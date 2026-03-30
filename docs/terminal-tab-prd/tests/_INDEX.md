# 终端 Tab 前端 UI 重写 — 测试用例索引

> **所属 PRD**：Muxvo 终端 Tab — 前端 UI 重写
> **生成日期**：2026-03-01

---

## 1. 文档结构

| 文件 | 模块 | 内容 |
|------|------|------|
| `01-terminal-lifecycle-tests.md` | 终端生命周期 | L1 契约 + L2 规则 + L3 场景 |
| `02-tiling-mode-tests.md` | Tiling 模式 | L1 契约 + L2 规则 + L3 场景 |
| `03-focused-mode-tests.md` | Focused 模式 | L1 契约 + L2 规则 + L3 场景 |
| `04-list-mode-tests.md` | List 模式 | L1 契约 + L2 规则 + L3 场景 |
| `05-xterm-rendering-tests.md` | XTerm 渲染 | L1 契约 + L2 规则 + L3 场景 |
| `06-visual-effects-tests.md` | 视觉效果 | L1 契约 + L2 规则 + L3 场景 |
| `07-onboarding-tour-tests.md` | 新手引导 Tour | L2 规则 + L3 场景 |
| `08-settings-shortcuts-tests.md` | 设置与快捷键 | L1 契约 + L2 规则 + L3 场景 |
| `09-integration-tests.md` | 跨模块集成 | L3 场景（22 个集成用例） |
| `appendix.md` | 附录 G/H/I | 遗漏检查 + 特殊规则 + 覆盖矩阵 |

---

## 2. 测试分层说明

| 层级 | 名称 | 验证内容 | 实现方式 |
|------|------|----------|----------|
| L1 | 契约层 | IPC 调用参数格式、默认值、数据形状、常量 | Vitest + mock IPC，JSON-driven test.each |
| L2 | 规则层 | 业务规则、状态转换、布局计算、选中逻辑、组件行为 | Vitest + React Testing Library |
| L3 | 场景层 | 多步骤用户旅程、跨模式交互、E2E 流程 | Playwright E2E |

---

## 3. 模块编号说明

| 前缀 | 模块 | PRD 文档 |
|------|------|---------|
| `TERM` | 01 终端生命周期 | `modules/01-terminal-lifecycle.md` |
| `TILE` | 02 Tiling 模式 | `modules/02-tiling-mode.md` |
| `FOCUS` | 03 Focused 模式 | `modules/03-focused-mode.md` |
| `LIST` | 04 List 模式 | `modules/04-list-mode.md` |
| `XTERM` | 05 XTerm 渲染 | `modules/05-xterm-rendering.md` |
| `VFX` | 06 视觉效果 | `modules/06-visual-effects.md` |
| `TOUR` | 07 新手引导 | `modules/07-onboarding-tour.md` |
| `SET` | 08 设置与快捷键 | `modules/08-settings-shortcuts.md` |
| `INTG` | 09 跨模块集成 | （跨模块） |

---

## 附录 A：用例索引

### 模块 01：终端生命周期（TERM）

