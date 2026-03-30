# 模块 06：视觉效果 — 测试用例

> 来源 PRD：modules/06-visual-effects.md
> 生成日期：2026-03-01

## 目录

- [一、L1 契约层测试](#一l1-契约层测试)
- [二、L2 规则层测试](#二l2-规则层测试)
  - [2.1 状态指示点映射](#21-状态指示点映射)
  - [2.2 statusPulse 动画](#22-statuspulse-动画)
  - [2.3 WaitingInput 视觉效果](#23-waitinginput-视觉效果)
  - [2.4 Tile 基础样式](#24-tile-基础样式)
  - [2.5 Tile 状态 Class 对照](#25-tile-状态-class-对照)
  - [2.6 tileEnter 入场动画](#26-tileenter-入场动画)
  - [2.7 聚焦过渡动画](#27-聚焦过渡动画)
  - [2.8 终端内容隐藏](#28-终端内容隐藏)
  - [2.9 focus-cell--hidden](#29-focus-cell--hidden)
  - [2.10 关闭确认对话框](#210-关闭确认对话框)
  - [2.11 Dark/Light 主题适配](#211-darklight-主题适配)
  - [2.12 保留的 CSS Class 名](#212-保留的-css-class-名)
- [三、L3 场景层测试](#三l3-场景层测试)

---

## 一、L1 契约层测试

### VFX_L1_01_focus_enter_duration

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L1_01 |
| **名称** | --focus-enter-duration CSS variable 默认值为 300ms |
| **层级** | L1 契约 |
| **验证点** | `:root` 级别定义 `--focus-enter-duration: 300ms` |
| **测试方法** | 读取 CSS/computed style 的 --focus-enter-duration，断言为 '300ms' |
| **期望结果** | `300ms` |

### VFX_L1_02_focus_exit_duration

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L1_02 |
| **名称** | --focus-exit-duration CSS variable 默认值为 250ms |
| **层级** | L1 契约 |
| **验证点** | `:root` 级别定义 `--focus-exit-duration: 250ms` |
| **测试方法** | 读取 --focus-exit-duration，断言为 '250ms' |
| **期望结果** | `250ms` |

### VFX_L1_03_tile_enter_duration

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L1_03 |
| **名称** | --tile-enter-duration CSS variable 默认值为 600ms |
| **层级** | L1 契约 |
| **验证点** | `:root` 级别定义 `--tile-enter-duration: 600ms` |
| **测试方法** | 读取 --tile-enter-duration，断言为 '600ms' |
| **期望结果** | `600ms` |

### VFX_L1_04_content_fade_duration

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L1_04 |
| **名称** | --content-fade-duration CSS variable 默认值为 200ms |
| **层级** | L1 契约 |
| **验证点** | `:root` 级别定义 `--content-fade-duration: 200ms` |
| **测试方法** | 读取 --content-fade-duration，断言为 '200ms' |
| **期望结果** | `200ms` |

### VFX_L1_05_js_css_sync_focus_enter

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L1_05 |
| **名称** | FOCUS_ENTER_MS JS 常量与 --focus-enter-duration CSS 变量同步 |
| **层级** | L1 契约 |
| **验证点** | JS 端 `FOCUS_ENTER_MS = 300` 与 CSS `--focus-enter-duration: 300ms` 一致 |
| **测试方法** | 导入 FOCUS_ENTER_MS 常量，断言值为 300；读取 CSS variable，断言为 '300ms' |
| **期望结果** | 两者一致 |

### VFX_L1_06_js_css_sync_focus_exit

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L1_06 |
| **名称** | FOCUS_EXIT_MS JS 常量与 --focus-exit-duration CSS 变量同步 |
| **层级** | L1 契约 |
| **验证点** | JS 端 `FOCUS_EXIT_MS = 250` 与 CSS `--focus-exit-duration: 250ms` 一致 |
| **测试方法** | 导入 FOCUS_EXIT_MS 常量，断言值为 250；读取 CSS variable，断言为 '250ms' |
| **期望结果** | 两者一致 |

### VFX_L1_07_accent_color_dark

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L1_07 |
| **名称** | --accent Dark 值为 #e8a748（琥珀色） |
| **层级** | L1 契约 |
| **验证点** | Dark 主题下 `--accent` 为 #e8a748 |
| **测试方法** | Dark 主题下读取 --accent 的 computed value |
| **期望结果** | `#e8a748` |

### VFX_L1_08_success_color

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L1_08 |
| **名称** | --success 颜色为 #22c55e（绿色） |
| **层级** | L1 契约 |
| **验证点** | `--success` 在 Dark/Light 主题下均为 #22c55e |
| **测试方法** | 读取 --success 的 computed value |
| **期望结果** | `#22c55e` |

---

## 二、L2 规则层测试

### 2.1 状态指示点映射

#### VFX_L2_01_created_idle

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_01 |
| **名称** | Created 状态 → tile-status--idle + 灰色 + 无动画 |
| **层级** | L2 规则 |
| **验证点** | Created 状态映射为 CSS class `tile-status--idle`，颜色 var(--text-muted)，无动画 |
| **测试方法** | 调用 UI map 函数传入 'Created' → 断言返回 { class: 'tile-status--idle', color: 'var(--text-muted)', animation: null } |
| **期望结果** | idle 灰色无动画 |

#### VFX_L2_02_starting_idle

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_02 |
| **名称** | Starting 状态 → tile-status--idle + 灰色 + 无动画 |
| **层级** | L2 规则 |
| **验证点** | Starting 与 Created 视觉一致 |
| **测试方法** | 传入 'Starting' → 断言同 idle |
| **期望结果** | idle 灰色无动画 |

#### VFX_L2_03_running_green_pulse

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_03 |
| **名称** | Running 状态 → tile-status--running + 绿色 + statusPulse 2s |
| **层级** | L2 规则 |
| **验证点** | Running 映射为 `tile-status--running`，颜色 var(--success)，statusPulse 2s |
| **测试方法** | 传入 'Running' → 断言返回 { class: 'tile-status--running', color: 'var(--success)', animation: 'statusPulse 2s' } |
| **期望结果** | running 绿色 2s 脉动 |

#### VFX_L2_04_busy_same_as_running

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_04 |
| **名称** | Busy 状态与 Running 视觉一致 |
| **层级** | L2 规则 |
| **验证点** | Busy 映射结果与 Running 相同 |
| **测试方法** | 传入 'Busy' → 断言结果与 'Running' 相同 |
| **期望结果** | 与 Running 一致 |

#### VFX_L2_05_waiting_input_red_pulse

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_05 |
| **名称** | WaitingInput 状态 → tile-status--waiting + 红色 + statusPulse 1s |
| **层级** | L2 规则 |
| **验证点** | WaitingInput 映射为 `tile-status--waiting`，颜色 #ef4444，statusPulse 1s（加速） |
| **测试方法** | 传入 'WaitingInput' → 断言 { class: 'tile-status--waiting', color: '#ef4444', animation: 'statusPulse 1s' } |
| **期望结果** | waiting 红色 1s 加速脉动 |

#### VFX_L2_06_stopped_idle

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_06 |
| **名称** | Stopped 状态 → tile-status--idle |
| **层级** | L2 规则 |
| **验证点** | Stopped 映射为 idle |
| **测试方法** | 传入 'Stopped' → 断言 idle |
| **期望结果** | idle |

#### VFX_L2_07_stopping_idle

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_07 |
| **名称** | Stopping 状态 → tile-status--idle |
| **层级** | L2 规则 |
| **验证点** | Stopping 映射为 idle |
| **测试方法** | 传入 'Stopping' → 断言 idle |
| **期望结果** | idle |

#### VFX_L2_08_disconnected_idle

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_08 |
| **名称** | Disconnected 状态 → tile-status--idle |
| **层级** | L2 规则 |
| **验证点** | Disconnected 映射为 idle |
| **测试方法** | 传入 'Disconnected' → 断言 idle |
| **期望结果** | idle |

#### VFX_L2_09_failed_idle

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_09 |
| **名称** | Failed 状态 → tile-status--idle |
| **层级** | L2 规则 |
| **验证点** | Failed 映射为 idle |
| **测试方法** | 传入 'Failed' → 断言 idle |
| **期望结果** | idle |

#### VFX_L2_10_all_10_states_covered

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_10 |
| **名称** | 全部 10 种进程状态（含 Removed）均有映射 |
| **层级** | L2 规则 |
| **验证点** | UI map 覆盖所有 9 个可见状态 + Removed |
| **测试方法** | 遍历所有状态值调用 map 函数，断言均返回有效结果（不抛错） |
| **期望结果** | 全部覆盖 |

### 2.2 statusPulse 动画

#### VFX_L2_11_statusPulse_2s_period

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_11 |
| **名称** | statusPulse 动画 Running/Busy 使用 2s 周期 |
| **层级** | L2 规则 |
| **验证点** | tile-status--running 的 animation-duration 为 2s |
| **前置条件** | 渲染 Running 状态的状态点 |
| **测试方法** | 断言 computed animation-duration 为 '2s' |
| **期望结果** | 2s |

#### VFX_L2_12_statusPulse_1s_period

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_12 |
| **名称** | statusPulse 动画 WaitingInput 使用 1s 周期（加速） |
| **层级** | L2 规则 |
| **验证点** | tile-status--waiting 的 animation-duration 为 1s |
| **前置条件** | 渲染 WaitingInput 状态的状态点 |
| **测试方法** | 断言 computed animation-duration 为 '1s' |
| **期望结果** | 1s |

#### VFX_L2_13_statusPulse_ease_in_out

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_13 |
| **名称** | statusPulse 使用 ease-in-out 缓动 |
| **层级** | L2 规则 |
| **验证点** | animation-timing-function 为 ease-in-out |
| **前置条件** | 渲染带 statusPulse 的状态点 |
| **测试方法** | 断言 animation-timing-function |
| **期望结果** | ease-in-out |

### 2.3 WaitingInput 视觉效果

#### VFX_L2_14_tile_border_glow

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_14 |
| **名称** | tile--waiting 边框脉动 borderGlow 2.5s |
| **层级** | L2 规则 |
| **验证点** | `.tile--waiting` 有 animation: borderGlow 2.5s ease-in-out infinite |
| **前置条件** | 渲染 WaitingInput 状态的 Tile |
| **测试方法** | 断言 Tile 的 animation-name 包含 borderGlow，duration 2.5s |
| **期望结果** | borderGlow 2.5s 无限循环 |

#### VFX_L2_15_tile_waiting_border_style

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_15 |
| **名称** | tile--waiting 边框为 2px solid rgba(239,68,68,0.7) |
| **层级** | L2 规则 |
| **验证点** | WaitingInput 状态下 Tile 有红色边框 |
| **前置条件** | 渲染 WaitingInput 状态 Tile |
| **测试方法** | 断言 border 样式 |
| **期望结果** | 2px solid 红色 |

#### VFX_L2_16_outline_glow_dual_state

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_16 |
| **名称** | 双状态叠加（选中/聚焦 + WaitingInput）红色 outline 脉动 |
| **层级** | L2 规则 |
| **验证点** | `.tile--waiting.tile-selected` 和 `.tile--waiting.tile-focused` 有 outlineGlow 动画 |
| **前置条件** | 渲染同时有 waiting + selected 的 Tile |
| **测试方法** | 断言 animation-name 包含 outlineGlow |
| **期望结果** | outlineGlow 动画激活 |

#### VFX_L2_17_outline_glow_keeps_amber_border

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_17 |
| **名称** | 双状态叠加时保持琥珀色选中边框 |
| **层级** | L2 规则 |
| **验证点** | tile--waiting + tile-selected 时，border-color 仍为 var(--accent)，红色仅在 outline |
| **前置条件** | 渲染 waiting + selected Tile |
| **测试方法** | 断言 border-color 为琥珀色，outline-color 为红色 |
| **期望结果** | 边框琥珀 + outline 红色 |

#### VFX_L2_18_waiting_badge_style

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_18 |
| **名称** | WaitingInput Badge 样式（红色圆形 + badgePulse 1.5s） |
| **层级** | L2 规则 |
| **验证点** | `.tile-waiting-badge` 有 font-size:11px, font-weight:700, color:#fff, background:#ef4444, min-width:18px, height:18px, border-radius:50%, badgePulse 1.5s |
| **前置条件** | 渲染 WaitingInput 状态 Tile |
| **测试方法** | 断言 badge 元素的 computed style |
| **期望结果** | 所有样式正确 |

#### VFX_L2_19_badge_pulse_opacity

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_19 |
| **名称** | badgePulse 动画 opacity 0.6~1 循环 |
| **层级** | L2 规则 |
| **验证点** | badgePulse 关键帧中 opacity 在 0.6 和 1 之间循环 |
| **前置条件** | 渲染 badge |
| **测试方法** | 检查 @keyframes badgePulse 定义或读取 animation 属性 |
| **期望结果** | opacity 循环 0.6~1 |

#### VFX_L2_20_floating_notification_position

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_20 |
| **名称** | 浮动通知位置 fixed bottom:16px right:16px z-index:200 |
| **层级** | L2 规则 |
| **验证点** | WaitingInputNotification 的 position/bottom/right/z-index |
| **前置条件** | waitingCount > 0 且 overlayActive |
| **测试方法** | 断言通知元素的 computed style |
| **期望结果** | fixed, bottom:16px, right:16px, z-index:200 |

#### VFX_L2_21_floating_notification_condition

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_21 |
| **名称** | 浮动通知显示条件：waitingCount > 0 && overlayActive |
| **层级** | L2 规则 |
| **验证点** | 仅当有等待终端且用户看不到终端时显示 |
| **前置条件** | 渲染组件 |
| **测试方法** | waitingCount=0 → 不显示；waitingCount=1 + overlayActive=false → 不显示；waitingCount=1 + overlayActive=true → 显示 |
| **期望结果** | 两个条件同时满足才显示 |

#### VFX_L2_22_floating_notification_text

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_22 |
| **名称** | 浮动通知文案正确（单数/复数） |
| **层级** | L2 规则 |
| **验证点** | waitingCount=1 显示 "1 terminal waiting for input"；waitingCount=3 显示 "3 terminals waiting for input" |
| **前置条件** | 不同 waitingCount 值 |
| **测试方法** | 断言文案内容 |
| **期望结果** | 单复数正确 |

#### VFX_L2_23_floating_notification_red_dot

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_23 |
| **名称** | 浮动通知红点 8px + waitingDotPulse 动画 |
| **层级** | L2 规则 |
| **验证点** | 通知中的红点为 8px 圆形，有 waitingDotPulse 动画 |
| **前置条件** | 通知显示 |
| **测试方法** | 断言红点元素的尺寸和 animation |
| **期望结果** | 8px 圆形 + 脉动动画 |

### 2.4 Tile 基础样式

#### VFX_L2_24_tile_container_style

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_24 |
| **名称** | Tile 容器基础样式（圆角、边框、阴影、过渡） |
| **层级** | L2 规则 |
| **验证点** | `.tile` 有 border-radius:10px, border:2px solid var(--border), outline:3px solid transparent, box-shadow, transition |
| **前置条件** | 渲染 TerminalTile |
| **测试方法** | 断言 .tile 的 computed style |
| **期望结果** | 基础样式正确 |

#### VFX_L2_25_tile_hover_shadow

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_25 |
| **名称** | Tile hover 时增强阴影 |
| **层级** | L2 规则 |
| **验证点** | `.tile:hover` 的 box-shadow 比默认更强 |
| **前置条件** | 渲染 Tile |
| **测试方法** | 模拟 hover → 断言 box-shadow 变化 |
| **期望结果** | 阴影增强 |

#### VFX_L2_26_gloss_overlay

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_26 |
| **名称** | 光泽效果 ::after 伪元素使用 --mx/--my CSS 变量 |
| **层级** | L2 规则 |
| **验证点** | `.tile::after` 有 radial-gradient at var(--mx, 50%) var(--my, 50%)，pointer-events:none |
| **前置条件** | 渲染 Tile |
| **测试方法** | 断言 ::after 伪元素的 background 和 pointer-events |
| **期望结果** | 光泽效果正确 |

#### VFX_L2_27_tile_header_style

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_27 |
| **名称** | Tile Header 样式（padding、background、border-bottom、gap） |
| **层级** | L2 规则 |
| **验证点** | `.tile-header` 有 padding:6px 10px, background:var(--bg-primary), border-bottom:1px solid var(--border), gap:8px |
| **前置条件** | 渲染 Tile |
| **测试方法** | 断言 header 的 computed style |
| **期望结果** | 样式正确 |

### 2.5 Tile 状态 Class 对照

#### VFX_L2_28_tile_selected_style

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_28 |
| **名称** | tile-selected：琥珀色边框 + 名称变琥珀色 |
| **层级** | L2 规则 |
| **验证点** | `.tile-selected` 有 border-color:var(--accent)；`.tile-selected .tile-name` 有 color:var(--accent) |
| **前置条件** | 渲染选中状态 Tile |
| **测试方法** | 断言 border-color 和 .tile-name 颜色 |
| **期望结果** | 琥珀色边框 + 名称 |

#### VFX_L2_29_tile_focused_style

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_29 |
| **名称** | tile-focused：height:100% + z-index:100 + 增强阴影 |
| **层级** | L2 规则 |
| **验证点** | `.tile-focused` 有 height:100%, z-index:100, border-color:var(--border-focus), 增强 box-shadow |
| **前置条件** | 渲染聚焦状态 Tile |
| **测试方法** | 断言 height, z-index, border-color, box-shadow |
| **期望结果** | 聚焦样式正确 |

#### VFX_L2_30_tile_dragging_style

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_30 |
| **名称** | tile.dragging：opacity 0.4 |
| **层级** | L2 规则 |
| **验证点** | `.tile.dragging` 有 opacity:0.4 |
| **前置条件** | 渲染拖拽中 Tile |
| **测试方法** | 断言 opacity |
| **期望结果** | 0.4 |

#### VFX_L2_31_tile_drag_over_style

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_31 |
| **名称** | tile.drag-over：琥珀色边框发光 |
| **层级** | L2 规则 |
| **验证点** | `.tile.drag-over` 有 border-color:var(--accent) !important + box-shadow |
| **前置条件** | 渲染被拖拽悬停的 Tile |
| **测试方法** | 断言 border-color 和 box-shadow |
| **期望结果** | 琥珀色边框 + 阴影 |

### 2.6 tileEnter 入场动画

#### VFX_L2_32_tile_enter_animation

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_32 |
| **名称** | tileEnter 动画：600ms cubic-bezier 从 opacity:0+translateY(40px)+scale(0.95) |
| **层级** | L2 规则 |
| **验证点** | `.tile-enter` 有 animation: tileEnter 600ms cubic-bezier(0.16,1,0.3,1) both |
| **前置条件** | 渲染新 Tile |
| **测试方法** | 断言 .tile-enter 的 animation 属性 |
| **期望结果** | 600ms cubic-bezier |

#### VFX_L2_33_tile_enter_stagger

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_33 |
| **名称** | 交错延迟 stagger 50ms/index |
| **层级** | L2 规则 |
| **验证点** | animation-delay = `calc(var(--stagger-index, 0) * 50ms)` |
| **前置条件** | 渲染 3 个 Tile |
| **测试方法** | 断言第 1 个 Tile delay=0ms, 第 2 个=50ms, 第 3 个=100ms |
| **期望结果** | 交错 50ms |

#### VFX_L2_34_tile_enter_cleanup

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_34 |
| **名称** | 动画完成后移除 .tile-enter class |
| **层级** | L2 规则 |
| **验证点** | onAnimationEnd 回调移除 `.tile-enter` class，避免覆盖 borderGlow |
| **前置条件** | 渲染带 .tile-enter 的 Tile |
| **测试方法** | 触发 onAnimationEnd → 断言 element.classList 不再包含 'tile-enter' |
| **期望结果** | class 被移除 |

#### VFX_L2_35_tile_enter_no_conflict_with_waiting

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_35 |
| **名称** | 入场动画清理后 borderGlow 正常工作 |
| **层级** | L2 规则 |
| **验证点** | tile-enter 移除后，tile--waiting 的 borderGlow 动画不被覆盖 |
| **前置条件** | Tile 同时有 tile-enter 和 tile--waiting |
| **测试方法** | 等待 onAnimationEnd → 断言 borderGlow 动画正在运行 |
| **期望结果** | borderGlow 正常 |

### 2.7 聚焦过渡动画

#### VFX_L2_36_focus_transition_three_phases

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_36 |
| **名称** | 聚焦过渡三阶段：entering → idle → exiting → idle |
| **层级** | L2 规则 |
| **验证点** | focusTransition 状态经历 entering(400ms) → idle → exiting(350ms) → idle |
| **前置条件** | Mock setTimeout |
| **测试方法** | 进入聚焦 → 断言 entering → 400ms 后 idle → 退出 → 断言 exiting → 350ms 后 idle |
| **期望结果** | 三阶段正确 |

#### VFX_L2_37_focus_fade_in_animation

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_37 |
| **名称** | 进入动画 focusFadeIn 300ms ease |
| **层级** | L2 规则 |
| **验证点** | `.focus-cell--entering.focus-cell--main` 有 animation: focusFadeIn 300ms ease both |
| **前置条件** | 进入聚焦模式 |
| **测试方法** | 断言主 cell 的 animation |
| **期望结果** | focusFadeIn 300ms |

#### VFX_L2_38_focus_entering_non_main_static

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_38 |
| **名称** | entering 阶段非聚焦 tile 保持 grid 位置不动 |
| **层级** | L2 规则 |
| **验证点** | 非聚焦 tile 在 entering 阶段不改变位置 + pointer-events:none |
| **前置条件** | 进入聚焦模式，3 个 tile |
| **测试方法** | 断言非主 tile 的 position 不变，pointer-events 为 none |
| **期望结果** | 非聚焦 tile 静止 |

#### VFX_L2_39_focus_exit_reverse_animation

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_39 |
| **名称** | 退出动画为 focusFadeIn reverse 250ms |
| **层级** | L2 规则 |
| **验证点** | `.focus-cell--exiting.focus-cell--main` 有 animation: focusFadeIn 250ms ease reverse both |
| **前置条件** | 退出聚焦模式 |
| **测试方法** | 断言主 cell 的 animation-direction 为 reverse |
| **期望结果** | reverse 动画 |

#### VFX_L2_40_focus_restoring_fade_in

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_40 |
| **名称** | exiting 阶段非聚焦 tile 渐入恢复 + pointer-events:none |
| **层级** | L2 规则 |
| **验证点** | `.focus-cell--restoring` 有 focusFadeIn 250ms ease both, pointer-events:none |
| **前置条件** | 退出聚焦模式 |
| **测试方法** | 断言 restoring cell 的 animation 和 pointer-events |
| **期望结果** | 渐入 + 不可点击 |

### 2.8 终端内容隐藏

#### VFX_L2_41_terminal_content_hidden_during_transition

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_41 |
| **名称** | 过渡期间终端内容 opacity:0 !important |
| **层级** | L2 规则 |
| **验证点** | `.focus-cell--entering .tile-terminal` 和 `.focus-cell--exiting .tile-terminal` 有 opacity:0 !important |
| **前置条件** | 进入或退出聚焦过渡中 |
| **测试方法** | 断言 .tile-terminal 的 opacity 为 0 |
| **期望结果** | opacity:0 |

#### VFX_L2_42_terminal_content_fade_in_after_transition

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_42 |
| **名称** | 过渡完成后终端内容渐入 200ms |
| **层级** | L2 规则 |
| **验证点** | `.focus-cell--main .tile-terminal` 有 transition: opacity 200ms ease |
| **前置条件** | 聚焦过渡完成后（idle 态） |
| **测试方法** | 断言 .tile-terminal 的 transition |
| **期望结果** | opacity 200ms ease |

### 2.9 focus-cell--hidden

#### VFX_L2_43_focus_cell_hidden_visibility

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_43 |
| **名称** | focus-cell--hidden 使用 visibility:hidden + pointer-events:none |
| **层级** | L2 规则 |
| **验证点** | `.focus-cell--hidden` 有 visibility:hidden, pointer-events:none（不再是旧版 1px+overflow:hidden） |
| **前置条件** | 聚焦模式 idle 态的非聚焦 tile |
| **测试方法** | 断言 computed visibility 和 pointer-events |
| **期望结果** | visibility:hidden, pointer-events:none |

#### VFX_L2_44_focus_cell_hidden_no_old_hack

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_44 |
| **名称** | focus-cell--hidden 不使用旧版 1px+overflow:hidden hack |
| **层级** | L2 规则 |
| **验证点** | CSS 中无 width:1px, height:1px, overflow:hidden 相关的 focus-cell 隐藏规则 |
| **前置条件** | 无 |
| **测试方法** | 搜索 CSS 源码，断言无旧版 hack 代码 |
| **期望结果** | 无旧版 hack |

### 2.10 关闭确认对话框

#### VFX_L2_45_close_dialog_overlay_style

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_45 |
| **名称** | 关闭确认对话框 overlay: fixed inset:0 背景 rgba(0,0,0,0.6) z-index:1000 |
| **层级** | L2 规则 |
| **验证点** | `.close-confirm-overlay` 的样式正确 |
| **前置条件** | 触发关闭确认 |
| **测试方法** | 断言 overlay 的 position, inset, background, z-index |
| **期望结果** | fixed, inset:0, 半透明黑, z-index:1000 |

#### VFX_L2_46_close_dialog_style

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_46 |
| **名称** | 对话框样式：bg-card, 12px 圆角, padding 32px 40px, min/max-width |
| **层级** | L2 规则 |
| **验证点** | `.close-confirm-dialog` 的样式正确 |
| **前置条件** | 弹出对话框 |
| **测试方法** | 断言 background, border-radius, padding, min-width, max-width, box-shadow |
| **期望结果** | 样式符合规格 |

#### VFX_L2_47_close_dialog_click_overlay_cancel

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_47 |
| **名称** | 点击遮罩区域 → 取消关闭 |
| **层级** | L2 规则 |
| **验证点** | 点击 overlay（非 dialog）触发取消 |
| **前置条件** | 对话框已弹出 |
| **测试方法** | 点击 overlay → 断言对话框关闭，终端未被关闭 |
| **期望结果** | 取消操作 |

#### VFX_L2_48_close_dialog_click_inside_no_bubble

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_48 |
| **名称** | 点击对话框内部不冒泡到遮罩 |
| **层级** | L2 规则 |
| **验证点** | 点击 dialog 内部区域不触发 overlay 的点击事件（stopPropagation） |
| **前置条件** | 对话框已弹出 |
| **测试方法** | 点击 dialog 内部 → 断言对话框仍在显示 |
| **期望结果** | 不关闭 |

#### VFX_L2_49_close_dialog_confirm_button_accent

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_49 |
| **名称** | 确认按钮琥珀色背景 + 深色文字 |
| **层级** | L2 规则 |
| **验证点** | 确认按钮 background 为 var(--accent)，文字颜色为深色 |
| **前置条件** | 弹出对话框 |
| **测试方法** | 断言确认按钮的 background 和 color |
| **期望结果** | 琥珀色背景 + 深色文字 |

### 2.11 Dark/Light 主题适配

#### VFX_L2_50_light_theme_fab_button

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_50 |
| **名称** | Light 主题 FAB 按钮使用 linear-gradient 琥珀色 |
| **层级** | L2 规则 |
| **验证点** | `[data-theme="light"] .terminal-grid__fab` 有 background: linear-gradient(135deg, #d4943a, #c4842a)，color:#fff |
| **前置条件** | Light 主题 |
| **测试方法** | 设为 Light 主题 → 断言 FAB 的 background 和 color |
| **期望结果** | 琥珀色渐变 + 白色文字 |

#### VFX_L2_51_light_theme_file_drop_overlay

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_51 |
| **名称** | Light 主题文件拖拽 overlay 颜色适配 |
| **层级** | L2 规则 |
| **验证点** | `[data-theme="light"] .xterm-file-drop-overlay` 有 background:rgba(196,132,42,0.06), border-color:rgba(196,132,42,0.5) |
| **前置条件** | Light 主题 + 拖拽进入 |
| **测试方法** | 断言 overlay 的 background 和 border-color |
| **期望结果** | Light 适配颜色 |

#### VFX_L2_52_waiting_red_consistent_across_themes

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_52 |
| **名称** | WaitingInput 红色 #ef4444 在 Dark/Light 下不变 |
| **层级** | L2 规则 |
| **验证点** | 红色在两种主题下保持一致，无 [data-theme="light"] 覆写 |
| **前置条件** | Dark 和 Light 主题 |
| **测试方法** | 两种主题下分别渲染 WaitingInput → 断言颜色一致 |
| **期望结果** | 红色不变 |

### 2.12 保留的 CSS Class 名

#### VFX_L2_53_terminal_tile_css_classes

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_53 |
| **名称** | TerminalTile 引用的 CSS class 全部存在于 TileEffects.css |
| **层级** | L2 规则 |
| **验证点** | tile, tile-enter, tile-selected, tile-focused, tile--waiting, tile-header, tile-status, tile-terminal, tile-name, tile-cwd, dragging, drag-over 均在 CSS 中定义 |
| **前置条件** | 无 |
| **测试方法** | 搜索 CSS 文件中这 12 个 class 定义，断言全部存在 |
| **期望结果** | 12 个 class 全部存在 |

#### VFX_L2_54_terminal_grid_css_classes

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L2_54 |
| **名称** | TerminalGrid 引用的 CSS class 全部存在于 TileEffects.css |
| **层级** | L2 规则 |
| **验证点** | terminal-grid__fab, focus-cell--main, focus-cell--hidden, focus-cell--entering, focus-cell--exiting, focus-cell--restoring 均在 CSS 中定义 |
| **前置条件** | 无 |
| **测试方法** | 搜索 CSS 文件中这 6 个 class 定义，断言全部存在 |
| **期望结果** | 6 个 class 全部存在 |

---

## 三、L3 场景层测试

### VFX_L3_01_status_dot_state_transitions

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L3_01 |
| **名称** | 终端从 Created→Starting→Running：状态点颜色从灰→灰→绿变化 |
| **层级** | L3 场景 |
| **验证点** | 状态流转时状态点视觉正确变化 |
| **前置条件** | 新建终端 |
| **步骤** | 1. 终端创建（Created）→ 断言状态点灰色、无动画 2. 推送 state-change=Starting → 断言仍灰色 3. 推送 state-change=Running → 断言绿色 + statusPulse 2s 4. 推送 state-change=Stopped → 断言灰色、无动画 |
| **期望结果** | 状态点颜色随状态变化 |

### VFX_L3_02_running_to_waiting_visual

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L3_02 |
| **名称** | Running→WaitingInput：状态点变红+边框脉动+Badge 出现 |
| **层级** | L3 场景 |
| **验证点** | WaitingInput 的完整视觉反馈 |
| **前置条件** | 终端处于 Running 状态 |
| **步骤** | 1. Running 状态 → 状态点绿色 2. 推送 state-change=WaitingInput 3. 断言状态点变红色 + 1s 加速脉动 4. 断言 Tile 边框出现 borderGlow 红色脉动 5. 断言 tile-waiting-badge 出现（红色圆形） 6. 推送 state-change=Running（用户输入后恢复） 7. 断言视觉恢复为绿色 + badge 消失 |
| **期望结果** | WaitingInput 视觉完整，恢复后正常 |

### VFX_L3_03_tile_enter_stagger_3_terminals

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L3_03 |
| **名称** | 创建 3 个终端 → 入场动画交错播放（0ms/50ms/100ms 延迟） |
| **层级** | L3 场景 |
| **验证点** | 多终端入场动画交错效果 |
| **前置条件** | 首次渲染终端 |
| **步骤** | 1. 同时渲染 3 个 Tile 2. 断言 Tile 1 animation-delay=0ms 3. 断言 Tile 2 animation-delay=50ms 4. 断言 Tile 3 animation-delay=100ms 5. 等待动画完成 6. 断言 .tile-enter class 已从所有 Tile 移除 |
| **期望结果** | 交错动画 + 清理 |

### VFX_L3_04_dark_light_theme_switch

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L3_04 |
| **名称** | 切换 Dark→Light 主题 → 所有视觉元素颜色适配 |
| **层级** | L3 场景 |
| **验证点** | 主题切换后所有颜色变量正确更新 |
| **前置条件** | Dark 主题下有终端（含 Running 和 WaitingInput） |
| **步骤** | 1. Dark 主题 → 确认 --accent=#e8a748, --bg-card=深灰色 2. 切换到 Light 主题 3. 断言 --accent=#d4943a 4. 断言 FAB 按钮使用 linear-gradient 5. 断言 WaitingInput 红色不变（#ef4444） 6. 断言文件拖拽 overlay 颜色适配 7. 断言状态点颜色适配 |
| **期望结果** | 全部视觉元素正确适配 |

### VFX_L3_05_focus_enter_exit_full_flow

| 项目 | 内容 |
|------|------|
| **用例 ID** | VFX_L3_05 |
| **名称** | 聚焦模式完整过渡流程：enter → idle → exit → idle |
| **层级** | L3 场景 |
| **验证点** | 聚焦模式过渡动画的完整生命周期 |
| **前置条件** | Tiling 模式，3 个终端 |
| **步骤** | 1. 双击 Tile 1 进入聚焦模式 2. entering 阶段：主 Tile 渐入（focusFadeIn），其他 Tile 静止 + pointer-events:none，终端内容 opacity:0 3. 400ms 后 → idle：主 Tile 全屏可见，其他 Tile visibility:hidden，终端内容渐入 200ms 4. 按 Esc 退出聚焦 5. exiting 阶段：主 Tile 渐出（reverse），其他 Tile 渐入恢复 + pointer-events:none 6. 350ms 后 → idle：恢复 Tiling 布局，所有 Tile 可见 + 可交互 |
| **期望结果** | 完整过渡流程正确 |
