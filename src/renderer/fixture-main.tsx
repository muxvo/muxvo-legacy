/**
 * fixture-main — dev-only 视觉回归入口（探针 3，muxvo/tools/visual-diff 消费）。
 *
 * 职责：把固定 fixture（窗口契约 window.__loadFixture）灌进真实组件，
 * 用与生产完全相同的组件与样式渲染，供 golden 截图。不接任何后端。
 * 契约见 muxvo/tools/visual-diff/fixtures/_CONTRACT.md。
 *
 * M2 B1（popover 屏）：terminal-search-bar / cwd-picker / worktree-popover 三屏在
 * terminal-grid 底图（fx.base）之上打开浮层 —— cwd/worktree 走生产入口 JS click
 * （f7 editing 先例）；搜索条因 fixture 模式下 XTermRenderer 整体替换为
 * FixtureTermContent（XTermRenderer.tsx:88）不在 DOM，故 fixture-only 受控挂载真组件。
 *
 * M2 B2（modal 簇五屏）：与生产同构——真实 Provider 树内由 host dispatch 打开动作
 * （PanelContext OPEN_* / AuthContext OPEN_LOGIN_MODAL），组件内部 state（login mode、
 * ws 行内编辑、whats-new 展开）经 FixtureDriver 走生产交互路径（JS click）抵达；
 * close-confirm 纯 props 直挂。providers 随 fixture 以 key 重挂，保证逐场景状态零残留
 * （locale/panel state 不跨 fixture 泄漏）。
 *
 * M2 B3（menu-bar/user-dropdown + 四配置面板）：
 * - menu-bar 屏非 overlay——与生产同构顶层渲染 .app > MenuBar + app-content(TerminalGrid 底图)，
 *   AuthProvider 包裹（AuthButton 触达 useAuth；登录态由 fixture.html auth.getStatus 替身给定）；
 *   user-dropdown 屏 = menu-bar + FixtureDriver 点 trigger 打开（生产入口）。
 * - 面板屏挂在生产 overlay 容器（App.tsx:281-306 同款 .{skills,mcp,hooks,plugins}-panel-overlay），
 *   数据走 fixture.html 的 config/fs 替身；选中/表单态经 FixtureDriver 走生产 click 路径。
 * - FilePanel.css 显式 import：生产 App 恒引入（FilePanel 组件），fixture 页不挂 FilePanel，
 *   但 SkillFileTree 的 .file-item 共享其样式，不引则与生产渲染不一致（dev-only，零生产改动）。
 */

