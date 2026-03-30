# 模块 06：视觉效果 — 前端 CSS 动画与状态映射

> **所属 PRD**：Muxvo 终端 Tab — 前端 UI 重写
> **模块**：视觉效果
> **实现文件**：`src/renderer/components/terminal/TileEffects.css`、`src/renderer/components/terminal/useTileEffects.ts`

> **范围声明**：本模块仅涉及前端 UI 层（CSS + React）。终端进程状态数据由后端通过 `terminal:state-change` Push 事件推送，前端不改变状态产生逻辑。

---

## 1. 状态指示点

### 1.1 状态-样式映射表

状态数据由后端推送（不变），前端仅负责映射为 CSS Class 和动画。

| 进程状态 | CSS Class | 颜色 | 动画 | 说明 |
|---------|-----------|------|------|------|
| Created | `tile-status--idle` | var(--text-muted)（灰色） | 无 | 初始状态 |
| Starting | `tile-status--idle` | var(--text-muted) | 无 | 短暂过渡态 |
| Running | `tile-status--running` | var(--success)（绿色 #22c55e） | `statusPulse` 2s | 正常运行 |
| Busy | `tile-status--running` | var(--success) | `statusPulse` 2s | 与 Running 视觉一致 |
| WaitingInput | `tile-status--waiting` | #ef4444（红色） | `statusPulse` 1s（加速） | 等待用户输入 |
| Stopping | `tile-status--idle` | var(--text-muted) | 无 | 短暂过渡态 |
| Stopped | `tile-status--idle` | var(--text-muted) | 无 | 进程已退出 |
| Disconnected | `tile-status--idle` | var(--text-muted) | 无 | PTY 断开 |
| Failed | `tile-status--idle` | var(--text-muted) | 无 | 启动失败 |

映射逻辑位于 `terminal-process-ui-map.ts`（共享层），前端通过 `onStateChange` Push 事件接收状态变化后查表渲染。

### 1.2 statusPulse 动画

```css
@keyframes statusPulse {
  0%, 100% {
    box-shadow: 0 0 6px var(--success);
  }
  50% {
    box-shadow: 0 0 12px var(--success), 0 0 24px rgba(74, 222, 128, 0.3);
  }
}
```

- 2s 周期：Running / Busy 状态使用
- 1s 周期：WaitingInput 状态使用（加速呼吸，提升紧迫感）
- `ease-in-out` 缓动

---

## 2. WaitingInput 视觉效果

WaitingInput 是终端最重要的视觉提示，多层叠加确保用户注意到。

### 2.1 Tile 边框脉动

```css
@keyframes borderGlow {
  0%, 100% {
    border-color: rgba(239, 68, 68, 0.7);
    outline-color: rgba(239, 68, 68, 0.2);
  }
  50% {
    border-color: rgba(239, 68, 68, 1);
    outline-color: rgba(239, 68, 68, 0.5);
  }
}

.tile--waiting {
  animation: borderGlow 2.5s ease-in-out infinite;
  border: 2px solid rgba(239, 68, 68, 0.7);
  outline-color: rgba(239, 68, 68, 0.2);
}
```

- 2.5s 周期：红色边框 + outline 脉动
- 使用 outline（不被 overflow:hidden 裁剪）而非额外的 box-shadow

### 2.2 双状态叠加（选中/聚焦 + WaitingInput）

当终端同时处于选中/聚焦状态和 WaitingInput 状态时：

```css
@keyframes outlineGlow {
  0%, 100% { outline-color: rgba(239, 68, 68, 0.3); }
  50%      { outline-color: rgba(239, 68, 68, 0.7); }
}

.tile--waiting.tile-selected,
.tile--waiting.tile-focused {
  animation: outlineGlow 2.5s ease-in-out infinite;
}
```

- 保持琥珀色选中边框不变
- 红色 outline 脉动叠加在琥珀色边框外侧

### 2.3 WaitingInput Badge

```css
.tile-waiting-badge {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: #ef4444;
  min-width: 18px;
  height: 18px;
  border-radius: 50%;
  animation: badgePulse 1.5s ease-in-out infinite;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
}
```

- 红色圆形 badge，显示在 Tile Header 右侧
- `badgePulse` 动画：opacity 0.6~1 循环，1.5s 周期