| 用例编号 | 层级 | 优先级 | 场景描述 | 文件位置 |
|----------|------|--------|----------|----------|
| TERM_L1_01_create_signature | L1 | P0 | terminal:create IPC 签名 | 01-terminal-lifecycle-tests.md |
| TERM_L1_02_close_signature | L1 | P0 | terminal:close IPC 签名 | 01-terminal-lifecycle-tests.md |
| TERM_L1_03_list_signature | L1 | P0 | terminal:list IPC 签名 | 01-terminal-lifecycle-tests.md |
| TERM_L1_04_getState_signature | L1 | P0 | terminal:getState IPC 签名 | 01-terminal-lifecycle-tests.md |
| TERM_L1_05_getBuffer_signature | L1 | P1 | terminal:getBuffer IPC 签名 | 01-terminal-lifecycle-tests.md |
| TERM_L1_06_getForegroundProcess_signature | L1 | P0 | terminal:getForegroundProcess 签名 | 01-terminal-lifecycle-tests.md |
| TERM_L1_07_updateCwd_signature | L1 | P1 | terminal:updateCwd IPC 签名 | 01-terminal-lifecycle-tests.md |
| TERM_L1_08_write_signature | L1 | P0 | terminal:write 签名 | 01-terminal-lifecycle-tests.md |
| TERM_L1_09_resize_signature | L1 | P0 | terminal:resize 签名 | 01-terminal-lifecycle-tests.md |
| TERM_L1_10_default_terminals | L1 | P0 | terminals 默认空数组 | 01-terminal-lifecycle-tests.md |
| TERM_L1_11_default_viewMode | L1 | P0 | viewMode 默认 Tiling | 01-terminal-lifecycle-tests.md |
| TERM_L1_12_default_selectedId | L1 | P0 | selectedId 默认 null | 01-terminal-lifecycle-tests.md |
| TERM_L1_13_default_focusedId | L1 | P0 | focusedId 默认 null | 01-terminal-lifecycle-tests.md |
| TERM_L1_14_default_listSelectedId | L1 | P1 | listSelectedId 默认 null | 01-terminal-lifecycle-tests.md |
| TERM_L1_15_default_terminalOrder | L1 | P0 | terminalOrder 默认空数组 | 01-terminal-lifecycle-tests.md |
| TERM_L1_16_default_terminalNames | L1 | P0 | terminalNames 默认空对象 | 01-terminal-lifecycle-tests.md |
| TERM_L1_17_onStateChange_format | L1 | P0 | onStateChange Push 事件格式 | 01-terminal-lifecycle-tests.md |
| TERM_L1_18_onExit_format | L1 | P0 | onExit Push 事件格式 | 01-terminal-lifecycle-tests.md |
| TERM_L1_19_onOutput_format | L1 | P0 | onOutput Push 事件格式 | 01-terminal-lifecycle-tests.md |
| TERM_L1_20_onCwdChange_format | L1 | P1 | onCwdChange Push 事件格式 | 01-terminal-lifecycle-tests.md |
| TERM_L1_21_max_terminals_constant | L1 | P0 | MAX_TERMINALS=20 | 01-terminal-lifecycle-tests.md |
| TERM_L2_01_create_cwd_from_active | L2 | P0 | 创建终端继承活跃 CWD | 01-terminal-lifecycle-tests.md |
| TERM_L2_02_create_cwd_fallback_home | L2 | P0 | 无活跃终端时 CWD 回退 home | 01-terminal-lifecycle-tests.md |
| TERM_L2_03_create_auto_select | L2 | P0 | 新终端自动选中 | 01-terminal-lifecycle-tests.md |
| TERM_L2_04_create_append_order | L2 | P0 | 新终端添加到 order 末尾 | 01-terminal-lifecycle-tests.md |
| TERM_L2_05_create_adds_entry | L2 | P0 | 创建终端添加 entry | 01-terminal-lifecycle-tests.md |
| TERM_L2_06_create_ipc_failure | L2 | P1 | IPC 创建失败处理 | 01-terminal-lifecycle-tests.md |
| TERM_L2_07_max_fab_disabled | L2 | P0 | 20 终端时 FAB 禁用 | 01-terminal-lifecycle-tests.md |
| TERM_L2_08_max_fab_tooltip | L2 | P1 | 20 终端时 FAB tooltip | 01-terminal-lifecycle-tests.md |
| TERM_L2_09_max_shortcut_blocked | L2 | P0 | 20 终端时快捷键阻止 | 01-terminal-lifecycle-tests.md |
| TERM_L2_10_below_max_fab_enabled | L2 | P0 | 19 终端时 FAB 可用 | 01-terminal-lifecycle-tests.md |
| TERM_L2_11_max_close_then_create | L2 | P1 | 关闭后恢复创建能力 | 01-terminal-lifecycle-tests.md |
| TERM_L2_12_close_no_foreground | L2 | P0 | 无前台进程直接关闭 | 01-terminal-lifecycle-tests.md |
| TERM_L2_13_close_has_foreground | L2 | P0 | 有前台进程弹确认框 | 01-terminal-lifecycle-tests.md |
| TERM_L2_14_close_confirm_dialog_confirm | L2 | P0 | 确认关闭执行 | 01-terminal-lifecycle-tests.md |
| TERM_L2_15_close_confirm_dialog_cancel | L2 | P0 | 取消关闭不影响 | 01-terminal-lifecycle-tests.md |
| TERM_L2_16_close_removes_from_list | L2 | P0 | 关闭后从列表移除 | 01-terminal-lifecycle-tests.md |
| TERM_L2_17_close_removes_from_order | L2 | P0 | 关闭后从 order 移除 | 01-terminal-lifecycle-tests.md |
| TERM_L2_18_close_cleans_names | L2 | P1 | 关闭后清理名称 | 01-terminal-lifecycle-tests.md |
| TERM_L2_19_close_select_next | L2 | P0 | 关闭选中终端选下一个 | 01-terminal-lifecycle-tests.md |
| TERM_L2_20_close_select_prev | L2 | P0 | 无下一个选上一个 | 01-terminal-lifecycle-tests.md |
| TERM_L2_21_close_select_null | L2 | P0 | 最后一个关闭 selectedId=null | 01-terminal-lifecycle-tests.md |
| TERM_L2_22_close_nonselected | L2 | P0 | 关闭非选中终端不影响选中 | 01-terminal-lifecycle-tests.md |
| TERM_L2_23_close_first_select_next | L2 | P0 | 关闭第一个选下一个 | 01-terminal-lifecycle-tests.md |
| TERM_L2_24_close_last_shows_empty | L2 | P0 | 最后终端关闭显示空状态 | 01-terminal-lifecycle-tests.md |
| TERM_L2_25~34 | L2 | P0-P1 | 进程状态视觉映射 (10 个状态) | 01-terminal-lifecycle-tests.md |
| TERM_L2_35~40 | L2 | P0-P1 | 终端命名功能 (6 个) | 01-terminal-lifecycle-tests.md |
| TERM_L2_41~46 | L2 | P0 | 命名状态机转换 (6 个) | 01-terminal-lifecycle-tests.md |
| TERM_L2_47~55 | L2 | P0-P1 | CWD 管理 (9 个) | 01-terminal-lifecycle-tests.md |
| TERM_L2_56~59 | L2 | P0-P1 | WaitingInput 前端呈现 (4 个) | 01-terminal-lifecycle-tests.md |
| TERM_L3_01_first_terminal_journey | L3 | P0 | 首个终端创建旅程 | 01-terminal-lifecycle-tests.md |
| TERM_L3_02_multi_create_close_journey | L3 | P0 | 多终端创建与关闭 | 01-terminal-lifecycle-tests.md |
| TERM_L3_03_state_cycle_journey | L3 | P0 | 进程状态循环 | 01-terminal-lifecycle-tests.md |
| TERM_L3_04_naming_journey | L3 | P0 | 命名流程 | 01-terminal-lifecycle-tests.md |
| TERM_L3_05_cwd_name_update_journey | L3 | P1 | CWD 变化触发名称更新 | 01-terminal-lifecycle-tests.md |
| TERM_L3_06_max_limit_journey | L3 | P0 | 上限达到后交互 | 01-terminal-lifecycle-tests.md |
| TERM_L3_07_empty_to_working_journey | L3 | P0 | 空状态到工作状态 | 01-terminal-lifecycle-tests.md |

