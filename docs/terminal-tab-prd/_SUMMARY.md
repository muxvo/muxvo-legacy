# Muxvo 终端 Tab 前端 UI - 产品摘要

> **所属 PRD**：Muxvo 终端 Tab 前端 UI - PRD V2.0
> **文件类型**：产品摘要
> **本模块仅涉及前端 UI 层**

---

## 1. 产品定位与目标

### 1.1 产品概述

Muxvo 是一个 Electron 桌面工作台，专为 AI CLI 工具（Claude Code、Codex、Gemini CLI）设计。终端 Tab 是 Muxvo 的核心功能页，用户在此创建和管理多个终端实例，与 AI CLI 工具进行交互。

本次重写仅涉及前端 UI 层（Renderer 进程中的 React 组件、CSS 样式、状态管理）。后端服务（Terminal Manager、PTY 管理、input-detector、状态机）和 IPC 接口均保持不变，前端通过已有 IPC 通道与后端通信。

### 1.2 目标用户

使用 AI CLI 工具的开发者。典型场景：

- 同时运行多个 Claude Code 会话处理不同任务
- 在不同项目目录间快速切换 AI CLI 终端
- 一边用 AI CLI 写代码，一边在另一个终端测试

### 1.3 核心痛点

| 痛点 | 现状 | Muxvo 方案 |
|------|------|-----------|
| 多终端管理混乱 | 系统终端 / iTerm2 Tab 过多，难以区分 | 三种视图模式（Tiling / Focused / List）按场景切换 |
| AI 等待输入难发现 | AI CLI 等待确认时用户可能在看别的终端 | WaitingInput 状态检测 + 视觉脉动 + 浮动通知 |
| 终端状态不可见 | 无法一眼看出哪个终端在运行、哪个在等待 | 10 种进程状态 + 彩色状态点动画 |
| 切换上下文成本高 | 来回切换窗口、记忆 CWD | CWD 显示 + CwdPicker + 终端命名 |

### 1.4 产品价值

三种视图模式满足不同工作场景：

| 模式 | 适用场景 | 布局 |
|------|---------|------|
| **Tiling**（平铺） | 同时观察多个终端 | CSS Grid 平铺，支持拖拽重排和 resize |
| **Focused**（聚焦） | 专注单个终端，兼顾全局 | 75% 主区 + 25% 侧边栏缩略 |
| **List**（列表） | 终端数量多时的高效导航 | 左侧列表导航 + 右侧全屏终端 |

### 1.5 重写边界

**重写范围（前端 Renderer 进程）：**

| 类型 | 文件/模块 | 操作 |
|------|----------|------|
| 删除重写 | XTermRenderer.tsx | 拆分为 4 个 hooks + 主组件 |
| 删除重写 | TerminalGrid.tsx | 新增 List Mode 分支，修正 focusTransition |
| 删除重写 | TileEffects.css | CSS variables 统一时间，修正 focus-cell--hidden |
| 新建 | TerminalListView.tsx/css | List 模式主组件 |
| 新建 | hooks/useTerminalFit.ts | 统一 fit 管理 |
| 新建 | hooks/useBufferReplay.ts | buffer 回放 |
| 新建 | hooks/useTerminalIO.ts | 输入输出 |
| 新建 | hooks/useTerminalEvents.ts | 外部事件监听 |
| 新建 | constants.ts | 共享时间常量 |
| 修改 | App.tsx | ViewMode 扩展 + listSelectedId |
| 修改 | SettingsModal.tsx | 视图模式切换 |
| 修改 | i18n zh.ts / en.ts | 新增 i18n key |
| 修改 | TourOverlay.tsx, steps.ts | Tour 适配新组件 |

**不动的部分：**

| 类型 | 文件/模块 | 原因 |
|------|----------|------|
| 保留 | TerminalTile.tsx | 组件设计清晰，无缺陷 |
| 保留 | TerminalSidebar.tsx/css | 职责单一，无缺陷 |
| 保留 | CwdPicker.tsx | 独立组件 |
| 保留 | ResizeHandle.tsx | 独立组件 |
| 保留 | TerminalSearchBar.tsx | 独立组件 |
| 保留 | WaitingInputNotification.tsx | 独立组件 |
| 保留 | CloseConfirmDialog.tsx | 独立组件 |
| 不动 | src/main/ 所有终端服务 | 后端质量 8.7/10，无缺陷 |
| 不动 | src/main/ipc/terminal-handlers.ts | IPC 接口不变 |
| 不动 | src/preload/index.ts | Preload API 不变 |
| 不动 | src/shared/machines/ | 状态机不变 |
| 不动 | src/shared/types/ | 类型定义不变 |
| 不动 | 所有 stores (terminal-config, grid-resize, drag-manager, focus-mode) | 设计良好 |

---

## 2. 功能清单与优先级

本次为**前端白纸重写**，全部功能均为 **P0**。