### 2.4 浮动通知（WaitingInputNotification）

当用户离开终端 Tab（或在聚焦模式下看不到等待终端）时，显示全局浮动通知：

| 属性 | 值 |
|------|------|
| 位置 | `position: fixed; bottom: 16px; right: 16px; z-index: 200` |
| 内容 | `"1 terminal waiting for input"` / `"N terminals waiting for input"`（i18n） |
| 红点 | 8px 圆点 + `waitingDotPulse` 动画 |
| 关闭 | 右上角 X 按钮 |
| 点击 | 切换回终端 Tab |
| 显示条件 | `waitingCount > 0 && overlayActive`（有等待 + 用户看不到终端） |

---

## 3. Tile 基础样式

### 3.1 容器

```css
.tile {
  background: var(--bg-card);
  border-radius: 10px;
  border: 2px solid var(--border);
  outline: 3px solid transparent;
  outline-offset: 2px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), 0 12px 40px rgba(0, 0, 0, 0.15);
  transition: box-shadow 0.3s ease, border-color 0.3s ease,
              filter 0.3s ease, outline-color 0.3s ease;
}
```

### 3.2 Hover 效果

```css
.tile:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}
```

### 3.3 光泽效果（Gloss Overlay）

```css
.tile::after {
  background: radial-gradient(
    circle at var(--mx, 50%) var(--my, 50%),
    rgba(255, 255, 255, 0.15) 0%,
    transparent 50%
  );
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}
```

- `--mx` / `--my` CSS 变量由 `handleMouseMove` 实时更新
- 鼠标位置处显示径向渐变光泽

### 3.4 Header

```css
.tile-header {
  padding: 6px 10px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border);
  gap: 8px;
}
```

---

## 4. Tile 状态变体

### 4.1 状态 Class 对照表

| 状态 | CSS Class | 视觉变化 |
|------|-----------|---------|
| 默认 | `.tile` | 标准阴影 + 灰色边框 |
| 选中 | `.tile-selected` | 琥珀色边框 + 名称变琥珀色 |
| 聚焦 | `.tile-focused` | 琥珀色边框发光 + 增强阴影 + z-index 100 |
| 等待输入 | `.tile--waiting` | 红色边框脉动 2.5s |
| 拖拽中 | `.tile.dragging` | opacity 0.4 |
| 拖拽目标 | `.tile.drag-over` | 琥珀色边框发光 |

### 4.2 选中态

```css
.tile-selected {
  border-color: var(--accent);
}
.tile-selected .tile-name {
  color: var(--accent);
}
```

### 4.3 聚焦态

```css
.tile-focused {
  height: 100%;
  z-index: 100;
  border-color: var(--border-focus);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5),
              0 0 80px rgba(232, 167, 72, 0.06);
}
.tile-focused .tile-name {
  color: var(--accent);
}
```

### 4.4 拖拽态

```css
.tile.dragging {
  opacity: 0.4;
}
.tile.drag-over {
  border-color: var(--accent) !important;
  box-shadow: 0 0 0 2px rgba(232, 167, 72, 0.18),
              0 4px 16px rgba(0, 0, 0, 0.3) !important;
}
```

---

## 5. 入场动画

### 5.1 tileEnter 动画

```css
@keyframes tileEnter {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.tile-enter {
  animation: tileEnter var(--tile-enter-duration, 600ms) cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--stagger-index, 0) * 50ms);
}
```

| 参数 | 值 |
|------|------|
| 持续时间 | `var(--tile-enter-duration)` = 600ms |
| 缓动 | `cubic-bezier(0.16, 1, 0.3, 1)`（spring-like） |
| 起始状态 | opacity: 0, translateY(40px), scale(0.95) |
| 结束状态 | opacity: 1, translateY(0), scale(1) |

### 5.2 交错延迟（Stagger）

- 每个 tile 的 `--stagger-index` 由 `staggerIndex` prop 设置
- 延迟：`staggerIndex * 50ms`
- 首次渲染时全部 tile 交错播放
- 后续新增 tile 单独播放（staggerIndex = 新 tile 的数组索引）

### 5.3 动画清理

