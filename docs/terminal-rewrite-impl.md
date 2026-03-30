# 终端组件重写 + List Mode 实施文档

> **目的**：本文档供独立 CC session 执行，包含完整上下文、代码快照、逐步实施指令。
>
> **执行前必读**：项目根目录 `CLAUDE.md`（项目约定）、本文档。

---

## 一、背景与目标

终端组件自 v0.1.0 以来引入了 scrollTracker/frozen 机制、CSS overlay 聚焦模式、focusTransition 动画等。这些改动导致 3 个严重 bug：

| Bug | 根因 | 影响 |
|-----|------|------|
| 滚动跳顶 | `focus-cell--hidden { width:1px; height:1px }` → ResizeObserver 触发 → frozen → 过期 viewportY | 切回平铺时所有终端滚回顶部 |
| 文字乱码 | 容器缩到 1x1px → fitAddon.fit() 算出 cols=2 → buffer rewrap → 字符重排 | 模式切换后终端内容乱码 |
| 模式切换闪烁 | JS setTimeout(400ms) vs CSS animation(350ms) 时间不匹配 → 50ms 间隙 | 进入/退出聚焦模式时闪一下 |

**目标**：
1. 保留全部 28 个用户功能和所有外部接口
2. 重写内部实现，消除 3 个 bug 的根因
3. 新增 List Mode（列表模式）

---

## 二、涉及文件清单

### 删除重写的文件（3 个，先删后从零写）

| 文件路径 | 原因 |
|----------|------|
| `src/renderer/components/terminal/XTermRenderer.tsx` | 284 行单 useEffect + frozen 机制，是 3 个 bug 的根因所在 |
| `src/renderer/components/terminal/TerminalGrid.tsx` | focusTransition 时间不匹配 + 5 分支渲染逻辑，需要加 List Mode |
| `src/renderer/components/terminal/TileEffects.css` | focus-cell--hidden 1x1px 是乱码/跳顶根因，动画时间硬编码 |

### 修改的外部文件（不删，只改接口相关部分）

| 文件路径 | 改动类型 |
|----------|----------|
| `src/renderer/App.tsx` | ViewMode 类型扩展 + listSelectedId + config 持久化 |
| `src/renderer/components/settings/SettingsModal.tsx` | 新增视图模式切换 |
| `src/renderer/i18n/locales/zh.ts` | 新增 i18n key |
| `src/renderer/i18n/locales/en.ts` | 新增 i18n key |

### 从零新建的文件

| 文件路径 | 用途 |
|----------|------|
| `src/renderer/components/terminal/constants.ts` | 共享时间常量 |
| `src/renderer/components/terminal/hooks/useTerminalFit.ts` | 统一 fit 管理 |
| `src/renderer/components/terminal/hooks/useBufferReplay.ts` | buffer 回放 |
| `src/renderer/components/terminal/hooks/useTerminalIO.ts` | 输入输出 + PTY resize |
| `src/renderer/components/terminal/hooks/useTerminalEvents.ts` | 事件监听（theme/zoom/refit） |
| `src/renderer/components/terminal/XTermRenderer.tsx` | 从零重写，用 hooks 组合 |
| `src/renderer/components/terminal/TerminalGrid.tsx` | 从零重写，含 List Mode 分支 |
| `src/renderer/components/terminal/TileEffects.css` | 从零重写，用 CSS variables |
| `src/renderer/components/terminal/TerminalListView.tsx` | List Mode 主组件 |
| `src/renderer/components/terminal/TerminalListView.css` | List Mode 样式 |

### 绝对不动的文件

TerminalTile.tsx、TerminalSidebar.tsx、CwdPicker.tsx、ResizeHandle.tsx、TerminalSearchBar.tsx、WaitingInputNotification.tsx、CloseConfirmDialog.tsx、所有辅助模块（grid-layout、drag-manager、grid-resize、terminal-addon-manager、shell-escape 等）。

---

## 三、步骤 0：接口边界梳理 + 删除旧代码

> **必须先做这一步，再写任何新代码。**

### 0.1 确认外部接口契约

在删除代码之前，先确认以下接口契约（这些是"不能变"的边界）：

#### App.tsx → TerminalGrid 的 Props

```typescript
interface TerminalGridProps {
  terminals: Array<{ id: string; state: string; cwd: string; customName?: string }>;
  viewMode?: 'Tiling' | 'Focused' | 'List';  // ← 扩展了 'List'
  focusedId?: string | null;
  selectedId?: string | null;
  listSelectedId?: string | null;              // ← 新增
  onDoubleClick?: (id: string) => void;
  onSidebarClick?: (id: string) => void;
  onClick?: (id: string) => void;
  onClose?: (id: string) => void;
  onReorder?: (newOrder: string[]) => void;
  onRename?: (id: string, name: string) => void;
  onAddTerminal?: () => void;
  maxReached?: boolean;
  onListSelect?: (id: string) => void;        // ← 新增
}
```

#### XTermRenderer Props（内部使用，但 TerminalTile 依赖）

```typescript
interface XTermRendererProps {
  terminalId: string;
  suppressResize?: boolean;
}
```

#### TerminalTile 对 TerminalGrid 的期望

TerminalTile 是不改的文件，它期望 TerminalGrid 把它包在 `<div>` 里并传入以下 props：
```
id, state, cwd, customName, onRename, selected, focused, compact,
staggerIndex, draggable, onDragStart/End/Over/Drop/Leave, dragState,
onDoubleClick, onClick, onClose
```

#### IPC 调用（XTermRenderer 使用）