### 模块 02：Tiling 模式（TILE）

| 用例编号 | 层级 | 优先级 | 场景描述 | 文件位置 |
|----------|------|--------|----------|----------|
| TILE_L1_01~07 | L1 | P0 | Grid 布局/Tile 定位/Handle 函数签名 (7 个) | 02-tiling-mode-tests.md |
| TILE_L2_01~14 | L2 | P0-P1 | Grid 行列计算 (14 个) | 02-tiling-mode-tests.md |
| TILE_L2_15_grid_last_row_span | L2 | P1 | 末行 Tile 跨列 | 02-tiling-mode-tests.md |
| TILE_L2_16~19 | L2 | P0-P1 | CSS Grid 属性生成 (4 个) | 02-tiling-mode-tests.md |
| TILE_L2_20~23 | L2 | P0-P1 | 选中状态 (4 个) | 02-tiling-mode-tests.md |
| TILE_L2_24~26 | L2 | P0 | 双击进入 Focused (3 个) | 02-tiling-mode-tests.md |
| TILE_L2_27~31 | L2 | P0-P2 | Tile header 悬停按钮 (5 个) | 02-tiling-mode-tests.md |
| TILE_L2_32~36 | L2 | P0-P1 | 入场动画交错 (5 个) | 02-tiling-mode-tests.md |
| TILE_L2_37~49 | L2 | P0-P1 | Resize Handle 拖拽 (13 个) | 02-tiling-mode-tests.md |
| TILE_L2_50~60 | L2 | P0-P1 | 拖拽排序 (11 个) | 02-tiling-mode-tests.md |
| TILE_L2_61~68 | L2 | P0-P1 | FAB 按钮 (8 个) | 02-tiling-mode-tests.md |
| TILE_L2_69~72 | L2 | P0 | 渲染分支切换 (4 个) | 02-tiling-mode-tests.md |
| TILE_L3_01_drag_swap_journey | L3 | P0 | 拖拽交换旅程 | 02-tiling-mode-tests.md |
| TILE_L3_02_resize_persist_journey | L3 | P0 | 拖拽调整持久化 | 02-tiling-mode-tests.md |
| TILE_L3_03_continuous_create_journey | L3 | P0 | 连续创建布局变化 | 02-tiling-mode-tests.md |
| TILE_L3_04_tile_interaction_journey | L3 | P0 | Tile 交互完整旅程 | 02-tiling-mode-tests.md |

