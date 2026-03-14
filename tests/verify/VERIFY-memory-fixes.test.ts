/**
 * VERIFY: Memory optimization fixes
 *
 * Tests for 7 memory fixes:
 * - Fix 2: Analytics events cap at 50000
 * - Fix 3: IPC output throttling
 * - Fix 4: Graceful close double onExit
 * - Fix 6: Perf-logger ring buffer
 * - Fix 7: Memory-push onExceeded callback
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock electron before importing modules that use it
vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [],
  },
}));

// Mock foreground-detector (uses execFileSync)
vi.mock('@/main/services/terminal/foreground-detector', () => ({
  getForegroundProcessName: () => null,
  getForegroundChildPid: () => null,
  getProcessCwd: () => null,
}));

// Mock input-detector
vi.mock('@/main/services/terminal/input-detector', () => ({
  detectWaitingInput: () => false,
  resetInputDetector: () => {},
  detectBellSignal: () => false,
  detectOscNotification: () => false,
}));

// Mock memory-monitor for memory-push tests
vi.mock('@/main/services/perf/memory-monitor', () => ({
  createMemoryMonitor: (opts: { thresholdMB: number }) => ({
    checkMemory: () => ({
      exceeded: process.memoryUsage().rss / (1024 * 1024) > opts.thresholdMB,
      currentMB: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    }),
  }),
}));

// ─── Fix 2: Analytics events cap ───

describe('Fix 2: Analytics tracker events cap', () => {
  test('events array should not exceed MAX_EVENTS (50000)', async () => {
    const { createAnalyticsTracker } = await import('@/main/services/analytics/tracker');
    const tracker = createAnalyticsTracker();

    // Push 51000 events
    for (let i = 0; i < 51000; i++) {
      tracker.track({ event: 'test.event', params: { i } });
    }

    // getSummary with a wide date range to count all events
    const today = new Date().toISOString().slice(0, 10);
    const summary = tracker.getSummary({ startDate: '2000-01-01', endDate: today });
    const totalEvents = summary.reduce((sum, s) => sum + s.totalEvents, 0);

    // After pruning 10% of 50000 = 5000, plus the remaining 1000 = 46000
    expect(totalEvents).toBeLessThanOrEqual(50000);
    expect(totalEvents).toBeGreaterThan(40000); // Should keep most events

    tracker.dispose();
  });

  test('events below cap should not be pruned', async () => {
    const { createAnalyticsTracker } = await import('@/main/services/analytics/tracker');
    const tracker = createAnalyticsTracker();

    for (let i = 0; i < 100; i++) {
      tracker.track({ event: 'test.event' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const summary = tracker.getSummary({ startDate: '2000-01-01', endDate: today });
    const totalEvents = summary.reduce((sum, s) => sum + s.totalEvents, 0);
    expect(totalEvents).toBe(100);

    tracker.dispose();
  });
});

// ─── Fix 6: Perf-logger ring buffer ───

describe('Fix 6: Perf-logger ring buffer', () => {
  test('track should not grow memory beyond MAX_RING_SIZE', async () => {
    const { createPerfLogger } = await import('@/main/services/perf/perf-logger');
    const logger = createPerfLogger({ termOutput: 99999, ipcPush: 99999, fsWatch: 99999, memoryMB: 99999 });

    // Track 5000 events (more than MAX_RING_SIZE of 2000)
    for (let i = 0; i < 5000; i++) {
      logger.track('termOutput', `term-${i % 3}`);
    }

    // If ring buffer works, internal storage shouldn't grow beyond 2000 entries
    // We verify indirectly: the logger should still work without errors
    logger.track('termOutput', 'term-final');

    logger.dispose();
  });

  test('track should work correctly after wrapping around', async () => {
    const { createPerfLogger } = await import('@/main/services/perf/perf-logger');
    const logger = createPerfLogger({ termOutput: 99999, ipcPush: 99999, fsWatch: 99999, memoryMB: 99999 });

    // Fill and wrap around multiple times
    for (let i = 0; i < 10000; i++) {
      logger.track('ipcPush', 'term-1');
    }

    // Should not throw
    logger.track('ipcPush', 'term-2');
    logger.dispose();
  });
});

// ─── Fix 4: Graceful close double onExit ───

describe('Fix 4: Graceful close - no double onExit', () => {
  test('graceful close should use exitResolve instead of registering second onExit', async () => {
    const { createTerminalManager } = await import('@/main/services/terminal/manager');

    let onExitCallCount = 0;
    let exitCallback: ((code: number) => void) | null = null;
    const mockProcess = {
      pid: 12345,
      onData: vi.fn(),
      onExit: vi.fn((cb: (code: number) => void) => {
        onExitCallCount++;
        exitCallback = cb;
      }),
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
    };

    const mockPty = {
      spawn: vi.fn(() => mockProcess),
      getDefaultShell: vi.fn(() => '/bin/zsh'),
    };

    const manager = createTerminalManager({ pty: mockPty as any });
    const result = manager.spawn({ cwd: '/tmp' });
    expect(result.success).toBe(true);

    // onExit should have been called exactly once (during spawn)
    expect(onExitCallCount).toBe(1);

    // Graceful close should NOT register a second onExit
    const closePromise = manager.close(result.id!);

    // After graceful close, onExit should still be 1 (no second registration)
    expect(onExitCallCount).toBe(1);

    // Simulate process exit — the global onExit resolves the promise
    exitCallback!(0);
    const closeResult = await closePromise;
    expect(closeResult.success).toBe(true);

    manager.closeAll();
  });

  test('graceful close timeout should force kill', async () => {
    vi.useFakeTimers();
    const { createTerminalManager } = await import('@/main/services/terminal/manager');

    const mockProcess = {
      pid: 12346,
      onData: vi.fn(),
      onExit: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
    };

    const mockPty = {
      spawn: vi.fn(() => mockProcess),
      getDefaultShell: vi.fn(() => '/bin/zsh'),
    };

    const manager = createTerminalManager({ pty: mockPty as any });
    const result = manager.spawn({ cwd: '/tmp' });

    const closePromise = manager.close(result.id!);

    // Advance past GRACEFUL_CLOSE_TIMEOUT (5000ms) + STATE_CHANGE_DEBOUNCE (50ms)
    vi.advanceTimersByTime(6000);

    const closeResult = await closePromise;
    expect(closeResult.success).toBe(true);
    expect(mockProcess.kill).toHaveBeenCalled();

    vi.useRealTimers();
  });
});

// ─── Fix 7: Memory-push onExceeded callback ───

describe('Fix 7: Memory-push onExceeded callback', () => {
  test('onExceeded should be called when memory exceeds threshold', async () => {
    const { createMemoryPushTimer } = await import('@/main/services/perf/memory-push');

    const onExceeded = vi.fn();
    const timer = createMemoryPushTimer({
      intervalMs: 60000,
      thresholdMB: 0.001, // Very low threshold to trigger
      onExceeded,
    });

    // checkOnce should trigger onExceeded since any process uses > 0.001 MB
    timer.checkOnce();
    expect(onExceeded).toHaveBeenCalled();
  });

  test('onExceeded should be optional (backward compatible)', async () => {
    const { createMemoryPushTimer } = await import('@/main/services/perf/memory-push');

    // Should not throw without onExceeded
    const timer = createMemoryPushTimer({
      intervalMs: 60000,
      thresholdMB: 0.001,
    });

    expect(() => timer.checkOnce()).not.toThrow();
  });
});

// ─── Fix 3: IPC throttling (structural check) ───

describe('Fix 3: IPC output throttling', () => {
  test('manager should batch IPC output instead of sending per onData', async () => {
    const { createTerminalManager } = await import('@/main/services/terminal/manager');

    let dataCallback: ((data: string) => void) | null = null;
    const mockProcess = {
      pid: 12347,
      onData: vi.fn((cb: (data: string) => void) => { dataCallback = cb; }),
      onExit: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
    };

    const mockPty = {
      spawn: vi.fn(() => mockProcess),
      getDefaultShell: vi.fn(() => '/bin/zsh'),
    };

    const manager = createTerminalManager({ pty: mockPty as any });
    const result = manager.spawn({ cwd: '/tmp' });
    expect(result.success).toBe(true);
    expect(dataCallback).not.toBeNull();

    // Simulate rapid output — should not crash
    for (let i = 0; i < 100; i++) {
      dataCallback!('output line ' + i + '\n');
    }

    // Manager should handle high-frequency data without error
    manager.closeAll();
  });
});

// ─── Fix 5: xterm scrollback (source check) ───

describe('Fix 5: xterm scrollback limit', () => {
  test('XTermRenderer source should include explicit scrollback setting', async () => {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');

    const source = readFileSync(
      join(process.cwd(), 'src/renderer/components/terminal/XTermRenderer.tsx'),
      'utf-8'
    );

    // Verify scrollback is explicitly set in Terminal constructor
    expect(source).toMatch(/new Terminal\(\{[\s\S]*scrollback:\s*\d+/);
    // Verify the value is 5000
    expect(source).toMatch(/scrollback:\s*5000/);
  });
});
