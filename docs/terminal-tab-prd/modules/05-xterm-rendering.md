# 模块 05：XTerm 渲染 — 前端终端实例管理

> **所属 PRD**：Muxvo 终端 Tab - PRD V1.0（前端 UI 重写）
> **模块编号**：05
> **优先级**：P0（重写）
> **实现文件**：`src/renderer/components/terminal/XTermRenderer.tsx`、`src/renderer/utils/terminal-addon-manager.ts`

**本模块仅涉及前端 UI 层。终端输入/输出通过 IPC 接口与后端通信（接口不变），后端不在重写范围。**

---

## 1. 终端实例创建

### 1.1 库依赖

- 核心：`@xterm/xterm`
- Addon：通过 `createAddonManager()` 统一管理（见 1.3）

### 1.2 默认配置

创建时使用 `DEFAULT_TERMINAL_CONFIG`（定义于 `src/renderer/stores/terminal-config.ts`）：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `cursorBlink` | `true` | 光标闪烁 |
| `cursorStyle` | `'block'` | 光标样式（block / underline / bar） |
| `fontSize` | `14` | 字体大小（px） |
| `fontFamily` | `TERMINAL_FONT_FAMILY` | 等宽字体族（见 `src/shared/constants/fonts.ts`） |
| `themeName` | `'dark'` | 主题名，通过 `resolveTerminalTheme()` 转为 xterm theme 对象 |
| `allowProposedApi` | `true` | 必须开启，Unicode11Addon 和 ImageAddon 依赖此选项 |

### 1.3 Addon 加载

通过 `createAddonManager(term)` 统一管理 addon 生命周期（该模块设计良好，不在重写范围）：

| Addon | 用途 | 加载方式 | 失败策略 |
|-------|------|---------|---------|
| **FitAddon** | 自适应容器尺寸 | 同步加载 | 必须成功 |
| **Unicode11Addon** | Unicode 11 字符宽度表 | 同步加载 | 必须成功 |
| **WebglAddon** | GPU 加速渲染 | 同步加载 | 静默 fallback 到 Canvas 渲染 |
| **SearchAddon** | 终端内搜索 | 同步加载 | 必须成功 |
| **ImageAddon** | Sixel 图片支持 | 同步加载 | 静默跳过 |
| **LigaturesAddon** | 连字支持 | 动态 import（async） | 静默跳过 |

WebGL 上下文丢失时自动 dispose，可通过 `recoverWebgl()` 重新加载。

### 1.4 挂载与初始 Fit

```
term = new Terminal(config)
  → term.open(containerDiv)
  → addonManager.loadAll()
  → 双重 rAF → fitAddon.fit()
      → 如 cols ≤ 2（容器未布局完成）→ 200ms 后重试
```

**双重 rAF 原因**：确保容器的 CSS 布局（grid/flex）已经完成，FitAddon 能拿到正确的容器尺寸。

---

## 2. XTermRenderer.tsx 重写设计

### 2.1 旧架构问题

旧 XTermRenderer.tsx 的核心问题：
- **单个 284 行 useEffect**：所有逻辑（挂载、buffer 回放、fit、IO、事件监听）混在一个 useEffect 中
- **scrollTracker / frozen 机制**：为了解决 1x1px 隐藏导致的滚动位置丢失而引入的复杂 workaround，本身成为新 bug 的根因
- **syncScrollDataAttrs**：将滚动数据写入 DOM data 属性，E2E 测试依赖，但增加了每次滚动的开销

### 2.2 新架构：主组件 + 4 个单一职责 Hooks

```
XTermRenderer.tsx（主组件）
├── useTerminalFit       — 统一 fit 入口
├── useBufferReplay      — buffer 回放
├── useTerminalIO        — 输入/键盘
└── useTerminalEvents    — 外部事件响应
```

每个 hook 职责单一、边界清晰，便于独立测试和维护。

### 2.3 关键改进

| 改进 | 说明 |
|------|------|
| 移除 scrollTracker / frozen 机制 | 根因已被 visibility:hidden 策略消除（见模块 03），不再需要 workaround |
| 移除 syncScrollDataAttrs | 不再将滚动数据写入 DOM data 属性 |
| fit 管理统一到 useTerminalFit | 所有 fit 场景走 `requestFit()` 单一入口 |
| ResizeObserver 跳过 tiny 容器 | width < 10 \|\| height < 10 时直接跳过（容器正在被隐藏） |

---

## 3. Hook 详细设计

### 3.1 useTerminalFit — 统一 fit 入口

**职责**：管理所有 fit 相关逻辑，提供 `requestFit()` 单一入口。

| 功能 | 说明 |
|------|------|
| `requestFit()` | 所有需要 fit 的场景调用此函数，内部 rAF 防抖 |
| `fitWithScrollPreservation()` | fit 前保存滚动位置，fit 后恢复（替代旧的 fitPreservingScroll） |
| ResizeObserver | 监听容器尺寸变化，跳过 width < 10 \|\| height < 10 的 tiny 容器 |
| suppressResize 支持 | 当 `suppressResize=true` 时，跳过 fit 和 PTY resize |