### 模块 03：Focused 模式（FOCUS）

| 用例编号 | 层级 | 优先级 | 场景描述 | 文件位置 |
|----------|------|--------|----------|----------|
| FOCUS_L1_01~06 | L1 | P0-P1 | CSS/JS 时间常量 (6 个) | 03-focused-mode-tests.md |
| FOCUS_L2_01~03 | L2 | P0 | 进入方式 (3 个) | 03-focused-mode-tests.md |
| FOCUS_L2_04~09 | L2 | P0-P1 | 布局规格 75/25 (6 个) | 03-focused-mode-tests.md |
| FOCUS_L2_10~12 | L2 | P0-P1 | 单终端布局 (3 个) | 03-focused-mode-tests.md |
| FOCUS_L2_13~19 | L2 | P0 | visibility:hidden 隐藏 (7 个) | 03-focused-mode-tests.md |
| FOCUS_L2_20~24 | L2 | P0 | suppressResize 标记 (5 个) | 03-focused-mode-tests.md |
| FOCUS_L2_25~28 | L2 | P0 | 时间同步验证 (4 个) | 03-focused-mode-tests.md |
| FOCUS_L2_29~33 | L2 | P0-P1 | 进入动画 (5 个) | 03-focused-mode-tests.md |
| FOCUS_L2_34~38 | L2 | P0-P1 | 退出动画 (5 个) | 03-focused-mode-tests.md |
| FOCUS_L2_39~47 | L2 | P0 | focusTransition 状态 (9 个) | 03-focused-mode-tests.md |
| FOCUS_L2_48~52 | L2 | P0-P1 | 侧边栏切换 (5 个) | 03-focused-mode-tests.md |
| FOCUS_L2_53~56 | L2 | P0 | Esc 退出 (4 个) | 03-focused-mode-tests.md |
| FOCUS_L2_57~68 | L2 | P0-P2 | WaitingInput 通知 (12 个) | 03-focused-mode-tests.md |
| FOCUS_L3_01_full_journey | L3 | P0 | Focused 完整进出旅程 | 03-focused-mode-tests.md |
| FOCUS_L3_02_transition_block_journey | L3 | P0 | 过渡阻止操作旅程 | 03-focused-mode-tests.md |
| FOCUS_L3_03_waiting_notify_journey | L3 | P0 | WaitingInput 通知旅程 | 03-focused-mode-tests.md |
| FOCUS_L3_04_sidebar_scroll_journey | L3 | P0 | 侧边栏滚动旅程 | 03-focused-mode-tests.md |
| FOCUS_L3_05_close_focused_journey | L3 | P0 | 关闭聚焦终端旅程 | 03-focused-mode-tests.md |
| FOCUS_L3_06_single_terminal_journey | L3 | P0 | 单终端 Focused 旅程 | 03-focused-mode-tests.md |

### 模块 04：List 模式（LIST）

| 用例编号 | 层级 | 优先级 | 场景描述 | 文件位置 |
|----------|------|--------|----------|----------|
| LIST_L1_01~07 | L1 | P0 | 默认值/常量/数据形状 (7 个) | 04-list-mode-tests.md |
| LIST_L2_01~10 | L2 | P0 | 面板布局 + WaitingInput (10 个) | 04-list-mode-tests.md |
| LIST_L2_11~13 | L2 | P0 | 创建按钮 (3 个) | 04-list-mode-tests.md |
| LIST_L2_14~19 | L2 | P0 | 右侧终端区域 (6 个) | 04-list-mode-tests.md |
| LIST_L2_20~26 | L2 | P0 | 列表项交互 (7 个) | 04-list-mode-tests.md |
| LIST_L2_27~33 | L2 | P0 | 关闭/创建行为 (7 个) | 04-list-mode-tests.md |
| LIST_L2_34~40 | L2 | P0 | 选中状态隔离 (7 个) | 04-list-mode-tests.md |
| LIST_L2_41~44 | L2 | P0 | 选中自动更新 (4 个) | 04-list-mode-tests.md |
| LIST_L2_45~46 | L2 | P0 | 配置持久化 (2 个) | 04-list-mode-tests.md |
| LIST_L2_47~49 | L2 | P0 | 空状态 (3 个) | 04-list-mode-tests.md |
| LIST_L2_50~52 | L2 | P1 | Light 主题适配 (3 个) | 04-list-mode-tests.md |
| LIST_L3_01~07 | L3 | P0 | 7 个 E2E 场景 | 04-list-mode-tests.md |