import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import type { SearchAddon } from '@xterm/addon-search';
import { I18nProvider, type Locale } from './i18n';
import { PanelProvider, usePanelContext } from './contexts/PanelContext';
import { TerminalProvider } from './contexts/TerminalContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TerminalGrid } from './components/terminal/TerminalGrid';
import { TerminalSearchBar } from './components/terminal/TerminalSearchBar';
import { WaitingInputNotification } from './components/terminal/WaitingInputNotification';
import { CloseConfirmDialog } from './components/terminal/CloseConfirmDialog';
import { SettingsModal } from './components/settings/SettingsModal';
import { LoginModal } from './components/auth/LoginModal';
import { WorkspaceManagerModal } from './components/workspace/WorkspaceManagerModal';
import { WhatsNewModal } from './components/whats-new/WhatsNewModal';
import { MenuBar } from './components/layout/MenuBar';
import { SkillsPanel } from './components/skill/SkillsPanel';
import { McpPanel } from './components/mcp/McpPanel';
import { HooksPanel } from './components/hook/HooksPanel';
import { PluginPanel } from './components/plugin/PluginPanel';
import './App.css';
import './components/file/FilePanel.css'; // B3：.file-item 共享样式（头注释，生产恒引入）

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
  /** B2：界面语言（缺省 zh；set-en 哨兵用） */
  locale?: Locale;
  /** B2：PanelProvider 打开动作（_CONTRACT.md 信封字段，如 ["SETTINGS"] → OPEN_SETTINGS） */
  panel?: { open: string[] };
  /** 复合屏底图（多屏信封，_CONTRACT.md） */
  base?: FixtureBase;
  /** terminal-search-bar 屏 payload */
  searchBar?: { terminalId: string };
  /** cwd-picker 屏 payload */
  cwdPicker?: { terminalId: string };
  /** worktree-popover 屏 payload（warning/worktrees 由 fixture.html 的 window.api 替身消费） */
  worktree?: { terminalId: string };
  /** settings-modal 屏 payload（config/update 由 window.api 替身消费） */
  settings?: {
    appVersion: string;
    config: Record<string, unknown>;
    update: { version: string } | null;
  };
  /** login-modal 屏 payload */
  login?: { mode: 'buttons' | 'login' };
  /** workspace-manager-modal 屏 payload（workspaces 由 getConfig 替身消费） */
  workspace?: {
    workspaces: { name: string; savedAt: string; terminals: { cwd: string }[] }[];
    editing: { index: number; value: string } | null;
  };
  /** whats-new-modal 屏 payload（entries 由 getReleaseNotes 替身消费） */
  whatsNew?: {
    appVersion: string;
    entries: { version: string; date: string; sections: Record<string, string[]> }[];
    expanded: string[];
  };
  /** close-confirm-dialog 屏 payload */
  closeConfirm?: { terminalId: string; processName: string };
  /** B3 menu-bar/user-dropdown 屏 payload（auth/update 由 fixture.html 替身消费） */
  auth?: { username: string; email?: string; provider: string; avatarDataUri: string } | null;
  update?:
    | { state: 'downloading'; percent: number; transferred: number; total: number; bytesPerSecond: number }
    | { state: 'error' }
    | null;
  /** B3 skills-panel 屏 payload（files/dirs 喂 fs.readFile/readDir 替身） */
  skills?: {
    items: { name: string; path: string; source?: string; level?: string; desc?: string }[];
    selected: string | null;
    sourceMode?: boolean;
    dirty?: boolean;
    dirtyValue?: string;
  };
  files?: Record<string, string>;
  dirs?: Record<string, { name: string; isDirectory: boolean }[]>;
  /** B3 mcp-panel 屏 payload（servers 由替身按 scope 反拼配置文件） */
  mcp?: {
    servers: { name: string; scope: string; [k: string]: unknown }[];
    selected: string | null;
    form?: boolean;
  };
  /** B3 hooks-panel 屏 payload（settings 即 getSettings 替身答案） */
  hooks?: {
    settings: { hooks: Record<string, { matcher?: string; hooks: { command: string }[] }[]> };
    selectedId: string | null;
    form?: boolean;
  };
  /** B3 plugins-panel 屏 payload（error 非空 = 替身 reject 定值 Error） */
  plugins?: {
    error: string | null;
    items: { id: string; installPath: string; [k: string]: unknown }[];
    selectedId: string | null;
  };
}

const noop = () => {};

/** popover 屏（B1）：__fixtureReady 在浮层就位后才置位（截不到浮层 = capture 超时红，防假绿） */
const POPOVER_READY_SELECTOR: Record<string, string> = {
  'terminal-search-bar': '.terminal-search-bar',
  'cwd-picker': '.cwd-picker',
  'worktree-popover': '.worktree-popover__list',
};

/**
 * modal 屏（B2）就位选择器：以「目标终态元素」为键——驱动链（dispatch/click/注值）任一环
 * 没走到，ready 不置位 → capture 超时红，防截到中间态假绿。
 */
