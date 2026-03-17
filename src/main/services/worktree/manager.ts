/**
 * Worktree Manager — Git worktree CLI wrapper for parallel development.
 *
 * Factory pattern: createWorktreeManager() → method object.
 * All git operations use child_process.execFile (no libgit2).
 * Designed for direct reuse by future MCP tool handlers.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, appendFile, access, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { WorktreeInfo } from '@/shared/types/worktree.types';

const execFileAsync = promisify(execFile);

// --- Diagnostic file logger for worktree ---
const wtLogDir = join(homedir(), '.muxvo', 'logs');
const wtLogPath = join(wtLogDir, 'worktree-debug.log');

function wtLog(msg: string): void {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  mkdir(wtLogDir, { recursive: true })
    .then(() => appendFile(wtLogPath, line))
    .catch(() => {});
}

/** Run a git command in a given directory */
async function git(cwd: string, args: string[], timeoutMs = 15_000): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, timeout: timeoutMs });
  return stdout.trim();
}

/** Get .git directory size in MB (for pre-check warnings) */
async function getGitDirSizeMB(repoPath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync('du', ['-sk', join(repoPath, '.git')], { timeout: 5_000 });
    return parseInt(stdout.split('\t')[0], 10) / 1024;
  } catch {
    return 0; // can't measure — skip warning
  }
}

const LARGE_REPO_THRESHOLD_MB = 500;

/** Parse `git worktree list --porcelain` output into WorktreeInfo[] */
function parseWorktreeList(output: string, repoPath: string): WorktreeInfo[] {
  const worktrees: WorktreeInfo[] = [];
  const blocks = output.split('\n\n').filter(Boolean);

  for (const block of blocks) {
    const lines = block.split('\n');
    let path = '';
    let branch = '';
    let isDetached = false;

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        path = line.slice('worktree '.length);
      } else if (line.startsWith('branch ')) {
        // branch refs/heads/main → main
        branch = line.slice('branch '.length).replace('refs/heads/', '');
      } else if (line === 'detached') {
        isDetached = true;
        branch = '(detached)';
      }
    }

    if (path) {
      worktrees.push({
        path,
        branch: branch || '(unknown)',
        isMain: path === repoPath,
        isMerged: false,
      });
    }
  }

  return worktrees;
}

/** Ensure .worktrees/ is in .gitignore */
async function ensureGitignore(repoPath: string): Promise<void> {
  const gitignorePath = join(repoPath, '.gitignore');
  const entry = '.worktrees/';

  try {
    await access(gitignorePath);
    const content = await readFile(gitignorePath, 'utf-8');
    if (content.includes(entry)) return;
    // Append with newline safety
    const prefix = content.endsWith('\n') ? '' : '\n';
    await appendFile(gitignorePath, `${prefix}${entry}\n`);
  } catch {
    // .gitignore doesn't exist — create it
    await appendFile(gitignorePath, `${entry}\n`);
  }
}

/** Find the next available worktree number (checks both worktree list and git branches) */
function nextWorktreeNumber(worktrees: WorktreeInfo[], gitBranches: string[] = [], existingDirs: string[] = []): number {
  const fromWorktrees = worktrees
    .map((wt) => wt.branch)
    .filter((b) => /^(wt|worktree)-\d+$/.test(b))
    .map((b) => parseInt(b.replace(/^(wt|worktree)-/, ''), 10));

  const fromGit = gitBranches
    .filter((b) => /^(wt|worktree)-\d+$/.test(b))
    .map((b) => parseInt(b.replace(/^(wt|worktree)-/, ''), 10));

  const fromDirs = existingDirs
    .filter((d) => /^(wt|worktree)-\d+$/.test(d))
    .map((d) => parseInt(d.replace(/^(wt|worktree)-/, ''), 10));

  const all = [...new Set([...fromWorktrees, ...fromGit, ...fromDirs])];
  if (all.length === 0) return 1;
  return Math.max(...all) + 1;
}