### 模块 05：XTerm 渲染（XTERM）

| 用例编号 | 层级 | 优先级 | 场景描述 | 文件位置 |
|----------|------|--------|----------|----------|
| XTERM_L1_01~12 | L1 | P0 | 默认配置/IPC 签名/常量 (12 个) | 05-xterm-rendering-tests.md |
| XTERM_L2_01~08 | L2 | P0 | 挂载/fit/resize (8 个) | 05-xterm-rendering-tests.md |
| XTERM_L2_09~15 | L2 | P0 | Buffer 回放 (7 个) | 05-xterm-rendering-tests.md |
| XTERM_L2_16~21 | L2 | P0 | IO 处理/快捷键 (6 个) | 05-xterm-rendering-tests.md |
| XTERM_L2_22~27 | L2 | P0 | 外部事件监听 (6 个) | 05-xterm-rendering-tests.md |
| XTERM_L2_28~33 | L2 | P0 | 搜索栏 (6 个) | 05-xterm-rendering-tests.md |
| XTERM_L2_34~39 | L2 | P0 | 文件拖放 (6 个) | 05-xterm-rendering-tests.md |
| XTERM_L2_40~47 | L2 | P0 | Resize/卸载/重建/WebGL (8 个) | 05-xterm-rendering-tests.md |
| XTERM_L3_01~05 | L3 | P0 | 5 个 E2E 场景 | 05-xterm-rendering-tests.md |

### 模块 06：视觉效果（VFX）

| 用例编号 | 层级 | 优先级 | 场景描述 | 文件位置 |
|----------|------|--------|----------|----------|
| VFX_L1_01~08 | L1 | P0 | CSS/JS 时间常量、颜色常量同步 (8 个) | 06-visual-effects-tests.md |
| VFX_L2_01~10 | L2 | P0 | 状态指示点映射 — 10 种状态 CSS 类 (10 个) | 06-visual-effects-tests.md |
| VFX_L2_11~13 | L2 | P0 | statusPulse 动画周期/缓动 (3 个) | 06-visual-effects-tests.md |
| VFX_L2_14~23 | L2 | P0 | WaitingInput 4 层视觉 — 边框/轮廓/Badge/浮动通知 (10 个) | 06-visual-effects-tests.md |
| VFX_L2_24~27 | L2 | P0-P1 | Tile 基础样式 — 容器/悬停/光泽/Header (4 个) | 06-visual-effects-tests.md |
| VFX_L2_28~31 | L2 | P0 | Tile 状态 Class — selected/focused/dragging/dragOver (4 个) | 06-visual-effects-tests.md |
| VFX_L2_32~37 | L2 | P0 | tileEnter 入场动画 — 交错延迟/关键帧/触发条件 (6 个) | 06-visual-effects-tests.md |
| VFX_L2_38~44 | L2 | P0 | 聚焦过渡动画 — 进入/退出/CSS 变量/sidebar (7 个) | 06-visual-effects-tests.md |
| VFX_L2_45~47 | L2 | P0 | 终端内容隐藏 — content-fade (3 个) | 06-visual-effects-tests.md |
| VFX_L2_48~50 | L2 | P0 | focus-cell--hidden CSS 规则 (3 个) | 06-visual-effects-tests.md |
| VFX_L2_51 | L2 | P0 | 关闭确认对话框样式 (1 个) | 06-visual-effects-tests.md |
| VFX_L2_52~54 | L2 | P0-P1 | Dark/Light 主题适配 (3 个) | 06-visual-effects-tests.md |
| VFX_L3_01_status_dot_state_transitions | L3 | P0 | 状态点状态切换旅程 | 06-visual-effects-tests.md |
| VFX_L3_02_running_to_waiting_visual | L3 | P0 | Running→WaitingInput 视觉变化 | 06-visual-effects-tests.md |
| VFX_L3_03_tile_enter_stagger_3_terminals | L3 | P0 | 3 终端入场交错动画 | 06-visual-effects-tests.md |
| VFX_L3_04_dark_light_theme_switch | L3 | P0 | Dark/Light 主题切换 | 06-visual-effects-tests.md |
| VFX_L3_05_focus_enter_exit_full_flow | L3 | P0 | 聚焦进入退出完整视觉流 | 06-visual-effects-tests.md |