**fit 流程**：

```
requestFit()
  → rAF 防抖（取消前一个待执行的 rAF）
  → fitWithScrollPreservation()
      ├── 1. 记录当前滚动位置
      │     ├── wasAtBottom = (viewportY >= baseY)
      │     └── offsetFromBottom = baseY - viewportY
      ├── 2. fitAddon.fit()
      └── 3. rAF →
            ├── wasAtBottom → scrollToBottom
            └── 非底部 → 恢复到相同 offsetFromBottom
```

**ResizeObserver 逻辑**：

```typescript
new ResizeObserver((entries) => {
  const { width, height } = entries[0].contentRect;
  if (width < 10 || height < 10) return;  // 跳过 tiny 容器
  requestFit();
});
```

### 3.2 useBufferReplay — buffer 回放

**职责**：挂载时回放历史 buffer，确保终端内容完整。

**流程**（Queue/Flush 模式）：

```
挂载
  ├── 1. 订阅 onOutput（实时数据 → pendingLiveData 数组暂存）
  ├── 2. 请求 getBuffer（IPC 接口不变，最大 64KB 历史数据）
  ├── 3. 历史数据到达：
  │     ├── stripPromptEolMark() 处理 prompt EOL 标记
  │     ├── term.write(历史数据)
  │     ├── flush pendingLiveData（逐条写入）
  │     └── bufferedDataWritten = true（后续实时数据直接写入）
  └── 4. requestFit() + scrollToBottom
```

| 步骤 | 操作 | 说明 |
|------|------|------|
| 1 | 订阅 `window.api.terminal.onOutput`（IPC 接口不变） | 早于 getBuffer 订阅，防止丢数据 |
| 2 | 调用 `window.api.terminal.getBuffer(id)`（IPC 接口不变） | 异步，返回最大 64KB 历史 |
| 3 | 历史写入 + flush 暂存 | 保证顺序：历史 → 实时 |
| 4 | requestFit() + scrollToBottom | 确保列宽正确且显示最新内容 |

**防护**：
- `disposed` 守卫：异步回调到达时检查组件是否已卸载
- `stripPromptEolMark()`：清理 prompt 尾部标记，避免渲染异常字符

### 3.3 useTerminalIO — 输入 / 键盘

**职责**：处理用户输入和键盘快捷键拦截。

**终端输入**：

```typescript
term.onData((data) => {
  window.api.terminal.write(terminalId, data);  // IPC 接口不变
});
```

**键盘快捷键拦截**（通过 `term.attachCustomKeyEventHandler()`）：

| 快捷键 | 动作 | 传递给终端 |
|--------|------|-----------|
| Cmd/Ctrl + F | 切换搜索栏显示/隐藏 | 否（return false） |
| Cmd/Ctrl + = / + | 全局放大（dispatch `muxvo:global-zoom-request` in） | 否 |
| Cmd/Ctrl + - | 全局缩小 | 否 |
| Cmd/Ctrl + 0 | 重置缩放 | 否 |
| 其他按键 | 不拦截 | 是（return true） |

### 3.4 useTerminalEvents — 外部事件响应

**职责**：监听全局自定义事件，响应 UI 变化。

| 事件 | 触发场景 | 行为 |
|------|---------|------|
| `muxvo:theme-change` | 用户切换 dark/light 主题 | 更新 `term.options.theme` |
| `muxvo:global-zoom` | 全局缩放级别变化（webFrame.setZoomFactor） | requestFit() |
| `muxvo:terminal-refit` | FileTempView overlay 关闭 | requestFit() + 强制重发 PTY resize（IPC 接口不变） |
| `muxvo:sidebar-refit` | 侧边栏布局变化（仅 suppressResize 实例） | fitAddon.fit()（不发 PTY resize） |

**配置加载**（也在此 hook 中）：

挂载时异步加载持久化配置（IPC 接口不变）：

```typescript
window.api.app.getConfig().then((result) => {
  if (result?.data?.terminal) {
    const cfg = { ...DEFAULT_TERMINAL_CONFIG, ...result.data.terminal };
    // 应用到 term.options
  }
});
```

配置加载后触发一次 requestFit()（字体变化可能改变 cols/rows）。

---

## 4. 搜索功能

### 4.1 触发方式

- **Cmd+F**（Mac）/ **Ctrl+F**（其他平台）切换 TerminalSearchBar 显示/隐藏
- SearchBar 组件挂载在 XTermRenderer 内部（`position: absolute`，右上角）

### 4.2 搜索交互