```
window.api.terminal.write(terminalId, data)
window.api.terminal.resize(terminalId, cols, rows)
window.api.terminal.getBuffer(terminalId) → { success, data? }
window.api.terminal.onOutput(callback) → unsubscribe
window.api.app.getConfig() → { data: { terminal: {...} } }
```

#### 自定义事件（XTermRenderer 监听/发射）

```
监听: muxvo:theme-change, muxvo:global-zoom, muxvo:terminal-refit, muxvo:sidebar-refit
发射: muxvo:global-zoom-request
```

#### CSS class 契约（TerminalTile.tsx 中引用，不能改名）

```
tile, tile-enter, tile-selected, tile-focused, tile--waiting
tile-header, tile-status, tile-terminal, tile-name, tile-cwd 等
dragging, drag-over
```

#### TerminalGrid 被引用的 export

```typescript
// 被 App.tsx import:
export function TerminalGrid(props): JSX.Element

// 被 tests 或其他文件引用（检查后确认）:
export function computeTilePlacements(layout, count): Array<{gridRow, gridColumn}>
export function computeHandlePositions(ratios): number[]
```

### 0.2 确认依赖模块（不删，重写时直接 import）

```
// stores（TerminalGrid 使用）
import { calculateGridLayout } from '@/shared/utils/grid-layout';
import { createGridResizeManager } from '@/renderer/stores/grid-resize';
import { createDragManager } from '@/renderer/stores/drag-manager';

// XTermRenderer 使用
import { createAddonManager } from '../../utils/terminal-addon-manager';
import { resolveTerminalTheme } from '@/shared/constants/terminal-themes';
import { DEFAULT_TERMINAL_CONFIG } from '@/renderer/stores/terminal-config';
import { shellEscapePaths } from '../../utils/shell-escape';
import { stripPromptEolMark } from '@/shared/utils/strip-prompt-eol-mark';

// 共用
import { useI18n } from '@/renderer/i18n';
import { usePanelDispatch } from '@/renderer/contexts/PanelContext';
import { getTerminalProcessUI } from '@/renderer/stores/terminal-process-ui-map';
```

### 0.3 执行删除

确认完接口后，删除这 3 个文件：

```bash
rm src/renderer/components/terminal/XTermRenderer.tsx
rm src/renderer/components/terminal/TerminalGrid.tsx
rm src/renderer/components/terminal/TileEffects.css
```

此时 `npx tsc --noEmit` 会报大量错误（正常），因为 TerminalTile.tsx 和 App.tsx 依赖这些文件。接下来从零写回来。

---

## 四、分阶段实施

### 阶段 1：重写核心文件（让 app 能跑起来）

先写回被删的 3 个文件 + hooks，让 Tiling 和 Focused 模式正常工作。

#### 步骤 1.0：创建 hooks 目录

```bash
mkdir -p src/renderer/components/terminal/hooks
```

#### 步骤 1.1：创建 `constants.ts`

**路径**：`src/renderer/components/terminal/constants.ts`

```typescript
/** Shared timing constants for terminal animations.
 * CSS uses corresponding CSS custom properties (--focus-enter-duration etc.)
 * defined in TileEffects.css. Keep JS and CSS values in sync.
 */
export const FOCUS_ENTER_DURATION = 300;  // ms — focusFadeIn animation
export const FOCUS_EXIT_DURATION = 250;   // ms — focusFadeIn reverse
export const TILE_ENTER_DURATION = 600;   // ms — tileEnter animation
export const CONTENT_FADE_DURATION = 200; // ms — tile-terminal opacity transition
```

#### 步骤 1.2：创建 hooks 目录和文件

**路径**：`src/renderer/components/terminal/hooks/`

##### `useTerminalFit.ts` — 统一 fit 管理

核心思路：**只有一个 fit 入口**，所有 fit 需求（ResizeObserver、config 加载、zoom、refit 事件）都通过 `requestFit()` 走同一条路径，内部 rAF 防抖。

```typescript
import { useEffect, useRef, useCallback } from 'react';
import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';

/**
 * Fit terminal while preserving scroll position.
 * Saves distance-from-bottom before fit, restores after.
 */
function fitWithScrollPreservation(term: Terminal, fitAddon: FitAddon): void {
  const buf = term.buffer.active;
  const wasAtBottom = buf.viewportY >= buf.baseY;
  const offsetFromBottom = buf.baseY - buf.viewportY;

  fitAddon.fit();

  // Scroll restoration needs next frame — xterm processes rewrap after fit()
  requestAnimationFrame(() => {
    if (wasAtBottom) {
      term.scrollToBottom();
    } else if (offsetFromBottom > 0) {
      const newTarget = term.buffer.active.baseY - offsetFromBottom;
      term.scrollToLine(Math.max(0, newTarget));
    }
  });
}

interface UseTerminalFitOptions {
  term: Terminal | null;
  fitAddon: FitAddon | null;
  containerRef: React.RefObject<HTMLDivElement>;
  suppressResize: boolean;
  terminalId: string;
  disposed: React.MutableRefObject<boolean>;
}

/**
 * Unified fit management hook.
 * Returns requestFit() — call it from anywhere that needs a refit.
 * Internally debounces via rAF. Also sets up ResizeObserver and event listeners.
 */
export function useTerminalFit({
  term, fitAddon, containerRef, suppressResize, terminalId, disposed,
}: UseTerminalFitOptions): () => void {
  const fitRafRef = useRef<number | null>(null);

  const requestFit = useCallback((preserveScroll = true) => {
    if (!term || !fitAddon || disposed.current) return;
    if (fitRafRef.current !== null) cancelAnimationFrame(fitRafRef.current);
    fitRafRef.current = requestAnimationFrame(() => {
      fitRafRef.current = null;
      if (disposed.current) return;
      if (preserveScroll) {
        fitWithScrollPreservation(term, fitAddon);
      } else {
        fitAddon.fit();
      }
    });
  }, [term, fitAddon, disposed]);

  // ResizeObserver — coalesced via requestFit's rAF
  useEffect(() => {
    if (!term || !fitAddon || !containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || disposed.current) return;
      const { width, height } = entry.contentRect;
      // Skip tiny containers (layout transition — visibility:hidden keeps size,
      // so this should rarely fire, but guard against edge cases)
      if (width < 10 || height < 10) return;
      requestFit(true);
    });
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      if (fitRafRef.current !== null) cancelAnimationFrame(fitRafRef.current);
    };
  }, [term, fitAddon, containerRef, requestFit, disposed]);

  // PTY resize notification
  useEffect(() => {
    if (!term || suppressResize) return;
    const disposable = term.onResize(({ cols, rows }) => {
      window.api.terminal.resize(terminalId, cols, rows);
    });
    return () => disposable.dispose();
  }, [term, suppressResize, terminalId]);

  return requestFit;
}
```

