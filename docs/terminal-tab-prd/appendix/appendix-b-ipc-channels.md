# 附录 B：IPC 接口契约（不变）— 前端调用参考

> **所属 PRD**：Muxvo 终端 Tab — 前端 UI 重写
> **文件类型**：附录

> **范围声明**：本附录定义的 IPC 接口**不在本次前端重写范围内**。前端重写必须遵守这些接口契约，调用签名和返回值保持不变。后端 `terminal-handlers.ts` 和 `preload/index.ts` 均不改动。

---

## B.1 IPC 调用接口（Renderer → Main）

### B.1.1 invoke 方法（返回 Promise）— 不变

| 通道 | 参数 | 返回值 | 说明 | 状态 |
|------|------|--------|------|------|
| `terminal:create` | `{ cwd: string }` | `{ success: boolean, data: { id: string, pid: number } }` | 创建终端实例，spawn PTY | 不变 |
| `terminal:close` | `{ id: string, force?: boolean }` | `{ success: boolean }` | 关闭终端（`force=true` 跳过优雅关闭） | 不变 |
| `terminal:list` | — | `{ success: boolean, data: TerminalInfo[] }` | 列出所有终端信息 | 不变 |
| `terminal:get-state` | `{ id: string }` | `{ success: boolean, data: { state: string } }` | 获取终端进程状态 | 不变 |
| `terminal:get-buffer` | `{ id: string }` | `{ success: boolean, data: string }` | 获取终端历史输出 buffer | 不变 |
| `terminal:get-foreground-process` | `{ id: string }` | `{ success: boolean, data: { name: string, pid: number } }` | 获取当前前台进程信息 | 不变 |
| `terminal:update-cwd` | `{ id: string, cwd: string }` | `{ success: boolean }` | 更新终端 CWD | 不变 |

### B.1.2 send 方法（无返回值）— 不变

| 通道 | 参数 | 说明 | 状态 |
|------|------|------|------|
| `terminal:write` | `{ id: string, data: string }` | 向终端写入数据（用户键入或粘贴） | 不变 |
| `terminal:resize` | `{ id: string, cols: number, rows: number }` | 调整终端 PTY 尺寸 | 不变 |

---

## B.2 Push 事件（Main → Renderer）— 不变

| 事件通道 | 数据 | 触发时机 | 说明 | 状态 |
|---------|------|---------|------|------|
| `terminal:output` | `{ id: string, data: string }` | PTY 产生输出 | 终端输出数据流 | 不变 |
| `terminal:state-change` | `{ id: string, state: string, processName?: string }` | 进程状态变化 | 去抖 50ms | 不变 |
| `terminal:exit` | `{ id: string, code: number }` | PTY 退出 | 包含退出码 | 不变 |
| `terminal:cwd-changed` | `{ id: string, cwd: string }` | CWD 变化检测 | 前台进程变化时检测 | 不变 |

---

## B.3 自定义事件（窗口内 CustomEvent）— 不变

Renderer 进程内部通过 `window.dispatchEvent()` / `window.addEventListener()` 通信的自定义事件。

| 事件名 | Detail 数据 | 触发方 | 监听方 | 说明 | 状态 |
|--------|------------|--------|--------|------|------|
| `muxvo:theme-change` | `{ theme: 'dark' \| 'light' }` | App（Settings 切换） | 所有 XTermRenderer | 主题变更通知 | 不变 |
| `muxvo:global-zoom` | — | App（处理缩放后） | 所有 XTermRenderer | 全局缩放完成，触发 refit | 不变 |
| `muxvo:global-zoom-request` | `'in' \| 'out' \| 'reset'` | XTermRenderer（捕获快捷键） | App | 请求缩放 | 不变 |
| `muxvo:terminal-refit` | — | Panel 关闭时 | XTermRenderer | 面板关闭后终端需 refit | 不变 |
| `muxvo:sidebar-refit` | — | Sidebar 切换时 | XTermRenderer（compact 模式） | 侧边栏宽度变化后 refit | 不变 |

---

## B.4 Preload API 表面 — 不变

`window.api.terminal` 暴露的完整 API，类型定义在 `MuxvoAPI.terminal`。前端重写时通过此 API 与后端交互。

### B.4.1 invoke 方法（返回 Promise）— 不变

