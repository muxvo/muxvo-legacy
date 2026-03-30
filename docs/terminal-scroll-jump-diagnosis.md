# 终端回跳第一行 — 问题排查手册

> 最后更新：2026-03-30

## 问题描述

**现象**：终端自动跳到最开始的位置（viewportY=0），用户没有操作却看到最顶部的内容。有时伴随重复内容（同一条消息出现两次）。

**触发场景**：
- 终端在 Focused/Tiling/Sidebar 间切换（组件 unmount → remount）
- CC 的 TUI 模式每次重绘（发送 `\x1b[2J\x1b[3J\x1b[H`）
- 终端容器 resize（触发 CC 重绘）
- 长时间运行的终端在后台

## 根因链条

### CC TUI 重绘机制

CC（Claude Code）的 TUI 模式每次重绘时发送：
```
\x1b[2J    ← Clear entire screen
\x1b[3J    ← Clear scrollback buffer（ED3 - Erase Saved Lines）
\x1b[H     ← Cursor to home position
[full TUI content]  ← 重绘整个 UI（可能 1000+ 行，30-120KB）
```

`\x1b[3J` 清除 xterm 的 scrollback buffer，将 viewportY 重置为 0。CC 每隔几秒就会发送一次（TUI 刷新）、resize 后也会立即发送。

### Buffer Replay 与 Live Data 重叠（重复内容的根因）

终端组件挂载时的数据流：
```
1. subscribe IPC output → 收到的数据进 pendingLiveData 队列
2. fetch buffer        → 返回到 fetch 时刻的全部缓存（64KB 上限）
3. replay              → 写入 buffer + pendingLiveData 到 xterm
```

**问题**：subscribe 到 fetch 之间（约 29ms）的数据同时存在于 buffer 和 pendingLiveData。如果这段重叠数据不含 ED3（`\x1b[3J`），两份内容都被写入 xterm → 用户看到重复消息。

## 已尝试的方案（按时间顺序）

### 方案 1：过滤 `\x1b[3J`（ED3）— 废弃

**做法**：在 `term.write()` 前用正则 `STRIP_ED3_RE` 剥离 `\x1b[3J`。
**结果**：修复了跳顶，但导致 xterm scrollback 不清除 → CC 每次重绘的内容叠加在旧 scrollback 上 → 用户看到同一条消息出现两次。
**结论**：**废弃**。ED3 是 CC TUI 的正常行为，不能过滤。

### 方案 2：ED3 放行 + write callback + 严格 wasAtBottom — 不够

**做法**：让 `\x1b[3J` 正常执行。检测到含 ED3 的 write 时，如果 `wasAtBottom = (vY >= bY)`，在 write callback 中调用 `scrollToBottom()`。
**结果**：部分修复。但 scrollToBottom 后 vY 可能略小于 bY（如 vY=677 vs bY=684），严格 `>=` 判断导致误判为"不在底部" → 不执行 scrollToBottom → 仍跳顶。
**log 证据**：
```
bufScrollBottom vY=0 → afterVY=677 baseY=684
write:dangerSeq vY=677 bY=684        ← wasAtBottom = (677 >= 684) = FALSE
render:jump! renderPrevVY=677 → vY=0  ← 跳顶
```

### 方案 3：Buffer replay 不 flush pendingLiveData — 未验证

**做法**：buffer replay 时只写 buffer 数据，丢弃 pendingLiveData。
**理由**：buffer 已包含全部数据到 fetch 时刻，pendingLiveData 是其子集。
**状态**：代码分析推断，未经 log 直接验证。如果重复内容再次出现，优先验证此方向。

### 方案 4：wasAtBottom 容差放宽到 1 屏（rows）— 不够

**做法**：将 `vY >= bY` 改为 `bY - vY <= rows`（在 rows 行内视为"在底部"）。
**结果**：仍不够。
**log 证据**（2026-03-30 08:36:20 term-97587）：
```
resizeObs  310x540 → 711x538         ← 容器变大
fit        36x33 → 84x33             ← rows=33
write:danger vY=4956 bY=5000         ← bY-vY=44 > rows=33 → wasAtBottom=FALSE
render:jump! vY=4956 → vY=0 bY=4643  ← 跳顶
```

### 方案 5：ED3 后无条件 scrollToBottom — 当前方案 ✅

**做法**：检测到 ED3 的 write callback 中，**无条件**执行 `scrollToBottom()`，移除 wasAtBottom 判断。
**理由**：ED3 清除所有 scrollback 后，旧内容已不存在。vY=0 显示的是 CC header/logo，不是用户想看的内容。不管用户之前在哪，ED3 后 scrollToBottom 永远比留在 vY=0 好。
**代码**（XTermRenderer.tsx，live output handler）：
```typescript
const hadED3 = ED3_RE.test(event.data);
term.write(event.data, () => {
  if (hadED3) {
    term.scrollToBottom();
  }
});
```
**潜在副作用**：如果用户在 xterm scrollback 中手动往上翻看旧消息，CC 的下一次 TUI 重绘（几秒后）会把用户拉回底部。但这是 CC 的 ED3 行为导致的——旧 scrollback 已被清除，留在 vY=0 看 header 更糟。

### domMismatch 检测 — 已移除