##### `useBufferReplay.ts` — buffer 回放

```typescript
import { useEffect } from 'react';
import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import { stripPromptEolMark } from '@/shared/utils/strip-prompt-eol-mark';

interface UseBufferReplayOptions {
  term: Terminal | null;
  fitAddon: FitAddon | null;
  terminalId: string;
  disposed: React.MutableRefObject<boolean>;
}

/**
 * Queue/flush buffer replay pattern.
 * Subscribes to live output, fetches buffered data, replays, then switches to live.
 */
export function useBufferReplay({ term, fitAddon, terminalId, disposed }: UseBufferReplayOptions): void {
  useEffect(() => {
    if (!term || !fitAddon) return;
    let bufferedDataWritten = false;
    const pendingLiveData: string[] = [];

    // Subscribe to live output first
    const unsubOutput = window.api.terminal.onOutput((event) => {
      if (event.id === terminalId) {
        if (!bufferedDataWritten) {
          pendingLiveData.push(event.data);
        } else {
          term.write(event.data);
        }
      }
    });

    // Fetch and replay buffered output
    console.log(`[MUXVO:restore] XTermRenderer mounted for id=${terminalId}`);
    window.api.terminal.getBuffer(terminalId).then((result: { success: boolean; data?: string }) => {
      if (disposed.current) return;
      if (result?.success && result.data) {
        console.log(`[MUXVO:restore] buffer received for id=${terminalId} bytes=${result.data.length}`);
        term.write(stripPromptEolMark(result.data));
      }
      // Flush live data that arrived during round-trip
      for (const data of pendingLiveData) {
        if (disposed.current) break;
        term.write(data);
      }
      pendingLiveData.length = 0;
      bufferedDataWritten = true;

      // Refit + scroll to bottom after buffer replay
      requestAnimationFrame(() => {
        if (!disposed.current) {
          fitAddon.fit();
          term.scrollToBottom();
        }
      });

      // Self-verification
      const lines = term.buffer.active.length;
      console.log(`[MUXVO:restore] xterm lines after buffer replay: ${lines} for id=${terminalId}`);
      if (lines <= 1) {
        console.warn(`[MUXVO:restore] WARNING: terminal ${terminalId} may still be blank after buffer replay`);
      }
    });

    return () => { unsubOutput(); };
  }, [term, fitAddon, terminalId, disposed]);
}
```

##### `useTerminalIO.ts` — 输入/键盘

```typescript
import { useEffect } from 'react';
import type { Terminal } from '@xterm/xterm';

interface UseTerminalIOOptions {
  term: Terminal | null;
  terminalId: string;
  setSearchVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Terminal input → IPC, keyboard shortcuts (Cmd+F search, Cmd+/-/0 zoom).
 */
export function useTerminalIO({ term, terminalId, setSearchVisible }: UseTerminalIOOptions): void {
  useEffect(() => {
    if (!term) return;

    // Terminal input → send to Main process
    const dataDisposable = term.onData((data) => {
      window.api.terminal.write(terminalId, data);
    });

    // Keyboard shortcuts
    term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      const isMod = navigator.platform.includes('Mac') ? e.metaKey : e.ctrlKey;
      if (isMod && e.key === 'f' && e.type === 'keydown') {
        setSearchVisible((prev) => !prev);
        return false;
      }
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
      return true;
    });

    return () => { dataDisposable.dispose(); };
  }, [term, terminalId, setSearchVisible]);
}
```

##### `useTerminalEvents.ts` — 外部事件监听

