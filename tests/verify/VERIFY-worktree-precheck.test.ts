/**
 * VERIFY: Worktree pre-check warns when .git is too large,
 * and create() uses extended timeout + passes warning through.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { execFile } from 'node:child_process';

// Mock child_process.execFile
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

// Mock fs/promises to avoid actual filesystem access
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('.worktrees/\n'),
  appendFile: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
}));

import { createWorktreeManager } from '@/main/services/worktree/manager';

const mockExecFile = vi.mocked(execFile);

/**
 * Helper: configure mockExecFile to respond to specific git/du commands
 */
function setupMocks(opts: {
  gitDirSizeKB?: number;
  worktreeListOutput?: string;
  branchListOutput?: string;
  worktreeAddSuccess?: boolean;
}) {
  const {
    gitDirSizeKB = 1024, // 1 MB default (small)
    worktreeListOutput = 'worktree /repo\nbranch refs/heads/main\n',
    branchListOutput = '',
    worktreeAddSuccess = true,
  } = opts;

  mockExecFile.mockImplementation(
    (cmd: string, args: string[], _opts: any, cb?: Function) => {
      // promisify wraps execFile: (cmd, args, opts) → Promise
      // but the mock sees the raw call pattern
      const callback = cb || _opts; // promisify may shift args

      if (cmd === 'du') {
        // du -sk .git/
        const stdout = `${gitDirSizeKB}\t/repo/.git\n`;
        if (typeof callback === 'function') {
          callback(null, { stdout, stderr: '' });
        }
        return;
      }

      if (cmd === 'git') {
        const subcommand = args[0];

        if (subcommand === 'rev-parse') {
          if (typeof callback === 'function') {
            callback(null, { stdout: 'main\n', stderr: '' });
          }
          return;
        }

        if (subcommand === 'worktree' && args[1] === 'list') {
          if (typeof callback === 'function') {
            callback(null, { stdout: worktreeListOutput, stderr: '' });
          }
          return;
        }

        if (subcommand === 'worktree' && args[1] === 'prune') {
          if (typeof callback === 'function') {
            callback(null, { stdout: '', stderr: '' });
          }
          return;
        }

        if (subcommand === 'worktree' && args[1] === 'add') {
          if (worktreeAddSuccess) {
            if (typeof callback === 'function') {
              callback(null, { stdout: '', stderr: '' });
            }
          } else {
            if (typeof callback === 'function') {
              callback(new Error('ETIMEDOUT'), { stdout: '', stderr: '' });
            }
          }
          return;
        }

        if (subcommand === 'branch') {
          if (args[1] === '--merged') {
            if (typeof callback === 'function') {
              callback(null, { stdout: '', stderr: '' });
            }
            return;
          }
          if (typeof callback === 'function') {
            callback(null, { stdout: branchListOutput, stderr: '' });
          }
          return;
        }

        if (subcommand === 'check-ref-format') {
          if (typeof callback === 'function') {
            callback(null, { stdout: '', stderr: '' });
          }
          return;
        }

        // Default: succeed silently
        if (typeof callback === 'function') {
          callback(null, { stdout: '', stderr: '' });
        }
        return;
      }

      // Unknown command
      if (typeof callback === 'function') {
        callback(new Error(`Unknown command: ${cmd}`), { stdout: '', stderr: '' });
      }
    },
  );
}

describe('VERIFY: worktree preCheck and create with large repo handling', () => {
  let manager: ReturnType<typeof createWorktreeManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = createWorktreeManager();
  });

  test('preCheck returns no warning for small repos', async () => {
    setupMocks({ gitDirSizeKB: 50 * 1024 }); // 50 MB
    const result = await manager.preCheck('/repo');
    expect(result.warning).toBeUndefined();
  });

  test('preCheck returns warning when .git > 500 MB', async () => {
    setupMocks({ gitDirSizeKB: 600 * 1024 }); // 600 MB
    const result = await manager.preCheck('/repo');
    expect(result.warning).toBeDefined();
    expect(result.warning!.sizeMB).toBe(600);
    expect(result.warning!.message).toContain('600 MB');
    expect(result.warning!.message).toContain('git filter-repo');
  });

  test('preCheck returns warning for very large repos (1.2 GB)', async () => {
    setupMocks({ gitDirSizeKB: 1200 * 1024 }); // 1.2 GB
    const result = await manager.preCheck('/repo');
    expect(result.warning).toBeDefined();
    expect(result.warning!.sizeMB).toBe(1200);
  });

  test('create passes warning through for large repos', async () => {
    setupMocks({ gitDirSizeKB: 800 * 1024 }); // 800 MB
    const result = await manager.create('/repo');
    expect(result.warning).toBeDefined();
    expect(result.warning!.sizeMB).toBe(800);
    expect(result.worktreePath).toContain('.worktrees/wt-');
    expect(result.branch).toMatch(/^wt-\d+$/);
  });

  test('create returns no warning for small repos', async () => {
    setupMocks({ gitDirSizeKB: 10 * 1024 }); // 10 MB
    const result = await manager.create('/repo');
    expect(result.warning).toBeUndefined();
    expect(result.worktreePath).toContain('.worktrees/wt-');
  });

  test('create uses 30s timeout for git worktree add', async () => {
    setupMocks({ gitDirSizeKB: 10 * 1024 });
    await manager.create('/repo');

    // Find the call to execFile with 'worktree' 'add' args
    const worktreeAddCall = mockExecFile.mock.calls.find(
      (call: any[]) => call[0] === 'git' && call[1]?.[0] === 'worktree' && call[1]?.[1] === 'add',
    );
    expect(worktreeAddCall).toBeDefined();
    // The options object should have timeout: 30000
    const opts = worktreeAddCall![2];
    expect(opts.timeout).toBe(30_000);
  });

  test('git helper default timeout is 15s for non-create operations', async () => {
    setupMocks({ gitDirSizeKB: 10 * 1024 });
    await manager.list('/repo');

    // Find calls to git worktree list
    const listCall = mockExecFile.mock.calls.find(
      (call: any[]) => call[0] === 'git' && call[1]?.[0] === 'worktree' && call[1]?.[1] === 'list',
    );
    expect(listCall).toBeDefined();
    const opts = listCall![2];
    expect(opts.timeout).toBe(15_000);
  });
});
