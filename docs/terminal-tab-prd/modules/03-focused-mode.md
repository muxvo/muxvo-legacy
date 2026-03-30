# 模块 03：Focused 模式 — 前端聚焦布局与过渡

> **所属 PRD**：Muxvo 终端 Tab - PRD V1.0（前端 UI 重写）
> **模块编号**：03
> **优先级**：P0（重写）
> **依赖**：模块 01（终端生命周期）、模块 02（Tiling 模式，进入来源）、模块 05（XTerm 渲染）

**本模块仅涉及前端 UI 层。终端进程状态（Running、WaitingInput 等）由后端通过 IPC Push 事件提供，后端与 IPC 接口不在重写范围。**

---

## 1. 进入方式

| 方式 | 触发操作 | 回调 |
|------|---------|------|
| 双击 Tile | 在 Tiling 模式下双击 Tile header | `onDoubleClick(id)` |
| 最大化按钮 | 点击 Tile header 上的蓝色最大化按钮 | `onDoubleClick(id)` |

**系统行为**：
1. `viewMode` 保持为 `'Tiling'`（Focused 是 Tiling 的临时叠加状态）
2. `focusedId` 设置为被操作终端的 ID
3. 触发进入动画（见第 4 节）
4. 布局切换为 Focused 模式

---

## 2. 布局

### 2.1 标准布局（多终端）

当终端数 >= 2 时：

```
┌──────────────────────────────────┬──────────────┐
│                                  │  Compact #1  │
│                                  ├──────────────┤
│         主终端（75%）             │  Compact #2  │
│         focusedId                ├──────────────┤
│                                  │  Compact #3  │
│                                  │              │
└──────────────────────────────────┴──────────────┘
         主区（75% 宽度）            侧边栏（25%）
```

- **主终端**：absolute overlay，`z-index: 10`，占容器宽度的 75%
- **侧边栏**：右侧 25%，显示其他终端的 compact 缩略视图
- 侧边栏最多显示 **3 个** compact 终端（超出时可滚动）

### 2.2 单终端布局

当终端数 = 1 时：
- 主终端占 100% 宽度
- 无侧边栏
- 无 Esc 退出提示（没有 Tiling 可退回到）

### 2.3 主终端样式

| 属性 | 值 |
|------|-----|
| 定位 | `position: absolute` |
| 层级 | `z-index: 10` |
| 宽度 | `75%`（无侧边栏时 `100%`） |
| 高度 | `100%` |
| 边框 | 琥珀色发光边框（`--tile-focused-glow`） |
| 阴影 | 增强阴影（`--tile-focused-shadow`） |

---

## 3. 非聚焦终端处理（3 个 bug 修复的核心策略）

### 3.1 Bug 修复策略一：visibility:hidden 替代 1x1px

**这是消除旧架构 3 个 bug 的核心前端策略。**

| 属性 | 旧架构（1x1px 缩小） | 新架构（visibility:hidden） |
|------|---------------------|---------------------------|
| 尺寸 | `width: 1px; height: 1px` | **保持原始尺寸**（与主区相同） |
| ResizeObserver | 触发 → fit → 错误计算 | **不触发**（尺寸未变） |
| fitAddon.fit() | 算出 cols=2 → buffer rewrap | **不调用**（suppressResize=true） |
| 滚动位置 | 丢失（viewport 重算） | **保持**（DOM 不变） |
| 可见性 | 视觉隐藏但占空间 | `visibility: hidden` 不可见不占空间 |

**关键点**：非聚焦终端保持原始尺寸，不触发 ResizeObserver，从根本上避免了错误的 fit 计算和 buffer rewrap。

### 3.2 focus-cell--hidden CSS 类（新增）

```css
.focus-cell--hidden {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
  z-index: -1;
  /* 关键：不改变 width/height，保持与主区相同尺寸 */
}
```

| 属性 | 说明 |
|------|------|
| `position: absolute` | 脱离文档流，不影响主终端布局 |
| `visibility: hidden` | 不可见，但保持布局占位和尺寸 |
| `pointer-events: none` | 防止意外交互 |
| `z-index: -1` | 确保不遮挡主终端和侧边栏 |

### 3.3 Bug 修复策略二：suppressResize 标记

