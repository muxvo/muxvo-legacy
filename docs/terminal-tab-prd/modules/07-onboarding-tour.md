# 模块 07：新手引导 Tour — 前端交互引导

> **所属 PRD**：Muxvo 终端 Tab — 前端 UI 重写
> **模块**：新手引导 Tour

> **范围声明**：本模块仅涉及前端 UI 层（TourOverlay 组件 + driver.js）。Tour 步骤依赖的状态数据（terminalCount、viewMode 等）由后端提供，前端不改变数据产生逻辑。

---

## 1. 概述

基于 driver.js (v1.4.0) 的交互式引导系统，帮助首次使用 Muxvo 的用户快速掌握核心操作。

| 属性 | 说明 |
|------|------|
| 触发条件 | 首次启动 Muxvo 时自动触发（检查 `preferences.tourCompleted`） |
| 引导步数 | 4 步，覆盖创建终端、进入聚焦、重命名、打开文件面板 |
| 推进方式 | Action-based 自动推进（用户完成操作后自动进入下一步，无需点"下一步"） |
| 退出方式 | 任意步骤可通过关闭按钮（X）退出 |
| 依赖模块 | `01-terminal-lifecycle`（创建终端）、`02-tiling-mode`（Tiling 视图演示） |

---

## 2. Tour 步骤定义

### 2.1 步骤总览

| 步骤 | ID | 目标元素 | 用户操作 | 检测方式 |
|------|-----|----------|----------|----------|
| 1 | `create-terminal` | `.terminal-grid__fab`（+ 按钮） | 点击创建第一个终端 | `terminalCount` 增加 |
| 2 | `focus-terminal` | `.tile-max-btn`（蓝色最大化按钮） | 点击进入聚焦模式 | `viewMode` 变为 `'Focused'` |
| 3 | `rename-terminal` | `.tile-custom-name--placeholder` 或 `.tile-custom-name` | 双击重命名终端 | `terminalNames` 有新值 |
| 4 | `open-files` | `.tile-file-btn`（琥珀色文件按钮） | 点击打开文件面板 | `filePanel.open` 变为 `true` |

### 2.2 步骤详细规格

#### 步骤 1：创建终端 (`create-terminal`)

| 项目 | 说明 |
|------|------|
| **前置条件** | 当前无终端实例（空白网格，FAB 按钮可见） |
| **目标元素** | `.terminal-grid__fab` |
| **Popover 标题** | "创建你的第一个终端" / "Create your first terminal" |
| **Popover 描述** | "点击 + 按钮创建一个终端" / "Click the + button to create a terminal" |
| **用户操作** | 点击 FAB 按钮 |
| **检测逻辑** | `prevTerminalCountRef.current < terminalCount` |
| **推进行为** | 检测到终端数量增加 → 隐藏 overlay → 500ms 后推进到步骤 2 |

#### 步骤 2：进入聚焦模式 (`focus-terminal`)

| 项目 | 说明 |
|------|------|
| **前置条件** | 至少存在 1 个终端（步骤 1 已完成） |
| **目标元素** | `.tile-max-btn`（Tile 右上角蓝色最大化按钮） |
| **Popover 标题** | "进入聚焦模式" / "Enter focused mode" |
| **Popover 描述** | "点击蓝色按钮放大终端" / "Click the blue button to maximize the terminal" |
| **用户操作** | 点击最大化按钮 |
| **检测逻辑** | `viewMode === 'Focused'` |
| **推进行为** | 检测到 viewMode 变化 → 500ms 后推进到步骤 3 |

#### 步骤 3：重命名终端 (`rename-terminal`)

| 项目 | 说明 |
|------|------|
| **前置条件** | 聚焦模式已激活（步骤 2 已完成） |
| **目标元素** | `.tile-custom-name--placeholder`（未命名时）或 `.tile-custom-name`（已命名时） |
| **Popover 标题** | "给终端取个名字" / "Name your terminal" |
| **Popover 描述** | "双击名称区域进入编辑" / "Double-click the name area to edit" |
| **用户操作** | 双击名称区域 → 输入名称 → Enter 确认 |
| **检测逻辑** | `terminalNames` Map 中出现新值 |
| **推进行为** | 检测到命名变化 → 500ms 后推进到步骤 4 |