```typescript
import { useEffect } from 'react';
import type { Terminal } from '@xterm/xterm';
import { resolveTerminalTheme } from '@/shared/constants/terminal-themes';
import { DEFAULT_TERMINAL_CONFIG } from '@/renderer/stores/terminal-config';

interface UseTerminalEventsOptions {
  term: Terminal | null;
  requestFit: () => void;
  suppressResize: boolean;
  terminalId: string;
  disposed: React.MutableRefObject<boolean>;
}

/**
 * Listens for theme changes, global zoom, force-refit, sidebar-refit events.
 * Also loads persisted config on mount.
 */
export function useTerminalEvents({
  term, requestFit, suppressResize, terminalId, disposed,
}: UseTerminalEventsOptions): void {
  // Load persisted config
  useEffect(() => {
    if (!term) return;
    window.api.app.getConfig().then((result) => {
      if (disposed.current) return;
      if (result?.data?.terminal) {
        const cfg = { ...DEFAULT_TERMINAL_CONFIG, ...result.data.terminal };
        term.options.theme = resolveTerminalTheme(cfg.themeName);
        term.options.fontSize = cfg.fontSize;
        term.options.fontFamily = cfg.fontFamily;
        term.options.cursorStyle = cfg.cursorStyle;
        term.options.cursorBlink = cfg.cursorBlink;
        requestFit();
      }
    }).catch(() => { /* use defaults */ });
  }, [term, requestFit, disposed]);

  // Theme change
  useEffect(() => {
    if (!term) return;
    const onThemeChange = (e: Event) => {
      const theme = (e as CustomEvent).detail?.theme;
      const terminalThemeName = theme === 'light' ? 'light' : 'dark';
      term.options.theme = resolveTerminalTheme(terminalThemeName);
    };
    window.addEventListener('muxvo:theme-change', onThemeChange);
    return () => window.removeEventListener('muxvo:theme-change', onThemeChange);
  }, [term]);

  // Global zoom → refit
  useEffect(() => {
    const onGlobalZoom = () => requestFit();
    window.addEventListener('muxvo:global-zoom', onGlobalZoom);
    return () => window.removeEventListener('muxvo:global-zoom', onGlobalZoom);
  }, [requestFit]);

  // Force refit (e.g. after FileTempView overlay closes)
  useEffect(() => {
    if (suppressResize) return;
    const onRefit = () => {
      if (!disposed.current && term) {
        requestFit();
        // Force re-send dimensions
        window.api.terminal.resize(terminalId, term.cols, term.rows);
      }
    };
    window.addEventListener('muxvo:terminal-refit', onRefit);
    return () => window.removeEventListener('muxvo:terminal-refit', onRefit);
  }, [term, requestFit, suppressResize, terminalId, disposed]);

  // Sidebar refit (compact terminals only)
  useEffect(() => {
    if (!suppressResize || !term) return;
    const onSidebarRefit = () => {
      if (!disposed.current) requestFit();
    };
    window.addEventListener('muxvo:sidebar-refit', onSidebarRefit);
    return () => window.removeEventListener('muxvo:sidebar-refit', onSidebarRefit);
  }, [term, requestFit, suppressResize, disposed]);
}
```

#### 步骤 1.3：从零写 `XTermRenderer.tsx`

旧文件已在步骤 0.3 删除。从零写一个新的，用 hooks 组合。

**与旧文件的区别**：
- 没有 `scrollTracker` / `frozen` / `fitPreservingScroll` / `syncScrollDataAttrs`
- 主 useEffect 只做：创建 Terminal、open、loadAddons、初始 fit、cleanup
- 所有其他逻辑由 hooks 负责
- 文件拖拽逻辑（`hasFilePayload`、`extractFilePaths`）重新写一遍（逻辑相同）

完整代码：

```typescript
import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import type { SearchAddon } from '@xterm/addon-search';
import type { FitAddon } from '@xterm/addon-fit';
import { createAddonManager } from '../../utils/terminal-addon-manager';
import { resolveTerminalTheme } from '@/shared/constants/terminal-themes';
import { DEFAULT_TERMINAL_CONFIG } from '@/renderer/stores/terminal-config';
import { TerminalSearchBar } from './TerminalSearchBar';
import { shellEscapePaths } from '../../utils/shell-escape';
import { useTerminalFit } from './hooks/useTerminalFit';
import { useBufferReplay } from './hooks/useBufferReplay';
import { useTerminalIO } from './hooks/useTerminalIO';
import { useTerminalEvents } from './hooks/useTerminalEvents';
import '@xterm/xterm/css/xterm.css';

// hasFilePayload, extractFilePaths — 保持不变（原文件 23-49 行）

export function XTermRenderer({ terminalId, suppressResize }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<Terminal | null>(null);
  const [fitAddon, setFitAddon] = useState<FitAddon | null>(null);
  const [searchAddon, setSearchAddon] = useState<SearchAddon | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [fileDropActive, setFileDropActive] = useState(false);
  const dragEnterCountRef = useRef(0);
  const disposedRef = useRef(false);

  // 1. Create terminal instance
  useEffect(() => {
    if (!containerRef.current) return;
    disposedRef.current = false;

    const t = new Terminal({
      cursorBlink: DEFAULT_TERMINAL_CONFIG.cursorBlink,
      cursorStyle: DEFAULT_TERMINAL_CONFIG.cursorStyle,
      fontSize: DEFAULT_TERMINAL_CONFIG.fontSize,
      fontFamily: DEFAULT_TERMINAL_CONFIG.fontFamily,
      theme: resolveTerminalTheme(DEFAULT_TERMINAL_CONFIG.themeName),
      allowProposedApi: true,
    });

    t.open(containerRef.current);
    const addonMgr = createAddonManager(t);
    addonMgr.loadAll();

    setTerm(t);
    setFitAddon(addonMgr.getFitAddon());
    setSearchAddon(addonMgr.getSearchAddon());

    // Initial fit — delay for container layout
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (disposedRef.current) return;
        addonMgr.getFitAddon().fit();
        if (t.cols <= 2) {
          setTimeout(() => {
            if (!disposedRef.current) addonMgr.getFitAddon().fit();
          }, 200);
        }
      });
    });

    return () => {
      disposedRef.current = true;
      setTerm(null);
      setFitAddon(null);
      setSearchAddon(null);
      addonMgr.disposeAll();
      t.dispose();
    };
  }, [terminalId]);

  // 2. Hooks — each manages one concern
  const requestFit = useTerminalFit({
    term, fitAddon, containerRef: containerRef as React.RefObject<HTMLDivElement>,
    suppressResize: suppressResize ?? false,
    terminalId, disposed: disposedRef,
  });

  useBufferReplay({ term, fitAddon, terminalId, disposed: disposedRef });
  useTerminalIO({ term, terminalId, setSearchVisible });
  useTerminalEvents({
    term, requestFit, suppressResize: suppressResize ?? false,
    terminalId, disposed: disposedRef,
  });

  // 3. File drag handlers — 保持不变（原文件 345-384 行）
  // ... handleFileDragOver, handleFileDragEnter, handleFileDragLeave, handleFileDrop ...

  // 4. JSX — 保持不变（原文件 386-408 行）
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
      {searchAddon && (
        <TerminalSearchBar
          searchAddon={searchAddon}
          visible={searchVisible}
          onClose={() => setSearchVisible(false)}
        />
      )}
    </div>
  );
}
```

