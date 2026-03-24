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
import { getActiveWebglCount } from './terminal-addon-manager';
import { checkGlyphIntegrity } from './glyph-integrity-check';

const appStartTime = Date.now();

export function forceCompositorFlush(reason: string = 'unknown'): void {
  try {
    const uptimeSec = Math.round((Date.now() - appStartTime) / 1000);
    const termCount = document.querySelectorAll('.xterm').length;
    const webglCount = getActiveWebglCount();
    const hidden = document.hidden;

    const integrity = checkGlyphIntegrity();
    glyphLog('flush', `reason=${reason} uptime=${uptimeSec}s terms=${termCount} webgl=${webglCount} hidden=${hidden} integrity=${integrity.ok ? 'OK' : 'FAIL'} ${integrity.detail}`);
    termLog('compositorFlush', `reason=${reason} uptime=${uptimeSec}s terms=${termCount} webgl=${webglCount}`);
    for (const id of getAllRingTerminalIds()) {
      ringPush(id, 'compositorFlush', `reason=${reason}`);
    }
    const el = document.documentElement;
    el.style.transform = 'translateZ(0)';
    requestAnimationFrame(() => {
      el.style.transform = '';
    });
  } catch { /* preload not ready */ }
}
