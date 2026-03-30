# 模块 03：Focused 模式 — 测试用例

> 来源 PRD：modules/03-focused-mode.md
> 参考附录：appendix-a-state-machine.md
> 生成日期：2026-03-01

## 目录

- [一、L1 契约层测试](#一l1-契约层测试)
  - [1.1 CSS Variables 值验证](#11-css-variables-值验证)
  - [1.2 JS 常量与 CSS Variables 同步验证](#12-js-常量与-css-variables-同步验证)
- [二、L2 规则层测试](#二l2-规则层测试)
  - [2.1 进入方式](#21-进入方式)
  - [2.2 标准布局（多终端）](#22-标准布局多终端)
  - [2.3 单终端布局](#23-单终端布局)
  - [2.4 Bug 修复策略一：visibility:hidden](#24-bug-修复策略一visibilityhidden)
  - [2.5 Bug 修复策略二：suppressResize 标记](#25-bug-修复策略二suppressresize-标记)
  - [2.6 Bug 修复策略三：CSS Variables 统一动画时间](#26-bug-修复策略三css-variables-统一动画时间)
  - [2.7 进入动画](#27-进入动画)
  - [2.8 退出动画](#28-退出动画)
  - [2.9 focusTransition 三阶段状态](#29-focustransition-三阶段状态)
  - [2.10 侧边栏点击切换](#210-侧边栏点击切换)
  - [2.11 退出方式](#211-退出方式)
  - [2.12 WaitingInput 浮动通知](#212-waitinginput-浮动通知)
- [三、L3 场景层测试](#三l3-场景层测试)
  - [3.1 完整 Focused 模式旅程](#31-完整-focused-模式旅程)
  - [3.2 动画期间操作阻止旅程](#32-动画期间操作阻止旅程)
  - [3.3 WaitingInput 通知旅程](#33-waitinginput-通知旅程)
  - [3.4 侧边栏滚动旅程](#34-侧边栏滚动旅程)
  - [3.5 Focused 模式下关闭聚焦终端旅程](#35-focused-模式下关闭聚焦终端旅程)
  - [3.6 单终端 Focused 模式旅程](#36-单终端-focused-模式旅程)
- [状态机覆盖](#状态机覆盖)

---

## 一、L1 契约层测试

### 1.1 CSS Variables 值验证

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| FOCUS_L1_01_css_enter_duration | 无 | 读取 CSS Variable `--focus-enter-duration` | 值为 `300ms` | P0 |
| FOCUS_L1_02_css_exit_duration | 无 | 读取 CSS Variable `--focus-exit-duration` | 值为 `250ms` | P0 |

### 1.2 JS 常量与 CSS Variables 同步验证

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| FOCUS_L1_03_js_enter_duration | 无 | 读取 `FOCUS_ENTER_DURATION` 常量 | 值为 `300`，与 `--focus-enter-duration` 的数值部分一致 | P0 |
| FOCUS_L1_04_js_exit_duration | 无 | 读取 `FOCUS_EXIT_DURATION` 常量 | 值为 `250`，与 `--focus-exit-duration` 的数值部分一致 | P0 |
| FOCUS_L1_05_js_enter_buffer | 无 | 读取 `FOCUS_ENTER_BUFFER` 常量 | 值为 `50` | P1 |
| FOCUS_L1_06_js_exit_buffer | 无 | 读取 `FOCUS_EXIT_BUFFER` 常量 | 值为 `50` | P1 |

---

## 二、L2 规则层测试

### 2.1 进入方式

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| FOCUS_L2_01_enter_dblclick | Tiling 模式，3 个终端 | 双击 t2 的 Tile header | `focusedId` 设为 `'t2'`，进入 Focused 布局 | P0 |
| FOCUS_L2_02_enter_max_btn | Tiling 模式，3 个终端 | 点击 t2 的蓝色最大化按钮 | `focusedId` 设为 `'t2'`，进入 Focused 布局 | P0 |
| FOCUS_L2_03_viewMode_unchanged | Tiling 模式 | 进入 Focused | `viewMode` 仍为 `'Tiling'`（Focused 是 Tiling 的临时叠加） | P0 |

### 2.2 标准布局（多终端）

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| FOCUS_L2_04_main_width_75 | Focused 模式，3 个终端，focusedId=t1 | 渲染主终端 | 主终端宽度为容器的 75% | P0 |
| FOCUS_L2_05_sidebar_width_25 | Focused 模式，3 个终端 | 渲染侧边栏 | 侧边栏宽度为容器的 25% | P0 |
| FOCUS_L2_06_main_position_absolute | Focused 模式 | 检查主终端 CSS | `position: absolute`，`z-index: 10` | P0 |
| FOCUS_L2_07_main_glow_border | Focused 模式 | 检查主终端样式 | 琥珀色发光边框 + 增强阴影 | P1 |
| FOCUS_L2_08_sidebar_max_3_visible | Focused 模式，6 个终端 | 渲染侧边栏 | 侧边栏同时可见最多 3 个 CompactTile | P0 |
| FOCUS_L2_09_sidebar_scrollable | Focused 模式，5 个终端 | 侧边栏内容超出 3 个 | 侧边栏可滚动查看剩余 CompactTile | P0 |

### 2.3 单终端布局

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| FOCUS_L2_10_single_full_width | Focused 模式，1 个终端 | 渲染 | 主终端占 100% 宽度 | P0 |
| FOCUS_L2_11_single_no_sidebar | Focused 模式，1 个终端 | 渲染 | 无侧边栏显示 | P0 |
| FOCUS_L2_12_single_no_esc_hint | Focused 模式，1 个终端 | 渲染 | 无 Esc 退出提示 | P1 |

### 2.4 Bug 修复策略一：visibility:hidden

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| FOCUS_L2_13_hidden_class_applied | Focused 模式，t1 为主终端 | 检查非聚焦终端 t2 | t2 的容器有 `focus-cell--hidden` CSS 类 | P0 |
| FOCUS_L2_14_hidden_visibility | 非聚焦终端 | 检查 CSS computed style | `visibility: hidden` | P0 |
| FOCUS_L2_15_hidden_position_absolute | 非聚焦终端 | 检查 CSS | `position: absolute` | P0 |
| FOCUS_L2_16_hidden_pointer_events | 非聚焦终端 | 检查 CSS | `pointer-events: none` | P0 |
| FOCUS_L2_17_hidden_zindex_negative | 非聚焦终端 | 检查 CSS | `z-index: -1` | P0 |
| FOCUS_L2_18_hidden_size_unchanged | 非聚焦终端在 Focused 前尺寸为 400x300 | 进入 Focused 后检查 | 非聚焦终端尺寸仍为 400x300（不改变 width/height） | P0 |
| FOCUS_L2_19_hidden_no_resize_observer | 非聚焦终端 | 进入 Focused | 不触发 ResizeObserver 回调 | P0 |

### 2.5 Bug 修复策略二：suppressResize 标记

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| FOCUS_L2_20_suppress_set_on_focus | Focused 模式，t1 为主终端 | 检查 t2 的 XTermRenderer | `suppressResize={true}` | P0 |
| FOCUS_L2_21_suppress_no_pty_resize | t2 设置 suppressResize=true | 容器尺寸变化 | 不发送 `terminal:resize` IPC 调用 | P0 |
| FOCUS_L2_22_suppress_no_fit | t2 设置 suppressResize=true | 容器尺寸变化 | 不触发 `fitAddon.fit()` | P0 |
| FOCUS_L2_23_suppress_no_resize_observer | t2 设置 suppressResize=true | ResizeObserver 触发 | 回调被忽略 | P0 |
| FOCUS_L2_24_suppress_clear_on_exit | Focused 模式退出 | 检查所有终端 | `suppressResize` 标记清除，触发一次 fit | P0 |

### 2.6 Bug 修复策略三：CSS Variables 统一动画时间

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| FOCUS_L2_25_enter_setTimeout_match | 进入 Focused | 检查 setTimeout 调用 | 延迟为 `FOCUS_ENTER_DURATION + FOCUS_ENTER_BUFFER` = 350ms | P0 |
| FOCUS_L2_26_exit_setTimeout_match | 退出 Focused | 检查 setTimeout 调用 | 延迟为 `FOCUS_EXIT_DURATION + FOCUS_EXIT_BUFFER` = 300ms | P0 |
| FOCUS_L2_27_css_animation_enter_match | 进入动画 | 检查 CSS animation-duration | 值为 `var(--focus-enter-duration)` = 300ms | P0 |
| FOCUS_L2_28_css_animation_exit_match | 退出动画 | 检查 CSS animation-duration | 值为 `var(--focus-exit-duration)` = 250ms | P0 |

### 2.7 进入动画

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| FOCUS_L2_29_enter_animation_name | 进入 Focused | 检查主终端动画 | 使用 `focusFadeIn` 关键帧动画 | P0 |
| FOCUS_L2_30_enter_animation_duration | 进入 Focused | 检查 animation-duration | 300ms（`--focus-enter-duration`） | P0 |
| FOCUS_L2_31_enter_animation_easing | 进入 Focused | 检查 animation-timing-function | `ease-out` | P1 |
| FOCUS_L2_32_enter_animation_from | focusFadeIn 动画开始 | 检查初始状态 | `opacity: 0; transform: scale(0.95)` | P1 |
| FOCUS_L2_33_enter_animation_to | focusFadeIn 动画结束 | 检查结束状态 | `opacity: 1; transform: scale(1)` | P1 |

### 2.8 退出动画

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| FOCUS_L2_34_exit_animation_reverse | 退出 Focused | 检查动画 | 使用 `focusFadeIn` 的 reverse 方向 | P0 |
| FOCUS_L2_35_exit_animation_duration | 退出 Focused | 检查 animation-duration | 250ms（`--focus-exit-duration`） | P0 |
| FOCUS_L2_36_exit_animation_easing | 退出 Focused | 检查 animation-timing-function | `ease-in` | P1 |
| FOCUS_L2_37_exit_clears_focusedId | 退出动画完成后 | 检查状态 | `focusedId = null` | P0 |
| FOCUS_L2_38_exit_triggers_fit | 退出完成后 | 检查终端 | 所有终端取消 suppressResize，触发 fit | P0 |

### 2.9 focusTransition 三阶段状态

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| FOCUS_L2_39_transition_entering | 触发进入 | 检查 focusTransition | 立即设为 `'entering'` | P0 |
| FOCUS_L2_40_transition_entering_to_idle | focusTransition='entering' | 等待 350ms | 设为 `'idle'` | P0 |
| FOCUS_L2_41_transition_exiting | 触发退出 | 检查 focusTransition | 立即设为 `'exiting'` | P0 |
| FOCUS_L2_42_transition_exiting_to_idle | focusTransition='exiting' | 等待 300ms | 设为 `'idle'`，`focusedId = null` | P0 |
| FOCUS_L2_43_entering_block_exit | focusTransition='entering' | 用户按 Esc 尝试退出 | 退出操作被阻止 | P0 |
| FOCUS_L2_44_entering_block_switch | focusTransition='entering' | 点击侧边栏切换聚焦 | 切换操作被阻止 | P0 |
| FOCUS_L2_45_exiting_block_enter | focusTransition='exiting' | 双击 Tile 尝试进入 | 进入操作被阻止 | P0 |
| FOCUS_L2_46_exiting_block_switch | focusTransition='exiting' | 点击侧边栏切换聚焦 | 切换操作被阻止 | P0 |
| FOCUS_L2_47_idle_allows_all | focusTransition='idle' | 尝试退出/进入/切换 | 所有操作允许 | P0 |

### 2.10 侧边栏点击切换

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| FOCUS_L2_48_sidebar_click_updates_focused | Focused，focusedId=t1，侧边栏有 t2/t3 | 点击 t2 的 CompactTile | `focusedId` 更新为 `'t2'` | P0 |
| FOCUS_L2_49_sidebar_old_main_suppress | 切换前 focusedId=t1 | 点击 t2 | t1 设置 suppressResize=true，移入侧边栏 | P0 |
| FOCUS_L2_50_sidebar_new_main_fit | 切换前 t2 在侧边栏 | 点击 t2 成为主终端 | t2 取消 suppressResize，触发 fit 适配主区尺寸 | P0 |
| FOCUS_L2_51_sidebar_refit_event | 侧边栏切换完成 | 检查 | 触发 `muxvo:sidebar-refit` 自定义事件 | P1 |
| FOCUS_L2_52_sidebar_blocked_during_transition | focusTransition='entering' | 点击侧边栏 CompactTile | 点击无效，不触发切换 | P0 |

### 2.11 退出方式

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| FOCUS_L2_53_esc_exit | Focused，focusTransition='idle'，焦点不在 xterm | 按 Esc | 触发退出动画，动画完成后切回 Tiling | P0 |
| FOCUS_L2_54_esc_consumed_by_xterm | Focused，焦点在 xterm 输入区域 | 按 Esc | Esc 由 xterm 消费，不触发退出 | P0 |
| FOCUS_L2_55_esc_blocked_during_transition | Focused，focusTransition='entering' | 按 Esc | 退出被阻止 | P0 |
| FOCUS_L2_56_exit_scroll_preserved | Focused，终端有滚动历史 | 退出回 Tiling | 所有终端滚动位置保持不变 | P0 |

### 2.12 WaitingInput 浮动通知

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| FOCUS_L2_57_notify_non_focused | Focused，focusedId=t1 | t2（非聚焦）进入 WaitingInput | 显示 WaitingInputNotification 浮动通知 | P0 |
| FOCUS_L2_58_no_notify_focused | Focused，focusedId=t1 | t1（聚焦）进入 WaitingInput | 不显示浮动通知（用户已能看到） | P0 |
| FOCUS_L2_59_notify_content | 非聚焦 t2 (名称 "Backend") WaitingInput | 渲染通知 | 显示 "Terminal Backend 正在等待输入" + 切换按钮 | P0 |
| FOCUS_L2_60_notify_switch_btn | 通知显示中，有切换按钮 | 点击切换按钮 | focusedId 切换为 t2 | P0 |
| FOCUS_L2_61_notify_multi_count | t2 和 t3 同时 WaitingInput | 渲染通知 | 显示最早的终端 + "还有 1 个终端等待输入" | P0 |
| FOCUS_L2_62_notify_multi_cycle | t2 和 t3 同时 WaitingInput | 多次点击切换 | 依次切换到 t2、t3 | P1 |
| FOCUS_L2_63_notify_dismiss_input | t2 WaitingInput，通知显示中 | t2 收到 Running 状态 | 通知消失 | P0 |
| FOCUS_L2_64_notify_dismiss_switch | t2 WaitingInput，通知显示中 | 用户通过通知切换到 t2 | 通知消失（t2 变为聚焦终端） | P0 |
| FOCUS_L2_65_notify_dismiss_close | t2 WaitingInput，通知显示中 | t2 被关闭 | 通知消失 | P0 |
| FOCUS_L2_66_notify_slide_in | 通知首次出现 | 检查动画 | 从顶部滑入（`translateY(-100%) → translateY(0)`） | P1 |
| FOCUS_L2_67_notify_slide_out | 通知消失 | 检查动画 | 向顶部滑出 | P1 |
| FOCUS_L2_68_notify_breathe | 通知持续显示 | 检查动画 | 轻微呼吸脉动效果 | P2 |

---

## 三、L3 场景层测试

### 3.1 完整 Focused 模式旅程

**编号**：FOCUS_L3_01_full_journey

**前置条件**：Tiling 模式，3 个终端 [t1, t2, t3]，selectedId=t1

**步骤**：

1. 用户双击 t2 的 Tile header
2. focusedId 设为 't2'，focusTransition 设为 'entering'
3. 进入动画开始：focusFadeIn 300ms ease-out
4. 350ms 后 focusTransition 变为 'idle'
5. 布局：t2 为主终端（75%宽），侧边栏显示 t1、t3 的 CompactTile
6. 非聚焦终端 t1/t3 应用 focus-cell--hidden 类（visibility:hidden）
7. 用户点击侧边栏中的 t3
8. focusedId 更新为 't3'
9. t2 设置 suppressResize=true，移入侧边栏
10. t3 取消 suppressResize，触发 fit，成为主终端
11. 用户点击主终端 header 区域（使焦点离开 xterm）
12. 按 Esc 键
13. focusTransition 设为 'exiting'
14. 退出动画：focusFadeIn reverse 250ms ease-in
15. 300ms 后 focusTransition 变为 'idle'，focusedId 设为 null
16. 回到 Tiling 模式，所有终端取消 suppressResize，触发 fit
17. 终端滚动位置保持不变

**期望**：进入 → 侧边栏切换 → 退出的完整流程无异常，动画过渡平滑。

**优先级**：P0

---

### 3.2 动画期间操作阻止旅程

**编号**：FOCUS_L3_02_transition_block_journey

**前置条件**：Tiling 模式，3 个终端

**步骤**：

1. 用户双击 t1 进入 Focused
2. focusTransition 变为 'entering'
3. 在进入动画中（350ms 内）用户按 Esc → 操作被阻止
4. 在进入动画中用户点击侧边栏 t2 → 操作被阻止
5. 350ms 后 focusTransition 变为 'idle'
6. 用户按 Esc 触发退出
7. focusTransition 变为 'exiting'
8. 在退出动画中（300ms 内）用户双击尝试进入 → 操作被阻止
9. 在退出动画中用户点击侧边栏 → 操作被阻止
10. 300ms 后 focusTransition 变为 'idle'，回到 Tiling

**期望**：entering 和 exiting 状态期间，所有进入/退出/切换操作均被正确阻止。

**优先级**：P0

---

### 3.3 WaitingInput 通知旅程

**编号**：FOCUS_L3_03_waiting_notify_journey

**前置条件**：Focused 模式，focusedId=t1，3 个终端 [t1, t2, t3]

**步骤**：

1. t2（非聚焦）收到 `onStateChange` state='WaitingInput'
2. 浮动通知从顶部滑入：显示 "Terminal t2 正在等待输入" + 切换按钮
3. 用户点击通知中的切换按钮
4. focusedId 切换为 t2，t2 成为主终端
5. 通知消失（t2 已是聚焦终端）
6. t3（现在非聚焦）也进入 WaitingInput
7. 新通知出现，显示 t3 的等待信息
8. 用户在 t3 对应终端输入内容（通过侧边栏切换到 t3 再输入）
9. t3 收到 Running 状态，通知消失

**期望**：WaitingInput 通知正确出现/消失，切换按钮功能正常。

**优先级**：P0

---

### 3.4 侧边栏滚动旅程

**编号**：FOCUS_L3_04_sidebar_scroll_journey

**前置条件**：5 个终端 [t1, t2, t3, t4, t5]，Focused 模式，focusedId=t1

**步骤**：

1. 侧边栏显示 t2、t3、t4（前 3 个可见），t5 需滚动查看
2. 侧边栏可滚动
3. 用户向下滚动侧边栏，看到 t5
4. 用户点击 t5
5. focusedId 切换为 t5
6. 侧边栏重新排列，显示 t1、t2、t3（t4 需滚动）
7. t5 成为主终端，触发 fit

**期望**：超过 3 个终端时侧边栏可滚动，点击滚动区域的终端能正确切换。

**优先级**：P1

---

### 3.5 Focused 模式下关闭聚焦终端旅程

**编号**：FOCUS_L3_05_close_focused_journey

**前置条件**：Focused 模式，3 个终端 [t1, t2, t3]，focusedId=t1

**步骤**：

1. 用户点击主终端 t1 的关闭按钮
2. t1 无前台进程 → 直接关闭
3. t1 从 terminals 移除
4. focusedId 需要更新（t1 已不存在）
5. 自动选中新的聚焦终端（按 terminalOrder 选下一个，即 t2）
6. t2 成为新的主终端
7. 侧边栏显示 t3
8. 布局正确更新

**期望**：关闭聚焦终端后自动切换到下一个终端，Focused 模式不中断。

**优先级**：P0

---

### 3.6 单终端 Focused 模式旅程

**编号**：FOCUS_L3_06_single_terminal_journey

**前置条件**：2 个终端 [t1, t2]，Focused 模式，focusedId=t1

**步骤**：

1. 标准布局：t1 主终端（75%），侧边栏显示 t2
2. 用户关闭 t2
3. 终端数降为 1，布局切换为单终端模式
4. t1 主终端占 100% 宽度
5. 无侧边栏显示
6. 无 Esc 退出提示（没有 Tiling 布局可退回到）
7. 用户在 t1 中正常工作

**期望**：从多终端布局过渡到单终端布局时平滑，无闪烁。

**优先级**：P1

---

## 状态机覆盖

### focusTransition 状态机图

```
         进入 Focused
              │
              ↓
idle ──→ entering ──350ms──→ idle ──→ exiting ──300ms──→ idle
                                         ↑                  │
                                         │                  │
                                    退出 Focused      focusedId=null
```

### focusTransition 转换路径覆盖表

| 路径编号 | 起始状态 | 触发条件 | 目标状态 | 覆盖测试用例 |
|---------|---------|---------|---------|------------|
| FT_01 | idle | 双击 Tile / 点击最大化 | entering | FOCUS_L2_39, FOCUS_L2_01 |
| FT_02 | entering | 350ms 超时 | idle | FOCUS_L2_40, FOCUS_L3_01 |
| FT_03 | idle | 按 Esc / 退出操作 | exiting | FOCUS_L2_41, FOCUS_L2_53 |
| FT_04 | exiting | 300ms 超时 | idle (focusedId=null) | FOCUS_L2_42, FOCUS_L2_37 |

### entering 期间阻止操作覆盖表

| 操作 | 覆盖测试用例 |
|------|------------|
| 按 Esc 退出 | FOCUS_L2_43, FOCUS_L3_02 |
| 侧边栏点击切换 | FOCUS_L2_44, FOCUS_L3_02 |

### exiting 期间阻止操作覆盖表

| 操作 | 覆盖测试用例 |
|------|------------|
| 双击进入 Focused | FOCUS_L2_45, FOCUS_L3_02 |
| 侧边栏点击切换 | FOCUS_L2_46, FOCUS_L3_02 |

---

## 统计

| 层级 | 数量 |
|------|------|
| L1 契约层 | 6 |
| L2 规则层 | 68 |
| L3 场景层 | 6 |
| **合计** | **80** |