**注意**：原代码用 `searchAddonRef.current` 条件渲染 TerminalSearchBar，新代码改用 `searchAddon` state。这确保 addon 加载完成后 SearchBar 才渲染。

#### 步骤 1.4：从零写 `TileEffects.css`

旧文件已在步骤 0.3 删除。从零写，包含：
- 所有 `.tile-*` 基础样式（这些 class 名是 TerminalTile.tsx 的契约，必须保留）
- **修正**的 `focus-cell--hidden`（用 visibility:hidden 替代 1x1px）
- CSS custom properties 统一动画时间
- 所有 keyframes 动画

**关键修正点**：

```css
/* 旧代码的 bug 根因——从零写时用这个替代 */
.focus-cell--hidden {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 25%;  /* 保持与 focus-cell--main 相同尺寸 */
  visibility: hidden;
  pointer-events: none;
  z-index: -1;
}
```

**CSS variables**（文件顶部）：

```css
:root {
  --focus-enter-duration: 300ms;
  --focus-exit-duration: 250ms;
  --tile-enter-duration: 600ms;
  --content-fade-duration: 200ms;
}
```

**完整文件内容太长，但必须包含旧文件中的所有 class**（因为 TerminalTile.tsx 不改，它引用了这些 class）：

`.tile` `.tile:hover` `.tile::after` `.tile-header` `.tile-status` `.tile-status--running` `.tile-status--idle` `.tile-status--waiting` `.tile-waiting-badge` `.tile--waiting` `.tile-cwd` `.tile-separator` `.tile-name-clickable` `.tile-custom-name` `.tile-custom-name--placeholder` `.tile-custom-name-input` `.tile-file-btn` `.tile-max-btn` `.tile-close-btn` `.tile-name` `.tile-terminal` `.tile-focused` `.tile-selected` `.tile-enter` `.tile.dragging` `.tile.drag-over` `.terminal-search-bar` `.terminal-grid__fab` `.focus-cell--main` `.focus-cell--main-full` `.focus-cell--hidden`（修正版）`.focus-cell--entering` `.focus-cell--exiting` `.focus-cell--restoring` `.xterm-file-drop-overlay`

这些 class 的样式可以从旧代码直接复制（视觉效果不变），只改 `focus-cell--hidden` 和动画时间用 CSS variables。

#### 步骤 1.5：修改 `TerminalGrid.tsx`

**改动 1**：import constants

```typescript
import { FOCUS_ENTER_DURATION, FOCUS_EXIT_DURATION } from './constants';
```

**改动 2**：focusTransition setTimeout 用常量（第 257、262 行）

```typescript
// 原: setTimeout(() => setFocusTransition('idle'), 400);
const timer = setTimeout(() => setFocusTransition('idle'), FOCUS_ENTER_DURATION + 50);

// 原: setTimeout(() => setFocusTransition('idle'), 350);
const timer = setTimeout(() => setFocusTransition('idle'), FOCUS_EXIT_DURATION + 50);
```

**改动 3**：Props 接口扩展 viewMode 类型（为阶段 2 准备）

```typescript
// 原:
viewMode?: 'Tiling' | 'Focused';

// 改为:
viewMode?: 'Tiling' | 'Focused' | 'List';
```

TerminalGrid 函数中增加 List 分支（阶段 2 再实现具体渲染）：

```typescript
// 在 return <TilingGrid .../> 之前
if (viewMode === 'List') {
  // 阶段 2 实现 — 暂时 fallback 到 tiling
  return <TilingGrid ... />;
}
```

#### 步骤 1.6：验证

```bash
# 1. 类型检查
npx tsc --noEmit

# 2. 运行测试
npm test

# 3. 启动 app 手动验证
nohup npx electron-vite dev > /dev/null 2>&1 & disown
```

**手动验证清单**（阶段 1 共 16 项）：

1. 启动 app → 终端正常渲染，无闪烁
2. 输入命令 → 输出正常，无乱码
3. 双击 tile → 聚焦模式，动画平滑，无闪烁
4. Esc 退出 → 恢复平铺，无闪烁，无乱码
5. 聚焦模式下 sidebar 点击 → 切换焦点，滚动位置保持
6. 切回平铺 → 所有终端滚动位置正确（不跳顶）
7. 非焦点终端有持续输出时切换模式 → 无跳顶
8. 什么都不做等 30 秒 → 滚动位置不变
9. 窗口 resize → 内容正常 refit，无乱码
10. Cmd+/-/0 缩放 → 所有终端同步 refit
11. 拖拽文件到终端 → 路径正确插入
12. Cmd+F → 搜索栏正常
13. 拖拽重排序 → 正常
14. resize handle → 正常
15. CwdPicker → 正常
16. WaitingInput → 红色脉动 + 通知正常

---

