/**
 * fixture-main — dev-only 视觉回归入口（探针 3，muxvo/tools/visual-diff 消费）。
 *
 * 职责：把固定 fixture（窗口契约 window.__loadFixture）灌进真实 TerminalGrid，
 * 用与生产完全相同的组件与样式渲染，供 golden 截图。不接任何后端。
 * 契约见 muxvo/tools/visual-diff/fixtures/_CONTRACT.md。
 *
 * M2 B1（popover 屏）：terminal-search-bar / cwd-picker / worktree-popover 三屏在
 * terminal-grid 底图（fx.base）之上打开浮层 —— cwd/worktree 走生产入口 JS click
 * （f7 editing 先例）；搜索条因 fixture 模式下 XTermRenderer 整体替换为
 * FixtureTermContent（XTermRenderer.tsx:88）不在 DOM，故 fixture-only 受控挂载真组件。
 */

import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import type { SearchAddon } from '@xterm/addon-search';
import { I18nProvider } from './i18n';
import { PanelProvider } from './contexts/PanelContext';
import { TerminalProvider } from './contexts/TerminalContext';
import { TerminalGrid } from './components/terminal/TerminalGrid';
import { TerminalSearchBar } from './components/terminal/TerminalSearchBar';
import { WaitingInputNotification } from './components/terminal/WaitingInputNotification';
import './App.css';

interface FixtureTerminal {
  id: string;
  state: string;
  cwd: string;
  customName?: string;
}

interface FixtureBase {
  homePath: string;
  viewMode: 'Tiling' | 'Focused';
  focusedId: string | null;
  selectedId: string | null;
  activeSidebarId: string | null;
  maxReached: boolean;
  waitingNotification: { count: number } | null;
  terminals: FixtureTerminal[];
}

interface FixtureData extends Partial<FixtureBase> {
  id: string;
  theme: 'dark' | 'light';
  /** M2 多屏（muxvo 任务4）：缺省 'terminal-grid'；各批次复刻时在下方按屏挂载分支登记 */
  screen?: string;
  /** 复合屏底图（多屏信封，_CONTRACT.md） */
  base?: FixtureBase;
  /** terminal-search-bar 屏 payload */
  searchBar?: { terminalId: string };
  /** cwd-picker 屏 payload */
  cwdPicker?: { terminalId: string };
  /** worktree-popover 屏 payload（warning/worktrees 由 fixture.html 的 window.api 替身消费） */
  worktree?: { terminalId: string };
}

const noop = () => {};

/** popover 屏：__fixtureReady 在浮层就位后才置位（截不到浮层 = capture 超时红，防假绿） */
const POPOVER_READY_SELECTOR: Record<string, string> = {
  'terminal-search-bar': '.terminal-search-bar',
  'cwd-picker': '.cwd-picker',
  'worktree-popover': '.worktree-popover__list',
};

/** 与生产同构打开浮层：fonts.ready 后轮询入口元素（worktree 按钮异步出现）并 JS click */
function FixturePopoverOpener({
  entrySelector,
  tileIndex,
}: {
  entrySelector: string;
  tileIndex: number;
}): null {
  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      const tryClick = () => {
        if (cancelled) return;
        const tile = document.querySelectorAll('.tile')[tileIndex];
        const el = tile?.querySelector(entrySelector) as HTMLElement | null;
        if (el) el.click();
        else requestAnimationFrame(tryClick);
      };
      tryClick();
    });
    return () => {
      cancelled = true;
    };
  }, [entrySelector, tileIndex]);
  return null;
}

/**
 * fixture-only 受控挂载搜索条：量取目标 tile 的 .tile-terminal rect，body 下挂同矩形
 * fixed 包裹层 + 内衬 relative 满幅层 —— 与生产挂载点（XTermRenderer 满幅 relative 包裹层，
 * XTermRenderer.tsx:748）几何等价。searchAddon 注 noop 替身（搜索执行不属视觉）。
 */
const stubSearchAddon = {
  findNext: noop,
  findPrevious: noop,
  clearDecorations: noop,
} as unknown as SearchAddon;