入场动画完成后移除 `.tile-enter` class（`onAnimationEnd` 回调）。
**原因**：`.tile-enter` 的 `tileEnter` animation 会覆盖 `.tile--waiting` 的 `borderGlow` animation（CSS 级联顺序冲突）。移除后 borderGlow 正常工作。

---

## 6. 聚焦模式过渡动画

### 6.1 三阶段状态

| 阶段 | `focusTransition` 值 | 持续时间 | 说明 |
|------|---------------------|---------|------|
| 进入中 | `'entering'` | 400ms（JS timer） | 聚焦 tile 渐入，非聚焦 tile 保持 grid 位置 |
| 退出中 | `'exiting'` | 350ms（JS timer） | 聚焦 tile 渐出，非聚焦 tile 恢复 grid 位置 |
| 空闲 | `'idle'` | — | 动画完成，正常交互 |

### 6.2 进入动画

```css
@keyframes focusFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.focus-cell--entering.focus-cell--main {
  animation: focusFadeIn var(--focus-enter-duration, 300ms) ease both;
}
```

- 聚焦 tile 作为 `position: absolute` overlay 渐入（z-index: 10）
- 非聚焦 tile 保持原 grid 位置（不动），避免布局跳动
- 非聚焦 tile 设 `pointer-events: none` 防止误点击

### 6.3 退出动画

```css
.focus-cell--exiting.focus-cell--main {
  animation: focusFadeIn var(--focus-exit-duration, 250ms) ease reverse both;
}

.focus-cell--restoring {
  animation: focusFadeIn var(--focus-exit-duration, 250ms) ease both;
  pointer-events: none;
}
```

- 聚焦 tile 渐出（reverse focusFadeIn）
- 非聚焦 tile 恢复到 grid 位置并渐入
- 恢复期间 `pointer-events: none` 防止误操作

### 6.4 终端内容隐藏

过渡期间隐藏终端内容，防止 xterm refit 导致 1 帧闪烁：

```css
.focus-cell--entering .tile-terminal,
.focus-cell--exiting .tile-terminal {
  opacity: 0 !important;
  transition: none !important;
}

.focus-cell--main .tile-terminal {
  transition: opacity var(--content-fade-duration, 200ms) ease;
}
```

### 6.5 非聚焦 tile 隐藏（idle 态）

```css
.focus-cell--hidden {
  visibility: hidden;
  pointer-events: none;
}
```

**重写修正**：旧版使用 `width: 1px; height: 1px; overflow: hidden; opacity: 0` 模拟隐藏，存在布局计算开销。新版改用 `visibility: hidden`，语义正确、性能更优，且保持 DOM 挂载（XTermRenderer 不销毁）。

---

## 7. 关闭确认对话框

### 7.1 触发条件

关闭终端时检测到有前台进程运行 → 弹出 CloseConfirmDialog。前台进程检测由后端提供（`terminal:get-foreground-process`，接口不变），前端仅负责 UI 展示。

### 7.2 布局

```css
.close-confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
}

.close-confirm-dialog {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 32px 40px;
  min-width: 400px;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
```

### 7.3 内容

| 元素 | 说明 |
|------|------|
| 提示文案 | i18n `close.confirm`，15px，居中 |
| 取消按钮 | 透明背景，hover 轻微高亮 |
| 确认按钮 | 琥珀色背景（var(--accent)），深色文字 |

### 7.4 交互

- 点击遮罩 → 取消（同取消按钮）
- 点击对话框内部 → 不冒泡到遮罩

---

## 8. CSS Variables 体系

### 8.1 动画时间变量（:root 级别定义）

```css
:root {
  --focus-enter-duration: 300ms;
  --focus-exit-duration: 250ms;
  --tile-enter-duration: 600ms;
  --content-fade-duration: 200ms;
}
```

| 变量 | 值 | 对应 JS 常量 | 同步说明 |
|------|------|-------------|---------|
| `--focus-enter-duration` | 300ms | `FOCUS_ENTER_MS` | JS timer 与 CSS 动画时间必须一致 |
| `--focus-exit-duration` | 250ms | `FOCUS_EXIT_MS` | JS timer 与 CSS 动画时间必须一致 |
| `--tile-enter-duration` | 600ms | — | 纯 CSS 动画，无对应 JS 常量 |
| `--content-fade-duration` | 200ms | — | 纯 CSS 动画，无对应 JS 常量 |