### 阶段 2：List Mode（改动 6）

**前置条件**：阶段 1 验证全部通过。

#### 步骤 2.1：App.tsx 变更

**改动 1**：ViewMode 类型扩展

```typescript
// 原:
const [viewMode, setViewMode] = useState<'Tiling' | 'Focused'>('Tiling');

// 改为:
const [viewMode, setViewMode] = useState<'Tiling' | 'Focused' | 'List'>('Tiling');
```

同时修改 AppContent 的 props 类型：

```typescript
viewMode: 'Tiling' | 'Focused' | 'List';
```

**改动 2**：新增 listSelectedId 状态

```typescript
const [listSelectedId, setListSelectedId] = useState<string | null>(null);
```

**改动 3**：启动时读取 config 决定初始 viewMode

在已有的 `window.api.app.getConfig()` useEffect 中添加：

```typescript
// 在 theme 加载之后
if (result?.data?.terminal?.defaultViewMode === 'List') {
  setViewMode('List');
}
```

**改动 4**：listSelectedId 自动选中逻辑

```typescript
// 当前选中终端被关闭时，自动选下一个
useEffect(() => {
  if (viewMode === 'List' && listSelectedId && !terminals.find(t => t.id === listSelectedId)) {
    // 选下一个可用终端
    const remaining = terminals.filter(t => t.id !== listSelectedId);
    setListSelectedId(remaining.length > 0 ? remaining[0].id : null);
  }
}, [terminals, listSelectedId, viewMode]);

// 首次进入 List Mode 时，选中第一个
useEffect(() => {
  if (viewMode === 'List' && !listSelectedId && terminals.length > 0) {
    setListSelectedId(terminals[0].id);
  }
}, [viewMode, listSelectedId, terminals]);
```

**改动 5**：新增 handleListSelect 和 handleViewModeChange 回调

```typescript
const handleListSelect = useCallback((id: string) => {
  setListSelectedId(id);
}, []);

const handleViewModeChange = useCallback((mode: 'Tiling' | 'List') => {
  setViewMode(mode);
  // 进入 List Mode 时重置 focused 状态
  if (mode === 'List') {
    setFocusedId(null);
  }
  // 持久化到 config
  window.api.app.getConfig().then((result: any) => {
    const terminal = { ...result?.data?.terminal, defaultViewMode: mode };
    window.api.app.saveConfig({ ...result?.data, terminal });
  }).catch(() => {});
}, []);
```

**改动 6**：新建终端时在 List Mode 下自动选中

在 `addTerminal` callback 中添加：

```typescript
if (viewMode === 'List') {
  setListSelectedId(result.data.id);
}
```

（在已有的 `setSelectedId(result.data.id)` 后面）

**改动 7**：传递新 props 到 TerminalGrid 和 SettingsModal

```typescript
// TerminalGrid
<TerminalGrid
  ...
  listSelectedId={listSelectedId}
  onListSelect={handleListSelect}
/>

// SettingsModal
<SettingsModal
  uiTheme={uiTheme}
  onToggleTheme={onToggleTheme}
  viewMode={viewMode}
  onViewModeChange={handleViewModeChange}
/>
```

**改动 8**：Esc 处理增加 List Mode 判断

```typescript
// 原:
if (e.key === 'Escape' && viewMode === 'Focused') {

// 改为:（List Mode 下 Esc 不退出）
if (e.key === 'Escape' && viewMode === 'Focused') {
```

（无需改动，List Mode 不匹配 'Focused' 自然跳过）

#### 步骤 2.2：新建 `TerminalListView.tsx`

**路径**：`src/renderer/components/terminal/TerminalListView.tsx`