#### 步骤 4：打开文件面板 (`open-files`)

| 项目 | 说明 |
|------|------|
| **前置条件** | 终端已命名（步骤 3 已完成） |
| **目标元素** | `.tile-file-btn`（琥珀色文件按钮） |
| **Popover 标题** | "查看项目文件" / "View project files" |
| **Popover 描述** | "点击文件按钮浏览目录" / "Click the file button to browse directory" |
| **用户操作** | 点击文件按钮 |
| **检测逻辑** | `filePanel.open === true` |
| **推进行为** | 检测到文件面板打开 → Tour 完成流程 |

---

## 3. 自动推进机制

### 3.1 推进原理

每步只显示"关闭"按钮（无 Next / Prev），用户完成操作后系统自动推进。

```
用户完成操作 → useEffect 检测状态变化 → 隐藏 overlay 显示结果 → 500ms 延迟 → 推进到下一步
```

### 3.2 状态变化检测

使用 `useEffect` + `prevRef` 模式：

| 步骤 | Ref | 检测表达式 |
|------|-----|-----------|
| 1 | `prevTerminalCountRef` | `prevCount < currentCount` |
| 2 | — | `viewMode === 'Focused'`（直接判断） |
| 3 | — | `terminalNames` 中存在新值（对比前后 Map 大小或内容） |
| 4 | — | `filePanel.open === true`（直接判断） |

### 3.3 推进时序

```
t=0        状态变化被 useEffect 捕获
t=0~500ms  隐藏当前步骤 overlay，让用户看到操作结果
t=500ms    driver.js moveNext() 推进到下一步
```

### 3.4 异常处理

| 异常场景 | 处理 |
|---------|------|
| 用户未操作就点关闭（X） | 触发 Tour 跳过流程（保存 `tourCompleted = true`） |
| 目标元素不存在（DOM 未渲染） | driver.js 自动跳过该步骤 |
| Tour 进行中终端被关闭 | 检测到 `terminalCount === 0` → 暂停 Tour，提示用户重新创建 |

---

## 4. UI 呈现

### 4.1 Overlay 遮罩

| 属性 | 值 |
|------|-----|
| 背景色 | `rgba(6, 8, 12, 0.85)` 半透明黑色 |
| 层级 | `z-index: 10000`（覆盖所有 UI） |
| 目标元素高亮 | `stagePadding: 8`, `stageRadius: 10` |

### 4.2 脉动光环

目标元素周围显示琥珀色脉动光环，提示用户操作位置：

| 属性 | 值 |
|------|-----|
| 动画名称 | `tour-pulse` |
| 颜色 | 琥珀色（amber） |
| 周期 | `1.8s` infinite |
| 效果 | 从目标元素向外扩散的光环 |

### 4.3 Popover 弹窗

| 属性 | 说明 |
|------|------|
| 内容 | 步骤标题 + 步骤描述 |
| 进度 | 右下角显示 "X / Y"（当前步 / 总步数） |
| 关闭按钮 | 右上角 X 按钮，随时可退出 |
| 位置 | driver.js 自动定位（优先显示在目标元素下方） |

---

## 5. 启动与重启

### 5.1 首次自动启动

```
App 启动 → 读取 preferences.tourCompleted
  ├── true  → 跳过引导
  └── false → 延迟 1500ms → dispatch START_TOUR
```

**前置条件**：App 完成初始化、UI 完成首次渲染。

**1500ms 延迟原因**：确保 React 组件树完全挂载，FAB 按钮等 DOM 元素就绪。

### 5.2 手动重启

| 项目 | 说明 |
|------|------|
| 入口 | Settings → 帮助 section → "重新开始引导" 按钮 |
| 操作流程 | 点击按钮 → 关闭 Settings Modal → 延迟 100ms → dispatch `START_TOUR` |
| 100ms 延迟 | 等待 Settings Modal 完全关闭，避免 overlay 冲突 |

### 5.3 START_TOUR dispatch

`START_TOUR` 事件触发以下操作：

1. 重置所有面板到初始状态（关闭 filePanel、侧边栏等）
2. 设置 `tour.active = true`
3. 设置 `tour.currentStep = 0`
4. 初始化 driver.js 实例

### 5.4 完成 / 跳过 Tour

