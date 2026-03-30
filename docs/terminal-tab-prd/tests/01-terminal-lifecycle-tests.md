# 模块 01：终端生命周期 — 测试用例

> 来源 PRD：modules/01-terminal-lifecycle.md
> 参考附录：appendix-a-state-machine.md、appendix-b-ipc-channels.md
> 生成日期：2026-03-01

## 目录

- [一、L1 契约层测试](#一l1-契约层测试)
  - [1.1 IPC 调用签名验证](#11-ipc-调用签名验证)
  - [1.2 React 状态默认值验证](#12-react-状态默认值验证)
  - [1.3 Push 事件数据格式验证](#13-push-事件数据格式验证)
  - [1.4 业务约束常量验证](#14-业务约束常量验证)
- [二、L2 规则层测试](#二l2-规则层测试)
  - [2.1 终端创建流程](#21-终端创建流程)
  - [2.2 终端上限控制](#22-终端上限控制)
  - [2.3 终端关闭判断](#23-终端关闭判断)
  - [2.4 关闭后选中逻辑](#24-关闭后选中逻辑)
  - [2.5 进程状态视觉映射](#25-进程状态视觉映射)
  - [2.6 终端命名功能](#26-终端命名功能)
  - [2.7 命名状态机转换](#27-命名状态机转换)
  - [2.8 CWD 管理](#28-cwd-管理)
  - [2.9 WaitingInput 前端呈现](#29-waitinginput-前端呈现)
  - [2.10 空状态](#210-空状态)
- [三、L3 场景层测试](#三l3-场景层测试)
  - [3.1 首个终端创建旅程](#31-首个终端创建旅程)
  - [3.2 多终端创建与关闭旅程](#32-多终端创建与关闭旅程)
  - [3.3 进程状态循环旅程](#33-进程状态循环旅程)
  - [3.4 命名流程旅程](#34-命名流程旅程)
  - [3.5 CWD 变化触发名称更新旅程](#35-cwd-变化触发名称更新旅程)
  - [3.6 上限达到后的交互旅程](#36-上限达到后的交互旅程)
  - [3.7 空状态到工作状态旅程](#37-空状态到工作状态旅程)
- [状态机覆盖](#状态机覆盖)

---

## 一、L1 契约层测试

### 1.1 IPC 调用签名验证

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TERM_L1_01_create_signature | 无 | 调用 `window.api.terminal.create(cwd)` | 参数为 `{ cwd: string }`，返回 `{ success: boolean, data: { id: string, pid: number } }` | P0 |
| TERM_L1_02_close_signature | 终端已创建 | 调用 `window.api.terminal.close(id, force?)` | 参数为 `{ id: string, force?: boolean }`，返回 `{ success: boolean }` | P0 |
| TERM_L1_03_list_signature | 无 | 调用 `window.api.terminal.list()` | 无参数，返回 `{ success: boolean, data: TerminalInfo[] }` | P0 |
| TERM_L1_04_getState_signature | 终端已创建 | 调用 `window.api.terminal.getState(id)` | 参数为 `{ id: string }`，返回 `{ success: boolean, data: { state: string } }` | P0 |
| TERM_L1_05_getBuffer_signature | 终端已创建 | 调用 `window.api.terminal.getBuffer(id)` | 参数为 `{ id: string }`，返回 `{ success: boolean, data: string }` | P1 |
| TERM_L1_06_getForegroundProcess_signature | 终端 Running | 调用 `window.api.terminal.getForegroundProcess(id)` | 参数为 `{ id: string }`，返回 `{ success: boolean, data: { name: string, pid: number } }` | P0 |
| TERM_L1_07_updateCwd_signature | 终端已创建 | 调用 `window.api.terminal.updateCwd(id, cwd)` | 参数为 `{ id: string, cwd: string }`，返回 `{ success: boolean }` | P1 |
| TERM_L1_08_write_signature | 终端 Running | 调用 `window.api.terminal.write(id, data)` | 参数为 `{ id: string, data: string }`，无返回值（fire-and-forget） | P0 |
| TERM_L1_09_resize_signature | 终端 Running | 调用 `window.api.terminal.resize(id, cols, rows)` | 参数为 `{ id: string, cols: number, rows: number }`，无返回值 | P0 |

### 1.2 React 状态默认值验证

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TERM_L1_10_default_terminals | App 初始化 | 读取 `terminals` 状态 | `terminals` 为空数组 `[]` | P0 |
| TERM_L1_11_default_viewMode | App 初始化 | 读取 `viewMode` 状态 | `viewMode` 为 `'Tiling'` | P0 |
| TERM_L1_12_default_selectedId | App 初始化 | 读取 `selectedId` 状态 | `selectedId` 为 `null` | P0 |
| TERM_L1_13_default_focusedId | App 初始化 | 读取 `focusedId` 状态 | `focusedId` 为 `null` | P0 |
| TERM_L1_14_default_listSelectedId | App 初始化 | 读取 `listSelectedId` 状态 | `listSelectedId` 为 `null` | P1 |
| TERM_L1_15_default_terminalOrder | App 初始化 | 读取 `terminalOrder` 状态 | `terminalOrder` 为空数组 `[]` | P0 |
| TERM_L1_16_default_terminalNames | App 初始化 | 读取 `terminalNames` 状态 | `terminalNames` 为空对象 `{}` | P0 |

### 1.3 Push 事件数据格式验证

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TERM_L1_17_onStateChange_format | 终端 Running | 后端推送 `onStateChange` | 回调参数包含 `{ id: string, state: string, processName?: string }` | P0 |
| TERM_L1_18_onExit_format | 终端 Stopping | 后端推送 `onExit` | 回调参数包含 `{ id: string, code: number }` | P0 |
| TERM_L1_19_onOutput_format | 终端 Running | 后端推送 `onOutput` | 回调参数包含 `{ id: string, data: string }` | P0 |
| TERM_L1_20_onCwdChange_format | 终端 Running | 后端推送 `onCwdChange` | 回调参数包含 `{ id: string, cwd: string }` | P1 |

### 1.4 业务约束常量验证

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TERM_L1_21_max_terminals_constant | 无 | 读取 `MAX_TERMINALS` 常量 | 值为 `20` | P0 |

---

## 二、L2 规则层测试

### 2.1 终端创建流程

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TERM_L2_01_create_cwd_from_active | 1 个终端（CWD=/Users/rl/project） | 点击 FAB 创建新终端 | 新终端的 CWD 为 `/Users/rl/project`（继承上一个活跃终端的 CWD） | P0 |
| TERM_L2_02_create_cwd_fallback_home | 0 个终端 | 点击空状态页创建按钮 | 新终端的 CWD 为用户 home 目录（通过 `getHomePath()` 获取） | P0 |
| TERM_L2_03_create_auto_select | 2 个终端，selectedId=t1 | 创建第 3 个终端 t3 | `selectedId` 更新为 `t3`（新终端自动选中） | P0 |
| TERM_L2_04_create_append_order | terminalOrder=[t1, t2] | 创建终端 t3 | `terminalOrder` 变为 `[t1, t2, t3]`（新终端添加到末尾） | P0 |
| TERM_L2_05_create_adds_entry | terminals=[] | 创建终端，后端返回 `{ id: 't1', pid: 123 }` | `terminals` 数组添加新条目，包含 id='t1' | P0 |
| TERM_L2_06_create_ipc_failure | 0 个终端 | 创建终端，IPC 返回失败 | 显示错误 Toast，`terminals` 不变 | P1 |

### 2.2 终端上限控制

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TERM_L2_07_max_fab_disabled | 20 个终端 | 检查 FAB 按钮状态 | FAB 按钮变为禁用态（灰色，不可点击） | P0 |
| TERM_L2_08_max_fab_tooltip | 20 个终端 | hover FAB 按钮 | 显示 tooltip "终端数已达上限" | P1 |
| TERM_L2_09_max_shortcut_blocked | 20 个终端 | 按 Cmd+T 快捷键 | 创建被阻止，终端数仍为 20 | P0 |
| TERM_L2_10_below_max_fab_enabled | 19 个终端 | 检查 FAB 按钮状态 | FAB 按钮正常可点击 | P0 |
| TERM_L2_11_max_close_then_create | 20 个终端 | 关闭 1 个终端后点击 FAB | FAB 恢复可用，可成功创建新终端（总数回到 20） | P1 |

### 2.3 终端关闭判断

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TERM_L2_12_close_no_foreground | 终端 Running，无前台进程 | 点击关闭按钮 | 直接执行关闭流程，不弹确认框 | P0 |
| TERM_L2_13_close_has_foreground | 终端 Busy，前台进程 name='node' | 点击关闭按钮 | 弹出 CloseConfirmDialog，描述显示"终端中有正在运行的进程：node" | P0 |
| TERM_L2_14_close_confirm_dialog_confirm | CloseConfirmDialog 显示中 | 点击"强制关闭" | 调用 `terminal.close(id)`，执行关闭流程 | P0 |
| TERM_L2_15_close_confirm_dialog_cancel | CloseConfirmDialog 显示中 | 点击"取消" | 对话框关闭，终端不受影响 | P0 |
| TERM_L2_16_close_removes_from_list | terminals=[t1, t2, t3] | 关闭 t2，收到 onExit | `terminals` 不再包含 t2 | P0 |
| TERM_L2_17_close_removes_from_order | terminalOrder=[t1, t2, t3] | 关闭 t2 | `terminalOrder` 变为 `[t1, t3]` | P0 |
| TERM_L2_18_close_cleans_names | terminalNames={t2: 'My Term'} | 关闭 t2 | `terminalNames` 中不再包含 t2 条目 | P1 |

### 2.4 关闭后选中逻辑

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TERM_L2_19_close_select_next | terminalOrder=[t1, t2, t3], selectedId=t2 | 关闭 t2 | `selectedId` 更新为 `t3`（选中下一个） | P0 |
| TERM_L2_20_close_select_prev | terminalOrder=[t1, t2, t3], selectedId=t3 | 关闭 t3 | `selectedId` 更新为 `t2`（无下一个，选中上一个） | P0 |
| TERM_L2_21_close_select_null | terminalOrder=[t1], selectedId=t1 | 关闭 t1 | `selectedId` 更新为 `null`（最后一个终端关闭） | P0 |
| TERM_L2_22_close_nonselected | terminalOrder=[t1, t2, t3], selectedId=t1 | 关闭 t3 | `selectedId` 仍为 `t1`（关闭的不是选中终端） | P0 |
| TERM_L2_23_close_first_select_next | terminalOrder=[t1, t2, t3], selectedId=t1 | 关闭 t1 | `selectedId` 更新为 `t2`（优先选中下一个） | P0 |
| TERM_L2_24_close_last_shows_empty | terminals=[t1], selectedId=t1 | 关闭 t1 | `terminals` 为空，显示空状态页 | P0 |

### 2.5 进程状态视觉映射

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TERM_L2_25_status_created | 终端状态 Created | 渲染 StatusDot | 灰色状态点，无动画 | P0 |
| TERM_L2_26_status_starting | 终端状态 Starting | 渲染 StatusDot | 黄色状态点，blink 动画 | P0 |
| TERM_L2_27_status_running | 终端状态 Running | 渲染 StatusDot | 绿色状态点，breathPulse 动画 | P0 |
| TERM_L2_28_status_busy | 终端状态 Busy | 渲染 StatusDot | 绿色状态点，fastPulse 动画 | P0 |
| TERM_L2_29_status_waiting | 终端状态 WaitingInput | 渲染 StatusDot 和 Tile 边框 | 琥珀色状态点 + breathPulse 动画 + 红色边框脉动 | P0 |
| TERM_L2_30_status_stopping | 终端状态 Stopping | 渲染 StatusDot | 灰色状态点，blink 动画 | P1 |
| TERM_L2_31_status_stopped | 终端状态 Stopped | 渲染 StatusDot | 灰色状态点，无动画 | P1 |
| TERM_L2_32_status_disconnected | 终端状态 Disconnected | 渲染 StatusDot | 红色状态点，无动画 | P1 |
| TERM_L2_33_status_failed | 终端状态 Failed | 渲染 StatusDot | 红色状态点，无动画 | P1 |
| TERM_L2_34_status_removed_invisible | 终端状态 Removed | 检查 UI | 终端不在 UI 中显示（内部状态，UI 不可见） | P1 |

### 2.6 终端命名功能

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TERM_L2_35_name_click_enter_edit | 终端未命名，显示 placeholder | 点击名称区域 | 切换为可编辑输入框，输入框获得焦点 | P0 |
| TERM_L2_36_name_enter_confirm | 编辑模式，输入 "My Term" | 按 Enter | 名称保存为 "My Term"，退出编辑模式，`terminalNames[id]` = "My Term" | P0 |
| TERM_L2_37_name_escape_cancel | 编辑模式，输入 "My Term" | 按 Escape | 放弃修改，恢复原名称，退出编辑模式 | P0 |
| TERM_L2_38_name_blur_save | 编辑模式，输入 "My Term" | 点击其他区域（失焦） | 名称保存为 "My Term"，退出编辑模式 | P0 |
| TERM_L2_39_name_empty_restore_default | 编辑模式，清空输入框 | 按 Enter | 恢复为默认名称（CWD 目录名），`terminalNames` 中清除该条目 | P0 |
| TERM_L2_40_name_select_all_on_edit | 终端已命名 "My Term" | 点击名称区域进入编辑 | 输入框预填 "My Term"，文本全部选中 | P1 |

### 2.7 命名状态机转换

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TERM_L2_41_naming_empty_to_editing | 状态 DisplayEmpty | 触发 START_EDIT | 状态变为 Editing，`editBuffer = ''` | P0 |
| TERM_L2_42_naming_editing_confirm_nonempty | 状态 Editing，editBuffer="Test" | 触发 CONFIRM | 状态变为 DisplayNamed，`displayText = "Test"` | P0 |
| TERM_L2_43_naming_editing_confirm_empty | 状态 Editing，editBuffer="" | 触发 CONFIRM | 状态变为 DisplayEmpty，清除名称 | P0 |
| TERM_L2_44_naming_editing_cancel_unnamed | 状态 Editing（从 DisplayEmpty 进入） | 触发 CANCEL | 状态变为 DisplayEmpty，丢弃 editBuffer | P0 |
| TERM_L2_45_naming_editing_cancel_named | 状态 Editing（从 DisplayNamed 进入） | 触发 CANCEL | 状态变为 DisplayNamed，恢复原名 | P0 |
| TERM_L2_46_naming_named_to_editing | 状态 DisplayNamed，displayText="Test" | 触发 START_EDIT | 状态变为 Editing，`editBuffer = "Test"` | P0 |

### 2.8 CWD 管理

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TERM_L2_47_cwd_initial_explicit | 创建参数指定 CWD=/Users/rl/foo | 创建终端 | 终端 CWD 为 `/Users/rl/foo` | P0 |
| TERM_L2_48_cwd_initial_active | 上一个终端 CWD=/Users/rl/bar | 创建终端（无显式 CWD） | 终端 CWD 继承为 `/Users/rl/bar` | P0 |
| TERM_L2_49_cwd_initial_home | 无活跃终端，无显式 CWD | 创建终端 | 终端 CWD 为 home 目录 | P0 |
| TERM_L2_50_cwd_change_updates_display | 终端 CWD=/Users/rl/old | 后端推送 `onCwdChange` CWD=/Users/rl/new | Tile header 中 CWD 显示更新为 `/Users/rl/new` | P0 |
| TERM_L2_51_cwd_change_updates_default_name | 终端未自定义命名，CWD=/Users/rl/old | CWD 变更为 `/Users/rl/new` | 终端默认名从 "old" 更新为 "new" | P0 |
| TERM_L2_52_cwd_change_no_update_custom_name | 终端已自定义命名 "My Term"，CWD=/Users/rl/old | CWD 变更为 `/Users/rl/new` | 终端名仍为 "My Term"（自定义名不受 CWD 影响） | P0 |
| TERM_L2_53_cwd_shorten_home | CWD=/Users/rl/project/src | 渲染 CWD 显示 | 显示为 `~/project/src`（home 目录替换为 ~） | P1 |
| TERM_L2_54_cwd_shorten_long | CWD=/Users/rl/very/deep/nested/path/src | 渲染 CWD 显示 | 显示为 `~/.../{最后两级}`，省略中间路径 | P1 |
| TERM_L2_55_cwd_picker_sends_cd | 终端 Running，CWD=/Users/rl | CwdPicker 选择 /Users/rl/project | 调用 `terminal.write(id, 'cd /Users/rl/project\n')` 发送 cd 命令 | P1 |

### 2.9 WaitingInput 前端呈现

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TERM_L2_56_waiting_status_dot | 终端状态 Running | 收到 `onStateChange` state='WaitingInput' | 状态点变为琥珀色 + breathPulse 动画 | P0 |
| TERM_L2_57_waiting_border_pulse | 终端状态 Running | 收到 WaitingInput 状态 | Tile 边框出现红色脉动动画 | P0 |
| TERM_L2_58_waiting_to_running_clear | 终端状态 WaitingInput | 收到 `onStateChange` state='Running' | 所有 WaitingInput 视觉效果移除（状态点恢复绿色，边框脉动消失） | P0 |
| TERM_L2_59_waiting_sidebar_highlight | Focused 模式，非聚焦终端 WaitingInput | 渲染侧边栏 | 该终端的 CompactTile 显示琥珀色高亮 | P1 |

### 2.10 空状态

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TERM_L2_60_empty_state_shows | terminals.length === 0 | 渲染 TerminalGrid | 显示空状态页：居中引导文案 + 创建按钮 + 快捷键提示 | P0 |
| TERM_L2_61_empty_state_create_btn | 空状态页显示中 | 点击创建按钮 | 与 FAB 功能相同，创建新终端 | P0 |
| TERM_L2_62_empty_state_shortcut | 空状态页显示中 | 显示快捷键提示 | 快捷键提示文案正确显示（如 "Cmd+T"） | P2 |
| TERM_L2_63_empty_state_hides | 空状态页显示中 | 创建成功一个终端 | 空状态页消失，显示 Tiling 布局中的终端 Tile | P0 |

---

## 三、L3 场景层测试

### 3.1 首个终端创建旅程

**编号**：TERM_L3_01_first_terminal_journey

**前置条件**：App 刚启动，无任何终端

**步骤**：

1. 用户看到空状态页（居中引导文案 + 创建按钮 + 快捷键提示）
2. 用户点击空状态页的创建按钮
3. 前端调用 `window.api.terminal.create(homePath)` 发送 IPC 请求
4. 后端返回 `{ success: true, data: { id: 't1', pid: 1001 } }`
5. `terminals` 数组添加终端条目
6. `terminalOrder` 更新为 `['t1']`
7. `selectedId` 更新为 `'t1'`
8. 空状态页消失，TerminalGrid 渲染 Tiling 布局
9. 单个 Tile 在 1x1 Grid 中铺满显示
10. Tile header 显示 CWD 目录名作为默认名称

**期望**：终端从创建到渲染完成无异常，selectedId 自动指向新终端。

**优先级**：P0

---

### 3.2 多终端创建与关闭旅程

**编号**：TERM_L3_02_multi_create_close_journey

**前置条件**：已有终端 t1、t2、t3，selectedId=t2

**步骤**：

1. 验证 terminalOrder 为 [t1, t2, t3]
2. 用户点击 t2 的关闭按钮
3. t2 无前台进程 → 直接执行关闭流程
4. 前端调用 `terminal.close('t2')`
5. 收到 `onExit({ id: 't2', code: 0 })`
6. t2 从 terminals 移除，terminalOrder 变为 [t1, t3]
7. selectedId 更新为 t3（选中下一个）
8. Grid 从 1x3 重新计算为 1x2 布局

**期望**：关闭中间终端后，选中逻辑正确跳到下一个，Grid 自动调整。

**优先级**：P0

---

### 3.3 进程状态循环旅程

**编号**：TERM_L3_03_state_cycle_journey

**前置条件**：终端 t1 处于 Running 状态

**步骤**：

1. 终端 t1 状态点为绿色 + breathPulse 动画
2. 后端推送 `onStateChange({ id: 't1', state: 'WaitingInput' })`
3. 状态点变为琥珀色 + breathPulse，Tile 边框出现红色脉动
4. 用户在终端中输入内容
5. 后端推送 `onStateChange({ id: 't1', state: 'Running' })`
6. 状态点恢复绿色 + breathPulse，边框脉动消失
7. 后端推送 `onStateChange({ id: 't1', state: 'Busy', processName: 'npm' })`
8. 状态点变为绿色 + fastPulse
9. 后端推送 `onStateChange({ id: 't1', state: 'Running' })`
10. 状态点恢复绿色 + breathPulse

**期望**：状态在 Running → WaitingInput → Running → Busy → Running 循环中，视觉表现正确切换。

**优先级**：P0

---

### 3.4 命名流程旅程

**编号**：TERM_L3_04_naming_journey

**前置条件**：终端 t1 已创建，未自定义命名，默认名为 CWD 目录名 "project"

**步骤（Enter 确认路径）**：

1. 终端名称区域显示 placeholder "Name this terminal"
2. 用户点击名称区域
3. 名称区域切换为输入框，获得焦点
4. 用户输入 "Backend Server"
5. 用户按 Enter
6. 名称保存为 "Backend Server"，退出编辑模式
7. Tile header 显示 "Backend Server"

**步骤（Escape 取消路径）**：

8. 用户再次点击名称区域进入编辑
9. 输入框预填 "Backend Server"，文本全选
10. 用户修改为 "Frontend Client"
11. 用户按 Escape
12. 名称恢复为 "Backend Server"，退出编辑模式

**期望**：命名流程中 Enter 确认保存、Escape 取消恢复均正确工作。

**优先级**：P0

---

### 3.5 CWD 变化触发名称更新旅程

**编号**：TERM_L3_05_cwd_name_update_journey

**前置条件**：终端 t1 未自定义命名，CWD=/Users/rl/project，默认名 "project"

**步骤**：

1. Tile header 显示默认名 "project"
2. 用户在终端执行 `cd ../other-project`
3. 后端检测到 CWD 变化，推送 `onCwdChange({ id: 't1', cwd: '/Users/rl/other-project' })`
4. Tile header 的 CWD 显示更新为 `~/other-project`
5. 终端默认名更新为 "other-project"
6. Tile header 名称区域显示 "other-project"

**期望**：未自定义命名的终端在 CWD 变化时自动更新默认名。

**优先级**：P1

---

### 3.6 上限达到后的交互旅程

**编号**：TERM_L3_06_max_limit_journey

**前置条件**：已有 19 个终端

**步骤**：

1. FAB 按钮可用，用户点击创建第 20 个终端
2. 创建成功，终端数达到 20
3. FAB 按钮变为禁用态（灰色）
4. hover FAB 显示 tooltip "终端数已达上限"
5. 用户按 Cmd+T → 创建被阻止
6. 用户关闭 1 个终端，终端数降到 19
7. FAB 按钮恢复可用状态

**期望**：上限控制在 FAB 和快捷键两个入口同时生效，关闭终端后自动恢复。

**优先级**：P0

---

### 3.7 空状态到工作状态旅程

**编号**：TERM_L3_07_empty_to_working_journey

**前置条件**：App 初始化完成，无终端

**步骤**：

1. 验证空状态页显示：引导文案 + 创建按钮 + 快捷键提示
2. 用户点击创建按钮，创建终端 t1
3. 空状态页消失，Tiling 布局显示 t1
4. 用户通过 FAB 创建 t2、t3
5. Grid 从 1x1 → 1x2 → 1x3 自动调整
6. 关闭 t1、t2、t3 所有终端
7. 空状态页重新出现

**期望**：空状态与工作状态之间的切换平滑无异常。

**优先级**：P1

---

## 状态机覆盖

### 终端进程状态机图

```
Created ──SPAWN──→ Starting ──SPAWN_SUCCESS──→ Running ──PROCESS_START──→ Busy
                      │                          │  ↑                      │
                      │                          │  │PROCESS_DONE──────────┘
                 SPAWN_FAILURE                   │  │
                      │                     WAIT_INPUT  USER_INPUT/AUTO_RESUME
                      ↓                          │  ↑
                   Failed                        ↓  │
                      │                    WaitingInput
                      │
                      │              Running ──CLOSE──→ Stopping
                      │                                    │
                      │                          ┌─────────┤
                  REMOVE                    EXIT_NORMAL  TIMEOUT
                      │                         │          │
                      ↓                         ↓          ↓
                   Removed ←─REMOVE─── Stopped  Disconnected
                      ↑                              │
                      └──────────REMOVE──────────────┘
                                                     │
                                               RECONNECT → Starting
```

### 进程状态机转换路径覆盖表

| 路径编号 | 起始状态 | 触发条件 | 目标状态 | 覆盖测试用例 |
|---------|---------|---------|---------|------------|
| SM_01 | Created | SPAWN | Starting | TERM_L2_05 (创建流程) |
| SM_02 | Starting | SPAWN_SUCCESS | Running | TERM_L3_01 (首个终端旅程) |
| SM_03 | Starting | SPAWN_FAILURE | Failed | TERM_L2_33 (Failed 视觉) |
| SM_04 | Running | PROCESS_START | Busy | TERM_L2_28 (Busy 视觉), TERM_L3_03 |
| SM_05 | Running | WAIT_INPUT | WaitingInput | TERM_L2_29, TERM_L2_56, TERM_L3_03 |
| SM_06 | Running | CLOSE | Stopping | TERM_L2_30 (Stopping 视觉) |
| SM_07 | Busy | PROCESS_DONE | Running | TERM_L3_03 (状态循环) |
| SM_08 | WaitingInput | USER_INPUT | Running | TERM_L2_58, TERM_L3_03 |
| SM_09 | WaitingInput | AUTO_RESUME | Running | TERM_L2_58 (同清除逻辑) |
| SM_10 | Stopping | EXIT_NORMAL | Stopped | TERM_L2_31 (Stopped 视觉) |
| SM_11 | Stopping | TIMEOUT | Disconnected | TERM_L2_32 (Disconnected 视觉) |
| SM_12 | Disconnected | RECONNECT | Starting | — (后端行为，前端仅消费状态推送) |
| SM_13 | Stopped | REMOVE | Removed | TERM_L2_34 (Removed 不可见) |
| SM_14 | Disconnected | REMOVE | Removed | TERM_L2_34 |
| SM_15 | Failed | REMOVE | Removed | TERM_L2_34 |

### 命名状态机转换路径覆盖表

| 路径编号 | 起始状态 | 触发条件 | 目标状态 | 覆盖测试用例 |
|---------|---------|---------|---------|------------|
| NM_01 | DisplayEmpty | START_EDIT | Editing | TERM_L2_41, TERM_L2_35 |
| NM_02 | Editing | CONFIRM (非空) | DisplayNamed | TERM_L2_42, TERM_L2_36 |
| NM_03 | Editing | CONFIRM (空) | DisplayEmpty | TERM_L2_43, TERM_L2_39 |
| NM_04 | Editing | CANCEL (未命名) | DisplayEmpty | TERM_L2_44, TERM_L2_37 |
| NM_05 | Editing | CANCEL (已命名) | DisplayNamed | TERM_L2_45, TERM_L3_04 |
| NM_06 | DisplayNamed | START_EDIT | Editing | TERM_L2_46, TERM_L2_40 |

---

## 统计

| 层级 | 数量 |
|------|------|
| L1 契约层 | 21 |
| L2 规则层 | 42 |
| L3 场景层 | 7 |
| **合计** | **70** |