```typescript
import { useState, useCallback } from 'react';
import { useI18n } from '@/renderer/i18n';
import { XTermRenderer } from './XTermRenderer';
import { getTerminalProcessUI } from '@/renderer/stores/terminal-process-ui-map';
import './TerminalListView.css';

interface TerminalInfo {
  id: string;
  state: string;
  cwd: string;
  customName?: string;
}

interface TerminalListViewProps {
  terminals: TerminalInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  onAddTerminal?: () => void;
  maxReached?: boolean;
}

export function TerminalListView({
  terminals, selectedId, onSelect, onClose, onRename, onAddTerminal, maxReached,
}: TerminalListViewProps): JSX.Element {
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // 获取终端显示名称
  const getDisplayName = (term: TerminalInfo): string => {
    if (term.customName) return term.customName;
    // 默认：CWD 最后一级目录名
    const parts = term.cwd.replace(/\/+$/, '').split('/');
    return parts[parts.length - 1] || term.cwd;
  };

  // 缩短 CWD 路径
  const shortenCwd = (path: string): string => {
    const home = window.api.app.getHomePath();
    if (home && home !== '/' && path.startsWith(home)) {
      return '~' + path.slice(home.length);
    }
    return path;
  };

  const handleNameDoubleClick = (e: React.MouseEvent, term: TerminalInfo) => {
    e.stopPropagation();
    setEditingId(term.id);
    setEditValue(term.customName || getDisplayName(term));
  };

  const handleNameKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onRename?.(id, editValue.trim());
      setEditingId(null);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingId(null);
    }
  };

  const handleNameBlur = (id: string) => {
    onRename?.(id, editValue.trim());
    setEditingId(null);
  };

  if (terminals.length === 0) {
    return (
      <div className="terminal-list-view">
        <div className="terminal-list-view__empty">
          {t('terminal.noTerminals')}
          {onAddTerminal && (
            <button
              className="terminal-grid__fab"
              onClick={onAddTerminal}
              disabled={maxReached}
              style={{ position: 'static', marginTop: '16px' }}
            >+</button>
          )}
        </div>
      </div>
    );
  }

  const selectedTerminal = terminals.find(t => t.id === selectedId);

  return (
    <div className="terminal-list-view">
      {/* 左侧列表面板 */}
      <div className="terminal-list-panel">
        <div className="terminal-list-panel__items">
          {terminals.map((term) => {
            const isSelected = term.id === selectedId;
            const isWaiting = term.state === 'WaitingInput';
            const statusClass =
              isWaiting ? 'tile-status--waiting' :
              term.state === 'Running' ? 'tile-status--running' :
              'tile-status--idle';

            return (
              <div
                key={term.id}
                className={[
                  'terminal-list-item',
                  isSelected ? 'terminal-list-item--selected' : '',
                  isWaiting ? 'terminal-list-item--waiting' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => onSelect(term.id)}
              >
                <span className={`tile-status ${statusClass}`} />
                <div className="terminal-list-item__info">
                  {editingId === term.id ? (
                    <input
                      className="terminal-list-item__name-input"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => handleNameKeyDown(e, term.id)}
                      onBlur={() => handleNameBlur(term.id)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className="terminal-list-item__name"
                      onDoubleClick={(e) => handleNameDoubleClick(e, term)}
                    >
                      {getDisplayName(term)}
                    </span>
                  )}
                  <span className="terminal-list-item__cwd">{shortenCwd(term.cwd)}</span>
                </div>
                {onClose && (
                  <button
                    className="terminal-list-item__close"
                    onClick={(e) => { e.stopPropagation(); onClose(term.id); }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 底部添加按钮 */}
        {onAddTerminal && (
          <button
            className="terminal-list-panel__add"
            onClick={onAddTerminal}
            disabled={maxReached}
          >
            + {t('menu.newTerminal')}
          </button>
        )}
      </div>

      {/* 右侧终端区域 */}
      <div className="terminal-list-main">
        {selectedTerminal && (
          <div className="terminal-list-main__header">
            <span className={`tile-status ${
              selectedTerminal.state === 'WaitingInput' ? 'tile-status--waiting' :
              selectedTerminal.state === 'Running' ? 'tile-status--running' :
              'tile-status--idle'
            }`} />
            <span className="terminal-list-main__name">
              {getDisplayName(selectedTerminal)}
            </span>
            <span className="terminal-list-main__cwd">
              {shortenCwd(selectedTerminal.cwd)}
            </span>
          </div>
        )}

        {/* 所有终端保持挂载，非选中的用 visibility:hidden 隐藏 */}
        <div className="terminal-list-main__terminals">
          {terminals.map((term) => (
            <div
              key={term.id}
              className="terminal-list-main__terminal-wrapper"
              style={{
                visibility: term.id === selectedId ? 'visible' : 'hidden',
                position: term.id === selectedId ? 'relative' : 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
              }}
            >
              <XTermRenderer terminalId={term.id} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### 步骤 2.3：新建 `TerminalListView.css`

**路径**：`src/renderer/components/terminal/TerminalListView.css`

```css
/* === List Mode Layout === */
.terminal-list-view {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;
}

.terminal-list-view__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--text-secondary);
  font-size: 13px;
}

/* === Left Panel (List) === */
.terminal-list-panel {
  width: 220px;
  min-width: 220px;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  background: var(--bg-primary);
}

.terminal-list-panel__items {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.terminal-list-panel__add {
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-top: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 12px;
  font-family: var(--font-sans);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.terminal-list-panel__add:hover {
  background: var(--bg-hover);
  color: var(--accent);
}

.terminal-list-panel__add:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* === List Item === */
.terminal-list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  height: 48px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
  border-left: 3px solid transparent;
}

.terminal-list-item:hover {
  background: var(--bg-hover);
}

.terminal-list-item--selected {
  background: rgba(232, 167, 72, 0.08);
  border-left-color: var(--accent);
}

.terminal-list-item--waiting {
  animation: listItemWaiting 2.5s ease-in-out infinite;
}

@keyframes listItemWaiting {
  0%, 100% { background: rgba(239, 68, 68, 0.05); }
  50% { background: rgba(239, 68, 68, 0.12); }
}

.terminal-list-item--selected.terminal-list-item--waiting {
  border-left-color: #ef4444;
}

.terminal-list-item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.terminal-list-item__name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.terminal-list-item__name-input {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--accent);
  outline: none;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  width: 100%;
  padding: 0;
  caret-color: var(--accent);
}

