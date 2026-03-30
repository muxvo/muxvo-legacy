/**
 * Force Chromium compositor to invalidate cached texture layers.
 *
 * Uses capturePage() via IPC to trigger GPU readback — equivalent to
 * macOS screenshot, which forces the compositor to re-rasterize all tiles.
 *
 * Detection: captures a reference DOM element (#glyph-ref) and compares
 * pixel hash against startup baseline. FAIL = GPU corruption detected.
 *
 * Repair: on FAIL, triggers full-window capturePage (no rect) to force
 * complete re-rasterization of all compositor tiles.
 */
import { glyphLog } from './glyph-logger';
import { termLog } from './term-debug-logger';
import { getActiveWebglCount } from './terminal-addon-manager';
import { checkGlyphIntegrity, checkGpuIntegrity, forceFullWindowReadback } from './glyph-integrity-check';

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

    // GPU-level check — capturePage() triggers readback on reference element
    const gpuIntegrity = await checkGpuIntegrity();

    // If GPU corruption detected, force full-window readback (= macOS screenshot)
    if (!gpuIntegrity.ok) {
      glyphLog('flush', `GPU_CORRUPTION_DETECTED — triggering full-window readback`);
      await forceFullWindowReadback();
    }

    window.dispatchEvent(new CustomEvent('muxvo:compositor-flush-post', { detail: reason }));

    glyphLog('flush', `reason=${reason} uptime=${uptimeSec}s terms=${termCount} webgl=${webglCount} hidden=${hidden} integrity=${cpuIntegrity.ok ? 'OK' : 'FAIL'} ${cpuIntegrity.detail} gpu_integrity=${gpuIntegrity.ok ? 'OK' : 'FAIL'} ${gpuIntegrity.detail}`);
  } catch { /* preload not ready */ }
}
