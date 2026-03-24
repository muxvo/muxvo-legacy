import { describe, test, expect, vi, beforeEach } from 'vitest';

/**
 * VERIFY: forceCompositorFlush CSS transform 机制
 *
 * 验证文字乱码修复的 workaround 机制是否正确工作：
 * 1. 设置 document.documentElement.style.transform = 'translateZ(0)'
 * 2. 在 RAF 回调中移除 transform
 * 3. 通过 glyphLog 记录触发原因
 * 4. 不使用 setZoomFactor（避免触发 ResizeObserver 导致滚动跳顶）
 */

// Mock window.api + requestAnimationFrame before importing module
const mockGlyphLog = vi.fn();
const mockTermLog = vi.fn();
let rafCallbacks: Array<() => void> = [];

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  rafCallbacks = [];

  // Mock document.documentElement
  const mockStyle = { transform: '' };
  (globalThis as any).document = {
    documentElement: { style: mockStyle },
  };

  (globalThis as any).window = {
    api: {
      glyphLog: mockGlyphLog,
      termDebugLog: mockTermLog,
    },
  };
  (globalThis as any).requestAnimationFrame = (cb: () => void) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  };
});

describe('forceCompositorFlush', () => {
  test('applies translateZ(0) transform immediately', async () => {
    const { forceCompositorFlush } = await import('@/renderer/utils/force-repaint');
    forceCompositorFlush('test');

    expect(document.documentElement.style.transform).toBe('translateZ(0)');
  });

  test('removes transform in RAF callback', async () => {
    const { forceCompositorFlush } = await import('@/renderer/utils/force-repaint');
    forceCompositorFlush('test');

    expect(document.documentElement.style.transform).toBe('translateZ(0)');

    // Fire RAF
    rafCallbacks.forEach((cb) => cb());

    expect(document.documentElement.style.transform).toBe('');
  });

  test('does NOT use setZoomFactor (scroll-safe)', async () => {
    // Ensure no setZoomFactor is called — it causes terminal scroll-to-top bugs
    const mockSetZoomFactor = vi.fn();
    (globalThis as any).window.api.app = {
      getZoomFactor: vi.fn(() => 1.0),
      setZoomFactor: mockSetZoomFactor,
    };

    const { forceCompositorFlush } = await import('@/renderer/utils/force-repaint');
    forceCompositorFlush('test');
    rafCallbacks.forEach((cb) => cb());

    expect(mockSetZoomFactor).not.toHaveBeenCalled();
  });

  test('logs reason via glyphLog', async () => {
    const { forceCompositorFlush } = await import('@/renderer/utils/force-repaint');
    forceCompositorFlush('timer:30s');

    expect(mockGlyphLog).toHaveBeenCalledTimes(1);
    const logLine = mockGlyphLog.mock.calls[0][0] as string;
    expect(logLine).toContain('reason=timer:30s');
  });

  test('does not throw when DOM not ready', async () => {
    // Simulate missing documentElement
    (globalThis as any).document = {};
    const { forceCompositorFlush } = await import('@/renderer/utils/force-repaint');

    expect(() => forceCompositorFlush('test')).not.toThrow();
  });

  test('default reason is "unknown"', async () => {
    const { forceCompositorFlush } = await import('@/renderer/utils/force-repaint');
    forceCompositorFlush();

    const logLine = mockGlyphLog.mock.calls[0][0] as string;
    expect(logLine).toContain('reason=unknown');
  });
});