非聚焦终端的 `XTermRenderer` 接收 `suppressResize={true}`：

- 不发送 PTY resize 信号（IPC `terminal:resize`，接口不变）
- 不触发 fitAddon.fit()
- 不响应 ResizeObserver 回调
- 回到 Tiling 模式后，标记清除，触发一次 fit

**设计理由**：即使 visibility:hidden 保持了尺寸不变，suppressResize 作为额外保险，确保隐藏终端绝不会向后端发送错误的 resize 信号。

---

## 4. 过渡动画

### 4.1 Bug 修复策略三：CSS Variables 统一动画时间

**旧问题**：JS setTimeout 和 CSS animation duration 分别硬编码不同值，存在时间差导致动画未完成就切状态。

**新设计**：CSS variables 定义权威时间，JS 常量与之同步。

```css
:root {
  --focus-enter-duration: 300ms;
  --focus-exit-duration: 250ms;
}
```

### 4.2 JS 常量（与 CSS Variables 同步）

定义在 `constants.ts` 中：

```typescript
const FOCUS_ENTER_DURATION = 300;  // 与 CSS --focus-enter-duration 一致
const FOCUS_EXIT_DURATION = 250;   // 与 CSS --focus-exit-duration 一致
const FOCUS_ENTER_BUFFER = 50;     // 余量，防止动画未完成就切状态
const FOCUS_EXIT_BUFFER = 50;
```

**使用方式**：`setTimeout(callback, FOCUS_ENTER_DURATION + FOCUS_ENTER_BUFFER)` = 350ms。

### 4.3 进入动画

**CSS 动画**：`focusFadeIn`

