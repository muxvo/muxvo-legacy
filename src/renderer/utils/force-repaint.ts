/**
 * Force Chromium compositor to invalidate cached texture layers.
 *
 * Uses capturePage() via IPC to trigger GPU readback — equivalent to
 * macOS screenshot, which forces the compositor to re-rasterize all tiles.
 *
 * Previous approaches that DIDN'T work:
 * - CSS translateZ(0): only marks layers dirty, doesn't force re-rasterize
 * - setZoomFactor(): forces re-rasterize but triggers ResizeObserver → scroll-to-top
 * - OffscreenCanvas integrity check: CPU rendering, misses GPU-only corruption
 *
 * capturePage() is the correct fix because:
 * 1. It reads actual post-compositing pixels (GPU readback)
 * 2. The readback forces GPU to re-rasterize all tiles
 * 3. It's the same mechanism as macOS screenshot (proven to fix the issue)
 */
import { glyphLog } from './glyph-logger';
import { termLog } from './term-debug-logger';
import { ringPush, getAllRingTerminalIds } from './scroll-event-ring';
import { getActiveWebglCount } from './terminal-addon-manager';
import { checkGlyphIntegrity, checkGpuIntegrity } from './glyph-integrity-check';

const appStartTime = Date.now();

export async function forceCompositorFlush(reason: string = 'unknown'): Promise<void> {
  try {
    const uptimeSec = Math.round((Date.now() - appStartTime) / 1000);
    const termCount = document.querySelectorAll('.xterm').length;
    const webglCount = getActiveWebglCount();
    const hidden = document.hidden;

    // CPU-level check (kept for comparison logging)
    const cpuIntegrity = checkGlyphIntegrity();

    termLog('compositorFlush', `reason=${reason} uptime=${uptimeSec}s terms=${termCount} webgl=${webglCount}`);
    window.dispatchEvent(new CustomEvent('muxvo:compositor-flush-pre', { detail: reason }));

    // GPU-level check — capturePage() triggers readback → detects + repairs in one call
    const gpuIntegrity = await checkGpuIntegrity();

    window.dispatchEvent(new CustomEvent('muxvo:compositor-flush-post', { detail: reason }));

    glyphLog('flush', `reason=${reason} uptime=${uptimeSec}s terms=${termCount} webgl=${webglCount} hidden=${hidden} integrity=${cpuIntegrity.ok ? 'OK' : 'FAIL'} ${cpuIntegrity.detail} gpu_integrity=${gpuIntegrity.ok ? 'OK' : 'FAIL'} ${gpuIntegrity.detail}`);
  } catch { /* preload not ready */ }
}
