/**
 * XTermRenderer — React wrapper for a single xterm.js terminal instance
 * DEV-PLAN A4: Terminal rendering via xterm.js
 */

import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import type { SearchAddon } from '@xterm/addon-search';
import { createAddonManager } from '../../utils/terminal-addon-manager';
import { trackRenderer } from '../../utils/renderer-perf-logger';
import { resolveTerminalTheme } from '@/shared/constants/terminal-themes';
import { DEFAULT_TERMINAL_CONFIG } from '@/renderer/stores/terminal-config';
import { TerminalSearchBar } from './TerminalSearchBar';
import { shellEscapePaths } from '../../utils/shell-escape';
import { stripPromptEolMark } from '@/shared/utils/strip-prompt-eol-mark';
import { glyphLog } from '../../utils/glyph-logger';
import { termLog } from '../../utils/term-debug-logger';
import { ringPush, ringFlush, ringRemove } from '../../utils/scroll-event-ring';
import { updateTerminalSizeCache } from '../../utils/terminal-size-cache';
import '@xterm/xterm/css/xterm.css';

/** Minimum terminal dimensions to send to PTY. Prevents hard-wrapping damage
 *  from layout transitions (fullscreen toggle, focus mode switch) where
 *  fitAddon briefly calculates cols from not-yet-settled containers. */
const MIN_COLS_FOR_RESIZE = 10;
const MIN_ROWS_FOR_RESIZE = 2;

/** Diagnostic logging — set to false after debugging */
const RESIZE_DEBUG = true;

function logFit(id: string, src: string, container: HTMLElement | null, cols: number, rows: number, action: string): void {
  if (!RESIZE_DEBUG) return;
  const rect = container?.getBoundingClientRect();
  const w = Math.round(rect?.width ?? 0);
  const h = Math.round(rect?.height ?? 0);
  console.log(`[XTERM:fit] id=${id.slice(0, 5)} src=${src} container=${w}x${h} cols=${cols} rows=${rows} ${action}`);
}

function logResize(id: string, cols: number, rows: number, action: string): void {
  if (!RESIZE_DEBUG) return;
  console.log(`[XTERM:resize] id=${id.slice(0, 5)} cols=${cols} rows=${rows} → ${action}`);
}

/** Check if container has sufficient dimensions for a meaningful fit */
function isContainerReady(container: HTMLElement | null): boolean {
  if (!container) return false;
  const { width, height } = container.getBoundingClientRect();
  return width >= 10 && height >= 10;
}

interface Props {
  terminalId: string;
  suppressResize?: boolean;
}

/** Check if a drag event carries file data (Finder or Muxvo internal) */
function hasFilePayload(e: React.DragEvent): boolean {
  return (
    e.dataTransfer.types.includes('Files') ||
    e.dataTransfer.types.includes('application/x-muxvo-file-paths')
  );
}

/** Extract file paths from a drop event */
function extractFilePaths(e: React.DragEvent): string[] {
  // Priority 1: Muxvo internal file drag
  const muxvoData = e.dataTransfer.getData('application/x-muxvo-file-paths');
  if (muxvoData) {
    try {
      return JSON.parse(muxvoData) as string[];
    } catch { /* fall through */ }
  }
  // Priority 2: System file drop (Finder)
  if (e.dataTransfer.files.length > 0) {
    const paths: string[] = [];
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      const p = window.api.getPathForFile(e.dataTransfer.files[i]);
      if (p) paths.push(p);
    }
    return paths;
  }
  return [];
}