**CSS-JS 同步关系**：JS 端 `constants.ts` 定义 `FOCUS_ENTER_MS = 300` 和 `FOCUS_EXIT_MS = 250`，用于 `setTimeout` 控制过渡阶段切换。CSS 端使用对应 CSS variables 控制动画时长。两者必须保持一致，否则会出现动画时间不匹配导致的视觉 glitch（如动画未完成就切换状态、或动画已完成但状态延迟切换）。

### 8.2 颜色变量（部分）

| 变量 | Dark 值 | Light 值 |
|------|---------|---------|
| `--bg-card` | 深灰色 | 浅白色 |
| `--bg-primary` | 深色 | 浅色 |
| `--border` | 暗灰色 | 浅灰色 |
| `--accent` | #e8a748（琥珀色） | #d4943a |
| `--success` | #22c55e（绿色） | #22c55e |
| `--text-primary` | 浅灰 | 深灰 |
| `--text-secondary` | 中灰 | 中灰 |
| `--text-muted` | 暗灰 | 浅灰 |

---

## 9. Dark/Light 主题适配

### 9.1 自动适配

大部分颜色通过 CSS variables 适配，主题切换时变量值自动更新，无需额外 CSS 规则。

### 9.2 手动覆写

部分元素有 `[data-theme="light"]` 选择器覆写：

```css
/* FAB 按钮 */
[data-theme="light"] .terminal-grid__fab {
  background: linear-gradient(135deg, #d4943a, #c4842a);
  color: #fff;
  box-shadow: 0 4px 16px rgba(196, 132, 42, 0.3), 0 1px 4px rgba(0, 0, 0, 0.15);
}

/* 文件拖拽 overlay */
[data-theme="light"] .xterm-file-drop-overlay {
  background: rgba(196, 132, 42, 0.06);
  border-color: rgba(196, 132, 42, 0.5);
}
```

### 9.3 动画颜色

WaitingInput 相关动画颜色（红色 #ef4444）在 dark/light 主题下保持一致，不需要覆写——红色在两种主题下都有足够对比度。

---

## 10. 重写文件清单

### 10.1 TileEffects.css — 从零重写

| 项目 | 说明 |
|------|------|
| 旧文件行数 | 571 行 |
| 重写策略 | 从零重写，不在旧文件基础上修改 |
| 重写原因 | 旧 CSS 存在大量历史补丁、冗余规则和注释掉的代码，重写可统一 CSS variables 体系、消除级联冲突 |

重写要点：
- 所有动画时间统一使用 CSS variables（`--focus-enter-duration` 等），不硬编码数值
- `focus-cell--hidden` 改用 `visibility: hidden` 替代旧版 `1px + overflow:hidden` hack
- 清理重复的 `@keyframes` 定义（旧文件存在同名动画多处定义）
- 所有 Tile 状态变体按本文档第 4 节定义的 Class 名实现

### 10.2 保留的 CSS Class 名

以下 CSS class 名被组件直接引用，**重写时不能改名**：

**TerminalTile.tsx 引用**：`tile`, `tile-enter`, `tile-selected`, `tile-focused`, `tile--waiting`, `tile-header`, `tile-status`, `tile-terminal`, `tile-name`, `tile-cwd`, `dragging`, `drag-over`

**TerminalGrid.tsx 引用**：`terminal-grid__fab`, `focus-cell--main`, `focus-cell--hidden`, `focus-cell--entering`, `focus-cell--exiting`, `focus-cell--restoring`

---

## 11. 与其他模块的关系

| 模块 | 本模块提供 |
|------|-----------|
| `01-terminal-lifecycle` | 状态指示点颜色/动画映射 |
| `02-tiling-mode` | Tile 基础样式、入场动画、拖拽样式 |
| `03-focused-mode` | 聚焦过渡动画、focus-cell 布局 CSS |
| `04-list-mode` | 状态指示点样式、WaitingInput 脉动（复用） |
| `05-xterm-rendering` | 文件拖拽 overlay 样式、搜索栏样式 |
