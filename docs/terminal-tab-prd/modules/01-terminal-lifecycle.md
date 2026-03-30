# 模块 01：终端生命周期 — 前端状态管理

> **所属 PRD**：Muxvo 终端 Tab 前端 UI - PRD V2.0
> **模块编号**：01
> **优先级**：P0（重写）
> **依赖**：无（基础模块，被所有视图模块依赖）
> **本模块仅涉及前端 UI 层**

本模块描述前端如何管理终端的 UI 状态。终端进程的创建/销毁/状态检测由后端 Terminal Manager 负责（不在本次重写范围内），前端通过 IPC 调用和 Push 事件驱动 UI 更新。

---

## 1. React 状态管理

App.tsx 中的终端相关状态：

```typescript
// 终端列表
terminals: TerminalEntry[]            // 终端实例列表

// 排序与命名
terminalOrder: string[]               // 排序顺序（终端 ID 数组）
terminalNames: Record<string, string> // 自定义名称（terminalId → name）

// 视图模式
viewMode: 'Tiling' | 'Focused' | 'List'  // 当前视图模式

// 各模式的选中/聚焦状态
focusedId: string | null              // 聚焦模式的焦点终端
selectedId: string | null             // 平铺模式的选中终端
listSelectedId: string | null         // 列表模式的选中终端
```

这些状态由前端 React 组件管理，通过 IPC 调用和 Push 事件与后端同步。

---

## 2. 终端创建

### 2.1 创建入口

| 入口 | 触发方式 |
|------|---------|
| FAB "+" 按钮 | 点击右下角浮动按钮 |
| 快捷键 | 可配置（默认 Cmd+T） |
| 空状态页 | 无终端时显示的引导按钮 |

### 2.2 前端创建流程

**前置条件**：当前终端数 < 20

**操作**：用户点击创建入口

**前端行为**：
1. 确定初始 CWD：
   - 如果有上一个活跃终端：使用其 CWD
   - 否则：使用用户 home 目录（通过 `window.api.app.getHomePath()` 获取）
2. 调用 `window.api.terminal.create(cwd)` 发起 IPC 请求
3. 收到后端返回的 `{ id, pid }` 后，更新 `terminals` 状态：添加新终端条目
4. 将新终端 ID 添加到 `terminalOrder` 末尾
5. 设置 `selectedId = newId`（新终端自动被选中）
6. 在当前视图模式中渲染新终端 Tile

**异常处理**：
- IPC 调用失败：显示错误提示（Toast）
- 达到上限（20）：FAB 按钮禁用，显示 tooltip "终端数已达上限"

### 2.3 上限控制

- 最大终端数：20
- 达到上限时：
  - FAB "+" 按钮变为禁用态（灰色，不可点击）
  - 按钮 tooltip 显示提示文案
  - 快捷键创建同样被阻止

---

## 3. 终端关闭

### 3.1 关闭判断

**前置条件**：用户点击终端的关闭按钮（红色 X）

**前端行为**：
1. 调用 `window.api.terminal.getForegroundProcess(terminalId)` 检测前台进程
2. **无前台进程**：直接执行关闭流程
3. **有前台进程**：弹出 `CloseConfirmDialog` 确认对话框（保留组件，不改动）

### 3.2 CloseConfirmDialog

| 元素 | 内容 |
|------|------|
| 标题 | "关闭终端？" |
| 描述 | "终端中有正在运行的进程：{processName}" |
| 确认按钮 | "强制关闭"（红色） |
| 取消按钮 | "取消" |

### 3.3 前端关闭流程

**操作**：用户确认关闭（或无前台进程直接关闭）

**前端行为**：
1. 调用 `window.api.terminal.close(terminalId)` 发起 IPC 关闭请求
2. 后端负责 SIGINT → 5 秒超时 → 强制 kill 的完整关闭流程（由后端提供，不在重写范围）
3. 前端监听 `onExit` 事件，收到后：
   - 从 `terminals` 列表中移除该终端
   - 从 `terminalOrder` 中移除该 ID
   - 清理 `terminalNames` 中的条目
   - 执行选中逻辑（见 3.4）

### 3.4 关闭后选中逻辑

- 如果关闭的是当前选中终端：
  - 优先选中下一个终端（按 terminalOrder 顺序）
  - 无下一个则选中上一个
  - 都没有则 `selectedId = null`
- 如果关闭的不是当前选中终端：选中状态不变
- 最后一个终端关闭后：显示空状态页

---

## 4. 进程状态展示

终端进程有 10 种状态，由后端状态机管理（定义在 `src/shared/machines/terminal-process.ts`，不改动）。前端负责接收状态推送并映射到视觉表现。

完整状态转换表见 [附录 A](../appendix/appendix-a-state-machine.md)。

### 4.1 状态一览与视觉映射

| 状态 | 含义 | 视觉表现（前端负责） |
|------|------|---------------------|
| **Created** | 已创建，尚未启动 shell | 灰色状态点，无动画 |
| **Starting** | 正在启动 shell 进程 | 黄色状态点，blink 动画 |
| **Running** | shell 正常运行，无前台进程 | 绿色状态点，breathPulse 动画 |
| **Busy** | 有前台进程正在运行 | 绿色状态点，fastPulse 动画 |
| **WaitingInput** | 等待用户输入（AI CLI 等待确认） | 琥珀色状态点，breathPulse + 红色边框脉动 |
| **Stopping** | 正在关闭中 | 灰色状态点，blink 动画 |
| **Stopped** | 进程已正常退出 | 灰色状态点，无动画 |
| **Disconnected** | 连接断开（超时/异常退出） | 红色状态点，无动画 |
| **Failed** | 启动失败 | 红色状态点，无动画 |
| **Removed** | 已移除（内部状态，UI 不可见） | — |