| 方法 | 签名 | 说明 | 状态 |
|------|------|------|------|
| `create` | `(cwd: string) => Promise<{ success, data: { id, pid } }>` | 创建终端 | 不变 |
| `close` | `(id: string, force?: boolean) => Promise<{ success }>` | 关闭终端 | 不变 |
| `list` | `() => Promise<{ success, data: TerminalInfo[] }>` | 列出终端 | 不变 |
| `getBuffer` | `(id: string) => Promise<{ success, data: string }>` | 获取 buffer | 不变 |
| `getState` | `(id: string) => Promise<{ success, data: { state } }>` | 获取状态 | 不变 |
| `getForegroundProcess` | `(id: string) => Promise<{ success, data: { name, pid } }>` | 获取前台进程 | 不变 |
| `updateCwd` | `(id: string, cwd: string) => Promise<{ success }>` | 更新 CWD | 不变 |

### B.4.2 send 方法（无返回值）— 不变

| 方法 | 签名 | 说明 | 状态 |
|------|------|------|------|
| `write` | `(id: string, data: string) => void` | 写入数据 | 不变 |
| `resize` | `(id: string, cols: number, rows: number) => void` | 调整尺寸 | 不变 |

### B.4.3 事件订阅（返回 unsubscribe 函数）— 不变

| 方法 | 回调参数 | 说明 | 状态 |
|------|---------|------|------|
| `onOutput` | `(event: { id, data }) => void` | 终端输出 | 不变 |
| `onStateChange` | `(event: { id, state, processName? }) => void` | 状态变化 | 不变 |
| `onExit` | `(event: { id, code }) => void` | 终端退出 | 不变 |
| `onListUpdated` | `(event: TerminalInfo[]) => void` | 终端列表更新 | 不变 |
| `onCwdChange` | `(event: { id, cwd }) => void` | CWD 变化 | 不变 |
| `onZoom` | `(event: { fontSize }) => void` | 缩放变化 | 不变 |

所有 `on*` 方法返回 `() => void` 类型的清理函数，在组件卸载时调用以取消订阅。

---

## B.5 业务约束常量 — 不变

| 约束名 | 值 | 说明 | 状态 |
|--------|-----|------|------|
| `MAX_TERMINALS` | `20` | 单实例最大终端数，超出时 `terminal:create` 返回错误 | 不变 |
| `OUTPUT_BUFFER_MAX_BYTES` | `65536`（64KB） | 每终端输出 buffer 上限，超出时截断头部 | 不变 |
| `GRACEFUL_CLOSE_TIMEOUT` | `5000ms` | 优雅关闭超时，超时后发送 SIGKILL | 不变 |
| `BELL_COOLDOWN_MS` | `3000ms` | Bell 字符冷却时间，防止频繁触发系统通知 | 不变 |
| `STATE_CHANGE_DEBOUNCE_MS` | `50ms` | 状态变化推送去抖，避免高频状态切换淹没 Renderer | 不变 |

### B.5.1 约束生效位置 — 不变

| 约束 | 检查位置 | 异常处理 | 状态 |
|------|---------|---------|------|
| `MAX_TERMINALS` | `terminal:create` handler（后端） | 返回 `{ success: false, error: 'MAX_TERMINALS_REACHED' }` | 不变 |
| `OUTPUT_BUFFER_MAX_BYTES` | Main 进程 output buffer 管理（后端） | 静默截断头部，保留最新输出 | 不变 |
| `GRACEFUL_CLOSE_TIMEOUT` | `terminal:close` handler（后端） | 超时后转入 Disconnected 状态 | 不变 |
| `BELL_COOLDOWN_MS` | Renderer 端 XTermRenderer（前端） | 冷却期内忽略 bell 事件 | 不变 |
| `STATE_CHANGE_DEBOUNCE_MS` | Main 进程 push 逻辑（后端） | 合并同 ID 的连续状态变化 | 不变 |

---

## B.6 前端调用方式

前端组件通过 `window.api.terminal.*` 调用后端接口。以下是典型的调用模式：

### B.6.1 创建终端

```typescript
// TerminalGrid.tsx 或 useTerminalManager hook 中
const result = await window.api.terminal.create(cwd);
if (result.success) {
  const { id, pid } = result.data;
  // 将新终端添加到本地状态
}
```

### B.6.2 订阅 Push 事件

```typescript
// XTermRenderer.tsx 中
useEffect(() => {
  const unsubOutput = window.api.terminal.onOutput(({ id, data }) => {
    if (id === terminalId) {
      xtermInstance.write(data);
    }
  });

  const unsubState = window.api.terminal.onStateChange(({ id, state, processName }) => {
    if (id === terminalId) {
      // 通过 terminal-process-ui-map.ts 映射为 CSS class
      updateTileStatus(state);
    }
  });

  return () => {
    unsubOutput();
    unsubState();
  };
}, [terminalId]);
```

### B.6.3 写入和调整尺寸

```typescript
// 用户键入时（无返回值，fire-and-forget）
window.api.terminal.write(terminalId, inputData);

// 终端容器尺寸变化时
window.api.terminal.resize(terminalId, cols, rows);
```