| 模块 | 功能 | 详细文档 |
|------|------|---------|
| 终端生命周期 | 前端状态管理：创建/关闭 UI 流程、状态展示、命名、CWD | `modules/01-terminal-lifecycle.md` |
| Tiling 模式 | CSS Grid 平铺、动态行列、Tile 组件、Resize Handle、拖拽重排、FAB 按钮 | `modules/02-tiling-mode.md` |
| Focused 模式 | 75% 主区 + 25% sidebar、visibility:hidden 隐藏、过渡动画、侧边栏交互 | `modules/03-focused-mode.md` |
| List 模式 | 左侧列表 + 右侧全屏终端 | `modules/04-list-mode.md` |
| XTerm 渲染 | buffer 回放、fit 管理、搜索、缩放、IO 处理 | `modules/05-xterm-rendering.md` |
| 视觉效果 | 状态点动画、主题适配、WaitingInput 脉动、入场动画 | `modules/06-visual-effects.md` |
| 新手引导 | 4 步交互引导 Tour | `modules/07-onboarding-tour.md` |
| 设置与快捷键 | 视图模式切换、终端外观配置、键盘快捷键 | `modules/08-settings-shortcuts.md` |

---

## 3. 核心策略

### 3.1 前端白纸重写

本次不是全栈重写，而是**仅重写前端 UI 层**，后端保持不变。决策理由：

- **后端质量高**：839 行代码质量评分 8.7/10，架构清晰、职责分明
- **测试覆盖完整**：187 个后端测试全部通过，行为验证充分
- **Bug 根因全在前端**：三方独立分析确认 3 个 bug 的根因均在前端 CSS/JS 层
- **IPC 接口设计规范**：10 个 terminal 相关 IPC 通道定义清晰，前后端耦合度极低
- **改动成本最小化**：仅重写前端对后端零影响，风险可控

### 3.2 三个根因 Bug 及对应策略

| Bug | 根因（前端） | 重写策略 |
|-----|-------------|---------|
| **滚动跳顶** | 非聚焦终端缩到 1x1px → ResizeObserver 触发 fit → 计算出错误的 viewport 位置 | **visibility:hidden 替代 1x1px 隐藏**：保持原始尺寸，不触发 ResizeObserver |
| **文字乱码** | 容器 1x1px → fitAddon.fit() 算出 cols=2 → buffer rewrap → 字符重排 | **suppressResize 标记**：隐藏终端不发送 PTY resize，不触发 fit |
| **模式切换闪烁** | JS setTimeout(400ms) vs CSS animation(350ms) 时间不匹配 → 50ms 间隙出现裸露内容 | **CSS variables 统一时间**：`--focus-enter-duration` / `--focus-exit-duration` + JS 常量同步 |

### 3.3 架构改进

| 改进 | 旧架构 | 新架构 |
|------|--------|--------|
| XTermRenderer | 单个 284 行 useEffect 处理所有逻辑 | 4 个单一职责 hooks（useTerminalFit / useBufferReplay / useTerminalIO / useTerminalEvents） |
| TerminalGrid | 5 分支渲染（Tiling/Focused/...） | 清晰的 3 模式分支（Tiling / Focused / List） |
| TileEffects.css | 硬编码时间值 | CSS variables + JS 常量统一管理 |

**Hooks 拆分设计思路**：

将 XTermRenderer 中 284 行的单体 useEffect 按职责拆分为 4 个独立 hooks：

| Hook | 职责 | 输入 | 输出 |
|------|------|------|------|
| `useTerminalFit` | 管理 FitAddon，响应容器 resize，计算 cols/rows | containerRef, terminalInstance | 无（内部调用 fit） |
| `useBufferReplay` | 终端挂载时回放后端 buffer，恢复滚动位置 | terminalId, terminalInstance | isReplaying |
| `useTerminalIO` | 绑定用户输入 → IPC write，订阅 IPC output → terminal.write | terminalId, terminalInstance | 无（内部绑定） |
| `useTerminalEvents` | 监听外部事件（stateChange, exit, cwdChange），更新 React 状态 | terminalId, dispatch | 无（内部订阅） |

每个 hook 独立管理自己的生命周期（setup/cleanup），消除原来的副作用竞态和依赖耦合。

---

## 4. 非功能需求

| 类别 | 要求 |
|------|------|
| **容量** | 最大 20 个终端实例同时运行 |
| **Buffer** | 每终端 64KB 滚动 buffer（由后端提供，不在重写范围） |
| **视觉质量** | 模式切换无闪烁、无乱码、无跳顶 |
| **主题** | 支持 dark / light 双主题 |
| **国际化** | 中文 / 英文 i18n |
| **性能** | 状态推送去抖 50ms（由后端提供）；前端渲染无明显卡顿 |
| **关闭超时** | 优雅关闭 5 秒超时（由后端提供，不在重写范围） |
| **Bell 冷却** | 3 秒防重复触发（由后端提供，不在重写范围） |

---

## 5. 文档导航

详细功能规格请查阅各模块文档，索引见 [`_INDEX.md`](./_INDEX.md)。