```css
@keyframes focusFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

- 持续时间：`var(--focus-enter-duration)` = 300ms
- 缓动函数：ease-out

**JS 过渡管理**：
1. 设置 `focusTransition = 'entering'`
2. 应用 `focusFadeIn` 动画
3. `setTimeout(FOCUS_ENTER_DURATION + FOCUS_ENTER_BUFFER)`（350ms）后：
   - 设置 `focusTransition = 'idle'`
   - 过渡完成

### 4.4 退出动画

**CSS 动画**：`focusFadeIn` reverse

```css
animation: focusFadeIn var(--focus-exit-duration) ease-in reverse;
```

- 持续时间：`var(--focus-exit-duration)` = 250ms
- 反向播放：从 `opacity: 1` 到 `opacity: 0`

**JS 过渡管理**：
1. 设置 `focusTransition = 'exiting'`
2. 应用 reverse 动画
3. `setTimeout(FOCUS_EXIT_DURATION + FOCUS_EXIT_BUFFER)`（300ms）后：
   - 设置 `focusTransition = 'idle'`
   - 切回 Tiling 模式（`focusedId = null`）
   - 所有终端取消 suppressResize，触发 fit

### 4.5 focusTransition 三阶段状态

| 值 | 含义 | 期间禁止的操作 |
|-----|------|---------------|
| `'idle'` | 无过渡 | 无限制 |
| `'entering'` | 正在进入 Focused | 禁止退出、禁止切换聚焦目标 |
| `'exiting'` | 正在退出 Focused | 禁止进入、禁止切换聚焦目标 |

状态流转：`idle` → `entering` → `idle`（进入完成）→ `exiting` → `idle`（退出完成）

---

## 5. 前端实现要点

### 5.1 CSS 新增内容

| 内容 | 说明 |
|------|------|
| `.focus-cell--hidden` 类 | position: absolute + visibility: hidden + pointer-events: none（见 3.2） |
| `--focus-enter-duration` variable | 300ms，进入动画时间 |
| `--focus-exit-duration` variable | 250ms，退出动画时间 |
| `@keyframes focusFadeIn` | 进入/退出复用的淡入缩放动画 |

### 5.2 JS 常量（constants.ts）

| 常量 | 值 | 说明 |
|------|-----|------|
| `FOCUS_ENTER_DURATION` | 300 | 与 `--focus-enter-duration` 同步 |
| `FOCUS_EXIT_DURATION` | 250 | 与 `--focus-exit-duration` 同步 |
| `FOCUS_ENTER_BUFFER` | 50 | 进入动画余量 |
| `FOCUS_EXIT_BUFFER` | 50 | 退出动画余量 |

### 5.3 三个 bug 修复策略汇总

| # | 策略 | 修复的问题 | 实现层 |
|---|------|-----------|--------|
| 1 | visibility:hidden 替代 1x1px | 非聚焦终端 ResizeObserver 错误触发 → fit 计算错误 → buffer rewrap → 滚动位置丢失 | CSS |
| 2 | CSS variables 统一动画时间 | JS setTimeout 与 CSS animation 时间差 → 动画未完成就切状态 → 视觉闪烁 | CSS + JS |
| 3 | suppressResize 标记 | 隐藏终端向后端发送错误 resize → PTY 列宽被改乱 | React props |

---

## 6. 侧边栏交互

### 6.1 侧边栏组件

`TerminalSidebar` 显示非聚焦终端的 compact 缩略视图：

```
TerminalSidebar
├── CompactTile #1（终端 A）
│   ├── 状态点
│   ├── 名称 / CWD
│   └── 缩略终端预览
├── CompactTile #2（终端 B）
└── CompactTile #3（终端 C）
```

- 每个 CompactTile 高度固定
- 超过 3 个时侧边栏可滚动
- CompactTile 内的终端使用 suppressResize 模式

### 6.2 点击切换

**前置条件**：Focused 模式下

**操作**：用户点击侧边栏中的某个 CompactTile

**系统行为**：
1. 触发 `onSidebarClick(clickedId)` 回调
2. `focusedId` 更新为被点击的终端 ID
3. 原主终端移入侧边栏（设置 suppressResize）
4. 新主终端从侧边栏移出（取消 suppressResize，触发 fit）
5. 触发 `muxvo:sidebar-refit` 自定义事件
6. 新主终端的 XTerm 执行 fit 适配新尺寸

### 6.3 切换限制

- `focusTransition !== 'idle'` 时，侧边栏点击无效
- 防止动画过程中切换导致视觉异常

---

## 7. 退出方式

### 7.1 Esc 键退出

**前置条件**：
- Focused 模式
- 焦点不在 xterm 输入区域内
- `focusTransition === 'idle'`

**操作**：按 Esc 键

**系统行为**：
1. 触发退出动画（见 4.4 节）
2. 动画完成后切回 Tiling 模式
3. 所有终端取消 suppressResize
4. 所有终端触发 fit 适配 Tiling 布局
5. **滚动位置保持不变**（visibility:hidden 策略确保）

### 7.2 注意事项

- 如果焦点在 xterm 内，Esc 键由 xterm 消费（如 Claude Code 的 Esc to cancel）
- 只有焦点在 Tile header 或 Grid 容器上时，Esc 才触发退出
- 用户可以先点击 header 区域使焦点离开 xterm，再按 Esc 退出

---

## 8. WaitingInput 浮动通知

### 8.1 触发条件

- 当前处于 Focused 模式
- **非聚焦终端**处于 `WaitingInput` 状态（由后端通过 IPC Push 事件提供，不在重写范围）
- 聚焦终端自身的 WaitingInput 不触发浮动通知（因为用户已经看到了）

### 8.2 通知组件

`WaitingInputNotification` 显示在 Focused 模式的**顶部区域**：

```
┌─────────────────────────────────────────────────┐
│ ⚠ "Terminal {name}" 正在等待输入      [切换]     │
└─────────────────────────────────────────────────┘
```

| 元素 | 说明 |
|------|------|
| 图标 | 琥珀色警告图标 |
| 文案 | 终端名称 + "正在等待输入" |
| 切换按钮 | 点击后切换聚焦到该终端 |

### 8.3 多终端等待

如果多个非聚焦终端同时处于 WaitingInput：
- 显示最早进入 WaitingInput 的终端
- 通知中显示总数："还有 N 个终端等待输入"
- 切换按钮可依次切换

### 8.4 自动消失

- 等待终端收到用户输入 → 状态恢复 Running → 通知消失
- 用户通过通知切换到该终端 → 通知消失（因为它变成了聚焦终端）
- 等待终端被关闭 → 通知消失

### 8.5 动画

- 通知从顶部滑入（`translateY(-100%) → translateY(0)`）
- 消失时滑出
- 持续显示时有轻微的呼吸脉动效果