export function XTermRenderer({ terminalId, suppressResize }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [fileDropActive, setFileDropActive] = useState(false);
  const dragEnterCountRef = useRef(0);
  // Ref tracks latest suppressResize value so ResizeObserver closure reads current state.
  // Assigned during render (not useEffect) to avoid race: ResizeObserver fires before
  // useEffect, so the ref must be updated synchronously before paint.
  const suppressResizeRef = useRef(suppressResize ?? false);
  suppressResizeRef.current = suppressResize ?? false;

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false; // Guard: skip async callbacks after unmount

    // Create terminal synchronously with defaults (ensures immediate render)
    const term = new Terminal({
      scrollback: 5000, // 显式设置上限，防止无限增长
      cursorBlink: DEFAULT_TERMINAL_CONFIG.cursorBlink,
      cursorStyle: DEFAULT_TERMINAL_CONFIG.cursorStyle,
      fontSize: DEFAULT_TERMINAL_CONFIG.fontSize,
      fontFamily: DEFAULT_TERMINAL_CONFIG.fontFamily,
      theme: resolveTerminalTheme(DEFAULT_TERMINAL_CONFIG.themeName),
      allowProposedApi: true, // Required by Unicode11Addon and ImageAddon
    });

    term.open(containerRef.current);
    // Hide terminal until buffer replay completes, preventing blank/partial content flash
    if (containerRef.current) {
      containerRef.current.style.opacity = '0';
    }
    {
      const rect = containerRef.current?.getBoundingClientRect();
      termLog('mount', `id=${terminalId} containerW=${Math.round(rect?.width ?? 0)} containerH=${Math.round(rect?.height ?? 0)} suppressResize=${suppressResizeRef.current}`);
    }
    const addonManager = createAddonManager(term);
    // loadAll is async (waits for document.fonts.ready before WebGL init).
    // FitAddon is loaded synchronously at the start, so getFitAddon() is safe here.
    // SearchAddon is set after the promise resolves.
    addonManager.loadAll().then(() => {
      if (disposed) return;
      searchAddonRef.current = addonManager.getSearchAddon();
    });
    const fitAddon = addonManager.getFitAddon();

    // Expose xterm scroll state on the container div for E2E testability.
    // xterm.js v6 manages scroll internally — DOM scrollTop is always 0.
    function syncScrollDataAttrs(): void {
      if (containerRef.current) {
        containerRef.current.dataset.viewportY = String(term.buffer.active.viewportY);
        containerRef.current.dataset.baseY = String(term.buffer.active.baseY);
      }
    }
    // Track previous viewportY to detect abnormal scroll-to-top events
    let prevScrollViewportY = 0;
    const scrollDisposable = term.onScroll(() => {
      const vY = term.buffer.active.viewportY;
      prevScrollViewportY = vY;
      syncScrollDataAttrs();
    });

    // Helper: read DOM-level scrollTop from .xterm-viewport element
    function getDomScrollState(): { domST: number; domSH: number } {
      const vp = containerRef.current?.querySelector('.xterm-viewport') as HTMLElement | null;
      return { domST: vp ? Math.round(vp.scrollTop) : -1, domSH: vp ? Math.round(vp.scrollHeight) : -1 };
    }

    // onRender jump detection — fires on every xterm render frame.
    // More reliable than onScroll for catching DOM-level scrollTop resets.
    let renderPrevVY = 0;
    const renderDisposable = term.onRender(() => {
      const vY = term.buffer.active.viewportY;
      const bY = term.buffer.active.baseY;
      if (renderPrevVY > 5 && vY === 0 && bY > 10) {
        const { domST, domSH } = getDomScrollState();
        termLog('render:jump!', `id=${terminalId} renderPrevVY=${renderPrevVY} → vY=0 bY=${bY} domST=${domST} domSH=${domSH}`);
        ringFlush(terminalId, `renderJump ${renderPrevVY}->0`);
      }
      renderPrevVY = vY;
    });

    // Poll-based scroll jump detection (500ms interval).
    // onScroll misses DOM-level scrollTop resets (CSS relayout, compositing layer changes).
    // Polling viewportY + DOM scrollTop catches ALL jump sources.
    let pollPrevVY = 0;
    const scrollPollTimer = setInterval(() => {
      if (disposed) return;
      const vY = term.buffer.active.viewportY;
      const bY = term.buffer.active.baseY;
      const { domST, domSH } = getDomScrollState();
      const delta = pollPrevVY - vY;

      // Detect jump to top or large backward jump
      if ((pollPrevVY > 5 && vY === 0 && bY > 10) || (delta > 50 && bY > 10)) {
        termLog('scrollPoll:jump!', `id=${terminalId} pollPrevVY=${pollPrevVY} → vY=${vY} bY=${bY} delta=${delta} domST=${domST} domSH=${domSH}`);
        ringFlush(terminalId, `pollJump ${pollPrevVY}->${vY}`);
      }

      // NOTE: domMismatch detection removed — xterm v6 WebGL renderer does NOT use
      // DOM scrollbar, so .xterm-viewport scrollTop is always 0. The old check
      // produced 870K+ false positives flooding the log file.

      pollPrevVY = vY;
    }, 500);
    // Also sync after any write (covers initial buffer replay)
    const writeDisposable = term.onWriteParsed(() => syncScrollDataAttrs());

    // Helper: fit terminal while preserving scroll position.
    // Uses proportional (ratio-based) scroll position to survive buffer rewrap
    // when column count changes significantly (e.g. tiled → focused mode switch).
    // Absolute offset would overshoot when baseY shrinks after unwrapping lines.
    // Scroll restoration is deferred to next frame because xterm.js v6
    // processes buffer rewrap asynchronously after fit().
    let fitSeq = 0;
    let lastObsWidth = 0;
    let lastObsHeight = 0;

    /** Guarded fit: skip when container is too small to produce meaningful dimensions.
     *  ALL fit triggers should go through this single entry point. */
    function safeFit(source: string): void {
      if (!isContainerReady(containerRef.current)) {
        logFit(terminalId, source, containerRef.current, term.cols, term.rows, 'SKIPPED(notReady)');
        return;
      }
      fitPreservingScroll(source);
    }

    function fitPreservingScroll(source: string = 'unknown'): void {
      const seq = ++fitSeq;
      const prevCols = term.cols;
      const prevRows = term.rows;
      const buf = term.buffer.active;
      const wasAtBottom = buf.viewportY >= buf.baseY;
      const scrollRatio = buf.baseY > 0 ? buf.viewportY / buf.baseY : 1;

      // Diagnostic: log scroll state BEFORE fit (critical for debugging scroll-to-top bug)
      termLog('scrollFit:before', `id=${terminalId} src=${source} seq=${seq} viewportY=${buf.viewportY} baseY=${buf.baseY} ratio=${scrollRatio.toFixed(3)} wasAtBottom=${wasAtBottom}`);
      ringPush(terminalId, 'fit:before', `src=${source} seq=${seq} vY=${buf.viewportY} bY=${buf.baseY}`);

      // Hide content during reflow to prevent 1-frame flash of wrong scroll position.
      // visibility:hidden keeps element dimensions (unlike display:none) so fitAddon
      // calculates correct cols/rows. Only hidden for ~16ms (1 frame).
      const viewport = containerRef.current?.querySelector('.xterm-viewport') as HTMLElement | null;
      if (viewport) viewport.style.visibility = 'hidden';

      fitAddon.fit();
      trackRenderer('fitCall');
      logFit(terminalId, source, containerRef.current, term.cols, term.rows,
        `${prevCols}x${prevRows}→${term.cols}x${term.rows}`);
      termLog('fit', `id=${terminalId} src=${source} prev=${prevCols}x${prevRows} now=${term.cols}x${term.rows} containerW=${Math.round(containerRef.current?.getBoundingClientRect().width ?? 0)} containerH=${Math.round(containerRef.current?.getBoundingClientRect().height ?? 0)}`);
      ringPush(terminalId, 'fit:done', `src=${source} seq=${seq} ${prevCols}x${prevRows}->${term.cols}x${term.rows}`);
      if (RESIZE_DEBUG && prevCols > 20 && term.cols < prevCols / 2) {
        console.warn(`[XTERM:WARN] id=${terminalId.slice(0, 5)} cols DROPPED ${prevCols}→${term.cols} src=${source}`);
        console.trace();
      }

      // No-op fit: dimensions unchanged → skip scroll restoration entirely.
      // This prevents compositorFlush and other no-resize triggers from
      // unnecessarily executing scrollToBottom + scrollLines, which can
      // perpetuate a corrupted vY=0 state.
      if (term.cols === prevCols && term.rows === prevRows) {
        if (viewport) viewport.style.visibility = '';
        termLog('scrollFit:noop', `id=${terminalId} src=${source} seq=${seq} ${prevCols}x${prevRows} → no change`);
        ringPush(terminalId, 'fit:noop', `src=${source} seq=${seq}`);
        return;
      }

      // Defer scroll restoration to next frame — xterm needs a tick to
      // complete buffer rewrap and update baseY/viewportY after fit().
      requestAnimationFrame(() => {
        if (disposed || seq !== fitSeq) {
          // Stale restore: a newer fit superseded this one. Log for diagnostics.
          const stack = new Error().stack?.split('\n').slice(1, 4).join(' | ') ?? '';
          termLog('scrollFit:stale', `id=${terminalId} src=${source} seq=${seq} current=${fitSeq} stack=${stack} → SKIP`);
          ringPush(terminalId, 'fit:stale', `src=${source} seq=${seq} cur=${fitSeq}`);
          // Ensure viewport visibility is restored even on stale skip
          if (viewport) viewport.style.visibility = '';
          return;
        }
        if (wasAtBottom) {
          term.scrollToBottom();
        } else {
          const newBaseY = term.buffer.active.baseY;
          const targetViewportY = Math.round(scrollRatio * newBaseY);
          const newOffset = newBaseY - targetViewportY;
          term.scrollToBottom();
          if (newOffset > 0) {
            term.scrollLines(-newOffset);
          }
        }
        syncScrollDataAttrs();
        // Diagnostic: log scroll state AFTER restoration
        termLog('scrollFit:after', `id=${terminalId} src=${source} seq=${seq} viewportY=${term.buffer.active.viewportY} baseY=${term.buffer.active.baseY} wasAtBottom=${wasAtBottom}`);
        ringPush(terminalId, 'fit:restored', `src=${source} seq=${seq} vY=${term.buffer.active.viewportY} bY=${term.buffer.active.baseY} wasBottom=${wasAtBottom}`);
        // Restore visibility after scroll position is correct
        if (viewport) viewport.style.visibility = '';
      });
    }

    // Cmd/Ctrl+F toggles terminal search bar
    term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      const isMod = navigator.platform.includes('Mac') ? e.metaKey : e.ctrlKey;
      if (isMod && e.key === 'f' && e.type === 'keydown') {
        setSearchVisible((prev) => !prev);
        return false;
      }
      // Cmd/Ctrl +/- global zoom (delegated to useGlobalZoom via custom event)
      if (isMod && (e.key === '=' || e.key === '+') && e.type === 'keydown') {
        window.dispatchEvent(new CustomEvent('muxvo:global-zoom-request', { detail: 'in' }));
        return false;
      }
      if (isMod && e.key === '-' && e.type === 'keydown') {
        window.dispatchEvent(new CustomEvent('muxvo:global-zoom-request', { detail: 'out' }));
        return false;
      }
      if (isMod && e.key === '0' && e.type === 'keydown') {
        window.dispatchEvent(new CustomEvent('muxvo:global-zoom-request', { detail: 'reset' }));
        return false;
      }
      // Cmd+Left → Home (beginning-of-line via bindkey \e[H)
      // Cmd+Right → End (end-of-line via bindkey \e[F)
      if (e.metaKey && e.type === 'keydown') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          window.api.terminal.write(terminalId, '\x1b[H');
          return false;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          window.api.terminal.write(terminalId, '\x1b[F');
          return false;
        }
      }
      return true;
    });
    // 延迟 fit，等待容器完成布局后再计算列宽行高
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (disposed) return;
        safeFit('initialFit');
      });
    });
    // Safety-net: retry fit after a generous delay to catch cases where the
    // initial double-RAF was too early (e.g. CSS Grid not fully settled).
    // safeFit is a no-op when container isn't ready or dimensions haven't changed.
    const safetyTimer = setTimeout(() => {
      if (disposed) return;
      safeFit('safetyNet');
    }, 200);
    termRef.current = term;

    // Async: load persisted config and apply (theme/font changes take effect live)
    window.api.app.getConfig().then((result) => {
      if (disposed) return;
      if (result?.data?.terminal) {
        const cfg = { ...DEFAULT_TERMINAL_CONFIG, ...result.data.terminal };
        term.options.theme = resolveTerminalTheme(cfg.themeName);
        term.options.fontSize = cfg.fontSize;
        term.options.fontFamily = cfg.fontFamily;
        term.options.cursorStyle = cfg.cursorStyle;
        term.options.cursorBlink = cfg.cursorBlink;
        requestAnimationFrame(() => {
          if (!disposed) safeFit('configApply');
        });
      }
    }).catch(() => { /* use defaults on error */ });

    // Terminal input -> send to Main process
    term.onData((data) => {
      window.api.terminal.write(terminalId, data);
    });

    // Queue/flush pattern: subscribe first, fetch buffer, replay, then go live
    let bufferedDataWritten = false;
    const pendingLiveData: string[] = [];

    // Detect escape sequences that may cause viewport scroll changes
    const SCROLL_DANGER_RE = /\x1b\[\??(?:1049[hl]|H|2J|3J|1;1H)/;

    // Regex to detect \x1b[3J (ED3 - Erase Saved Lines / clear scrollback).
    // CC's TUI sends this on every redraw. It clears xterm's scrollback and
    // resets viewportY to 0. We let it through (filtering causes duplicate content)
    // but restore scroll position via write callback.
    const ED3_RE = /\x1b\[3J/;

    const unsubOutput = window.api.terminal.onOutput((event) => {
      if (event.id === terminalId) {
        trackRenderer('ipcOutput');
        if (!bufferedDataWritten) {
          pendingLiveData.push(event.data);
          // Always log queued events (rare, only during buffer fetch)
          termLog('output', `id=${terminalId} bytes=${event.data.length} buffered=true queueLen=${pendingLiveData.length}`);
        } else {
          trackRenderer('termWrite');
          // Detect escape sequences that may reset viewport (cursor home, clear, alt buffer)
          if (SCROLL_DANGER_RE.test(event.data)) {
            const vY = term.buffer.active.viewportY;
            const escaped = event.data.slice(0, 80).replace(/[\x00-\x1f]/g, (c: string) => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0'));
            termLog('write:dangerSeq', `id=${terminalId} vY=${vY} bY=${term.buffer.active.baseY} seq=${escaped}`);
            ringPush(terminalId, 'write:danger', `vY=${vY} bytes=${event.data.length}`);
          }
          // If data contains ED3 (clear scrollback), save scroll state and restore
          // after xterm finishes processing. This prevents the viewport from staying
          // at the top after CC's TUI redraw.
          const hadED3 = ED3_RE.test(event.data);
          // Use lenient "at bottom" check: within `rows` lines counts as bottom.
          // After scrollToBottom(), vY can lag behind bY by a few lines due to
          // async xterm processing (e.g. vY=677 vs bY=684).
          const wasAtBottom = term.buffer.active.baseY - term.buffer.active.viewportY <= term.rows;
          term.write(event.data, () => {
            if (hadED3 && wasAtBottom) {
              term.scrollToBottom();
            }
          });
          // Sampled log (10%) for live output — increased from 2% for scroll debugging
          if (Math.random() < 0.1) {
            const rect = containerRef.current?.getBoundingClientRect();
            termLog('write', `id=${terminalId} bytes=${event.data.length} lines=${term.buffer.active.length} cols=${term.cols} rows=${term.rows} vY=${term.buffer.active.viewportY} bY=${term.buffer.active.baseY} containerW=${Math.round(rect?.width ?? 0)} containerH=${Math.round(rect?.height ?? 0)}`);
          }
        }
      }
    });

    // Fetch buffered output (captures anything from before subscription)
    window.api.terminal.getBuffer(terminalId).then((result: { success: boolean; data?: string }) => {
      if (disposed) return; // Component unmounted — discard
      termLog('bufReplay', `id=${terminalId} bufBytes=${result?.data?.length ?? 0} success=${result?.success}`);

      // Collect all data to write: buffer replay + pending live data
      const chunks: string[] = [];
      if (result?.success && result.data) {
        chunks.push(stripPromptEolMark(result.data));
      }
      for (const data of pendingLiveData) {
        if (disposed) break;
        chunks.push(data);
      }
      pendingLiveData.length = 0;

      // Helper: called after ALL writes are parsed by xterm (baseY is accurate)
      const onAllWritesParsed = (): void => {
        if (disposed) return;
        bufferedDataWritten = true;

        // Reveal terminal AFTER data is parsed (prevents flash of empty/top content)
        if (containerRef.current) {
          containerRef.current.style.opacity = '1';
        }
        {
          const rect = containerRef.current?.getBoundingClientRect();
          termLog('reveal', `id=${terminalId} lines=${term.buffer.active.length} cols=${term.cols} rows=${term.rows} containerW=${Math.round(rect?.width ?? 0)} containerH=${Math.round(rect?.height ?? 0)}`);
        }

        // Now baseY is the real value — scrollToBottom will work correctly
        requestAnimationFrame(() => {
          if (!disposed) {
            safeFit('bufferReplay');
            const beforeVY = term.buffer.active.viewportY;
            term.scrollToBottom();
            termLog('bufScrollBottom', `id=${terminalId} beforeVY=${beforeVY} afterVY=${term.buffer.active.viewportY} baseY=${term.buffer.active.baseY}`);
          }
        });
      };

      if (chunks.length === 0) {
        // No data to write — reveal immediately
        onAllWritesParsed();
      } else {
        // Write all chunks. Use callback on the LAST write to know when xterm
        // has finished parsing all data. term.write() is async in xterm.js v6 —
        // without the callback, scrollToBottom() runs before baseY is updated.
        let writesRemaining = chunks.length;
        for (const chunk of chunks) {
          if (disposed) break;
          term.write(chunk, () => {
            writesRemaining--;
            if (writesRemaining === 0) {
              onAllWritesParsed();
            }
          });
        }
      }

      // Self-verification: warn if terminal may still be blank
      // (checked synchronously — actual data arrives async via write callbacks)
      if (chunks.length === 0 && term.buffer.active.length <= 1) {
        console.warn(`[MUXVO:restore] WARNING: terminal ${terminalId} may still be blank after buffer replay`);
      }
    });

    // Resize observer -> fit terminal via safeFit (skips when container too small).
    // Called synchronously (no rAF) so fitAddon.fit() runs before paint —
    // eliminates 1-frame gap where container is resized but canvas hasn't been fitted yet.
    // ResizeObserver already batches observations per frame, so no extra debouncing needed.
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || disposed) return;
      const { width, height } = entry.contentRect;
      const buf = term.buffer.active;
      // Ring: always push (no IPC cost)
      ringPush(terminalId, 'resizeObs', `w=${Math.round(width)} h=${Math.round(height)} vY=${buf.viewportY} bY=${buf.baseY} suppress=${suppressResizeRef.current}`);
      // File log only when container dimensions actually changed (dedup)
      if (Math.abs(width - lastObsWidth) > 1 || Math.abs(height - lastObsHeight) > 1) {
        termLog('resizeObs', `id=${terminalId} ${Math.round(lastObsWidth)}x${Math.round(lastObsHeight)}->${Math.round(width)}x${Math.round(height)} vY=${buf.viewportY} bY=${buf.baseY}`);
        lastObsWidth = width;
        lastObsHeight = height;
      }
      if (RESIZE_DEBUG) {
        console.log(`[XTERM:resizeObs] id=${terminalId.slice(0, 5)} w=${Math.round(width)} h=${Math.round(height)} viewportY=${buf.viewportY} baseY=${buf.baseY}`);
      }
      safeFit('resizeObs');
      trackRenderer('resizeObs');
    });
    observer.observe(containerRef.current);

    // Notify Main process of terminal size changes (suppressed for compact/sidebar terminals).
    // Min-size gate: never send tiny dimensions to PTY — they cause irreversible
    // hard-wrapping when shell redraws prompt at e.g. 2 columns.
    term.onResize(({ cols, rows }) => {
      if (suppressResizeRef.current) {
        logResize(terminalId, cols, rows, 'BLOCKED(suppressResize)');
      } else if (cols < MIN_COLS_FOR_RESIZE || rows < MIN_ROWS_FOR_RESIZE) {
        logResize(terminalId, cols, rows, `BLOCKED(min:${MIN_COLS_FOR_RESIZE}x${MIN_ROWS_FOR_RESIZE})`);
      } else {
        logResize(terminalId, cols, rows, 'IPC_SENT');
        window.api.terminal.resize(terminalId, cols, rows);
        updateTerminalSizeCache(cols, rows);
      }
    });

    // Listen for UI theme changes to update xterm theme live
    const onThemeChange = (e: Event) => {
      const theme = (e as CustomEvent).detail?.theme;
      const terminalThemeName = theme === 'light' ? 'light' : 'dark';
      term.options.theme = resolveTerminalTheme(terminalThemeName);
    };
    window.addEventListener('muxvo:theme-change', onThemeChange);

    // Refit after global zoom changes (webFrame.setZoomFactor alters viewport dimensions)
    const onGlobalZoom = () => {
      ringPush(terminalId, 'globalZoom', `vY=${term.buffer.active.viewportY} bY=${term.buffer.active.baseY}`);
      requestAnimationFrame(() => { if (!disposed) safeFit('globalZoom'); });
    };
    window.addEventListener('muxvo:global-zoom', onGlobalZoom);

    // Listen for force-refit requests (e.g. after FileTempView overlay closes)
    const onRefit = () => {
      if (!disposed) {
        glyphLog('refit', `id=${terminalId.slice(0, 5)} cols=${term.cols} rows=${term.rows}`);
        const prevCols = term.cols;
        const prevRows = term.rows;
        safeFit('forceRefit');
        // If fit didn't change dimensions, force re-send to PTY (overlay close may
        // have left PTY out of sync). But respect suppressResize + MIN_COLS guards.
        if (term.cols === prevCols && term.rows === prevRows) {
          if (!suppressResizeRef.current && term.cols >= MIN_COLS_FOR_RESIZE && term.rows >= MIN_ROWS_FOR_RESIZE) {
            logResize(terminalId, term.cols, term.rows, 'FORCE_RESYNC');
            window.api.terminal.resize(terminalId, term.cols, term.rows);
          }
        }
        // If dimensions changed, safeFit → fitAddon.fit() → term.onResize fires
        // through the normal guarded path (suppressResize + MIN_COLS check)
      }
    };
    window.addEventListener('muxvo:terminal-refit', onRefit);

    // Sidebar activation: receive focus request from overlay
    const onTerminalFocusReq = (e: Event) => {
      const { detail } = e as CustomEvent;
      if (detail === terminalId && !disposed) {
        const rect = containerRef.current?.getBoundingClientRect();
        termLog('focus', `id=${terminalId} containerW=${Math.round(rect?.width ?? 0)} containerH=${Math.round(rect?.height ?? 0)} cols=${term.cols} rows=${term.rows}`);
        term.focus();
      }
    };
    window.addEventListener('muxvo:terminal-focus', onTerminalFocusReq);

    // Sidebar activation: receive scroll forwarding from overlay
    const onTerminalScrollReq = (e: Event) => {
      const { detail } = e as CustomEvent<{ id: string; deltaY: number }>;
      if (detail.id === terminalId && !disposed) {
        const lines = Math.round(detail.deltaY / 20);
        if (lines !== 0) term.scrollLines(lines);
      }
    };
    window.addEventListener('muxvo:terminal-scroll', onTerminalScrollReq);

    // Track clicks for scroll-jump diagnostics (ring only, no IPC)
    const containerEl = containerRef.current;
    const onContainerMouseDown = () => {
      const buf = term.buffer.active;
      ringPush(terminalId, 'mousedown', `vY=${buf.viewportY} bY=${buf.baseY}`);
    };
    containerEl.addEventListener('mousedown', onContainerMouseDown);

    // Track terminal container focus/blur (may correlate with scroll jumps)
    const onContainerFocus = () => {
      ringPush(terminalId, 'focus', `vY=${term.buffer.active.viewportY} bY=${term.buffer.active.baseY}`);
    };
    const onContainerBlur = () => {
      ringPush(terminalId, 'blur', `vY=${term.buffer.active.viewportY} bY=${term.buffer.active.baseY}`);
    };
    containerEl.addEventListener('focus', onContainerFocus, true);
    containerEl.addEventListener('blur', onContainerBlur, true);

    // Compositor flush scroll snapshots — record vY/bY/domScrollTop before and after flush
    const onFlushPre = () => {
      if (disposed) return;
      const { domST } = getDomScrollState();
      ringPush(terminalId, 'flush:pre', `vY=${term.buffer.active.viewportY} bY=${term.buffer.active.baseY} domST=${domST}`);
    };
    const onFlushPost = () => {
      if (disposed) return;
      const { domST } = getDomScrollState();
      ringPush(terminalId, 'flush:post', `vY=${term.buffer.active.viewportY} bY=${term.buffer.active.baseY} domST=${domST}`);
    };
    window.addEventListener('muxvo:compositor-flush-pre', onFlushPre);
    window.addEventListener('muxvo:compositor-flush-post', onFlushPost);

    // Pause cursor blink when window loses focus to reduce idle CPU usage.
    // WebGL renderer's rAF loop runs continuously when cursorBlink is true,
    // even when the window is behind other windows. Pausing the blink
    // eliminates the primary render trigger when user isn't looking at the app.
    const savedCursorBlink = term.options.cursorBlink;
    const onWindowBlur = () => {
      if (!disposed) {
        term.options.cursorBlink = false;
        glyphLog('cursor', `id=${terminalId.slice(0, 5)} BLINK_PAUSE reason=blur`);
      }
    };
    const onWindowFocus = () => {
      if (!disposed) {
        term.options.cursorBlink = savedCursorBlink ?? true;
        glyphLog('cursor', `id=${terminalId.slice(0, 5)} BLINK_RESUME reason=focus`);
      }
    };
    const onVisibilityChange = () => {
      if (disposed) return;
      if (document.hidden) {
        term.options.cursorBlink = false;
        glyphLog('cursor', `id=${terminalId.slice(0, 5)} BLINK_PAUSE reason=visibility`);
      } else {
        term.options.cursorBlink = savedCursorBlink ?? true;
        glyphLog('cursor', `id=${terminalId.slice(0, 5)} BLINK_RESUME reason=visibility`);
      }
    };
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      termLog('unmount', `id=${terminalId}`);
      disposed = true;
      clearTimeout(safetyTimer);
      clearInterval(scrollPollTimer);
      unsubOutput();
      observer.disconnect();
      containerEl?.removeEventListener('mousedown', onContainerMouseDown);
      containerEl?.removeEventListener('focus', onContainerFocus, true);
      containerEl?.removeEventListener('blur', onContainerBlur, true);
      window.removeEventListener('muxvo:compositor-flush-pre', onFlushPre);
      window.removeEventListener('muxvo:compositor-flush-post', onFlushPost);
      window.removeEventListener('muxvo:theme-change', onThemeChange);
      window.removeEventListener('muxvo:global-zoom', onGlobalZoom);
      window.removeEventListener('muxvo:terminal-refit', onRefit);
      window.removeEventListener('muxvo:terminal-focus', onTerminalFocusReq);
      window.removeEventListener('muxvo:terminal-scroll', onTerminalScrollReq);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      scrollDisposable.dispose();
      renderDisposable.dispose();
      writeDisposable.dispose();
      addonManager.disposeAll();
      term.dispose();
      ringRemove(terminalId);
    };
  }, [terminalId]);

  const handleFileDragOver = (e: React.DragEvent) => {
    if (hasFilePayload(e)) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleFileDragEnter = (e: React.DragEvent) => {
    if (hasFilePayload(e)) {
      e.preventDefault();
      e.stopPropagation();
      dragEnterCountRef.current++;
      setFileDropActive(true);
    }
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    if (hasFilePayload(e)) {
      dragEnterCountRef.current--;
      if (dragEnterCountRef.current <= 0) {
        dragEnterCountRef.current = 0;
        setFileDropActive(false);
      }
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    if (!hasFilePayload(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setFileDropActive(false);
    dragEnterCountRef.current = 0;

    const paths = extractFilePaths(e);
    if (paths.length > 0) {
      const escaped = shellEscapePaths(paths);
      window.api.terminal.write(terminalId, escaped);
    }
  };

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onDragOver={handleFileDragOver}
      onDragEnter={handleFileDragEnter}
      onDragLeave={handleFileDragLeave}
      onDrop={handleFileDrop}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {fileDropActive && (
        <div className="xterm-file-drop-overlay">
          Drop to insert path
        </div>
      )}
      {searchAddonRef.current && (
        <TerminalSearchBar
          searchAddon={searchAddonRef.current}
          visible={searchVisible}
          onClose={() => setSearchVisible(false)}
        />
      )}
    </div>
  );
}
