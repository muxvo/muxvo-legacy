/**
 * fixture-main — dev-only 视觉回归入口（探针 3，muxvo/tools/visual-diff 消费）。
 *
 * 职责：把固定 fixture（窗口契约 window.__loadFixture）灌进真实 TerminalGrid，
 * 用与生产完全相同的组件与样式渲染，供 golden 截图。不接任何后端。
 * 契约见 muxvo/tools/visual-diff/fixtures/_CONTRACT.md。
 */

import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from './i18n';
import { PanelProvider } from './contexts/PanelContext';
import { TerminalProvider } from './contexts/TerminalContext';
import { TerminalGrid } from './components/terminal/TerminalGrid';
import { WaitingInputNotification } from './components/terminal/WaitingInputNotification';
import './App.css';

interface FixtureData {
  id: string;
  theme: 'dark' | 'light';
  /** M2 多屏（muxvo 任务4）：缺省 'terminal-grid'；各批次复刻时在下方按屏挂载分支登记 */
  screen?: string;
  homePath: string;
  viewMode: 'Tiling' | 'Focused';
  focusedId: string | null;
  selectedId: string | null;
  activeSidebarId: string | null;
  maxReached: boolean;
  waitingNotification: { count: number } | null;
  terminals: Array<{ id: string; state: string; cwd: string; customName?: string }>;
}

const noop = () => {};

function FixtureApp(): JSX.Element | null {
  const [fx, setFx] = useState<FixtureData | null>(null);

  useEffect(() => {
    (window as any).__loadFixture = (data: FixtureData) => {
      (window as any).__fixtureReady = false;
      (window as any).__MUXVO_FIXTURE_DATA__ = data;
      document.documentElement.setAttribute('data-theme', data.theme);
      setFx(data);
      document.fonts.ready.then(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            (window as any).__fixtureReady = true;
          });
        });
      });
    };
    (window as any).__fixturePageUp = true;
  }, []);

  if (!fx) return null;

  // M2 多屏分发：未登记的屏报错 + 空渲染（截图必红，防静默空图假绿）。
  // 新屏挂载分支随 muxvo 各复刻批次在此登记（modal/overlay 屏经 PanelProvider dispatch 打开）。
  const screen = fx.screen ?? 'terminal-grid';
  if (screen !== 'terminal-grid') {
    console.error(`[fixture] 未登记的屏: ${screen}（fixture-main.tsx）`);
    return null;
  }

  return (
    <div className="app">
      <main className="app-content">
        <TerminalGrid
          key={fx.id}
          terminals={fx.terminals}
          viewMode={fx.viewMode}
          focusedId={fx.focusedId}
          selectedId={fx.selectedId}
          activeSidebarId={fx.activeSidebarId}
          maxReached={fx.maxReached}
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
      {fx.waitingNotification && (
        <WaitingInputNotification
          waitingCount={fx.waitingNotification.count}
          overlayActive
          onSwitchToTerminals={noop}
        />
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
