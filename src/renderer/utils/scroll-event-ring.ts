/**
 * Ring buffer for terminal scroll diagnostics.
 *
 * Captures high-frequency events (onScroll, ResizeObserver, click) with zero
 * IPC overhead. On scroll anomaly detection, the entire ring is flushed to
 * terminal-debug.log for post-mortem analysis.
 */
import { termLog } from './term-debug-logger';

interface RingEntry {
  ts: number;
  tag: string;
  detail: string;
}

const rings = new Map<string, RingEntry[]>();
const MAX_ENTRIES = 30;

/** Push an event into the ring buffer for a terminal (no IPC). */
export function ringPush(termId: string, tag: string, detail: string): void {
  let ring = rings.get(termId);
  if (!ring) {
    ring = [];
    rings.set(termId, ring);
  }
  ring.push({ ts: Date.now(), tag, detail });
  if (ring.length > MAX_ENTRIES) ring.shift();
}

/** Flush the ring buffer to terminal-debug.log and clear it. */
export function ringFlush(termId: string, reason: string): void {
  const ring = rings.get(termId);
  if (!ring || ring.length === 0) return;
  const lines = ring.map((e) => `  ${e.ts} [${e.tag}] ${e.detail}`).join('\n');
  termLog('ringDump', `id=${termId} reason=${reason} count=${ring.length}\n${lines}`);
  ring.length = 0;
}

/** Get all terminal IDs that have an active ring buffer. */
export function getAllRingTerminalIds(): string[] {
  return Array.from(rings.keys());
}

/** Remove a terminal's ring buffer (call on unmount). */
export function ringRemove(termId: string): void {
  rings.delete(termId);
}