状态点动画的详细 CSS 定义见 [模块 06：视觉效果](./06-visual-effects.md)。

### 4.2 前端状态消费

前端通过以下 Push 事件接收后端状态变化：

| Push 事件 | 前端处理 |
|-----------|---------|
| `onStateChange(terminalId, newState)` | 更新 `terminals` 中对应条目的 `state` 字段，触发状态点动画更新 |
| `onExit(terminalId, exitCode)` | 从终端列表移除该终端，执行关闭后选中逻辑 |
| `onOutput(terminalId, data)` | 写入对应的 xterm.js 终端实例（由 useTerminalIO hook 处理） |

- 状态推送去抖 50ms，由后端控制，前端无需额外处理
- WaitingInput 状态由后端 input-detector 检测并推送，前端只负责视觉呈现（琥珀色状态点 + 红色边框脉动 + 浮动通知）

---

## 5. 终端命名

### 5.1 默认名称

- 默认名为 CWD 的最后一级目录名（例如 `/Users/rl/project` → `project`）
- CWD 变化时，如果用户没有设置自定义名称，默认名跟随更新

### 5.2 自定义命名

**前置条件**：终端已创建

**操作**：点击 Tile header 中的名称区域（placeholder: "Name this terminal"）

**前端行为**：
1. 名称区域切换为可编辑输入框
2. 输入框获得焦点，选中全部文本
3. 用户编辑名称

**确认操作**：
- **Enter**：保存名称到 `terminalNames`，退出编辑模式
- **Escape**：放弃修改，恢复原名称，退出编辑模式
- **失焦**（点击其他区域）：保存名称，退出编辑模式

**数据管理**：
- 自定义名称存储在 `terminalNames: Record<string, string>` 状态中（纯前端状态，不持久化到后端）
- 空名称（用户清空后确认）：恢复为默认名（CWD 目录名）

### 5.3 命名状态机

命名流程由 `terminal-naming` 状态机管理（定义在 shared 层，不改动）：
- `Idle` → `EDIT` → `Editing`
- `Editing` → `CONFIRM` → `Idle`（保存名称）
- `Editing` → `CANCEL` → `Idle`（恢复原名）

---

## 6. CWD 管理

### 6.1 初始 CWD

创建终端时的 CWD 来源（优先级从高到低）：
1. 创建参数中显式指定的路径
2. 上一个活跃终端的当前 CWD
3. 用户 home 目录

### 6.2 CWD 变化的前端消费

- 后端通过 OSC 7 escape sequence 检测 shell 的 CWD 变化（由后端提供，不在重写范围）
- 前端监听 CWD 变化事件，更新终端条目中的 `cwd` 字段
- Tile header 中的 CWD 显示实时更新
- 如果用户未设置自定义名称，终端名也跟随 CWD 更新

### 6.3 CwdPicker 手动切换

**前置条件**：终端已创建且处于 Running 状态

**操作**：点击 Tile header 中的 CWD 显示区域

**前端行为**：
1. 打开 CwdPicker 下拉菜单（保留组件，不改动）
2. 显示常用目录列表
3. 用户选择目标目录
4. 通过 `window.api.terminal.write(terminalId, 'cd <path>\n')` 向 PTY 发送 cd 命令
5. 后端检测到 CWD 变化后推送事件，前端更新显示

### 6.4 CWD 显示格式

- 完整路径超出显示区域时，自动缩短
- 缩短规则：`/Users/rl/project/src` → `~/project/src`（替换 home 为 `~`）
- 仍然过长时：`~/.../{最后两级}` 省略中间路径

---

## 7. WaitingInput 前端呈现

### 7.1 呈现目的

AI CLI 工具在等待用户确认/输入时，需要明确提示用户。尤其在 Focused 模式下，非聚焦终端的等待状态需要通过浮动通知传达。

### 7.2 后端检测（不在重写范围）

WaitingInput 的检测逻辑完全由后端 input-detector 负责：
- 精确检测：Claude Code 取消提示、数字选择器
- 通用检测：Yes/No 提示、按键提示、密码提示
- 信号检测：Bell（`\x07`）、OSC 9/777
- 排除规则：进度条、日志行、大量连续输出
- Bell 冷却：3 秒防重复触发

以上均由后端实现，前端不参与检测逻辑。

### 7.3 前端视觉呈现

前端收到 `onStateChange(terminalId, 'WaitingInput')` 后：

| 视觉元素 | 表现 |
|---------|------|
| 状态点 | 琥珀色，breathPulse 动画 |
| Tile 边框 | 红色脉动动画 |
| Focused 模式通知 | 弹出 WaitingInputNotification 浮动通知（保留组件，不改动） |
| 侧边栏缩略图 | 琥珀色高亮 |

用户在对应终端输入后，后端推送状态回 `Running`，前端移除所有 WaitingInput 视觉效果。

---

## 8. 空状态

### 8.1 触发条件

当前无任何终端实例（`terminals.length === 0`）

### 8.2 显示内容

- 居中的引导文案："创建一个终端开始工作"
- 创建按钮（与 FAB 功能相同）
- 快捷键提示

### 8.3 首次使用

如果用户是首次使用（`onboarding.complete === false`），空状态页会触发新手引导 Tour，详见 [模块 07](./07-onboarding-tour.md)。