### 模块 07：新手引导 Tour（TOUR）

| 用例编号 | 层级 | 优先级 | 场景描述 | 文件位置 |
|----------|------|--------|----------|----------|
| TOUR_L2_01_steps_definition | L2 | P0 | 4 步引导定义完整性 | 07-onboarding-tour-tests.md |
| TOUR_L2_02_step1_target_fab | L2 | P0 | 步骤 1 目标 FAB | 07-onboarding-tour-tests.md |
| TOUR_L2_03_step2_target_max_btn | L2 | P0 | 步骤 2 目标最大化按钮 | 07-onboarding-tour-tests.md |
| TOUR_L2_04_step3_target_name | L2 | P0 | 步骤 3 目标名称区域 | 07-onboarding-tour-tests.md |
| TOUR_L2_05_step4_target_file_btn | L2 | P0 | 步骤 4 目标文件按钮 | 07-onboarding-tour-tests.md |
| TOUR_L2_06_step1_auto_advance | L2 | P0 | 步骤 1 自动推进 | 07-onboarding-tour-tests.md |
| TOUR_L2_07_step2_auto_advance | L2 | P0 | 步骤 2 自动推进 | 07-onboarding-tour-tests.md |
| TOUR_L2_08_step3_auto_advance | L2 | P0 | 步骤 3 自动推进 | 07-onboarding-tour-tests.md |
| TOUR_L2_09_step4_complete | L2 | P0 | 步骤 4 完成 Tour | 07-onboarding-tour-tests.md |
| TOUR_L2_10_auto_start_condition | L2 | P0 | 首次自动启动条件 | 07-onboarding-tour-tests.md |
| TOUR_L2_11_skip_when_completed | L2 | P0 | tourCompleted=true 跳过 | 07-onboarding-tour-tests.md |
| TOUR_L2_12_manual_restart | L2 | P0 | 手动重启引导 | 07-onboarding-tour-tests.md |
| TOUR_L2_13_start_tour_behavior | L2 | P0 | START_TOUR 行为 | 07-onboarding-tour-tests.md |
| TOUR_L2_14_complete_tour | L2 | P0 | 完成 Tour 持久化 | 07-onboarding-tour-tests.md |
| TOUR_L2_15_skip_tour | L2 | P0 | 跳过 Tour skipped=true | 07-onboarding-tour-tests.md |
| TOUR_L2_16_missing_element_skip | L2 | P1 | 目标元素不存在跳过 | 07-onboarding-tour-tests.md |
| TOUR_L2_17_terminal_closed_during_tour | L2 | P1 | Tour 中终端被关闭 | 07-onboarding-tour-tests.md |
| TOUR_L2_18_close_all_preserves_tour | L2 | P0 | CLOSE_ALL 保留 tour | 07-onboarding-tour-tests.md |
| TOUR_L2_19_complete_tour_preserves_panels | L2 | P0 | COMPLETE_TOUR 不影响面板 | 07-onboarding-tour-tests.md |
| TOUR_L2_20_analytics_complete | L2 | P1 | 分析埋点 complete | 07-onboarding-tour-tests.md |
| TOUR_L2_21_analytics_step | L2 | P1 | 分析埋点 step | 07-onboarding-tour-tests.md |
| TOUR_L2_22_i18n_keys | L2 | P1 | i18n key 验证 | 07-onboarding-tour-tests.md |
| TOUR_L2_23_list_to_tiling_before_tour | L2 | P0 | List 下 Tour 先切 Tiling | 07-onboarding-tour-tests.md |
| TOUR_L2_24_advance_timing | L2 | P1 | 推进 500ms 延迟验证 | 07-onboarding-tour-tests.md |
| TOUR_L3_01_full_tour_flow | L3 | P0 | 首次完整 Tour 流程 | 07-onboarding-tour-tests.md |
| TOUR_L3_02_exit_midway | L3 | P0 | 中途 X 退出 | 07-onboarding-tour-tests.md |
| TOUR_L3_03_restart_from_settings | L3 | P0 | Settings 手动重启 | 07-onboarding-tour-tests.md |
| TOUR_L3_04_terminal_closed_recovery | L3 | P1 | Tour 中终端关闭恢复 | 07-onboarding-tour-tests.md |

### 模块 08：设置与快捷键（SET）