| 操作 | 效果 |
|------|------|
| 输入关键词 | SearchAddon 高亮匹配项 |
| Enter | 跳转到下一个匹配项（`findNext`） |
| Shift + Enter | 跳转到上一个匹配项（`findPrevious`） |
| 点击 ▲ 按钮 | 上一个匹配项 |
| 点击 ▼ 按钮 | 下一个匹配项 |
| Escape | 清除高亮 + 关闭搜索栏 |
| 点击 ✕ 按钮 | 清除高亮 + 关闭搜索栏 |

### 4.3 SearchBar 样式

- 容器：`position: absolute; top: 4px; right: 8px; z-index: 20`
- 背景：`var(--bg-card)`，带边框和阴影
- 输入框：180px 宽，mono 字体，focus 时边框变为 accent 色
- 按钮：透明背景，hover 时高亮

---

## 5. 文件拖拽

### 5.1 支持的数据源

| 来源 | DataTransfer 类型 | 优先级 |
|------|-------------------|-------|
| Muxvo 内部文件拖拽 | `application/x-muxvo-file-paths`（JSON 数组） | 1（优先） |
| 系统 Finder 拖拽 | `Files`（DataTransferItemList） | 2 |

### 5.2 拖拽流程

| 阶段 | 事件 | 行为 |
|------|------|------|
| 进入 | dragEnter | `dragEnterCount++`，显示 overlay |
| 悬停 | dragOver | `dropEffect = 'copy'`，阻止默认行为 |
| 子元素进出 | dragLeave | `dragEnterCount--`，归零时隐藏 overlay |
| 松手 | drop | 提取路径 → shell 转义 → 写入终端（IPC 接口不变） |

### 5.3 路径处理

```
extractFilePaths(event)
  → shellEscapePaths(paths)    // 处理空格、特殊字符
  → window.api.terminal.write(terminalId, escapedPaths)
```

### 5.4 Drop Overlay

- 拖入时显示 `"Drop to insert path"` 文案
- 样式：琥珀色虚线边框 + 半透明背景
- fadeIn 动画 0.15s
- `pointer-events: none`（不阻挡拖拽事件）

---

## 6. 配置项

### 6.1 可配置项

| 配置项 | 影响 |
|--------|------|
| `themeName` | 终端配色方案（通过 `resolveTerminalTheme()` 转换） |
| `fontSize` | 字体大小 |
| `fontFamily` | 字体族 |
| `cursorStyle` | 光标样式（block / underline / bar） |
| `cursorBlink` | 光标是否闪烁 |

配置加载后触发一次 requestFit()（字体变化可能改变 cols/rows）。

---

## 7. 生命周期

### 7.1 挂载

```
组件挂载
  ├── new Terminal(config)
  ├── term.open(containerDiv)
  ├── addonManager.loadAll()
  ├── useTerminalIO: attachCustomKeyEventHandler + onData
  ├── 双重 rAF → requestFit()
  ├── useTerminalEvents: 异步加载 config → 应用 → requestFit()
  ├── useBufferReplay: 订阅 onOutput + getBuffer → buffer 回放
  ├── useTerminalFit: ResizeObserver → requestFit()
  ├── useTerminalFit: term.onResize → PTY resize（IPC 接口不变）
  └── useTerminalEvents: 注册全局事件监听（theme/zoom/refit）
```

### 7.2 卸载

```
组件卸载
  ├── disposed = true
  ├── unsubOutput()               // 取消 onOutput 订阅
  ├── cancelAnimationFrame        // 取消待执行的 resize rAF
  ├── observer.disconnect()       // 断开 ResizeObserver
  ├── removeEventListener × 4     // theme/zoom/refit/sidebarRefit
  ├── scrollDisposable.dispose()  // 取消 onScroll 订阅（如仍需要）
  ├── addonManager.disposeAll()   // 逆序 dispose 所有 addon
  └── term.dispose()              // 销毁 xterm 实例
```

### 7.3 terminalId 变化

`terminalId` 是 useEffect 的唯一依赖项。当 terminalId 变化时，整个 xterm 实例被销毁并重建。

---

## 8. PTY Resize 通知

```typescript
term.onResize(({ cols, rows }) => {
  if (!suppressResize) {
    window.api.terminal.resize(terminalId, cols, rows);  // IPC 接口不变
  }
});
```

- `suppressResize` 为 `true` 时（Focused 模式非聚焦终端、List 模式非选中终端）不发送 resize
- 防止隐藏终端的 resize 影响主进程 PTY 的列宽
- IPC 调用方式重组（从单个 useEffect 拆分到 useTerminalFit hook 中），但接口本身不变

---

## 9. E2E 可测试性

XTermRenderer 在容器 div 上暴露 `data-*` 属性供 Playwright 断言：

| 属性 | 值 | 更新时机 |
|------|------|---------|
| `data-terminal-id` | 终端 ID | 挂载时设置 |

**注意**：旧版的 `data-viewport-y` 和 `data-base-y`（通过 syncScrollDataAttrs 更新）已移除。E2E 测试如需验证滚动位置，应通过 Playwright 执行 `page.evaluate()` 直接读取 xterm buffer 状态。