function FixtureSearchBar({ tileIndex }: { tileIndex: number }): JSX.Element | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      const measure = () => {
        if (cancelled) return;
        const el = document.querySelectorAll('.tile')[tileIndex]?.querySelector('.tile-terminal');
        if (el) setRect(el.getBoundingClientRect());
        else requestAnimationFrame(measure);
      };
      requestAnimationFrame(measure);
    });
    return () => {
      cancelled = true;
    };
  }, [tileIndex]);

  if (!rect) return null;
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        pointerEvents: 'none',
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <TerminalSearchBar searchAddon={stubSearchAddon} visible onClose={noop} />
      </div>
    </div>,
    document.body,
  );
}

function FixtureApp(): JSX.Element | null {
  const [fx, setFx] = useState<FixtureData | null>(null);

  useEffect(() => {
    (window as any).__loadFixture = (data: FixtureData) => {
      (window as any).__fixtureReady = false;
      // 复合屏：base 摊平到顶层，FixtureTermContent / window.api 替身统一读 terminals/homePath
      (window as any).__MUXVO_FIXTURE_DATA__ = data.base ? { ...data, ...data.base } : data;
      document.documentElement.setAttribute('data-theme', data.theme);
      setFx(data);
      const readySelector = POPOVER_READY_SELECTOR[data.screen ?? ''];
      document.fonts.ready.then(() => {
        const arm = () => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              (window as any).__fixtureReady = true;
            });
          });
        };
        if (!readySelector) {
          arm();
          return;
        }
        const poll = () => {
          if (document.querySelector(readySelector)) arm();
          else requestAnimationFrame(poll);
        };
        poll();
      });
    };
    (window as any).__fixturePageUp = true;
  }, []);

  if (!fx) return null;

  // M2 多屏分发：未登记的屏报错 + 空渲染（截图必红，防静默空图假绿）。
  // 新屏挂载分支随 muxvo 各复刻批次在此登记（modal/overlay 屏经 PanelProvider dispatch 打开）。
  const screen = fx.screen ?? 'terminal-grid';
  const isPopoverScreen = screen in POPOVER_READY_SELECTOR;
  if (screen !== 'terminal-grid' && !isPopoverScreen) {
    console.error(`[fixture] 未登记的屏: ${screen}（fixture-main.tsx）`);
    return null;
  }

  // terminal-grid：顶层字段即底图；popover 屏：底图在 fx.base
  const base = (isPopoverScreen ? fx.base : fx) as FixtureBase | undefined;
  if (!base || !base.terminals) {
    console.error(`[fixture] ${fx.id}: 缺底图数据（base.terminals）`);
    return null;
  }

  const popoverTargetId =
    fx.searchBar?.terminalId ?? fx.cwdPicker?.terminalId ?? fx.worktree?.terminalId;
  const tileIndex = popoverTargetId
    ? base.terminals.findIndex((t) => t.id === popoverTargetId)
    : -1;

  return (
    <div className="app">
      <main className="app-content">
        <TerminalGrid
          key={fx.id}
          terminals={base.terminals}
          viewMode={base.viewMode}
          focusedId={base.focusedId}
          selectedId={base.selectedId}
          activeSidebarId={base.activeSidebarId}
          maxReached={base.maxReached}
          onAddTerminal={noop}
          onClose={noop}
          onRename={noop}
          onReorder={noop}
          onDoubleClick={noop}
          onFocusTerminal={noop}
          onSidebarClick={noop}
          onSidebarActivate={noop}
          onSidebarDeactivate={noop}
          onClick={noop}
          onBackToTiling={noop}
        />
      </main>
      {base.waitingNotification && (
        <WaitingInputNotification
          waitingCount={base.waitingNotification.count}
          overlayActive
          onSwitchToTerminals={noop}
        />
      )}
      {screen === 'terminal-search-bar' && tileIndex >= 0 && (
        <FixtureSearchBar key={fx.id} tileIndex={tileIndex} />
      )}
      {screen === 'cwd-picker' && tileIndex >= 0 && (
        <FixturePopoverOpener key={fx.id} entrySelector=".tile-cwd" tileIndex={tileIndex} />
      )}
      {screen === 'worktree-popover' && tileIndex >= 0 && (
        <FixturePopoverOpener key={fx.id} entrySelector=".tile-worktree-btn" tileIndex={tileIndex} />
      )}
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  // 不用 StrictMode：避免双渲染干扰 fixture 状态置位时序
  createRoot(root).render(
    <I18nProvider initialLocale="zh">
      <TerminalProvider>
        <PanelProvider>
          <FixtureApp />
        </PanelProvider>
      </TerminalProvider>
    </I18nProvider>,
  );
}