| 用例编号 | 层级 | 优先级 | 场景描述 | 文件位置 |
|----------|------|--------|----------|----------|
| SET_L1_01_terminal_config_defaults | L1 | P0 | config.terminal 默认值 | 08-settings-shortcuts-tests.md |
| SET_L1_02_cursor_style_enum | L1 | P0 | cursorStyle 枚举值 | 08-settings-shortcuts-tests.md |
| SET_L1_03_default_view_mode_enum | L1 | P0 | defaultViewMode 枚举值 | 08-settings-shortcuts-tests.md |
| SET_L1_04_font_size_type | L1 | P0 | fontSize 类型 | 08-settings-shortcuts-tests.md |
| SET_L1_05_startup_terminals_default | L1 | P0 | startupTerminals 默认值 | 08-settings-shortcuts-tests.md |
| SET_L1_06_cursor_blink_default | L1 | P0 | cursorBlink 默认值 | 08-settings-shortcuts-tests.md |
| SET_L2_01_switch_tiling_to_list | L2 | P0 | Tiling→List 切换 | 08-settings-shortcuts-tests.md |
| SET_L2_02_switch_list_to_tiling | L2 | P0 | List→Tiling 切换 | 08-settings-shortcuts-tests.md |
| SET_L2_03_config_write_failure | L2 | P1 | config 写入失败 UI 仍切换 | 08-settings-shortcuts-tests.md |
| SET_L2_04_switch_during_output | L2 | P1 | 输出中切换不影响 | 08-settings-shortcuts-tests.md |
| SET_L2_05_config_apply_all_terminals | L2 | P0 | 配置实时应用所有终端 | 08-settings-shortcuts-tests.md |
| SET_L2_06_theme_change_event_flow | L2 | P0 | 主题切换事件流 | 08-settings-shortcuts-tests.md |
| SET_L2_07_terminal_follows_ui_theme | L2 | P0 | 终端主题跟随 UI | 08-settings-shortcuts-tests.md |
| SET_L2_08_restart_tour_button | L2 | P0 | 引导重启按钮 | 08-settings-shortcuts-tests.md |
| SET_L2_09_esc_exit_focused | L2 | P0 | Esc 退出聚焦 | 08-settings-shortcuts-tests.md |
| SET_L2_10_esc_no_effect_tiling | L2 | P0 | 非 Focused Esc 无效 | 08-settings-shortcuts-tests.md |
| SET_L2_11_esc_consumed_by_xterm | L2 | P0 | xterm 消费 Esc | 08-settings-shortcuts-tests.md |
| SET_L2_12_esc_blocked_during_transition | L2 | P0 | 过渡中 Esc 阻止 | 08-settings-shortcuts-tests.md |
| SET_L2_13_toggle_search_bar | L2 | P0 | Cmd+F 搜索栏 | 08-settings-shortcuts-tests.md |
| SET_L2_14_search_bar_keys | L2 | P0 | 搜索栏快捷键 | 08-settings-shortcuts-tests.md |
| SET_L2_15_zoom_in_event_flow | L2 | P0 | Cmd+= 放大 | 08-settings-shortcuts-tests.md |
| SET_L2_16_zoom_out_event_flow | L2 | P0 | Cmd+- 缩小 | 08-settings-shortcuts-tests.md |
| SET_L2_17_zoom_reset | L2 | P0 | Cmd+0 重置 | 08-settings-shortcuts-tests.md |
| SET_L2_18_zoom_max_limit | L2 | P0 | 缩放上限 32px | 08-settings-shortcuts-tests.md |
| SET_L2_19_zoom_min_limit | L2 | P0 | 缩放下限 8px | 08-settings-shortcuts-tests.md |
| SET_L2_20_font_size_clamp_low | L2 | P0 | fontSize 7→8 | 08-settings-shortcuts-tests.md |
| SET_L2_21_font_size_clamp_high | L2 | P0 | fontSize 33→32 | 08-settings-shortcuts-tests.md |
| SET_L2_22_zoom_global_effect | L2 | P0 | 缩放全局生效 | 08-settings-shortcuts-tests.md |
| SET_L2_23_view_mode_ui | L2 | P0 | 视图模式切换 UI | 08-settings-shortcuts-tests.md |
| SET_L2_24_settings_modal_props | L2 | P0 | SettingsModal 新 props | 08-settings-shortcuts-tests.md |
| SET_L2_25_i18n_view_mode_keys | L2 | P1 | i18n 新增 key | 08-settings-shortcuts-tests.md |
| SET_L3_01_switch_layout_visible | L3 | P0 | Settings 切换布局 | 08-settings-shortcuts-tests.md |
| SET_L3_02_zoom_to_max_then_reset | L3 | P0 | 缩放到上限后重置 | 08-settings-shortcuts-tests.md |
| SET_L3_03_theme_sync | L3 | P0 | 主题切换同步 | 08-settings-shortcuts-tests.md |
| SET_L3_04_esc_exit_focused_e2e | L3 | P0 | Esc 退出 E2E | 08-settings-shortcuts-tests.md |

