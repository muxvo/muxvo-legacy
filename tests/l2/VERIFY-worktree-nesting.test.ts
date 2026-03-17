/**
 * VERIFY: Worktree nesting prevention + current marker fix
 *
 * Bug 1: detectRepo returns nested worktree path instead of main repo
 * Bug 2: create() allows nested .worktrees/ creation
 * Bug 3: currentWorktree detection matches main repo (shorter prefix) before actual worktree
 * Bug 4: CLEAR event missing from naming machine
 */
import { describe, test, expect } from 'vitest';

describe('VERIFY: worktree nesting prevention', () => {
  // --- Bug 1: detectRepo safety net ---
  // We can't easily test detectRepo directly (it calls git),
  // but we can test the safety net logic in isolation.

  test('Bug1: repoPath containing /.worktrees/ should be stripped to main repo', () => {
    // This is the safety net logic extracted from detectRepo
    function stripWorktreePath(repoPath: string): string {
      const wtMarker = '/.worktrees/';
      const wtIdx = repoPath.indexOf(wtMarker);
      if (wtIdx >= 0) {
        return repoPath.substring(0, wtIdx);
      }
      return repoPath;
    }

    // Nested worktree path (the bug case)
    expect(stripWorktreePath('/repo/AIPM/.worktrees/wt-2/.worktrees/wt-1'))
      .toBe('/repo/AIPM');

    // Single-level worktree path
    expect(stripWorktreePath('/repo/AIPM/.worktrees/wt-2'))
      .toBe('/repo/AIPM');

    // Main repo path (no .worktrees/) — unchanged
    expect(stripWorktreePath('/repo/AIPM'))
      .toBe('/repo/AIPM');

    // Triple-nested
    expect(stripWorktreePath('/repo/.worktrees/a/.worktrees/b/.worktrees/c'))
      .toBe('/repo');
  });

  // --- Bug 2: create() rejects nested repoPath ---
  test('Bug2: create() throws if repoPath contains /.worktrees/', async () => {
    const { createWorktreeManager } = await import('@/main/services/worktree/manager');
    const mgr = createWorktreeManager();

    await expect(
      mgr.create('/repo/AIPM/.worktrees/wt-2')
    ).rejects.toThrow('Cannot create worktree inside another worktree');
  });

  // --- Bug 3: currentWorktree matches longest path first ---
  test('Bug3: currentWorktree should match worktree path before main repo prefix', () => {
    // Simulate the WorktreePopover logic
    const worktrees = [
      { path: '/repo/muxvo', branch: 'main', isMain: true, isMerged: false },
      { path: '/repo/muxvo/.worktrees/wt-59', branch: 'wt-59', isMain: false, isMerged: false },
      { path: '/repo/muxvo/.worktrees/wt-58', branch: 'wt-58', isMain: false, isMerged: true },
    ];

    const terminalCwd = '/repo/muxvo/.worktrees/wt-59';

    // OLD logic (broken): find without sort → matches main first
    const oldResult = worktrees.find(
      (wt) => terminalCwd === wt.path || terminalCwd.startsWith(wt.path + '/')
    );
    // This incorrectly matches main because main.path + '/' is a prefix
    expect(oldResult?.branch).toBe('main'); // proves the bug exists

    // NEW logic (fixed): sort by path length descending, then find
    const newResult = [...worktrees]
      .sort((a, b) => b.path.length - a.path.length)
      .find((wt) => terminalCwd === wt.path || terminalCwd.startsWith(wt.path + '/'));
    expect(newResult?.branch).toBe('wt-59'); // correct!
  });

  test('Bug3: main repo terminal should still match main', () => {
    const worktrees = [
      { path: '/repo/muxvo', branch: 'main', isMain: true, isMerged: false },
      { path: '/repo/muxvo/.worktrees/wt-59', branch: 'wt-59', isMain: false, isMerged: false },
    ];

    const terminalCwd = '/repo/muxvo';

    const result = [...worktrees]
      .sort((a, b) => b.path.length - a.path.length)
      .find((wt) => terminalCwd === wt.path || terminalCwd.startsWith(wt.path + '/'));
    expect(result?.branch).toBe('main');
  });

  test('Bug3: subdirectory within worktree matches correct worktree', () => {
    const worktrees = [
      { path: '/repo/muxvo', branch: 'main', isMain: true, isMerged: false },
      { path: '/repo/muxvo/.worktrees/wt-59', branch: 'wt-59', isMain: false, isMerged: false },
    ];

    const terminalCwd = '/repo/muxvo/.worktrees/wt-59/src/main';

    const result = [...worktrees]
      .sort((a, b) => b.path.length - a.path.length)
      .find((wt) => terminalCwd === wt.path || terminalCwd.startsWith(wt.path + '/'));
    expect(result?.branch).toBe('wt-59');
  });

  // --- Bug 4: CLEAR event on naming machine ---
  test('Bug4: naming machine CLEAR resets from DisplayNamed to DisplayEmpty', async () => {
    const { createNamingMachine } = await import('@/shared/machines/terminal-naming');

    const machine = createNamingMachine('feature-branch');
    expect(machine.state).toBe('DisplayNamed');
    expect(machine.context.displayText).toBe('feature-branch');

    machine.send('CLEAR');
    expect(machine.state).toBe('DisplayEmpty');
    expect(machine.context.displayText).toBe('');
    expect(machine.context.originalValue).toBe('');
  });

  test('Bug4: CLEAR is no-op in DisplayEmpty state', async () => {
    const { createNamingMachine } = await import('@/shared/machines/terminal-naming');

    const machine = createNamingMachine();
    expect(machine.state).toBe('DisplayEmpty');

    machine.send('CLEAR'); // should not crash
    expect(machine.state).toBe('DisplayEmpty');
  });
});
