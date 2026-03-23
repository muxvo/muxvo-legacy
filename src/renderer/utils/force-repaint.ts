/**
 * Force Chromium to re-rasterize all text by micro-toggling zoom factor.
 *
 * Changing webFrame.setZoomFactor() alters the effective rendering DPI,
 * which invalidates Chromium's glyph texture cache and forces fresh
 * rasterization of all text content (both DOM and WebGL).
 *
 * This is the programmatic equivalent of what happens when user switches
 * views (layout change → tile discard → fresh rasterization).
 *
 * Visual impact: none (0.01% = ~0.2px on 1920px screen, single frame)
 */
import { glyphLog } from './glyph-logger';

export function forceCompositorFlush(reason: string = 'unknown'): void {
  try {
    const current = window.api.app.getZoomFactor();
    glyphLog('flush', `reason=${reason} zoom=${current.toFixed(4)}`);
    window.api.app.setZoomFactor(current + 0.0001);
    requestAnimationFrame(() => {
      window.api.app.setZoomFactor(current);
    });
  } catch { /* preload not ready */ }
}