const MODAL_READY_SELECTOR: Record<string, (fx: FixtureData) => string> = {
  // update 非 null：帮助区（下载按钮）在 80vh 折叠线以下，驱动器滚到底后打 data-fx-scrolled
  'settings-modal': (fx) =>
    fx.settings?.update
      ? '.settings-modal[data-fx-scrolled]'
      : fx.settings?.config?.dockBadgeMode === 'timed'
        ? '.settings-modal__badge-sub-row'
        : '.settings-modal',
  'login-modal': (fx) =>
    fx.login?.mode === 'login' ? '.login-modal__email-form' : '.login-modal__oauth-btn--email',
  'workspace-manager-modal': (fx) =>
    fx.workspace?.editing ? '.ws-manager__name-input[data-fx-ready]' : '.ws-manager',
  'whats-new-modal': (fx) =>
    fx.whatsNew?.expanded?.length ? '.whats-new__older-content' : '.whats-new__modal',
  'close-confirm-dialog': () => '.close-confirm-dialog',
};

/**
 * B3 屏就位选择器：同 B2 思路——以目标终态元素为键（驱动链 click/注值任一环没走到 →
 * capture 超时红）。skills 选中态等 wysiwyg 首个 h1（SKILL.md 异步加载 + tiptap 渲染终点）。
 */
const B3_READY_SELECTOR: Record<string, (fx: FixtureData) => string> = {
  'menu-bar': (fx) =>
    fx.update ? '.update-progress' : fx.auth ? '.user-dropdown__trigger' : '.menu-bar',
  'user-dropdown': () => '.user-dropdown__menu',
  'skills-panel': (fx) =>
    fx.skills?.dirty
      ? '.skills-panel__editor-dirty'
      : fx.skills?.selected
        ? '.markdown-wysiwyg .tiptap h1'
        : '.skill-list__empty',
  'mcp-panel': (fx) => (fx.mcp?.form ? '.mcp-panel__form' : '.mcp-panel__detail'),
  'hooks-panel': (fx) => (fx.hooks?.form ? '.hooks-panel__form' : '.hooks-panel__detail'),
  'plugins-panel': (fx) =>
    fx.plugins?.error ? '.plugin-panel__empty' : '.plugin-panel__detail',
};

function readySelectorFor(fx: FixtureData): string | undefined {
  const screen = fx.screen ?? '';
  return (
    MODAL_READY_SELECTOR[screen]?.(fx) ??
    B3_READY_SELECTOR[screen]?.(fx) ??
    POPOVER_READY_SELECTOR[screen]
  );
}

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

/**
 * B2 驱动器：fonts.ready 后逐步执行 steps（find 命中才 act 并推进，**每帧至多一步**——
 * ws 编辑链靠帧间隔对冲 startEditing 的 setTimeout select()），把组件内部 state
 * （login mode / ws 行内编辑 / whats-new 展开）沿生产交互路径（JS click，不动鼠标防 hover
 * 入图）驱动到目标终态。终态就位由 MODAL_READY_SELECTOR 把关。
 */
interface DriverStep {
  find: () => HTMLElement | null;
  act: (el: HTMLElement) => void;
}

function FixtureDriver({ steps }: { steps: DriverStep[] }): null {
  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      let i = 0;
      const tick = () => {
        if (cancelled || i >= steps.length) return;
        const el = steps[i].find();
        if (el) {
          steps[i].act(el);
          i++;
        }
        if (i < steps.length) requestAnimationFrame(tick);
      };
      tick();
    });
    return () => {
      cancelled = true;
    };
    // steps 随 fixture 固定；整树以 key={fx.id} 重挂，无需依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

const click = (el: HTMLElement) => el.click();

/** 原生 setter 注值（f7 编辑先例：绕过 React 受控值，触发 onChange） */
function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** textarea 版原生 setter 注值（B3 sk-dirty：source 模式编辑区走 onChange 置 dirty） */
function setTextareaValue(el: HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value',
  )!.set!;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/** 在 NodeList 中找文本恰好等于 text 的元素（B3：按显示名定位列表项，与人眼选择同构） */
function findByText(selector: string, text: string): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>(selector)).find(
      (el) => (el.textContent ?? '').trim() === text,
    ) ?? null
  );
}