.terminal-list-item__cwd {
  font-size: 10px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.terminal-list-item__close {
  display: none;
  padding: 2px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 3px;
  flex-shrink: 0;
}

.terminal-list-item:hover .terminal-list-item__close {
  display: flex;
}

.terminal-list-item__close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

/* === Right Panel (Terminal) === */
.terminal-list-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.terminal-list-main__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.terminal-list-main__name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.terminal-list-main__cwd {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

.terminal-list-main__terminals {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.terminal-list-main__terminal-wrapper {
  width: 100%;
  height: 100%;
}

/* === Light theme overrides === */
[data-theme="light"] .terminal-list-item--selected {
  background: rgba(196, 132, 42, 0.08);
}

[data-theme="light"] .terminal-list-item--waiting {
  animation: listItemWaitingLight 2.5s ease-in-out infinite;
}

@keyframes listItemWaitingLight {
  0%, 100% { background: rgba(239, 68, 68, 0.04); }
  50% { background: rgba(239, 68, 68, 0.1); }
}
```

#### 步骤 2.4：修改 `TerminalGrid.tsx`

**改动 1**：扩展 Props 接口

```typescript
interface Props {
  terminals: TerminalInfo[];
  viewMode?: 'Tiling' | 'Focused' | 'List';
  focusedId?: string | null;
  selectedId?: string | null;
  listSelectedId?: string | null;         // 新增
  onDoubleClick?: (id: string) => void;
  onSidebarClick?: (id: string) => void;
  onClick?: (id: string) => void;
  onClose?: (id: string) => void;
  onReorder?: (newOrder: string[]) => void;
  onRename?: (id: string, name: string) => void;
  onAddTerminal?: () => void;
  maxReached?: boolean;
  onListSelect?: (id: string) => void;    // 新增
}
```

**改动 2**：TerminalGrid 函数新增 List 分支

```typescript
import { TerminalListView } from './TerminalListView';

export function TerminalGrid({ terminals, viewMode = 'Tiling', ..., listSelectedId, onListSelect }: Props): JSX.Element {
  // ... 空状态不变

  if (viewMode === 'List') {
    return (
      <TerminalListView
        terminals={terminals}
        selectedId={listSelectedId ?? null}
        onSelect={onListSelect ?? (() => {})}
        onClose={onClose}
        onRename={onRename}
        onAddTerminal={onAddTerminal}
        maxReached={maxReached}
      />
    );
  }

  // 原有 TilingGrid 逻辑不变
  return <TilingGrid ... />;
}
```

#### 步骤 2.5：修改 `SettingsModal.tsx`

**改动 1**：扩展 Props

```typescript
interface SettingsModalProps {
  uiTheme: 'dark' | 'light';
  onToggleTheme: () => void;
  viewMode?: 'Tiling' | 'Focused' | 'List';
  onViewModeChange?: (mode: 'Tiling' | 'List') => void;
}
```

**改动 2**：在"通用"section 中添加视图模式切换

在 `startupTerminals` row 之后添加：

```tsx
{/* View Mode */}
<div className="settings-modal__row">
  <div>
    <div className="settings-modal__label">{t('settings.viewMode')}</div>
    <div className="settings-modal__desc">{t('settings.viewModeDesc')}</div>
  </div>
  <div className="settings-modal__toggle-group">
    <button
      className={`settings-modal__toggle-btn${(viewMode ?? 'Tiling') !== 'List' ? ' settings-modal__toggle-btn--active' : ''}`}
      onClick={() => onViewModeChange?.('Tiling')}
    >
      {t('settings.viewModeTiling')}
    </button>
    <button
      className={`settings-modal__toggle-btn${viewMode === 'List' ? ' settings-modal__toggle-btn--active' : ''}`}
      onClick={() => onViewModeChange?.('List')}
    >
      {t('settings.viewModeList')}
    </button>
  </div>
</div>
```

#### 步骤 2.6：添加 i18n key

**zh.ts** 添加：

```typescript
'settings.viewMode': '默认视图模式',
'settings.viewModeDesc': '终端面板的默认显示方式',
'settings.viewModeTiling': '平铺',
'settings.viewModeList': '列表',
```

**en.ts** 添加：

```typescript
'settings.viewMode': 'Default View Mode',
'settings.viewModeDesc': 'Default display mode for terminal panel',
'settings.viewModeTiling': 'Tiling',
'settings.viewModeList': 'List',
```

#### 步骤 2.7：验证

```bash
npx tsc --noEmit
npm test
nohup npx electron-vite dev > /dev/null 2>&1 & disown
```

**手动验证清单**（List Mode 共 12 项）：

17. Settings 切换到列表模式 → 界面切换，左侧列表 + 右侧终端
18. 点击列表项 → 右侧切换终端，滚动位置保持
19. 列表中 WaitingInput 终端 → 红色高亮 + 脉动
20. 列表项 hover → 显示关闭按钮
21. 关闭终端（无进程）→ 列表移除，自动选中下一个
22. 关闭终端（有进程）→ 弹确认框
23. 所有终端关闭 → 显示空状态
24. "+" 按钮 → 新建终端，自动选中
25. 双击名称编辑 → 列表和右侧 header 同步更新
26. 名称持久化 → 关闭终端后新建同 CWD 终端，名称自动恢复
27. Settings 切回平铺模式 → 界面恢复，所有终端正常
28. 重启 app → 读取上次保存的 viewMode，正确显示

---

## 四、注意事项

### 不能改的东西

- **TerminalTile.tsx** — 不改任何逻辑
- **TerminalSidebar.tsx** — 不改
- **所有 IPC 调用签名** — `window.api.terminal.*` 不变
- **所有自定义事件名** — `muxvo:*` 不变
- **所有 CSS class 名** — `.tile`、`.tile-enter`、`.tile-selected` 等不变

### 容易踩的坑

1. **XTermRenderer 实例管理**：List Mode 下非选中终端用 `visibility:hidden` 隐藏，不能 unmount。否则切换时丢失 buffer 和滚动位置。
2. **suppressResize**：List Mode 右侧终端不需要 suppressResize（都是全屏显示），只有聚焦模式的 sidebar compact 终端需要。
3. **focusedId vs listSelectedId**：两个独立状态。进入 List Mode 时 focusedId 设为 null，进入 Focused 模式时 listSelectedId 不变。
4. **Config 持久化**：`terminal.defaultViewMode` 只存 `'Tiling'` 或 `'List'`，不存 `'Focused'`（Focused 通过双击进入，不是默认模式）。
5. **hooks 的 deps 数组**：useTerminalFit 等 hooks 引用 `term` 和 `fitAddon` 作为 state，当 `terminalId` 变化时会重新创建 Terminal 实例，hooks 自动跟随。