### 模块 09：跨模块集成（INTG）

| 用例编号 | 层级 | 优先级 | 场景描述 | 文件位置 |
|----------|------|--------|----------|----------|
| INTG_L3_01_new_user_full_journey | L3 | P0 | 新用户完整流程 | 09-integration-tests.md |
| INTG_L3_02_daily_multi_terminal | L3 | P0 | 日常多终端工作流 | 09-integration-tests.md |
| INTG_L3_03_ai_cli_waiting_input | L3 | P0 | AI CLI 等待响应 | 09-integration-tests.md |
| INTG_L3_04_max_terminals | L3 | P1 | 终端数量极限 | 09-integration-tests.md |
| INTG_L3_05_window_resize_layout | L3 | P1 | 窗口缩放自适应 | 09-integration-tests.md |
| INTG_L3_06_create_affects_grid | L3 | P0 | 创建影响 Grid | 09-integration-tests.md |
| INTG_L3_07_close_affects_selection | L3 | P0 | 关闭影响选中 | 09-integration-tests.md |
| INTG_L3_08_mode_switch_full_chain | L3 | P0 | 模式切换全链路 | 09-integration-tests.md |
| INTG_L3_09_names_consistent | L3 | P0 | 名称三模式一致 | 09-integration-tests.md |
| INTG_L3_10_process_state_consistent | L3 | P0 | 进程状态多处一致 | 09-integration-tests.md |
| INTG_L3_11_cwd_sync | L3 | P0 | CWD 多处同步 | 09-integration-tests.md |
| INTG_L3_12_focused_terminal_exit | L3 | P0 | 聚焦终端退出恢复 | 09-integration-tests.md |
| INTG_L3_13_tour_terminal_close | L3 | P1 | Tour 中终端关闭 | 09-integration-tests.md |
| INTG_L3_14_webgl_context_lost | L3 | P1 | WebGL 回退 | 09-integration-tests.md |
| INTG_L3_15_tiling_focused_tiling | L3 | P0 | T→F→T 切换 | 09-integration-tests.md |
| INTG_L3_16_tiling_to_list | L3 | P0 | T→L 切换 | 09-integration-tests.md |
| INTG_L3_17_list_to_tiling | L3 | P0 | L→T 切换 | 09-integration-tests.md |
| INTG_L3_18_chain_mode_switch | L3 | P0 | 链式切换 | 09-integration-tests.md |
| INTG_L3_19_list_to_focused_blocked | L3 | P0 | L→F 阻止 | 09-integration-tests.md |
| INTG_L3_20_scroll_position_preserved | L3 | P0 | 滚动跳顶修复 | 09-integration-tests.md |
| INTG_L3_21_no_text_rewrap | L3 | P0 | 文字乱码修复 | 09-integration-tests.md |
| INTG_L3_22_no_flicker | L3 | P0 | 闪烁修复 | 09-integration-tests.md |

---

## 附录 B：用例统计

### 各模块用例数

| 模块 | L1 | L2 | L3 | 合计 |
|------|-----|-----|-----|------|
| 01 终端生命周期 | 21 | 39 | 7 | 67 |
| 02 Tiling 模式 | 7 | 65 | 4 | 76 |
| 03 Focused 模式 | 6 | 62 | 6 | 74 |
| 04 List 模式 | 7 | 52 | 7 | 66 |
| 05 XTerm 渲染 | 12 | 47 | 5 | 64 |
| 06 视觉效果 | 8 | 54 | 5 | 67 |
| 07 新手引导 | 0 | 19 | 4 | 23 |
| 08 设置与快捷键 | 6 | 20 | 4 | 30 |
| 09 跨模块集成 | 0 | 0 | 22 | 22 |
| **合计** | **67** | **358** | **64** | **489** |

### 各层级占比

| 层级 | 数量 | 占比 |
|------|------|------|
| L1 契约层 | 67 | 13.7% |
| L2 规则层 | 358 | 73.2% |
| L3 场景层 | 64 | 13.1% |
| **总计** | **489** | 100% |