export function createWorktreeManager() {
  return {
    /**
     * Detect if a path is inside a git repository.
     * Returns the repo root path and current branch if found.
     */
    async detectRepo(
      path: string
    ): Promise<{ isRepo: boolean; repoPath?: string; branch?: string }> {
      wtLog(`[detectRepo] path=${path}`);
      try {
        let repoPath = await git(path, ['rev-parse', '--show-toplevel']);
        wtLog(`[detectRepo] show-toplevel=${repoPath}`);
        // --show-toplevel from a worktree returns the worktree root, not the main repo.
        // Use --git-common-dir to resolve the actual main repo path.
        try {
          const gitCommonDir = await git(path, ['rev-parse', '--git-common-dir']);
          const { resolve } = await import('node:path');
          const absGitDir = resolve(path, gitCommonDir);
          const mainRepo = resolve(absGitDir, '..');
          if (mainRepo !== repoPath) {
            repoPath = mainRepo;
          }
        } catch { /* fallback to --show-toplevel result */ }
        // Safety net: if repoPath still points inside .worktrees/, strip to main repo
        const wtMarker = '/.worktrees/';
        const wtIdx = repoPath.indexOf(wtMarker);
        if (wtIdx >= 0) {
          repoPath = repoPath.substring(0, wtIdx);
        }
        let branch: string | undefined;
        try {
          branch = await git(path, ['rev-parse', '--abbrev-ref', 'HEAD']);
        } catch { /* no commits yet — branch unknown */ }
        wtLog(`[detectRepo] OK isRepo=true repoPath=${repoPath} branch=${branch}`);
        return { isRepo: true, repoPath, branch };
      } catch (err: any) {
        const stderr = err?.stderr || '';
        const msg = err?.message || String(err);
        wtLog(`[detectRepo] FAILED path=${path} error=${msg} stderr=${stderr}`);
        return { isRepo: false };
      }
    },

    /**
     * List all worktrees for a repository.
     */
    async list(repoPath: string): Promise<WorktreeInfo[]> {
      try {
        const output = await git(repoPath, ['worktree', 'list', '--porcelain']);
        const worktrees = parseWorktreeList(output, repoPath);

        // Detect which branches have been merged into main
        const mainWt = worktrees.find(wt => wt.isMain);
        if (mainWt) {
          try {
            const merged = await git(repoPath, ['branch', '--merged', mainWt.branch]);
            const mergedBranches = merged.split('\n')
              .map(b => b.replace(/^[*+]?\s+/, '').trim())
              .filter(Boolean);
            for (const wt of worktrees) {
              wt.isMerged = !wt.isMain && mergedBranches.includes(wt.branch);
            }
          } catch { /* ignore — e.g. no commits */ }
        }

        return worktrees;
      } catch {
        return [];
      }
    },

    /**
     * Create a new worktree with auto-incremented naming.
     * Returns the new worktree path and branch name.
     */
    /**
     * Pre-check repo size. Returns a warning if .git is too large.
     */
    async preCheck(
      repoPath: string
    ): Promise<{ warning?: { sizeMB: number; message: string } }> {
      const sizeMB = await getGitDirSizeMB(repoPath);
      if (sizeMB > LARGE_REPO_THRESHOLD_MB) {
        return {
          warning: {
            sizeMB: Math.round(sizeMB),
            message: `.git 目录过大（${Math.round(sizeMB)} MB），创建 worktree 可能很慢。建议用 git filter-repo 清理历史中的大文件。`,
          },
        };
      }
      return {};
    },

    /**
     * Create a new worktree with auto-incremented naming.
     * Returns the new worktree path and branch name.
     */
    async create(
      repoPath: string
    ): Promise<{ worktreePath: string; branch: string; warning?: { sizeMB: number; message: string } }> {
      // Prevent nested worktree creation
      if (repoPath.includes('/.worktrees/')) {
        throw new Error(`Cannot create worktree inside another worktree: ${repoPath}`);
      }
      // Pre-check repo size
      const { warning } = await this.preCheck(repoPath);

      // Ensure .worktrees/ is gitignored
      await ensureGitignore(repoPath);

      // Prune stale worktree references before creating
      try {
        await git(repoPath, ['worktree', 'prune']);
      } catch { /* ignore */ }

      // Determine next number (check worktree list, git branches, AND existing directories)
      const existing = await this.list(repoPath);
      let gitBranches: string[] = [];
      try {
        const branchOutput = await git(repoPath, ['branch', '--list', 'wt-*']);
        gitBranches = branchOutput.split('\n')
          .map(b => b.replace(/^[*+]?\s+/, '').trim())
          .filter(Boolean);
      } catch { /* ignore */ }

      // Scan .worktrees/ directory for existing subdirectories (may be orphaned)
      const worktreesDir = join(repoPath, '.worktrees');
      let existingDirs: string[] = [];
      try {
        const { readdir } = await import('node:fs/promises');
        const entries = await readdir(worktreesDir, { withFileTypes: true });
        existingDirs = entries.filter(e => e.isDirectory()).map(e => e.name);
      } catch { /* directory may not exist yet */ }

      const num = nextWorktreeNumber(existing, gitBranches, existingDirs);
      const branch = `wt-${num}`;
      const worktreePath = join(repoPath, '.worktrees', branch);

      // Create the worktree (30s timeout for large repos)
      await git(repoPath, ['worktree', 'add', '-b', branch, worktreePath], 30_000);

      return { worktreePath, branch, warning };
    },

    /**
     * Rename the git branch of a worktree.
     * Validates the new name with git check-ref-format before renaming.
     */
    async rename(worktreePath: string, newBranchName: string): Promise<void> {
      // Validate new branch name
      await git(worktreePath, ['check-ref-format', '--branch', newBranchName]);
      // Get current branch name
      const oldBranch = await git(worktreePath, ['rev-parse', '--abbrev-ref', 'HEAD']);
      if (oldBranch === newBranchName) return; // no-op
      // Rename
      await git(worktreePath, ['branch', '-m', oldBranch, newBranchName]);
    },

    /**
     * Remove a worktree and its branch.
     * @param force — remove even if there are uncommitted changes
     */
    async remove(worktreePath: string, force?: boolean): Promise<void> {
      // Find the repo root from the worktree
      const repoPath = await git(worktreePath, ['rev-parse', '--show-toplevel']);
      // The worktree's own toplevel is the worktree dir itself.
      // We need the main repo — use commondir.
      let mainRepo: string;
      try {
        const gitDir = await git(worktreePath, [
          'rev-parse',
          '--git-common-dir',
        ]);
        // git-common-dir returns relative or absolute path to the main .git
        const { resolve } = await import('node:path');
        const absGitDir = resolve(worktreePath, gitDir);
        // Main repo is the parent of .git
        mainRepo = resolve(absGitDir, '..');
      } catch {
        mainRepo = repoPath;
      }
      // Safety net: if mainRepo still points inside .worktrees/, strip to main repo
      const wtMarker = '/.worktrees/';
      const wtIdx = mainRepo.indexOf(wtMarker);
      if (wtIdx >= 0) {
        mainRepo = mainRepo.substring(0, wtIdx);
      }

      // Get the branch name before removing
      let branch: string | null = null;
      try {
        branch = await git(worktreePath, [
          'rev-parse',
          '--abbrev-ref',
          'HEAD',
        ]);
      } catch {
        // ignore
      }

      // Remove the worktree
      const args = ['worktree', 'remove', worktreePath];
      if (force) args.push('--force');
      await git(mainRepo, args);

      // Delete the branch (only auto-created worktree-N branches)
      if (branch && /^(wt|worktree)-\d+$/.test(branch)) {
        try {
          await git(mainRepo, ['branch', '-D', branch]);
        } catch {
          // Branch may already be deleted or merged — ignore
        }
      }
    },
  };
}

export type WorktreeManager = ReturnType<typeof createWorktreeManager>;