/** login-modal 宿主：AuthProvider 内 dispatch 打开；mode=login 走条款守卫真实路径两连点 */
function FixtureLoginHost({ mode }: { mode: 'buttons' | 'login' }): JSX.Element {
  const { dispatch } = useAuth();
  useEffect(() => {
    dispatch({ type: 'OPEN_LOGIN_MODAL' });
  }, [dispatch]);

  const formSteps: DriverStep[] = [
    { find: () => document.querySelector('.login-modal__oauth-btn--email'), act: click },
    { find: () => document.querySelector('.login-modal__terms-confirm-agree'), act: click },
  ];

  return (
    <>
      <LoginModal />
      {mode === 'login' && <FixtureDriver steps={formSteps} />}
    </>
  );
}

/** modal 簇宿主：PanelProvider 内 dispatch 打开动作（_CONTRACT.md panel.open），再按屏驱动内部 state */
function FixtureModalHost({ fx }: { fx: FixtureData }): JSX.Element | null {
  const { dispatch } = usePanelContext();
  useEffect(() => {
    for (const name of fx.panel?.open ?? []) {
      dispatch({ type: `OPEN_${name}` } as never);
    }
    // fx 随 key={fx.id} 重挂固定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  switch (fx.screen) {
    case 'settings-modal': {
      // update 态：先等 config 异步落地（timed 子行就位 = 内容高度终值），再滚到底
      // 让帮助区（下载 vX.Y.Z）入画，并打 ready 标记（与 web 侧呈现对称）
      const steps: DriverStep[] = fx.settings?.update
        ? [
            ...(fx.settings.config?.dockBadgeMode === 'timed'
              ? [
                  {
                    find: () =>
                      document.querySelector<HTMLElement>('.settings-modal__badge-sub-row'),
                    act: noop,
                  },
                ]
              : []),
            {
              find: () => document.querySelector<HTMLElement>('.settings-modal'),
              act: (el) => {
                el.scrollTop = el.scrollHeight;
                el.setAttribute('data-fx-scrolled', '');
              },
            },
          ]
        : [];
      return (
        <>
          <SettingsModal uiTheme={fx.theme} onToggleTheme={noop} />
          {steps.length > 0 && <FixtureDriver steps={steps} />}
        </>
      );
    }

    case 'login-modal':
      return (
        <AuthProvider>
          <FixtureLoginHost mode={fx.login?.mode ?? 'buttons'} />
        </AuthProvider>
      );

    case 'workspace-manager-modal': {
      const editing = fx.workspace?.editing;
      const steps: DriverStep[] = editing
        ? [
            {
              find: () =>
                document.querySelectorAll<HTMLElement>('.ws-manager__name')[editing.index] ?? null,
              act: click,
            },
            {
              find: () => document.querySelector('.ws-manager__name-input'),
              act: (el) => setInputValue(el as HTMLInputElement, editing.value),
            },
            {
              // 独立一步（≥1 帧之后）：对冲 startEditing 的 setTimeout select()——
              // 折叠选区（选中高亮非确定性），并打 ready 标记
              find: () => document.querySelector('.ws-manager__name-input'),
              act: (el) => {
                const input = el as HTMLInputElement;
                input.setSelectionRange(input.value.length, input.value.length);
                input.setAttribute('data-fx-ready', '');
              },
            },
          ]
        : [];
      return (
        <>
          <WorkspaceManagerModal />
          {editing && <FixtureDriver steps={steps} />}
        </>
      );
    }

    case 'whats-new-modal': {
      const expanded = fx.whatsNew?.expanded ?? [];
      const steps: DriverStep[] = expanded.map((version) => ({
        find: () =>
          Array.from(document.querySelectorAll<HTMLElement>('.whats-new__older-toggle')).find(
            (b) => (b.textContent ?? '').includes(`v${version}`),
          ) ?? null,
        act: click,
      }));
      return (
        <>
          <WhatsNewModal />
          {steps.length > 0 && <FixtureDriver steps={steps} />}
        </>
      );
    }

    case 'close-confirm-dialog':
      return (
        <CloseConfirmDialog
          open
          terminalId={fx.closeConfirm?.terminalId ?? 't1'}
          processName={fx.closeConfirm?.processName ?? ''}
          onConfirm={noop}
          onCancel={noop}
        />
      );

    default:
      return null;
  }
}

const MODAL_SCREENS = new Set(Object.keys(MODAL_READY_SELECTOR));

// ── M2 B3 hosts ──

const MB_SCREENS = new Set(['menu-bar', 'user-dropdown']);
const PANEL_SCREENS = new Set(['skills-panel', 'mcp-panel', 'hooks-panel', 'plugins-panel']);

/**
 * menu-bar / user-dropdown 屏宿主：与生产同构（App.tsx:248-268）——.app 顶层 MenuBar +
 * app-content 网格底图；登录态由 auth.getStatus 替身在 AuthProvider 挂载时灌入。
 * user-dropdown 屏经 FixtureDriver 点生产入口 trigger 打开（头像异步出现，driver 轮询）。
 */
function FixtureMenuBarHost({ fx, base }: { fx: FixtureData; base: FixtureBase }): JSX.Element {
  const dropdownSteps: DriverStep[] = [
    { find: () => document.querySelector('.user-dropdown__trigger'), act: click },
  ];
  return (
    <AuthProvider>
      <div className="app">
        <MenuBar
          viewMode={base.viewMode}
          onBackToTiling={noop}
          terminalCount={base.terminals.length}
        />
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
      </div>
      {fx.screen === 'user-dropdown' && <FixtureDriver steps={dropdownSteps} />}
    </AuthProvider>
  );
}

/** hooks 展平序 = 事件插入序 → 组序 → 处理器序（useHookConfig flattenHooks 同构），求 DOM 项下标 */
function hookItemIndex(
  settings: NonNullable<FixtureData['hooks']>['settings'],
  selectedId: string,
): number {
  let idx = 0;
  for (const [event, groups] of Object.entries(settings.hooks)) {
    for (let gi = 0; gi < groups.length; gi++) {
      for (let hi = 0; hi < groups[gi].hooks.length; hi++) {
        if (`global:${event}:${gi}:${hi}` === selectedId) return idx;
        idx++;
      }
    }
  }
  return -1;
}

/**
 * 配置面板簇宿主：生产 overlay 容器（App.tsx:281-306 同款类名）+ 面板组件；
 * 数据全走 fixture.html 替身；选中/编辑态经 FixtureDriver 走生产 click 路径。
 */
function FixturePanelHost({ fx }: { fx: FixtureData }): JSX.Element | null {
  switch (fx.screen) {
    case 'skills-panel': {
      const sk = fx.skills;
      const selectedName = sk?.items.find((i) => i.path === sk.selected)?.name;
      const steps: DriverStep[] = [];
      if (selectedName) {
        steps.push({
          find: () => findByText('.skill-list__item-name', selectedName),
          act: click,
        });
      }
      if (sk?.sourceMode) {
        // 选中后 SKILL.md 异步加载，mode 钮（仅 markdown 有）出现即点 → source 模式
        steps.push({
          find: () => document.querySelector('.skills-panel__editor-mode-btn'),
          act: click,
        });
      }
      if (sk?.dirty && sk.dirtyValue != null) {
        steps.push({
          find: () => document.querySelector('.skills-panel__editor-body textarea'),
          act: (el) => setTextareaValue(el as HTMLTextAreaElement, sk.dirtyValue!),
        });
      }
      return (
        <div className="skills-panel-overlay">
          <SkillsPanel />
          {steps.length > 0 && <FixtureDriver steps={steps} />}
        </div>
      );
    }

    case 'mcp-panel': {
      const mc = fx.mcp;
      const steps: DriverStep[] = [];
      if (mc?.selected) {
        steps.push({
          find: () => findByText('.mcp-panel__item-name', mc.selected!),
          act: (el) => (el.closest('.mcp-panel__item') as HTMLElement | null)?.click(),
        });
      }
      if (mc?.form) {
        steps.push({
          find: () => document.querySelector('.mcp-panel__detail-actions .mcp-panel__btn--primary'),
          act: click,
        });
      }
      return (
        <div className="mcp-panel-overlay">
          <McpPanel />
          {steps.length > 0 && <FixtureDriver steps={steps} />}
        </div>
      );
    }

    case 'hooks-panel': {
      const hk = fx.hooks;
      const steps: DriverStep[] = [];
      if (hk?.selectedId) {
        const idx = hookItemIndex(hk.settings, hk.selectedId);
        steps.push({
          find: () =>
            idx >= 0
              ? (document.querySelectorAll<HTMLElement>('.hooks-panel__item')[idx] ?? null)
              : null,
          act: click,
        });
      }
      if (hk?.form) {
        steps.push({
          find: () =>
            document.querySelector('.hooks-panel__detail-actions .hooks-panel__btn--primary'),
          act: click,
        });
      }
      return (
        <div className="hooks-panel-overlay">
          <HooksPanel />
          {steps.length > 0 && <FixtureDriver steps={steps} />}
        </div>
      );
    }

    case 'plugins-panel': {
      const pl = fx.plugins;
      const steps: DriverStep[] = [];
      const selectedName = pl?.items.find((i) => i.id === pl.selectedId)?.name as
        | string
        | undefined;
      if (selectedName) {
        steps.push({
          find: () => findByText('.plugin-panel__item-name', selectedName),
          act: (el) => (el.closest('.plugin-panel__item') as HTMLElement | null)?.click(),
        });
      }
      return (
        <div className="plugins-panel-overlay">
          <PluginPanel />
          {steps.length > 0 && <FixtureDriver steps={steps} />}
        </div>
      );
    }

    default:
      return null;
  }
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
      const readySelector = readySelectorFor(data);
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
  // 新屏挂载分支随 muxvo 各复刻批次在此登记。
  const screen = fx.screen ?? 'terminal-grid';
  const isPopoverScreen = screen in POPOVER_READY_SELECTOR;
  const isModalScreen = MODAL_SCREENS.has(screen);
  const isMbScreen = MB_SCREENS.has(screen);
  const isPanelScreen = PANEL_SCREENS.has(screen);
  if (
    screen !== 'terminal-grid' &&
    !isPopoverScreen &&
    !isModalScreen &&
    !isMbScreen &&
    !isPanelScreen
  ) {
    console.error(`[fixture] 未登记的屏: ${screen}（fixture-main.tsx）`);
    return null;
  }

  // providers 入 fixture 子树并以 key 重挂：locale 随 fixture 生效、Panel/Auth state 逐场景归零
  const wrap = (children: JSX.Element) => (
    <I18nProvider key={fx.id} initialLocale={fx.locale ?? 'zh'}>
      <TerminalProvider>
        <PanelProvider>{children}</PanelProvider>
      </TerminalProvider>
    </I18nProvider>
  );

  // B2 modal 簇：单组件挂载（screens.json 裁决#4），无网格底图，页面底色即 body --bg-primary
  if (isModalScreen) {
    return wrap(<FixtureModalHost fx={fx} />);
  }

  // B3 配置面板簇：生产 overlay 容器 + 面板组件（无 menubar 底图，裁决#4 单组件挂载）
  if (isPanelScreen) {
    return wrap(<FixturePanelHost key={fx.id} fx={fx} />);
  }

  // B3 menu-bar/user-dropdown：base 底图（terminalCount 数据源）+ 顶层 MenuBar
  if (isMbScreen) {
    const mbBase = fx.base;
    if (!mbBase || !mbBase.terminals) {
      console.error(`[fixture] ${fx.id}: 缺底图数据（base.terminals）`);
      return null;
    }
    return wrap(<FixtureMenuBarHost key={fx.id} fx={fx} base={mbBase} />);
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

  return wrap(
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
    </div>,
  );
}

const root = document.getElementById('root');
if (root) {
  // 不用 StrictMode：避免双渲染干扰 fixture 状态置位时序
  createRoot(root).render(<FixtureApp />);
}
