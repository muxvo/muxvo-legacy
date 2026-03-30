# 模块 05：XTerm 渲染 — 测试用例

> 来源 PRD：modules/05-xterm-rendering.md
> 生成日期：2026-03-01

## 目录

- [一、L1 契约层测试](#一l1-契约层测试)
- [二、L2 规则层测试](#二l2-规则层测试)
  - [2.1 挂载流程](#21-挂载流程)
  - [2.2 useTerminalFit](#22-useterminalfit)
  - [2.3 useBufferReplay](#23-usebufferreplay)
  - [2.4 useTerminalIO](#24-useterminalio)
  - [2.5 useTerminalEvents](#25-useterminalevents)
  - [2.6 scrollTracker/frozen 移除](#26-scrolltrackerfrozen-移除)
  - [2.7 搜索功能](#27-搜索功能)
  - [2.8 文件拖拽](#28-文件拖拽)
  - [2.9 PTY Resize 通知](#29-pty-resize-通知)
  - [2.10 卸载流程](#210-卸载流程)
  - [2.11 terminalId 变化重建](#211-terminalid-变化重建)
  - [2.12 WebGL 上下文丢失](#212-webgl-上下文丢失)
  - [2.13 E2E 可测试性](#213-e2e-可测试性)
- [三、L3 场景层测试](#三l3-场景层测试)

---

## 一、L1 契约层测试

### XTERM_L1_01_default_cursorBlink

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L1_01 |
| **名称** | DEFAULT_TERMINAL_CONFIG.cursorBlink 默认值为 true |
| **层级** | L1 契约 |
| **验证点** | `cursorBlink` 默认值 |
| **测试方法** | 导入 DEFAULT_TERMINAL_CONFIG，断言 `cursorBlink === true` |
| **期望结果** | `true` |

### XTERM_L1_02_default_cursorStyle

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L1_02 |
| **名称** | DEFAULT_TERMINAL_CONFIG.cursorStyle 默认值为 'block' |
| **层级** | L1 契约 |
| **验证点** | `cursorStyle` 默认值 |
| **测试方法** | 导入 DEFAULT_TERMINAL_CONFIG，断言 `cursorStyle === 'block'` |
| **期望结果** | `'block'` |

### XTERM_L1_03_default_fontSize

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L1_03 |
| **名称** | DEFAULT_TERMINAL_CONFIG.fontSize 默认值为 14 |
| **层级** | L1 契约 |
| **验证点** | `fontSize` 默认值 |
| **测试方法** | 导入 DEFAULT_TERMINAL_CONFIG，断言 `fontSize === 14` |
| **期望结果** | `14` |

### XTERM_L1_04_default_fontFamily

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L1_04 |
| **名称** | DEFAULT_TERMINAL_CONFIG.fontFamily 为 TERMINAL_FONT_FAMILY |
| **层级** | L1 契约 |
| **验证点** | `fontFamily` 引用 `TERMINAL_FONT_FAMILY` 常量 |
| **测试方法** | 导入两者，断言相等 |
| **期望结果** | fontFamily === TERMINAL_FONT_FAMILY |

### XTERM_L1_05_default_themeName

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L1_05 |
| **名称** | DEFAULT_TERMINAL_CONFIG.themeName 默认值为 'dark' |
| **层级** | L1 契约 |
| **验证点** | `themeName` 默认值 |
| **测试方法** | 导入 DEFAULT_TERMINAL_CONFIG，断言 `themeName === 'dark'` |
| **期望结果** | `'dark'` |

### XTERM_L1_06_default_allowProposedApi

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L1_06 |
| **名称** | DEFAULT_TERMINAL_CONFIG.allowProposedApi 默认值为 true |
| **层级** | L1 契约 |
| **验证点** | `allowProposedApi` 默认值 |
| **测试方法** | 导入 DEFAULT_TERMINAL_CONFIG，断言 `allowProposedApi === true` |
| **期望结果** | `true` |

### XTERM_L1_07_addon_list_and_order

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L1_07 |
| **名称** | Addon 列表和加载顺序 |
| **层级** | L1 契约 |
| **验证点** | Addon 加载顺序为 FitAddon → Unicode11Addon → WebglAddon → SearchAddon → ImageAddon → LigaturesAddon |
| **测试方法** | 检查 addonManager 内部的加载列表或调用顺序 |
| **期望结果** | 6 个 addon 按指定顺序加载 |

### XTERM_L1_08_ipc_write_signature

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L1_08 |
| **名称** | terminal:write IPC 调用签名 |
| **层级** | L1 契约 |
| **验证点** | `window.api.terminal.write(id, data)` 调用格式：id 为 string，data 为 string |
| **前置条件** | Mock window.api.terminal.write |
| **测试方法** | 触发 term.onData → 断言 write 被调用，参数 (terminalId, data) |
| **期望结果** | 参数格式正确 |

### XTERM_L1_09_ipc_resize_signature

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L1_09 |
| **名称** | terminal:resize IPC 调用签名 |
| **层级** | L1 契约 |
| **验证点** | `window.api.terminal.resize(id, cols, rows)` 调用格式 |
| **前置条件** | Mock window.api.terminal.resize |
| **测试方法** | 触发 term.onResize → 断言 resize 被调用，参数 (terminalId, cols, rows) |
| **期望结果** | 参数格式正确 |

### XTERM_L1_10_ipc_getBuffer_signature

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L1_10 |
| **名称** | terminal:getBuffer IPC 调用签名 |
| **层级** | L1 契约 |
| **验证点** | `window.api.terminal.getBuffer(id)` 返回 `{ success, data: string }` |
| **前置条件** | Mock window.api.terminal.getBuffer |
| **测试方法** | 断言返回值结构 |
| **期望结果** | 返回 { success: boolean, data: string } |

### XTERM_L1_11_ipc_onOutput_signature

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L1_11 |
| **名称** | terminal:onOutput 事件回调签名 |
| **层级** | L1 契约 |
| **验证点** | `window.api.terminal.onOutput(callback)` 回调参数为 `{ id, data }` |
| **前置条件** | Mock onOutput |
| **测试方法** | 注册回调 → 触发事件 → 断言回调参数结构 |
| **期望结果** | 回调参数 { id: string, data: string } |

### XTERM_L1_12_output_buffer_max_64kb

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L1_12 |
| **名称** | OUTPUT_BUFFER_MAX_BYTES 为 65536 (64KB) |
| **层级** | L1 契约 |
| **验证点** | buffer 上限常量为 65536 |
| **测试方法** | 导入常量，断言值 |
| **期望结果** | 65536 |

---

## 二、L2 规则层测试

### 2.1 挂载流程

#### XTERM_L2_01_mount_sequence

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_01 |
| **名称** | 挂载流程顺序：new Terminal → open → loadAll → 双重 rAF → fit |
| **层级** | L2 规则 |
| **验证点** | 挂载时的执行顺序正确 |
| **前置条件** | Mock Terminal、addonManager、rAF |
| **测试方法** | 渲染 XTermRenderer，通过 spy 验证调用顺序 |
| **期望结果** | new Terminal → open → loadAll → rAF → rAF → fit |

#### XTERM_L2_02_double_raf_before_fit

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_02 |
| **名称** | 双重 rAF 确保 CSS 布局完成后再 fit |
| **层级** | L2 规则 |
| **验证点** | fit 在两次 requestAnimationFrame 回调后执行 |
| **前置条件** | Mock requestAnimationFrame |
| **测试方法** | 渲染组件 → 执行第一个 rAF → fit 未调用 → 执行第二个 rAF → fit 被调用 |
| **期望结果** | 两次 rAF 后才 fit |

#### XTERM_L2_03_cols_le_2_retry

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_03 |
| **名称** | fit 后 cols <= 2 时 200ms 后重试 |
| **层级** | L2 规则 |
| **验证点** | 如果 fit 后 cols <= 2（容器未布局完成），则 200ms 后重试 fit |
| **前置条件** | Mock fit 返回 cols=1 第一次、cols=80 第二次 |
| **测试方法** | 渲染组件 → 第一次 fit → cols=1 → 等 200ms → 第二次 fit → cols=80 |
| **期望结果** | 200ms 后重试成功 |

### 2.2 useTerminalFit

#### XTERM_L2_04_requestFit_raf_debounce

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_04 |
| **名称** | requestFit 使用 rAF 防抖，取消前一个待执行的 rAF |
| **层级** | L2 规则 |
| **验证点** | 连续多次调用 requestFit 只执行一次 fit |
| **前置条件** | Mock rAF 和 cancelAnimationFrame |
| **测试方法** | 连续调用 requestFit 3 次 → 断言 cancelAnimationFrame 被调用 2 次 → fit 最终只执行 1 次 |
| **期望结果** | rAF 防抖有效 |

#### XTERM_L2_05_fitWithScrollPreservation_at_bottom

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_05 |
| **名称** | fitWithScrollPreservation：在底部时 fit 后仍在底部 |
| **层级** | L2 规则 |
| **验证点** | fit 前 wasAtBottom=true → fit → 恢复后 scrollToBottom |
| **前置条件** | 终端已滚动到底部（viewportY >= baseY） |
| **测试方法** | 设置滚动到底部 → 调用 fitWithScrollPreservation → 断言 scrollToBottom 被调用 |
| **期望结果** | 保持在底部 |

#### XTERM_L2_06_fitWithScrollPreservation_not_at_bottom

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_06 |
| **名称** | fitWithScrollPreservation：非底部时恢复到相同 offsetFromBottom |
| **层级** | L2 规则 |
| **验证点** | fit 前在中间位置 → fit → 恢复到相同的 offsetFromBottom |
| **前置条件** | 终端滚动到中间位置 |
| **测试方法** | 记录 offsetFromBottom → 调用 fitWithScrollPreservation → 断言恢复后 offsetFromBottom 相同 |
| **期望结果** | 滚动位置恢复 |

#### XTERM_L2_07_resizeObserver_skip_tiny

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_07 |
| **名称** | ResizeObserver 跳过 tiny 容器 (width<10 || height<10) |
| **层级** | L2 规则 |
| **验证点** | 容器尺寸极小时不触发 fit |
| **前置条件** | Mock ResizeObserver |
| **测试方法** | 模拟 contentRect {width:5, height:5} → 断言 requestFit 未被调用；模拟 {width:100, height:100} → 断言 requestFit 被调用 |
| **期望结果** | tiny 容器跳过 |

#### XTERM_L2_08_suppressResize_skip_fit

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_08 |
| **名称** | suppressResize=true 时跳过 fit 和 PTY resize |
| **层级** | L2 规则 |
| **验证点** | suppressResize 为 true 时，ResizeObserver 回调不触发 fit，也不发送 resize IPC |
| **前置条件** | suppressResize=true |
| **测试方法** | 容器尺寸变化 → 断言 fit 未调用、resize IPC 未调用 |
| **期望结果** | 全部跳过 |

### 2.3 useBufferReplay

#### XTERM_L2_09_buffer_replay_queue_flush_order

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_09 |
| **名称** | Buffer 回放顺序：先订阅 onOutput → 请求 getBuffer → 历史写入 → flush 暂存 |
| **层级** | L2 规则 |
| **验证点** | Queue/Flush 模式保证顺序：历史 → 暂存的实时数据 |
| **前置条件** | Mock onOutput 和 getBuffer |
| **测试方法** | 验证 onOutput 订阅先于 getBuffer 调用；getBuffer 返回后先写历史再 flush pendingLiveData |
| **期望结果** | 顺序正确 |

#### XTERM_L2_10_onOutput_before_getBuffer

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_10 |
| **名称** | onOutput 订阅早于 getBuffer 调用（防止丢数据） |
| **层级** | L2 规则 |
| **验证点** | onOutput 回调注册时间早于 getBuffer 请求发出时间 |
| **前置条件** | Mock 两者，记录调用时序 |
| **测试方法** | 断言 onOutput 注册的时间戳 < getBuffer 调用的时间戳 |
| **期望结果** | onOutput 先注册 |

#### XTERM_L2_11_pending_live_data_flush

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_11 |
| **名称** | getBuffer 返回后 flush pendingLiveData |
| **层级** | L2 规则 |
| **验证点** | 在 getBuffer 返回和 bufferedDataWritten 之间收到的实时数据被暂存后逐条写入 |
| **前置条件** | getBuffer 异步延迟，期间 onOutput 推送 3 条数据 |
| **测试方法** | 模拟延迟 getBuffer → 期间推送 3 条 output → getBuffer 返回后断言 3 条被按序写入 |
| **期望结果** | 暂存数据被 flush |

#### XTERM_L2_12_bufferedDataWritten_flag

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_12 |
| **名称** | bufferedDataWritten 后实时数据直接写入 |
| **层级** | L2 规则 |
| **验证点** | `bufferedDataWritten = true` 后，onOutput 数据直接写入 term 而不暂存 |
| **前置条件** | getBuffer 已完成 |
| **测试方法** | 完成 buffer 回放 → 再触发 onOutput → 断言 term.write 被直接调用（无暂存） |
| **期望结果** | 实时直接写入 |

#### XTERM_L2_13_disposed_guard

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_13 |
| **名称** | disposed 守卫：异步回调到达时检查组件是否已卸载 |
| **层级** | L2 规则 |
| **验证点** | 组件卸载后，getBuffer 的回调不执行 term.write |
| **前置条件** | 渲染组件 → 卸载 → getBuffer 返回 |
| **测试方法** | 渲染 → 立即卸载 → 等待 getBuffer 异步回调 → 断言 term.write 未被调用 |
| **期望结果** | 不写入已销毁的终端 |

#### XTERM_L2_14_stripPromptEolMark

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_14 |
| **名称** | stripPromptEolMark 清理 prompt 尾部标记 |
| **层级** | L2 规则 |
| **验证点** | 历史 buffer 写入前经过 `stripPromptEolMark()` 处理 |
| **前置条件** | getBuffer 返回含 prompt EOL 标记的数据 |
| **测试方法** | Mock getBuffer 返回含标记数据 → 断言写入 term 的数据已清理 |
| **期望结果** | EOL 标记被清除 |

#### XTERM_L2_15_buffer_replay_triggers_fit_and_scroll

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_15 |
| **名称** | Buffer 回放完成后触发 requestFit + scrollToBottom |
| **层级** | L2 规则 |
| **验证点** | 回放完成后调用 requestFit() 和 scrollToBottom |
| **前置条件** | Mock requestFit 和 scrollToBottom |
| **测试方法** | 完成 buffer 回放 → 断言两者被调用 |
| **期望结果** | fit + scrollToBottom |

### 2.4 useTerminalIO

#### XTERM_L2_16_onData_writes_to_ipc

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_16 |
| **名称** | term.onData 数据通过 IPC write 发送 |
| **层级** | L2 规则 |
| **验证点** | 用户在终端键入时，数据通过 `window.api.terminal.write(terminalId, data)` 发送 |
| **前置条件** | Mock terminal.write IPC |
| **测试方法** | 触发 term.onData('hello') → 断言 write(terminalId, 'hello') 被调用 |
| **期望结果** | IPC 正确调用 |

#### XTERM_L2_17_cmd_f_toggle_search

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_17 |
| **名称** | Cmd+F 切换搜索栏显示/隐藏 |
| **层级** | L2 规则 |
| **验证点** | attachCustomKeyEventHandler 拦截 Cmd+F，toggle 搜索栏，不传递给终端 |
| **前置条件** | 渲染 XTermRenderer |
| **测试方法** | 模拟 Cmd+F 按键 → 断言搜索栏显示 → 再次 Cmd+F → 断言搜索栏隐藏 |
| **期望结果** | 搜索栏 toggle |

#### XTERM_L2_18_cmd_plus_zoom_in

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_18 |
| **名称** | Cmd+= / Cmd++ 触发全局放大 |
| **层级** | L2 规则 |
| **验证点** | 拦截 Cmd+= / Cmd++，dispatch `muxvo:global-zoom-request` 事件（detail='in'），不传递给终端 |
| **前置条件** | 监听 muxvo:global-zoom-request 事件 |
| **测试方法** | 模拟 Cmd+= → 断言事件被 dispatch 且 detail.direction='in' |
| **期望结果** | 触发放大事件 |

#### XTERM_L2_19_cmd_minus_zoom_out

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_19 |
| **名称** | Cmd+- 触发全局缩小 |
| **层级** | L2 规则 |
| **验证点** | 拦截 Cmd+-，dispatch zoom-request 事件（detail='out'） |
| **前置条件** | 同上 |
| **测试方法** | 模拟 Cmd+- → 断言事件 detail.direction='out' |
| **期望结果** | 触发缩小事件 |

#### XTERM_L2_20_cmd_0_zoom_reset

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_20 |
| **名称** | Cmd+0 重置缩放 |
| **层级** | L2 规则 |
| **验证点** | 拦截 Cmd+0，dispatch zoom-request 事件（detail='reset'） |
| **前置条件** | 同上 |
| **测试方法** | 模拟 Cmd+0 → 断言事件 detail.direction='reset' |
| **期望结果** | 触发重置事件 |

#### XTERM_L2_21_other_keys_pass_through

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_21 |
| **名称** | 非拦截按键正常传递给终端 |
| **层级** | L2 规则 |
| **验证点** | 普通按键（如字母、数字）返回 true，不被拦截 |
| **前置条件** | 获取 attachCustomKeyEventHandler 的回调 |
| **测试方法** | 模拟普通按键事件 → 断言返回 true |
| **期望结果** | return true |

### 2.5 useTerminalEvents

#### XTERM_L2_22_theme_change_event

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_22 |
| **名称** | muxvo:theme-change 事件更新 term.options.theme |
| **层级** | L2 规则 |
| **验证点** | 监听 `muxvo:theme-change`，收到后更新 `term.options.theme` |
| **前置条件** | 渲染 XTermRenderer |
| **测试方法** | dispatch muxvo:theme-change {theme:'light'} → 断言 term.options.theme 更新 |
| **期望结果** | theme 正确更新 |

#### XTERM_L2_23_global_zoom_triggers_refit

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_23 |
| **名称** | muxvo:global-zoom 事件触发 requestFit |
| **层级** | L2 规则 |
| **验证点** | 监听 `muxvo:global-zoom`，收到后调用 requestFit() |
| **前置条件** | Mock requestFit |
| **测试方法** | dispatch muxvo:global-zoom → 断言 requestFit 被调用 |
| **期望结果** | 触发 refit |

#### XTERM_L2_24_terminal_refit_event

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_24 |
| **名称** | muxvo:terminal-refit 触发 requestFit + 强制 PTY resize |
| **层级** | L2 规则 |
| **验证点** | 监听 `muxvo:terminal-refit`，收到后 requestFit() + 发送 PTY resize |
| **前置条件** | Mock requestFit 和 resize IPC |
| **测试方法** | dispatch muxvo:terminal-refit → 断言 requestFit 和 resize 被调用 |
| **期望结果** | fit + resize |

#### XTERM_L2_25_sidebar_refit_event

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_25 |
| **名称** | muxvo:sidebar-refit 仅 fit 不发 PTY resize（suppressResize 实例） |
| **层级** | L2 规则 |
| **验证点** | 监听 `muxvo:sidebar-refit`，收到后 fitAddon.fit()（不发 PTY resize） |
| **前置条件** | suppressResize=true |
| **测试方法** | dispatch muxvo:sidebar-refit → 断言 fit 被调用但 resize IPC 未调用 |
| **期望结果** | 仅 fit |

#### XTERM_L2_26_async_config_load

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_26 |
| **名称** | 挂载时异步加载持久化配置并应用 |
| **层级** | L2 规则 |
| **验证点** | 挂载后调用 `window.api.app.getConfig()`，将 config 合并到 term.options |
| **前置条件** | Mock getConfig 返回自定义 fontSize=16 |
| **测试方法** | 渲染组件 → 等待 getConfig 完成 → 断言 term.options.fontSize === 16 |
| **期望结果** | 配置应用成功 |

#### XTERM_L2_27_config_load_triggers_refit

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_27 |
| **名称** | 配置加载后触发一次 requestFit |
| **层级** | L2 规则 |
| **验证点** | 字体变化可能改变 cols/rows，配置加载后要 refit |
| **前置条件** | Mock requestFit |
| **测试方法** | 等待 config 加载完成 → 断言 requestFit 再次被调用 |
| **期望结果** | 配置后 refit |

### 2.6 scrollTracker/frozen 移除

#### XTERM_L2_28_no_scrollTracker

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_28 |
| **名称** | scrollTracker / frozen 机制已移除 |
| **层级** | L2 规则 |
| **验证点** | 代码中不存在 scrollTracker、frozen 相关逻辑 |
| **前置条件** | 无 |
| **测试方法** | 搜索源码中 scrollTracker 和 frozen 引用，断言不存在 |
| **期望结果** | 无相关代码 |

#### XTERM_L2_29_no_syncScrollDataAttrs

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_29 |
| **名称** | syncScrollDataAttrs 已移除，不写 data-viewport-y / data-base-y |
| **层级** | L2 规则 |
| **验证点** | 不再将滚动数据写入 DOM data 属性 |
| **前置条件** | 渲染 XTermRenderer |
| **测试方法** | 断言容器 DOM 上无 data-viewport-y 和 data-base-y 属性 |
| **期望结果** | 无 data 属性 |

### 2.7 搜索功能

#### XTERM_L2_30_search_bar_position

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_30 |
| **名称** | SearchBar 位置：右上角 absolute |
| **层级** | L2 规则 |
| **验证点** | TerminalSearchBar 使用 position:absolute, top:4px, right:8px, z-index:20 |
| **前置条件** | 打开搜索栏 |
| **测试方法** | 断言 SearchBar 的 computed style |
| **期望结果** | 位置和层级正确 |

#### XTERM_L2_31_search_enter_next

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_31 |
| **名称** | 搜索中按 Enter 跳转到下一个匹配项 |
| **层级** | L2 规则 |
| **验证点** | 输入关键词后按 Enter 调用 SearchAddon.findNext |
| **前置条件** | 打开搜索栏，输入关键词 |
| **测试方法** | 模拟 Enter → 断言 findNext 被调用 |
| **期望结果** | findNext |

#### XTERM_L2_32_search_shift_enter_previous

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_32 |
| **名称** | Shift+Enter 跳转到上一个匹配项 |
| **层级** | L2 规则 |
| **验证点** | Shift+Enter 调用 SearchAddon.findPrevious |
| **前置条件** | 打开搜索栏，输入关键词 |
| **测试方法** | 模拟 Shift+Enter → 断言 findPrevious 被调用 |
| **期望结果** | findPrevious |

#### XTERM_L2_33_search_escape_close

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_33 |
| **名称** | Escape 清除高亮 + 关闭搜索栏 |
| **层级** | L2 规则 |
| **验证点** | 按 Escape 调用 clearDecorations + 隐藏搜索栏 |
| **前置条件** | 搜索栏打开并有搜索结果 |
| **测试方法** | 模拟 Escape → 断言搜索栏隐藏且高亮清除 |
| **期望结果** | 关闭 + 清除 |

### 2.8 文件拖拽

#### XTERM_L2_34_drag_enter_counter

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_34 |
| **名称** | dragEnterCount 计数器正确管理 overlay 显示/隐藏 |
| **层级** | L2 规则 |
| **验证点** | dragEnter 时 count++, dragLeave 时 count--；count>0 显示 overlay，归零隐藏 |
| **前置条件** | 渲染 XTermRenderer |
| **测试方法** | 模拟 dragEnter（count=1, overlay 显示）→ 子元素 dragEnter（count=2）→ 子元素 dragLeave（count=1, overlay 仍显示）→ dragLeave（count=0, overlay 隐藏） |
| **期望结果** | 计数器正确管理 overlay |

#### XTERM_L2_35_extract_file_paths_muxvo

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_35 |
| **名称** | 优先提取 Muxvo 内部拖拽路径 |
| **层级** | L2 规则 |
| **验证点** | DataTransfer 含 `application/x-muxvo-file-paths` 时优先使用（JSON 数组） |
| **前置条件** | Mock drop 事件含 muxvo 自定义数据 |
| **测试方法** | 设置 dataTransfer 含 muxvo 路径 → 断言 extractFilePaths 返回该路径 |
| **期望结果** | 优先使用 muxvo 路径 |

#### XTERM_L2_36_extract_file_paths_finder

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_36 |
| **名称** | Finder 拖拽时从 Files 提取路径 |
| **层级** | L2 规则 |
| **验证点** | 无 muxvo 数据时从 DataTransferItemList Files 中提取路径 |
| **前置条件** | Mock drop 事件含 Files |
| **测试方法** | 设置 dataTransfer 含 Files → 断言正确提取路径 |
| **期望结果** | 从 Files 提取 |

#### XTERM_L2_37_shell_escape_paths

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_37 |
| **名称** | shellEscapePaths 处理空格和特殊字符 |
| **层级** | L2 规则 |
| **验证点** | 路径中的空格、括号等特殊字符被正确转义 |
| **前置条件** | 无 |
| **测试方法** | 输入含空格路径 `/path/my file (1).txt` → 断言输出为正确转义格式 |
| **期望结果** | 特殊字符转义 |

#### XTERM_L2_38_drop_writes_to_terminal

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_38 |
| **名称** | drop 后将转义路径写入终端 |
| **层级** | L2 规则 |
| **验证点** | 松手后调用 `window.api.terminal.write(terminalId, escapedPaths)` |
| **前置条件** | Mock write IPC |
| **测试方法** | 模拟 drop 事件 → 断言 write 被调用且参数为转义后的路径 |
| **期望结果** | 路径写入终端 |

#### XTERM_L2_39_drop_overlay_style

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_39 |
| **名称** | Drop overlay 样式：琥珀色虚线边框 + 半透明背景 + fadeIn |
| **层级** | L2 规则 |
| **验证点** | overlay 显示时有正确的样式和动画 |
| **前置条件** | 触发 dragEnter |
| **测试方法** | 断言 overlay 的 border-style、background、animation |
| **期望结果** | 琥珀色虚线 + 半透明 + 0.15s fadeIn |

### 2.9 PTY Resize 通知

#### XTERM_L2_40_resize_sends_ipc

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_40 |
| **名称** | suppressResize=false 时 term.onResize 发送 PTY resize IPC |
| **层级** | L2 规则 |
| **验证点** | term.onResize 回调中调用 `window.api.terminal.resize(terminalId, cols, rows)` |
| **前置条件** | suppressResize=false |
| **测试方法** | 触发 term.onResize → 断言 resize IPC 被调用 |
| **期望结果** | 发送 resize |

#### XTERM_L2_41_resize_suppressed

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_41 |
| **名称** | suppressResize=true 时不发送 PTY resize |
| **层级** | L2 规则 |
| **验证点** | suppressResize 为 true 时，resize IPC 不被调用 |
| **前置条件** | suppressResize=true |
| **测试方法** | 触发 term.onResize → 断言 resize IPC 未被调用 |
| **期望结果** | 不发送 resize |

### 2.10 卸载流程

#### XTERM_L2_42_unmount_disposed_flag

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_42 |
| **名称** | 卸载时设置 disposed=true |
| **层级** | L2 规则 |
| **验证点** | 组件卸载时 disposed 标志设为 true |
| **前置条件** | 渲染组件 |
| **测试方法** | 卸载组件 → 验证 disposed 标志（通过异步回调不执行来间接验证） |
| **期望结果** | disposed = true |

#### XTERM_L2_43_unmount_cleanup_order

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_43 |
| **名称** | 卸载清理顺序正确 |
| **层级** | L2 规则 |
| **验证点** | disposed=true → unsubOutput → cancelAnimationFrame → observer.disconnect → removeEventListener×4 → addonManager.disposeAll → term.dispose |
| **前置条件** | Mock 所有清理方法 |
| **测试方法** | 卸载组件 → 断言所有清理方法被调用 |
| **期望结果** | 完整清理 |

#### XTERM_L2_44_unmount_addon_dispose_reverse

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_44 |
| **名称** | addon 逆序 dispose |
| **层级** | L2 规则 |
| **验证点** | addonManager.disposeAll 按加载的逆序 dispose addon |
| **前置条件** | Mock addonManager |
| **测试方法** | 卸载 → 断言 addon dispose 调用顺序为加载顺序的逆序 |
| **期望结果** | LigaturesAddon → ... → FitAddon |

### 2.11 terminalId 变化重建

#### XTERM_L2_45_terminalId_change_rebuilds

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_45 |
| **名称** | terminalId 变化时整个 xterm 实例重建 |
| **层级** | L2 规则 |
| **验证点** | terminalId 是 useEffect 的唯一依赖项，变化时销毁旧实例并创建新实例 |
| **前置条件** | 渲染组件 terminalId='a' |
| **测试方法** | 更新 terminalId 为 'b' → 断言旧 term.dispose 被调用 → 新 Terminal 实例被创建 |
| **期望结果** | 完全重建 |

### 2.12 WebGL 上下文丢失

#### XTERM_L2_46_webgl_context_lost

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_46 |
| **名称** | WebGL 上下文丢失时自动 dispose 并可恢复 |
| **层级** | L2 规则 |
| **验证点** | WebGL 上下文丢失时 WebglAddon 被 dispose，不影响终端功能（fallback 到 Canvas），可通过 recoverWebgl() 恢复 |
| **前置条件** | WebglAddon 已加载 |
| **测试方法** | 模拟 WebGL context lost → 断言 WebglAddon dispose → 终端仍可正常渲染 |
| **期望结果** | 静默 fallback |

### 2.13 E2E 可测试性

#### XTERM_L2_47_data_terminal_id_attr

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L2_47 |
| **名称** | 容器 div 暴露 data-terminal-id 属性 |
| **层级** | L2 规则 |
| **验证点** | XTermRenderer 容器 div 有 `data-terminal-id` 属性，值为终端 ID |
| **前置条件** | 渲染 XTermRenderer |
| **测试方法** | 断言容器 DOM `dataset.terminalId === terminalId` |
| **期望结果** | data-terminal-id 正确设置 |

---

## 三、L3 场景层测试

### XTERM_L3_01_mount_replay_input_output

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L3_01 |
| **名称** | 终端挂载 → buffer 回放 → 显示历史内容 → 用户输入 → 实时输出 |
| **层级** | L3 场景 |
| **验证点** | 完整的终端启动到交互流程 |
| **前置条件** | 终端已有历史输出 |
| **步骤** | 1. 渲染 XTermRenderer 2. 等待 getBuffer 返回历史数据 3. 断言历史内容显示在终端中 4. 用户输入命令（如 "ls"） 5. 断言 write IPC 被调用 6. 模拟 onOutput 返回输出 7. 断言新输出显示在终端中 |
| **期望结果** | 完整流程正常 |

### XTERM_L3_02_search_flow

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L3_02 |
| **名称** | Cmd+F 搜索 → 输入关键词 → Enter 跳转 → Esc 关闭 |
| **层级** | L3 场景 |
| **验证点** | 搜索完整交互流程 |
| **前置条件** | 终端中有可搜索的文本内容 |
| **步骤** | 1. 按 Cmd+F 2. 断言搜索栏出现在右上角 3. 输入关键词 4. 断言匹配项高亮 5. 按 Enter 跳转到下一个 6. 按 Shift+Enter 跳转到上一个 7. 按 Escape 8. 断言搜索栏关闭 + 高亮清除 |
| **期望结果** | 搜索流程完整 |

### XTERM_L3_03_file_drag_from_finder

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L3_03 |
| **名称** | 文件从 Finder 拖入终端 → 路径写入 |
| **层级** | L3 场景 |
| **验证点** | 外部文件拖入终端的完整流程 |
| **前置条件** | 终端已挂载 |
| **步骤** | 1. 从 Finder 拖入文件（含空格路径） 2. 断言 drop overlay 出现 3. 松手（drop） 4. 断言 overlay 消失 5. 断言转义后的路径被写入终端 |
| **期望结果** | 路径正确写入 |

### XTERM_L3_04_mode_switch_suppress_resize

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L3_04 |
| **名称** | 模式切换（Tiling→Focused→Tiling）→ suppressResize 正确切换 → 无 buffer rewrap |
| **层级** | L3 场景 |
| **验证点** | 模式切换时 suppressResize 正确管理，避免不必要的 buffer rewrap |
| **前置条件** | Tiling 模式，3 个终端 |
| **步骤** | 1. Tiling 模式，终端 1 选中（suppressResize=false） 2. 进入 Focused 模式（终端 1） 3. 非聚焦终端 suppressResize 变为 true 4. 退出 Focused 回到 Tiling 5. 所有终端 suppressResize 恢复为 false 6. 断言期间非聚焦终端未触发 resize IPC |
| **期望结果** | suppressResize 正确管理 |

### XTERM_L3_05_multiple_terminals_independent_buffer

| 项目 | 内容 |
|------|------|
| **用例 ID** | XTERM_L3_05 |
| **名称** | 多终端各自独立 buffer 回放和输出 |
| **层级** | L3 场景 |
| **验证点** | 多个 XTermRenderer 实例各自维护独立的 buffer 和输出 |
| **前置条件** | 3 个终端，各有不同的历史 buffer |
| **步骤** | 1. 渲染 3 个 XTermRenderer 2. 各自 getBuffer 返回不同内容 3. 断言每个终端显示各自的历史 4. 向终端 1 推送 output 5. 断言只有终端 1 显示新内容 |
| **期望结果** | 终端相互独立 |