用户完成全部 4 步或点击 X 退出时：

1. 保存 `preferences.tourCompleted = true`（持久化到 config）
2. Dispatch `COMPLETE_TOUR`
3. 清理 driver.js 实例
4. 显示完成 Toast：
   - 文案："恭喜！引导完成，开始使用 Muxvo 吧" / "Congrats! Tour complete, start using Muxvo"
   - 持续时间：3 秒
   - 位置：屏幕底部居中

---

## 6. Panel 状态保护

Tour 期间需要特殊的面板状态管理，防止用户操作或系统事件中断引导流程。

| 事件 | 行为 | 说明 |
|------|------|------|
| `START_TOUR` | 重置所有面板到初始状态 | 确保引导从干净状态开始 |
| `CLOSE_ALL` | 保留 `tour.active` 状态 | 批量关闭面板时不中断正在进行的引导 |
| `COMPLETE_TOUR` | 仅关闭 tour，保留其他面板状态 | 引导完成后不影响用户已打开的文件面板等 |
| Tour 期间 Settings 打开 | 不中断 Tour | Tour overlay 层级高于 Settings |

---

## 7. 分析埋点

| 事件名 | 触发时机 | 参数 |
|--------|---------|------|
| `onboarding.complete` | Tour 完成或被跳过 | `{ skipped: boolean }` |
| `onboarding.step` | 每步完成时 | `{ step: number, total: number }` |

**skipped 判断规则**：
- `skipped: false` — 用户完成全部 4 步
- `skipped: true` — 用户在任意步骤点击 X 关闭

---

## 8. i18n 支持

所有步骤标题和描述支持中英文切换。

### 8.1 i18n Key 清单

| Key | 中文 | English |
|-----|------|---------|
| `tour.step1.title` | 创建你的第一个终端 | Create your first terminal |
| `tour.step1.desc` | 点击 + 按钮创建一个终端 | Click the + button to create a terminal |
| `tour.step2.title` | 进入聚焦模式 | Enter focused mode |
| `tour.step2.desc` | 点击蓝色按钮放大终端 | Click the blue button to maximize the terminal |
| `tour.step3.title` | 给终端取个名字 | Name your terminal |
| `tour.step3.desc` | 双击名称区域进入编辑 | Double-click the name area to edit |
| `tour.step4.title` | 查看项目文件 | View project files |
| `tour.step4.desc` | 点击文件按钮浏览目录 | Click the file button to browse directory |
| `tour.complete` | 恭喜！引导完成，开始使用 Muxvo 吧 | Congrats! Tour complete, start using Muxvo |
| `tour.noTerminal.title` | 需要创建终端 | Terminal needed |
| `tour.noTerminal.desc` | 请先创建一个终端以继续引导 | Please create a terminal to continue the tour |

---

## 9. 重写适配

### 9.1 Tour 步骤的目标 CSS 选择器

Tour 步骤依赖以下 CSS 选择器定位目标元素：

| 步骤 | CSS 选择器 | 组件来源 |
|------|-----------|---------|
| 1 | `.terminal-grid__fab` | TerminalGrid.tsx |
| 2 | `.tile-max-btn` | TerminalTile.tsx |
| 3 | `.tile-custom-name--placeholder` / `.tile-custom-name` | TerminalTile.tsx |
| 4 | `.tile-file-btn` | TerminalTile.tsx |

**约束**：如果前端重写过程中这些 CSS class 名发生变化，**必须同步更新** `steps.ts` 中的 `element` 选择器。否则 driver.js 无法定位目标元素，该步骤将被跳过。

### 9.2 List 模式与 Tour

- Tour 在 **Tiling 模式** 下执行（步骤 2 需要从 Tiling 进入 Focused）
- List 模式不需要额外的 Tour 步骤
- 如果用户默认视图模式为 List，`START_TOUR` 应先切换到 Tiling 模式

### 9.3 可能的小幅修改

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `TourOverlay.tsx` | 适配 | 如果新组件的挂载时机变化，可能需调整 `useEffect` 中的检测逻辑 |
| `steps.ts` | 适配 | 如果 CSS class 名变化，需更新 `element` 选择器 |
| Tour CSS | 不变 | Tour 自身的样式（overlay、popover、pulse）不需要修改 |
