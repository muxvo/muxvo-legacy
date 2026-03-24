/**
 * Glyph Integrity Check — detects GPU glyph cache corruption.
 *
 * Chromium's GPU glyph cache is shared across DOM text, 2D Canvas, and WebGL.
 * If the cache becomes corrupted, ctx.fillText() produces wrong glyphs.
 *
 * This module renders a known test string to an offscreen canvas at startup
 * (reference), then re-renders periodically and compares pixel hashes.
 * A hash mismatch means the glyph cache is corrupted.
 */

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
