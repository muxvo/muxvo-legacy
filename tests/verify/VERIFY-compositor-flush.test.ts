import { describe, test, expect, vi, beforeEach } from 'vitest';

/**
 * VERIFY: forceCompositorFlush 微缩放机制
 *
 * 验证文字乱码修复的 workaround 机制是否正确工作：
 * 1. 调用 setZoomFactor(current + 0.0001) 触发重新光栅化
 * 2. 在 RAF 回调中恢复原始 zoom factor
 * 3. 通过 glyphLog 记录触发原因
 * 4. preload 不可用时静默失败（不抛异常）
 */

// Mock window.api + requestAnimationFrame before importing module
const mockSetZoomFactor = vi.fn();
const mockGetZoomFactor = vi.fn(() => 1.0);
const mockGlyphLog = vi.fn();
let rafCallbacks: Array<() => void> = [];

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  rafCallbacks = [];
  mockGetZoomFactor.mockReturnValue(1.0);

  (globalThis as any).window = {
    api: {
      app: {
        getZoomFactor: mockGetZoomFactor,
        setZoomFactor: mockSetZoomFactor,
      },
      glyphLog: mockGlyphLog,
    },
  };
  (globalThis as any).requestAnimationFrame = (cb: () => void) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  };
});

describe('forceCompositorFlush', () => {
  test('applies micro-zoom offset (+0.0001) immediately', async () => {
    const { forceCompositorFlush } = await import('@/renderer/utils/force-repaint');
    forceCompositorFlush('test');

    // First call: micro-zoom
    expect(mockSetZoomFactor).toHaveBeenCalledTimes(1);
    expect(mockSetZoomFactor).toHaveBeenCalledWith(1.0001);
  });

  test('restores original zoom factor in RAF callback', async () => {
    const { forceCompositorFlush } = await import('@/renderer/utils/force-repaint');
    forceCompositorFlush('test');

    // Before RAF: only micro-zoom applied
    expect(mockSetZoomFactor).toHaveBeenCalledTimes(1);

    // Fire RAF
    rafCallbacks.forEach((cb) => cb());

    // After RAF: original zoom restored
    expect(mockSetZoomFactor).toHaveBeenCalledTimes(2);
    expect(mockSetZoomFactor).toHaveBeenLastCalledWith(1.0);
  });

  test('works with non-default zoom (e.g. user set 120%)', async () => {
    mockGetZoomFactor.mockReturnValue(1.2);
    const { forceCompositorFlush } = await import('@/renderer/utils/force-repaint');
    forceCompositorFlush('test');

    expect(mockSetZoomFactor).toHaveBeenCalledWith(1.2 + 0.0001);

    rafCallbacks.forEach((cb) => cb());
    expect(mockSetZoomFactor).toHaveBeenLastCalledWith(1.2);
  });

  test('logs reason via glyphLog', async () => {
    const { forceCompositorFlush } = await import('@/renderer/utils/force-repaint');
    forceCompositorFlush('timer:30s');

    expect(mockGlyphLog).toHaveBeenCalledTimes(1);
    const logLine = mockGlyphLog.mock.calls[0][0] as string;
    expect(logLine).toContain('reason=timer:30s');
    expect(logLine).toContain('zoom=1.0000');
  });

  test('logs correct zoom value when zoomed', async () => {
    mockGetZoomFactor.mockReturnValue(1.2);
    const { forceCompositorFlush } = await import('@/renderer/utils/force-repaint');
    forceCompositorFlush('windowFocus');

    const logLine = mockGlyphLog.mock.calls[0][0] as string;
    expect(logLine).toContain('reason=windowFocus');
    expect(logLine).toContain('zoom=1.2000');
  });

  test('does not throw when preload not ready', async () => {
    mockGetZoomFactor.mockImplementation(() => {
      throw new Error('preload not ready');
    });
    const { forceCompositorFlush } = await import('@/renderer/utils/force-repaint');

    expect(() => forceCompositorFlush('test')).not.toThrow();
    expect(mockSetZoomFactor).not.toHaveBeenCalled();
  });

  test('default reason is "unknown"', async () => {
    const { forceCompositorFlush } = await import('@/renderer/utils/force-repaint');
    forceCompositorFlush();

    const logLine = mockGlyphLog.mock.calls[0][0] as string;
    expect(logLine).toContain('reason=unknown');
  });
});
