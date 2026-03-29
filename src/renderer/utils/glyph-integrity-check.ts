/**
 * Glyph Integrity Check — detects GPU glyph cache corruption.
 *
 * Two-layer detection:
 * 1. CPU check (original): OffscreenCanvas fillText → getImageData hash comparison.
 *    Fast but misses GPU-only corruption (always passes when GPU compositor is broken).
 * 2. GPU check (new): capturePage() reads actual post-compositing pixels from a
 *    reference DOM element. This is the "ground truth" — same pixels the user sees.
 *    capturePage() also triggers GPU readback → forces compositor re-rasterize,
 *    so detection and repair happen in one call (equivalent to macOS screenshot).
 */

// --- CPU-level check (original, kept for logging) ---

const TEST_STRING = 'ABCDEFG测试文字あいう';
const CANVAS_W = 256;
const CANVAS_H = 32;

let ctx: OffscreenCanvasRenderingContext2D | null = null;
let referenceHash = 0;

export function initGlyphIntegrityCheck(): void {
  try {
    const canvas = new OffscreenCanvas(CANVAS_W, CANVAS_H);
    ctx = canvas.getContext('2d', { willReadFrequently: false }) as OffscreenCanvasRenderingContext2D | null;
    if (ctx) {
      referenceHash = renderAndHash(ctx);
    }
  } catch { /* OffscreenCanvas not available */ }
}

function renderAndHash(c: OffscreenCanvasRenderingContext2D): number {
  c.clearRect(0, 0, CANVAS_W, CANVAS_H);
  c.font = '14px monospace';
  c.fillStyle = '#ffffff';
  c.fillText(TEST_STRING, 0, 20);
  const data = c.getImageData(0, 0, CANVAS_W, CANVAS_H).data;
  // Fast hash: sample every 16th byte (alpha channel at stride 4, skip 4 pixels)
  let hash = 0;
  for (let i = 3; i < data.length; i += 16) {
    hash = (hash * 31 + data[i]) | 0;
  }
  return hash;
}

export function checkGlyphIntegrity(): { ok: boolean; detail: string } {
  if (!ctx || referenceHash === 0) {
    return { ok: true, detail: 'not_initialized' };
  }
  const currentHash = renderAndHash(ctx);
  const ok = currentHash === referenceHash;
  return {
    ok,
    detail: ok
      ? `hash=${currentHash}`
      : `MISMATCH ref=${referenceHash} cur=${currentHash}`,
  };
}

// --- GPU-level check (new: reads actual composited pixels via capturePage) ---

const GPU_REF_RECT = { x: 0, y: 0, width: 64, height: 16 };
let gpuReferenceHash = 0;

function hashBitmap(buf: ArrayLike<number>): number {
  let h = 0;
  for (let i = 0; i < buf.length; i += 16) {
    h = (h * 31 + buf[i]) | 0;
  }
  return h;
}

/**
 * Initialize GPU integrity check.
 * Must be called after the #glyph-ref DOM element is rendered.
 * Waits 2 animation frames to ensure GPU has composited the reference text.
 */
export async function initGpuIntegrityCheck(): Promise<void> {
  try {
    // Wait for GPU to composite the reference element
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    const bitmap = await window.api.captureFlush(GPU_REF_RECT);
    if (bitmap) {
      gpuReferenceHash = hashBitmap(new Uint8Array(bitmap));
    }
  } catch { /* captureFlush not available yet */ }
}

/**
 * Check GPU-level glyph integrity by capturing actual screen pixels.
 * The capturePage() call itself triggers GPU readback → forces re-rasterize,
 * so this both detects AND repairs corruption in one call.
 */
export async function checkGpuIntegrity(): Promise<{ ok: boolean; detail: string }> {
  if (!gpuReferenceHash) {
    return { ok: true, detail: 'gpu_not_initialized' };
  }
  try {
    const bitmap = await window.api.captureFlush(GPU_REF_RECT);
    if (!bitmap) return { ok: true, detail: 'capture_failed' };
    const currentHash = hashBitmap(new Uint8Array(bitmap));
    const ok = currentHash === gpuReferenceHash;
    return {
      ok,
      detail: ok
        ? `gpu_hash=${currentHash}`
        : `GPU_MISMATCH ref=${gpuReferenceHash} cur=${currentHash}`,
    };
  } catch {
    return { ok: true, detail: 'capture_error' };
  }
}
