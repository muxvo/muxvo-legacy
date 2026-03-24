/**
 * Force Chromium compositor to invalidate cached texture layers.
 *
 * Briefly promotes <html> to its own compositing layer via translateZ(0),
 * then removes it — forcing all child layers to be recreated and text
 * to be re-rasterized.
 *
 * Previous approach used setZoomFactor() which invalidated glyph caches
 * but also triggered ResizeObserver on all containers and could reset
 * xterm viewport scrollTop, causing terminal scroll-to-top bugs.
 *
 * CSS transform is safe: no element dimension changes, no ResizeObserver,
 * no scroll position impact.
 */
import { glyphLog } from './glyph-logger';
import { termLog } from './term-debug-logger';
import { ringPush, getAllRingTerminalIds } from './scroll-event-ring';

export function forceCompositorFlush(reason: string = 'unknown'): void {
  try {
    glyphLog('flush', `reason=${reason}`);
    termLog('compositorFlush', `reason=${reason}`);
    // Notify XTermRenderer instances to snapshot scroll state before/after flush
    window.dispatchEvent(new CustomEvent('muxvo:compositor-flush-pre', { detail: reason }));
    const el = document.documentElement;
    el.style.transform = 'translateZ(0)';
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('muxvo:compositor-flush-post', { detail: reason }));
      el.style.transform = '';
    });
  } catch { /* preload not ready */ }
}