**做法**：每 500ms 检查 DOM `.xterm-viewport` 的 scrollTop 是否与 xterm viewportY 一致。
**结果**：产生 87 万条误报。xterm v6 WebGL renderer 不使用 DOM scrollbar，scrollTop 始终为 0。
**结论**：**移除**。此检测在 xterm v6 下无效。

## 如果问题再次出现

### 第一步：确认是哪种问题

| 现象 | 类型 | 排查方向 |
|------|------|----------|
| 终端突然跳到最顶部 | 跳顶 | 查 render:jump / scrollPoll:jump |
| 往上翻看到同一条消息出现两次 | 重复内容 | 查 buffer replay + pendingLiveData |
| 终端切换后停在顶部不动 | mount 跳顶 | 查 bufReplay + bufScrollBottom |

### 第二步：读 log

```
~/.muxvo/logs/terminal-debug.log
```

日志自动轮转（500KB 上限，保留最新 200KB）。

### 搜索关键词

| 关键词 | 含义 | 优先级 |
|--------|------|--------|
| `render:jump!` | xterm onRender 检测到 viewportY 从 >5 跳到 0 | 最高 |
| `scrollPoll:jump!` | 500ms 轮询检测到大幅跳变 | 高 |
| `write:dangerSeq` | CC 发送了含 2J/3J/H 的 escape 序列 | 高 |
| `ringDump` | 跳变前的完整事件链（出现时必看） | 高 |
| `bufReplay` | buffer replay 开始（关注 bufBytes） | 中 |
| `bufScrollBottom` | buffer replay 后 scrollToBottom 的结果 | 中 |

### 排查命令

**场景 1：CC 交互中突然跳顶**
```bash
grep "render:jump\|scrollPoll:jump\|write:danger" ~/.muxvo/logs/terminal-debug.log | tail -20
```
然后找 ringDump：
```bash
grep -A 10 "ringDump.*term-XXXXX.*reason=renderJump" ~/.muxvo/logs/terminal-debug.log | tail -20
```
检查 ringDump 中：
- 有 `write:danger` → ED3 触发的跳顶，检查 write callback 是否执行了 scrollToBottom
- 有 `resizeObs` → resize 触发了 CC 重绘
- 有 `flush:pre/post` → compositorFlush 可能是触发源

**场景 2：终端切换后停在顶部**
```bash
grep "mount\|bufReplay\|reveal\|bufScrollBottom" ~/.muxvo/logs/terminal-debug.log | tail -20
```
检查：
- `bufReplay bufBytes` > 0？
- `reveal lines` > 1？
- `bufScrollBottom baseY` > 0？（如果 baseY=0，说明 write callback 没等 xterm 解析完）

**场景 3：往上翻看到重复内容**
```bash
grep "bufReplay\|output.*buffered=true" ~/.muxvo/logs/terminal-debug.log | tail -20
```
检查 buffer replay 是否写了 pendingLiveData（当前不应该写，但如果代码回退了可能重新出现）。

### 第三步：可能的下一步修复方向

如果方案 5（无条件 scrollToBottom）仍然不够，可以考虑：

1. **在 write callback 中加延迟**：`setTimeout(() => term.scrollToBottom(), 50)` — 等 xterm 完全处理完再滚动
2. **监听 xterm onLineFeed**：在 ED3 后的第一个 linefeed 事件中 scrollToBottom
3. **双重保险**：write callback + requestAnimationFrame 中都 scrollToBottom
4. **从根源解决**：在主进程的 buffer manager 中检测 ED3，只保留最后一个 ED3 后的内容，避免 replay 时的问题

如果重复内容再次出现：
1. 验证方案 3（不 flush pendingLiveData）——需要在 buffer replay 处添加 log 记录 pendingLiveData 的 bytes 和内容摘要
2. 检查 buffer manager 的 64KB 截断是否切断了 ED3 序列

## 关键文件

| 文件 | 作用 |
|------|------|
| `src/renderer/components/terminal/XTermRenderer.tsx` | 终端渲染组件 — buffer replay、live output 处理、ED3 检测、scroll 检测 |
| `src/main/services/terminal/manager.ts` | Buffer manager — 存储/截断/返回终端输出（`getBuffer()` 在 ~518 行） |
| `src/renderer/utils/scroll-event-ring.ts` | Ring buffer 事件追踪（容量 80 条） |
| `src/renderer/utils/force-repaint.ts` | Compositor flush（每 30s 触发 CSS transform） |
| `src/renderer/utils/term-debug-logger.ts` | 日志写入工具（通过 IPC 写文件） |

## Buffer Manager 机制

- 每个终端一个 string buffer，上限 64KB（`OUTPUT_BUFFER_MAX_BYTES`）
- 超过时从头截断，截断前回扫 32 字节避免切断 ESC 序列
- `getBuffer()` 返回最后一个 `\x1b[2J` 之后的内容（过滤 shell 初始化噪声）
- 如果 64KB 截断点切在两个 CC TUI frame 之间，可能导致不完整的 frame 残留

## 修复时间线

| 日期 | 方案 | 结果 |
|------|------|------|
| 2026-03-29 | 方案 1：过滤 ED3 | 修跳顶，但导致重复内容 |
| 2026-03-29 | 方案 2：ED3 放行 + 严格 wasAtBottom | 部分修复，容差不够 |
| 2026-03-29 | 方案 4：wasAtBottom 容差 1 屏 | 仍不够（44>33） |
| 2026-03-30 | 方案 5：ED3 后无条件 scrollToBottom | **当前方案** |
