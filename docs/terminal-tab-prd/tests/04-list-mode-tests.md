# 模块 04：List 模式 — 测试用例

> 来源 PRD：modules/04-list-mode.md
> 生成日期：2026-03-01

## 目录

- [一、L1 契约层测试](#一l1-契约层测试)
- [二、L2 规则层测试](#二l2-规则层测试)
  - [2.1 左侧列表面板](#21-左侧列表面板)
  - [2.2 列表项选中样式](#22-列表项选中样式)
  - [2.3 WaitingInput 列表项](#23-waitinginput-列表项)
  - [2.4 新建终端按钮](#24-新建终端按钮)
  - [2.5 右侧终端区域](#25-右侧终端区域)
  - [2.6 多终端挂载策略](#26-多终端挂载策略)
  - [2.7 选中终端交互](#27-选中终端交互)
  - [2.8 重命名交互](#28-重命名交互)
  - [2.9 关闭终端交互](#29-关闭终端交互)
  - [2.10 新建终端交互](#210-新建终端交互)
  - [2.11 listSelectedId 独立性](#211-listselectedid-独立性)
  - [2.12 状态流转规则](#212-状态流转规则)
  - [2.13 自动选中逻辑](#213-自动选中逻辑)
  - [2.14 viewMode 持久化](#214-viewmode-持久化)
  - [2.15 空状态](#215-空状态)
  - [2.16 Light 主题适配](#216-light-主题适配)
- [三、L3 场景层测试](#三l3-场景层测试)

---

## 一、L1 契约层测试

### LIST_L1_01_listSelectedId_default_null

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L1_01 |
| **名称** | listSelectedId 默认值为 null |
| **层级** | L1 契约 |
| **验证点** | Store 初始化时 `listSelectedId` 默认值为 `null` |
| **前置条件** | Store 刚初始化，未执行任何操作 |
| **测试方法** | 读取 store 初始 state，断言 `listSelectedId === null` |
| **期望结果** | `null` |

### LIST_L1_02_viewMode_persist_values

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L1_02 |
| **名称** | viewMode 持久化值只有 'Tiling' 和 'List' |
| **层级** | L1 契约 |
| **验证点** | `config.terminal.defaultViewMode` 只接受 `'Tiling'` 或 `'List'`，不存 `'Focused'` |
| **前置条件** | 无 |
| **测试方法** | 尝试将 viewMode 设为 `'Tiling'`、`'List'`、`'Focused'`，断言只有前两者被接受/持久化 |
| **期望结果** | `'Tiling'` 和 `'List'` 有效；`'Focused'` 不写入 config |

### LIST_L1_03_defaultViewMode_data_shape

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L1_03 |
| **名称** | config.terminal.defaultViewMode 数据格式 |
| **层级** | L1 契约 |
| **验证点** | 配置结构符合 `{ terminal: { defaultViewMode: 'Tiling' | 'List' } }` |
| **前置条件** | 无 |
| **测试方法** | Mock `window.api.app.getConfig()`，断言返回数据中 `data.terminal.defaultViewMode` 为字符串且值在允许范围内 |
| **期望结果** | 数据形状正确 |

### LIST_L1_04_saveConfig_ipc_call_format

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L1_04 |
| **名称** | viewMode 切换时 saveConfig IPC 调用签名正确 |
| **层级** | L1 契约 |
| **验证点** | 切换 viewMode 后调用 `window.api.app.saveConfig()` 时传参格式正确 |
| **前置条件** | Mock `window.api.app.saveConfig` |
| **测试方法** | 切换 viewMode 为 'List'，断言 saveConfig 被调用且参数包含 `{ terminal: { defaultViewMode: 'List' } }` |
| **期望结果** | IPC 调用参数格式正确 |

### LIST_L1_05_list_panel_width_constant

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L1_05 |
| **名称** | 列表面板宽度常量为 220px |
| **层级** | L1 契约 |
| **验证点** | 左侧列表面板宽度定义为固定 220px |
| **前置条件** | 无 |
| **测试方法** | 检查 CSS/style 中面板宽度常量为 220 |
| **期望结果** | 220px |

### LIST_L1_06_list_item_height_constant

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L1_06 |
| **名称** | 列表项高度常量为 48px |
| **层级** | L1 契约 |
| **验证点** | 每个列表项高度定义为 48px |
| **前置条件** | 无 |
| **测试方法** | 检查 CSS/style 中列表项高度为 48 |
| **期望结果** | 48px |

### LIST_L1_07_max_terminals_20

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L1_07 |
| **名称** | 终端数量上限为 20 |
| **层级** | L1 契约 |
| **验证点** | `MAX_TERMINALS` 常量值为 20 |
| **前置条件** | 无 |
| **测试方法** | 导入 `MAX_TERMINALS`，断言值为 20 |
| **期望结果** | 20 |

---

## 二、L2 规则层测试

### 2.1 左侧列表面板

#### LIST_L2_01_panel_container_style

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_01 |
| **名称** | 左侧列表面板容器样式 |
| **层级** | L2 规则 |
| **验证点** | 面板宽度 220px 固定、右边框 1px solid var(--border)、背景 var(--bg-deep)、overflow-y: auto |
| **前置条件** | 渲染 TerminalListView，至少有 1 个终端 |
| **测试方法** | 渲染组件，获取面板容器 DOM，断言 computed style |
| **期望结果** | 宽度 220px、右边框、背景色、可滚动 |

#### LIST_L2_02_list_item_layout

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_02 |
| **名称** | 列表项内部布局（状态点 + 名称 + CWD + 关闭按钮） |
| **层级** | L2 规则 |
| **验证点** | 每个列表项 48px 高，包含 6px 状态指示点、终端名称（12px, 600 weight, mono）、CWD 路径（10px, var(--text-secondary), mono）、hover 显示关闭按钮 |
| **前置条件** | 渲染列表项，终端有自定义名称和 CWD |
| **测试方法** | 渲染组件，断言各子元素存在且样式正确 |
| **期望结果** | 所有子元素按规格渲染 |

#### LIST_L2_03_list_item_name_priority

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_03 |
| **名称** | 终端名称显示优先级：自定义名 > CWD 最后一级 |
| **层级** | L2 规则 |
| **验证点** | 有自定义名时显示自定义名；无自定义名时显示 CWD 最后一级目录名 |
| **前置条件** | 渲染两个终端：一个有自定义名，一个只有 CWD |
| **测试方法** | 断言名称文本内容 |
| **期望结果** | 自定义名终端显示自定义名；无名终端显示 CWD 最后一级 |

#### LIST_L2_04_cwd_shorten_format

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_04 |
| **名称** | CWD 路径缩短为 ~/... 格式 |
| **层级** | L2 规则 |
| **验证点** | CWD 路径以 `~/...` 格式显示（home 目录替换为 ~） |
| **前置条件** | 终端 CWD 为 `/Users/username/projects/muxvo` |
| **测试方法** | 渲染列表项，断言 CWD 显示为 `~/projects/muxvo` |
| **期望结果** | CWD 格式正确缩短 |

#### LIST_L2_05_status_dot_consistent_with_tiling

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_05 |
| **名称** | 列表项状态指示点与 Tiling 模式一致 |
| **层级** | L2 规则 |
| **验证点** | 状态点 6px 圆点，颜色和动画映射与 06-visual-effects 定义一致 |
| **前置条件** | 终端处于 Running 状态 |
| **测试方法** | 渲染列表项，断言状态点 CSS class 和颜色 |
| **期望结果** | Running → 绿色 + statusPulse 2s |

### 2.2 列表项选中样式

#### LIST_L2_06_selected_item_style

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_06 |
| **名称** | 选中项左边框 3px 琥珀色 + 背景 rgba |
| **层级** | L2 规则 |
| **验证点** | 选中列表项有 3px solid var(--accent) 左边框，背景 rgba(232, 167, 72, 0.08) |
| **前置条件** | 渲染至少 2 个终端，选中其中一个 |
| **测试方法** | 断言选中项的 border-left 和 background-color |
| **期望结果** | 左边框 3px 琥珀色，背景半透明琥珀 |

#### LIST_L2_07_unselected_item_no_highlight

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_07 |
| **名称** | 非选中项无高亮样式 |
| **层级** | L2 规则 |
| **验证点** | 非选中列表项不带左边框高亮、不带琥珀色背景 |
| **前置条件** | 渲染 2 个终端，选中第一个 |
| **测试方法** | 断言第二个列表项无选中样式 |
| **期望结果** | 无左边框高亮，无琥珀背景 |

### 2.3 WaitingInput 列表项

#### LIST_L2_08_waiting_input_background_pulse

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_08 |
| **名称** | WaitingInput 列表项红色脉动背景 |
| **层级** | L2 规则 |
| **验证点** | WaitingInput 状态的列表项有红色脉动背景动画，2.5s 循环 |
| **前置条件** | 终端处于 WaitingInput 状态 |
| **测试方法** | 断言列表项 animation 包含脉动关键帧，duration 2.5s |
| **期望结果** | 红色脉动背景 2.5s 周期 |

#### LIST_L2_09_waiting_input_left_border_red

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_09 |
| **名称** | WaitingInput 选中项左边框为红色（替代琥珀色） |
| **层级** | L2 规则 |
| **验证点** | WaitingInput + 选中状态下，左边框 3px solid #ef4444（红色替代琥珀色） |
| **前置条件** | 终端处于 WaitingInput 状态且为当前选中项 |
| **测试方法** | 断言左边框颜色为 #ef4444 |
| **期望结果** | 左边框红色 |

#### LIST_L2_10_waiting_input_status_dot_accelerated

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_10 |
| **名称** | WaitingInput 状态点红色 + 加速 1s 动画 |
| **层级** | L2 规则 |
| **验证点** | WaitingInput 状态下状态点为红色，statusPulse 动画周期 1s（非 2s） |
| **前置条件** | 终端处于 WaitingInput 状态 |
| **测试方法** | 断言状态点颜色为 #ef4444，animation-duration 为 1s |
| **期望结果** | 红色状态点 + 1s 脉动 |

### 2.4 新建终端按钮

#### LIST_L2_11_create_button_position

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_11 |
| **名称** | 新建终端按钮位于列表底部固定显示 |
| **层级** | L2 规则 |
| **验证点** | "+ 新建终端" 按钮位于列表面板底部，始终可见 |
| **前置条件** | 渲染 TerminalListView |
| **测试方法** | 断言按钮存在且在面板底部 |
| **期望结果** | 按钮固定在底部 |

#### LIST_L2_12_create_button_hover_highlight

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_12 |
| **名称** | 新建终端按钮 hover 时背景高亮 |
| **层级** | L2 规则 |
| **验证点** | hover 时按钮背景发生高亮变化 |
| **前置条件** | 渲染按钮 |
| **测试方法** | 模拟 hover，断言 background 变化 |
| **期望结果** | hover 时背景高亮 |

#### LIST_L2_13_create_button_disabled_at_limit

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_13 |
| **名称** | 终端数达上限(20)时按钮禁用 + opacity 0.35 |
| **层级** | L2 规则 |
| **验证点** | 当终端数量 = 20 时，按钮设为 disabled，opacity 为 0.35 |
| **前置条件** | 模拟 20 个终端 |
| **测试方法** | 断言按钮 disabled 属性 + opacity 样式 |
| **期望结果** | disabled=true, opacity=0.35 |

### 2.5 右侧终端区域

#### LIST_L2_14_right_area_header

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_14 |
| **名称** | 右侧终端区域顶部 Header 显示当前选中终端信息 |
| **层级** | L2 规则 |
| **验证点** | Header 包含状态点 + 终端名称 + CWD 路径 |
| **前置条件** | 选中一个终端 |
| **测试方法** | 断言 Header 内各元素的文本和样式 |
| **期望结果** | Header 显示选中终端的状态点、名称和 CWD |

#### LIST_L2_15_right_area_xterm_fullscreen

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_15 |
| **名称** | XTermRenderer 渲染区域占满右侧剩余空间 |
| **层级** | L2 规则 |
| **验证点** | 终端渲染区域填满 Header 以下的所有空间 |
| **前置条件** | 选中一个终端 |
| **测试方法** | 断言终端容器 flex-grow / 高度占满 |
| **期望结果** | 终端区域全屏填充 |

### 2.6 多终端挂载策略

#### LIST_L2_16_all_terminals_mounted

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_16 |
| **名称** | 所有终端实例保持挂载，不随切换而销毁 |
| **层级** | L2 规则 |
| **验证点** | 切换选中终端时，非选中终端 XTermRenderer 仍在 DOM 中 |
| **前置条件** | 3 个终端存在 |
| **测试方法** | 选中终端 1 → 切换到终端 2 → 断言终端 1 的 DOM 仍存在 |
| **期望结果** | 所有 XTermRenderer 实例保持在 DOM 中 |

#### LIST_L2_17_active_terminal_css_class

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_17 |
| **名称** | 选中终端使用 list-terminal--active CSS 类 |
| **层级** | L2 规则 |
| **验证点** | 选中终端容器有 `.list-terminal--active` 类（position: relative, visibility: visible） |
| **前置条件** | 选中一个终端 |
| **测试方法** | 断言选中终端容器的 class 和 computed style |
| **期望结果** | visibility: visible, position: relative |

#### LIST_L2_18_hidden_terminal_css_class

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_18 |
| **名称** | 非选中终端使用 list-terminal--hidden CSS 类 |
| **层级** | L2 规则 |
| **验证点** | 非选中终端容器有 `.list-terminal--hidden` 类（position: absolute, visibility: hidden） |
| **前置条件** | 3 个终端，选中第 1 个 |
| **测试方法** | 断言第 2、3 个终端容器的 class 和 computed style |
| **期望结果** | visibility: hidden, position: absolute |

#### LIST_L2_19_hidden_terminal_no_fit_no_resize

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_19 |
| **名称** | 非选中终端不触发 fit 和 PTY resize |
| **层级** | L2 规则 |
| **验证点** | visibility:hidden 的终端不触发 ResizeObserver 回调，不发送 terminal:resize IPC |
| **前置条件** | 3 个终端，选中第 1 个 |
| **测试方法** | Mock terminal:resize IPC，切换选中终端，断言只有选中终端触发 resize |
| **期望结果** | 非选中终端无 fit/resize 调用 |

### 2.7 选中终端交互

#### LIST_L2_20_click_list_item_switches_terminal

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_20 |
| **名称** | 点击列表项切换到对应终端 |
| **层级** | L2 规则 |
| **验证点** | 点击列表项后，右侧切换到对应终端，列表项高亮变化 |
| **前置条件** | 3 个终端，当前选中第 1 个 |
| **测试方法** | 点击第 2 个列表项，断言 listSelectedId 更新、第 2 个终端变 visible、第 1 个变 hidden |
| **期望结果** | 终端正确切换 |

#### LIST_L2_21_switch_preserves_scroll_position

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_21 |
| **名称** | 切换终端时滚动位置保持 |
| **层级** | L2 规则 |
| **验证点** | visibility 切换不触发 ResizeObserver，不触发 fit，滚动位置保持 |
| **前置条件** | 终端 1 已滚动到某位置 |
| **测试方法** | 记录终端 1 滚动位置 → 切换到终端 2 → 切换回终端 1 → 断言滚动位置不变 |
| **期望结果** | 滚动位置保持不变 |

### 2.8 重命名交互

#### LIST_L2_22_double_click_enters_edit_mode

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_22 |
| **名称** | 双击列表项名称进入编辑模式 |
| **层级** | L2 规则 |
| **验证点** | 双击名称区域后，span 替换为 input，显示当前名称 |
| **前置条件** | 渲染一个有名称的终端列表项 |
| **测试方法** | 双击名称 span，断言出现 input 元素且 value 为当前名称 |
| **期望结果** | span → input，预填当前名称 |

#### LIST_L2_23_enter_confirms_rename

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_23 |
| **名称** | Enter 确认重命名 |
| **层级** | L2 规则 |
| **验证点** | 编辑模式下按 Enter → input 替换回 span，名称更新 |
| **前置条件** | 已进入编辑模式 |
| **测试方法** | 修改 input 值 → 按 Enter → 断言 span 显示新名称 |
| **期望结果** | 名称更新成功 |

#### LIST_L2_24_escape_cancels_rename

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_24 |
| **名称** | Escape 取消编辑，恢复原名称 |
| **层级** | L2 规则 |
| **验证点** | 编辑模式下按 Escape → 恢复原名称 |
| **前置条件** | 已进入编辑模式 |
| **测试方法** | 修改 input 值 → 按 Escape → 断言 span 显示原名称 |
| **期望结果** | 名称恢复为编辑前 |

#### LIST_L2_25_blur_confirms_rename

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_25 |
| **名称** | blur 确认名称（同 Enter 行为） |
| **层级** | L2 规则 |
| **验证点** | 编辑模式下 input 失去焦点 → 确认名称更新 |
| **前置条件** | 已进入编辑模式 |
| **测试方法** | 修改 input 值 → 触发 blur → 断言名称更新 |
| **期望结果** | 名称更新成功 |

#### LIST_L2_26_edit_click_no_bubble

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_26 |
| **名称** | 编辑时点击事件不冒泡到列表项 |
| **层级** | L2 规则 |
| **验证点** | 编辑模式下点击 input 不触发列表项的选中切换 |
| **前置条件** | 进入编辑模式 |
| **测试方法** | 点击 input 区域，断言 listSelectedId 不变 |
| **期望结果** | 不触发选中切换 |

### 2.9 关闭终端交互

#### LIST_L2_27_close_button_hover_visible

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_27 |
| **名称** | 关闭按钮仅 hover 时显示 |
| **层级** | L2 规则 |
| **验证点** | X 关闭按钮默认不可见，hover 列表项时才显示 |
| **前置条件** | 渲染一个列表项 |
| **测试方法** | 默认断言 X 按钮不可见 → hover 列表项 → 断言 X 按钮可见 |
| **期望结果** | hover 时才显示 X |

#### LIST_L2_28_close_no_process_direct

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_28 |
| **名称** | 无进程运行时点击 X 直接关闭 |
| **层级** | L2 规则 |
| **验证点** | 终端无前台进程运行时，点击 X 直接调用 close IPC，从列表移除 |
| **前置条件** | 终端处于 Stopped 状态 |
| **测试方法** | 点击 X → 断言 terminal:close 被调用，列表项消失 |
| **期望结果** | 直接关闭并移除 |

#### LIST_L2_29_close_with_process_confirm_dialog

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_29 |
| **名称** | 有进程运行时弹出 CloseConfirmDialog |
| **层级** | L2 规则 |
| **验证点** | 终端有前台进程运行时，点击 X 弹出确认对话框 |
| **前置条件** | 终端处于 Running 状态，有前台进程 |
| **测试方法** | Mock getForegroundProcess 返回有效进程 → 点击 X → 断言对话框出现 |
| **期望结果** | 弹出确认对话框 |

#### LIST_L2_30_close_selects_next

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_30 |
| **名称** | 关闭后自动选中下一个终端 |
| **层级** | L2 规则 |
| **验证点** | 关闭当前选中的终端后，自动选中列表中的下一个终端 |
| **前置条件** | 3 个终端 [A, B, C]，当前选中 B |
| **测试方法** | 关闭 B → 断言 listSelectedId 变为 C |
| **期望结果** | 自动选中下一个 |

#### LIST_L2_31_close_last_selects_previous

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_31 |
| **名称** | 关闭最后一个时选中前一个 |
| **层级** | L2 规则 |
| **验证点** | 当关闭的是列表中最后一个终端时，选中前一个 |
| **前置条件** | 3 个终端 [A, B, C]，当前选中 C |
| **测试方法** | 关闭 C → 断言 listSelectedId 变为 B |
| **期望结果** | 自动选中前一个 |

### 2.10 新建终端交互

#### LIST_L2_32_create_terminal_auto_select

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_32 |
| **名称** | 新建终端自动选中 |
| **层级** | L2 规则 |
| **验证点** | 点击 "+" 新建终端后，listSelectedId 更新为新终端 ID |
| **前置条件** | 已有 2 个终端 |
| **测试方法** | 点击创建按钮 → 断言新终端出现在列表底部 + listSelectedId = 新终端 ID |
| **期望结果** | 新终端自动选中 |

#### LIST_L2_33_create_disabled_at_limit

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_33 |
| **名称** | 达到上限时点击 "+" 无效 |
| **层级** | L2 规则 |
| **验证点** | 终端数量 = 20 时点击创建按钮无响应 |
| **前置条件** | 模拟 20 个终端 |
| **测试方法** | 点击创建按钮 → 断言 terminal:create 未被调用 |
| **期望结果** | 按钮禁用，无创建调用 |

### 2.11 listSelectedId 独立性

#### LIST_L2_34_listSelectedId_independent_from_selectedId

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_34 |
| **名称** | listSelectedId 与 selectedId 互不干扰 |
| **层级** | L2 规则 |
| **验证点** | 修改 listSelectedId 不影响 selectedId，反之亦然 |
| **前置条件** | Store 中 selectedId=A, listSelectedId=B |
| **测试方法** | 修改 listSelectedId 为 C → 断言 selectedId 仍为 A；修改 selectedId 为 D → 断言 listSelectedId 仍为 C |
| **期望结果** | 两者完全独立 |

#### LIST_L2_35_listSelectedId_independent_from_focusedId

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_35 |
| **名称** | listSelectedId 与 focusedId 互不干扰 |
| **层级** | L2 规则 |
| **验证点** | 修改 listSelectedId 不影响 focusedId，反之亦然 |
| **前置条件** | Store 中 focusedId=A, listSelectedId=B |
| **测试方法** | 修改 listSelectedId → 断言 focusedId 不变；修改 focusedId → 断言 listSelectedId 不变 |
| **期望结果** | 两者完全独立 |

### 2.12 状态流转规则

#### LIST_L2_36_enter_list_clears_focusedId

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_36 |
| **名称** | 进入 List 模式时 focusedId 设为 null |
| **层级** | L2 规则 |
| **验证点** | 从 Tiling/Focused 切换到 List 模式时，focusedId 被清除 |
| **前置条件** | focusedId = 'term-1' |
| **测试方法** | 切换到 List 模式 → 断言 focusedId === null |
| **期望结果** | focusedId 被清除 |

#### LIST_L2_37_enter_list_auto_select_first

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_37 |
| **名称** | 进入 List 模式时若 listSelectedId 为空则自动选中第一个 |
| **层级** | L2 规则 |
| **验证点** | listSelectedId 为 null 时进入 List 模式，自动设为第一个终端 ID |
| **前置条件** | listSelectedId = null，3 个终端存在 |
| **测试方法** | 切换到 List 模式 → 断言 listSelectedId 为第一个终端 ID |
| **期望结果** | 自动选中第一个终端 |

#### LIST_L2_38_enter_list_preserves_existing_selection

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_38 |
| **名称** | 进入 List 模式时保留已有的 listSelectedId |
| **层级** | L2 规则 |
| **验证点** | listSelectedId 已有值时进入 List 模式，不重置 |
| **前置条件** | listSelectedId = 'term-2'，切换到 Tiling 后再切回 List |
| **测试方法** | 断言 listSelectedId 仍为 'term-2' |
| **期望结果** | 保留已有选中 |

#### LIST_L2_39_switch_to_tiling_preserves_listSelectedId

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_39 |
| **名称** | 从 List 切回 Tiling 时 listSelectedId 保留 |
| **层级** | L2 规则 |
| **验证点** | 切换到 Tiling 模式后 listSelectedId 不被清除 |
| **前置条件** | List 模式下 listSelectedId = 'term-3' |
| **测试方法** | 切换到 Tiling → 断言 listSelectedId 仍为 'term-3' |
| **期望结果** | listSelectedId 保留 |

#### LIST_L2_40_new_terminal_updates_listSelectedId

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_40 |
| **名称** | 新建终端后 listSelectedId 更新 |
| **层级** | L2 规则 |
| **验证点** | 新建终端后 listSelectedId 自动设为新终端 ID |
| **前置条件** | List 模式下有 2 个终端 |
| **测试方法** | 新建终端 → 断言 listSelectedId 为新终端 ID |
| **期望结果** | listSelectedId 更新为新终端 |

### 2.13 自动选中逻辑

#### LIST_L2_41_first_enter_auto_select_first

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_41 |
| **名称** | 首次进入 List 模式（listSelectedId 为 null）自动选中第一个 |
| **层级** | L2 规则 |
| **验证点** | 首次进入 List 时自动选中终端列表第一个 |
| **前置条件** | 从未进入过 List 模式（listSelectedId = null） |
| **测试方法** | 切换到 List → 断言 listSelectedId = terminals[0].id |
| **期望结果** | 选中第一个终端 |

#### LIST_L2_42_close_current_auto_select_next

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_42 |
| **名称** | 关闭当前选中终端后自动选中下一个 |
| **层级** | L2 规则 |
| **验证点** | 关闭中间位置的选中终端时，自动选中其下一个 |
| **前置条件** | [A, B, C], 选中 B |
| **测试方法** | 关闭 B → 断言 listSelectedId = C |
| **期望结果** | 自动选中下一个 |

#### LIST_L2_43_close_last_auto_select_previous

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_43 |
| **名称** | 关闭的是最后一个则选中前一个 |
| **层级** | L2 规则 |
| **验证点** | 关闭列表末尾的选中终端时，自动选中前一个 |
| **前置条件** | [A, B, C], 选中 C |
| **测试方法** | 关闭 C → 断言 listSelectedId = B |
| **期望结果** | 自动选中前一个 |

#### LIST_L2_44_close_all_null

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_44 |
| **名称** | 所有终端关闭后 listSelectedId 设为 null |
| **层级** | L2 规则 |
| **验证点** | 最后一个终端关闭后 listSelectedId = null |
| **前置条件** | 仅有 1 个终端 |
| **测试方法** | 关闭唯一终端 → 断言 listSelectedId === null |
| **期望结果** | listSelectedId 为 null |

### 2.14 viewMode 持久化

#### LIST_L2_45_viewMode_persist_via_saveConfig

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_45 |
| **名称** | viewMode 通过 saveConfig IPC 持久化 |
| **层级** | L2 规则 |
| **验证点** | 切换 viewMode 后调用 `window.api.app.saveConfig()` |
| **前置条件** | Mock saveConfig |
| **测试方法** | 切换到 List → 断言 saveConfig 被调用且参数含 `defaultViewMode: 'List'` |
| **期望结果** | saveConfig 正确调用 |

#### LIST_L2_46_focused_not_persisted

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_46 |
| **名称** | Focused 模式不触发 viewMode 持久化 |
| **层级** | L2 规则 |
| **验证点** | 进入 Focused 模式时不调用 saveConfig（Focused 是临时叠加状态） |
| **前置条件** | Mock saveConfig |
| **测试方法** | 进入 Focused 模式 → 断言 saveConfig 未被调用 |
| **期望结果** | 不持久化 Focused |

### 2.15 空状态

#### LIST_L2_47_empty_state_right_area

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_47 |
| **名称** | 无终端时右侧显示空状态 + 创建按钮 |
| **层级** | L2 规则 |
| **验证点** | 终端列表为空时，右侧区域显示 "暂无终端" 文案和居中 "+" 按钮 |
| **前置条件** | 终端列表为空 |
| **测试方法** | 渲染组件，断言空状态文案和创建按钮存在 |
| **期望结果** | 显示空状态界面 |

#### LIST_L2_48_empty_state_text_style

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_48 |
| **名称** | 空状态文案样式正确 |
| **层级** | L2 规则 |
| **验证点** | 文案 font-size 13px, color var(--text-secondary)；按钮样式同 Tiling FAB |
| **前置条件** | 终端列表为空 |
| **测试方法** | 断言文案和按钮的 computed style |
| **期望结果** | 样式符合规格 |

#### LIST_L2_49_empty_state_left_panel

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_49 |
| **名称** | 无终端时左侧面板显示空列表 + 底部 "+" 按钮 |
| **层级** | L2 规则 |
| **验证点** | 左侧面板列表区域为空，底部仍有 "+" 按钮 |
| **前置条件** | 终端列表为空 |
| **测试方法** | 断言列表项数量为 0，创建按钮仍存在 |
| **期望结果** | 空列表 + 底部按钮 |

### 2.16 Light 主题适配

#### LIST_L2_50_light_theme_selected_background

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_50 |
| **名称** | Light 主题选中项背景为 rgba(196, 132, 42, 0.10) |
| **层级** | L2 规则 |
| **验证点** | Light 主题下选中列表项背景色为 rgba(196, 132, 42, 0.10)（区别于 Dark 的 0.08） |
| **前置条件** | Light 主题 + 选中一个终端 |
| **测试方法** | 设为 Light 主题，断言选中项 background-color |
| **期望结果** | rgba(196, 132, 42, 0.10) |

#### LIST_L2_51_light_theme_waiting_pulse_background

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_51 |
| **名称** | Light 主题 WaitingInput 脉动背景范围 rgba(239, 68, 68, 0.06~0.12) |
| **层级** | L2 规则 |
| **验证点** | Light 主题下 WaitingInput 脉动背景 alpha 范围为 0.06~0.12（Dark 为 0.08~0.15） |
| **前置条件** | Light 主题 + 终端 WaitingInput 状态 |
| **测试方法** | 断言动画关键帧中的 alpha 值 |
| **期望结果** | Light 主题使用更低 alpha |

#### LIST_L2_52_light_theme_border_auto_adapt

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L2_52 |
| **名称** | 面板边框通过 CSS variable 自动适配主题 |
| **层级** | L2 规则 |
| **验证点** | 面板右边框使用 var(--border)，主题切换时自动变化 |
| **前置条件** | 先 Dark 后 Light |
| **测试方法** | 断言 Dark 和 Light 下 --border 的 computed value 不同 |
| **期望结果** | 边框颜色随主题自动变化 |

---

## 三、L3 场景层测试

### LIST_L3_01_first_enter_full_flow

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L3_01 |
| **名称** | 首次进入 List 模式 → 自动选中第一个 → 右侧显示终端 |
| **层级** | L3 场景 |
| **验证点** | 完整的首次进入 List 模式流程 |
| **前置条件** | 3 个终端已创建，当前 Tiling 模式 |
| **步骤** | 1. 切换到 List 模式 2. 断言 listSelectedId 自动设为第一个终端 3. 断言左侧第一个列表项高亮 4. 断言右侧 Header 显示第一个终端信息 5. 断言右侧 XTermRenderer 可见 |
| **期望结果** | 完整流程正确 |

### LIST_L3_02_create_5_terminals_switch_scroll_preserve

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L3_02 |
| **名称** | List 模式创建 5 个终端 → 依次切换 → 每次滚动位置保持 |
| **层级** | L3 场景 |
| **验证点** | 多终端切换时，每个终端独立保持滚动位置 |
| **前置条件** | List 模式 |
| **步骤** | 1. 创建 5 个终端 2. 在每个终端中产生输出并滚动到不同位置 3. 依次切换终端 4. 每次切换回时断言滚动位置保持 |
| **期望结果** | 所有终端滚动位置独立保持 |

### LIST_L3_03_close_current_auto_select_next

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L3_03 |
| **名称** | 关闭当前选中终端 → 自动选中下一个（或上一个） |
| **层级** | L3 场景 |
| **验证点** | 关闭当前选中终端的完整流程 |
| **前置条件** | 3 个终端 [A, B, C]，选中 B |
| **步骤** | 1. 点击 B 的关闭按钮 2. （如有进程）确认关闭 3. B 从列表消失 4. C 自动选中 5. 右侧切换到 C 6. 再关闭 C → B 已不在 → 选中 A |
| **期望结果** | 关闭后正确自动选中 |

### LIST_L3_04_mode_switch_round_trip

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L3_04 |
| **名称** | List → Tiling → List 来回切换，listSelectedId 保留 |
| **层级** | L3 场景 |
| **验证点** | 模式来回切换不丢失 List 的选中状态 |
| **前置条件** | 3 个终端 |
| **步骤** | 1. 进入 List 模式 2. 选中第 2 个终端 3. 切换到 Tiling 模式 4. 在 Tiling 中做其他操作 5. 切回 List 模式 6. 断言仍选中第 2 个终端 |
| **期望结果** | listSelectedId 保留 |

### LIST_L3_05_waiting_input_visual_in_list

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L3_05 |
| **名称** | List 模式下终端 WaitingInput → 列表项红色脉动 |
| **层级** | L3 场景 |
| **验证点** | WaitingInput 状态在 List 模式下的完整视觉反馈 |
| **前置条件** | List 模式，3 个终端，第 2 个进入 WaitingInput |
| **步骤** | 1. 第 2 个终端进入 WaitingInput 状态 2. 断言列表项出现红色脉动背景 3. 断言状态点变为红色 + 加速动画 4. 如选中该终端，断言左边框变红色 |
| **期望结果** | WaitingInput 视觉完整 |

### LIST_L3_06_empty_to_create_to_operate

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L3_06 |
| **名称** | 空状态 → 创建终端 → 自动选中 → 正常操作 |
| **层级** | L3 场景 |
| **验证点** | 从空状态开始的完整使用流程 |
| **前置条件** | List 模式，无终端 |
| **步骤** | 1. 断言显示空状态界面 2. 点击右侧 "+" 按钮创建终端 3. 新终端出现在列表中 4. 自动选中新终端 5. 右侧显示终端内容 6. 终端可正常输入输出 |
| **期望结果** | 从空到可用的完整流程 |

### LIST_L3_07_rename_then_switch_back

| 项目 | 内容 |
|------|------|
| **用例 ID** | LIST_L3_07 |
| **名称** | 重命名终端 → 切换到其他终端 → 切回 → 名称保持 |
| **层级** | L3 场景 |
| **验证点** | 重命名后跨切换保持 |
| **前置条件** | List 模式，2 个终端 |
| **步骤** | 1. 双击第 1 个终端名称 2. 输入新名称 "MyServer" 3. 按 Enter 确认 4. 切换到第 2 个终端 5. 切回第 1 个终端 6. 断言名称仍为 "MyServer" 7. 断言 Header 也显示 "MyServer" |
| **期望结果** | 重命名持久保持 |
