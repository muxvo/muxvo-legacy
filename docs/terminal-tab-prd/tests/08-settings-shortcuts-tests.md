# 模块 08：设置与快捷键 — 测试用例

> **所属 PRD**：Muxvo 终端 Tab — 前端 UI 重写
> **模块**：设置与快捷键
> **来源文档**：`modules/08-settings-shortcuts.md`

---

## 测试分层说明

| 层级 | 名称 | 验证内容 | 实现方式 |
|------|------|----------|----------|
| L1 | 契约层 | 终端配置项默认值、枚举值 | Vitest + JSON-driven test.each |
| L2 | 规则层 | 视图切换逻辑、配置实时生效、快捷键行为、缩放参数 | Vitest + React Testing Library |
| L3 | 场景层 | 多步骤设置操作流程 | Playwright E2E |

---

## L1 契约层测试

### SET_L1_01：config.terminal 默认值完整性

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L1_01_terminal_config_defaults |
| **层级** | L1 |
| **优先级** | P0 |
| **验证内容** | config.terminal 包含 7 个配置项，默认值分别为：themeName='dark', fontSize=14, fontFamily='Menlo, monospace', cursorStyle='block', cursorBlink=true, startupTerminals=1, defaultViewMode='Tiling' |
| **期望结果** | 所有默认值与 PRD 定义一致 |
| **对应 PRD** | 08-settings-shortcuts.md §2.1 配置项清单 |

### SET_L1_02：cursorStyle 枚举值

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L1_02_cursor_style_enum |
| **层级** | L1 |
| **优先级** | P0 |
| **验证内容** | cursorStyle 仅接受 'block'、'underline'、'bar' 三个值 |
| **期望结果** | 有效值通过验证，其他值被拒绝 |
| **对应 PRD** | 08-settings-shortcuts.md §2.2 cursorStyle 可选值 |

### SET_L1_03：defaultViewMode 枚举值

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L1_03_default_view_mode_enum |
| **层级** | L1 |
| **优先级** | P0 |
| **验证内容** | defaultViewMode 仅接受 'Tiling'、'List' 两个值（Focused 不可作为默认模式） |
| **期望结果** | 'Tiling' 和 'List' 有效，'Focused' 和其他值无效 |
| **对应 PRD** | 08-settings-shortcuts.md §1.2 交互规格 |

### SET_L1_04：fontSize 数值类型和范围

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L1_04_font_size_type |
| **层级** | L1 |
| **优先级** | P0 |
| **验证内容** | fontSize 为 number 类型，默认值 14 |
| **期望结果** | 类型为 number，值为 14 |
| **对应 PRD** | 08-settings-shortcuts.md §2.1 |

### SET_L1_05：startupTerminals 默认值

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L1_05_startup_terminals_default |
| **层级** | L1 |
| **优先级** | P0 |
| **验证内容** | startupTerminals 默认值为 1 |
| **期望结果** | startupTerminals === 1 |
| **对应 PRD** | 08-settings-shortcuts.md §2.1 |

### SET_L1_06：cursorBlink 默认值

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L1_06_cursor_blink_default |
| **层级** | L1 |
| **优先级** | P0 |
| **验证内容** | cursorBlink 为 boolean 类型，默认值 true |
| **期望结果** | cursorBlink === true |
| **对应 PRD** | 08-settings-shortcuts.md §2.1 |

---

## L2 规则层测试

### SET_L2_01：视图模式切换 Tiling → List

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_01_switch_tiling_to_list |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | viewMode = 'Tiling' |
| **验证内容** | 选择 List → (1) 立即切换到 List 模式 (2) focusedId 重置为 null (3) 写入 config |
| **期望结果** | viewMode = 'List'，focusedId = null，config.terminal.defaultViewMode = 'List' |
| **对应 PRD** | 08-settings-shortcuts.md §1.2 交互规格 |

### SET_L2_02：视图模式切换 List → Tiling

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_02_switch_list_to_tiling |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | viewMode = 'List' |
| **验证内容** | 选择 Tiling → 立即切换 + 写入 config |
| **期望结果** | viewMode = 'Tiling'，config.terminal.defaultViewMode = 'Tiling' |
| **对应 PRD** | 08-settings-shortcuts.md §1.2 |

### SET_L2_03：config 写入失败时 UI 仍切换

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_03_config_write_failure |
| **层级** | L2 |
| **优先级** | P1 |
| **前置条件** | viewMode = 'Tiling'，mock app:saveConfig 返回失败 |
| **验证内容** | UI 仍切换到 List（内存态更新），下次启动回退到旧值 |
| **期望结果** | viewMode = 'List'（内存），config 未持久化 |
| **对应 PRD** | 08-settings-shortcuts.md §1.3 异常处理 |

### SET_L2_04：切换时终端正在输出不影响

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_04_switch_during_output |
| **层级** | L2 |
| **优先级** | P1 |
| **前置条件** | 终端正在接收 output 数据流 |
| **验证内容** | 切换 Tiling → List → 终端输出不中断 |
| **期望结果** | 输出流持续，布局变化不影响数据流 |
| **对应 PRD** | 08-settings-shortcuts.md §1.3 异常处理 |

### SET_L2_05：配置修改后实时应用到所有终端

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_05_config_apply_all_terminals |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | 2 个终端已打开 |
| **验证内容** | 修改 fontSize/cursorStyle/cursorBlink → 所有终端实例立即应用新配置 |
| **期望结果** | 两个终端同步更新外观 |
| **对应 PRD** | 08-settings-shortcuts.md §2.3 持久化与生效 |

### SET_L2_06：主题切换事件流

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_06_theme_change_event_flow |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | 当前主题 = dark |
| **验证内容** | Settings 切换 light → dispatch muxvo:theme-change { theme: 'light' } → XTermRenderer 监听并应用 |
| **期望结果** | muxvo:theme-change 事件被分发，携带正确 theme 值 |
| **对应 PRD** | 08-settings-shortcuts.md §3.1 切换流程 |

### SET_L2_07：终端主题跟随 UI 主题

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_07_terminal_follows_ui_theme |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | XTermRenderer 实例已挂载 |
| **验证内容** | muxvo:theme-change 事件触发 → XTermRenderer 更新 xterm.js theme option |
| **期望结果** | 终端颜色方案与 UI 主题一致 |
| **对应 PRD** | 08-settings-shortcuts.md §3.2 终端主题跟随规则 |

### SET_L2_08：引导重启按钮行为

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_08_restart_tour_button |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | Settings Modal 打开，帮助 section 可见 |
| **验证内容** | 点击"重新开始引导" → 关闭 Modal → 100ms 延迟 → dispatch START_TOUR |
| **期望结果** | Modal 关闭后 100ms Tour 启动 |
| **对应 PRD** | 08-settings-shortcuts.md §4 引导重启 |

### SET_L2_09：Esc 退出聚焦 — viewMode=Focused 且焦点不在 xterm

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_09_esc_exit_focused |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | viewMode = 'Focused'，焦点不在 xterm 元素内，focusTransition = 'idle' |
| **验证内容** | 按下 Esc → 退出聚焦模式，回到 previousViewMode |
| **期望结果** | viewMode 切换回 Tiling 或 List，focusedId = null |
| **对应 PRD** | 08-settings-shortcuts.md §5.2 Esc 退出聚焦规格 |

### SET_L2_10：Esc 在非 Focused 模式下无效

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_10_esc_no_effect_tiling |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | viewMode = 'Tiling' |
| **验证内容** | 按下 Esc → 无反应 |
| **期望结果** | viewMode 不变 |
| **对应 PRD** | 08-settings-shortcuts.md §5.2 |

### SET_L2_11：Esc 焦点在 xterm 时不退出聚焦

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_11_esc_consumed_by_xterm |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | viewMode = 'Focused'，焦点在 xterm 元素内 |
| **验证内容** | 按下 Esc → xterm.js 消费事件（如 vim 模式），不触发退出聚焦 |
| **期望结果** | viewMode 保持 'Focused' |
| **对应 PRD** | 08-settings-shortcuts.md §5.2 |

### SET_L2_12：Esc 在 focusTransition 非 idle 时不触发

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_12_esc_blocked_during_transition |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | viewMode = 'Focused'，focusTransition = 'entering' 或 'exiting' |
| **验证内容** | 按下 Esc → 不触发退出（过渡动画进行中） |
| **期望结果** | viewMode 保持不变 |
| **对应 PRD** | 08-settings-shortcuts.md §5.2 + appendix-a §A.3 |

### SET_L2_13：Cmd+F 切换搜索栏

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_13_toggle_search_bar |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | 终端已获得焦点 |
| **验证内容** | Cmd+F → 搜索栏显示；再次 Cmd+F → 搜索栏隐藏 |
| **期望结果** | 搜索栏 toggle 显示/隐藏 |
| **对应 PRD** | 08-settings-shortcuts.md §5.3 搜索栏快捷键 |

### SET_L2_14：搜索栏内 Enter/Shift+Enter/Esc

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_14_search_bar_keys |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | 搜索栏已打开 |
| **验证内容** | Enter → 搜索下一个；Shift+Enter → 搜索上一个；Esc → 关闭搜索栏 |
| **期望结果** | 三个快捷键各自执行正确行为 |
| **对应 PRD** | 08-settings-shortcuts.md §5.3 |

### SET_L2_15：缩放事件流 — Cmd+= 放大

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_15_zoom_in_event_flow |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | 终端已获得焦点，当前 fontSize = 14 |
| **验证内容** | 终端内 Cmd+= → dispatch muxvo:global-zoom-request { direction: 'in' } → App 处理 → fontSize += 1 → dispatch muxvo:global-zoom → XTermRenderer fit |
| **期望结果** | fontSize 变为 15，muxvo:global-zoom 事件触发 |
| **对应 PRD** | 08-settings-shortcuts.md §6.1 事件流 |

### SET_L2_16：缩放事件流 — Cmd+- 缩小

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_16_zoom_out_event_flow |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | 终端已获得焦点，当前 fontSize = 14 |
| **验证内容** | Cmd+- → fontSize -= 1 |
| **期望结果** | fontSize 变为 13 |
| **对应 PRD** | 08-settings-shortcuts.md §6.3 |

### SET_L2_17：缩放事件流 — Cmd+0 重置

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_17_zoom_reset |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | 终端已获得焦点，当前 fontSize = 20（非默认） |
| **验证内容** | Cmd+0 → fontSize 重置为默认值 14 |
| **期望结果** | fontSize === 14 |
| **对应 PRD** | 08-settings-shortcuts.md §6.2-6.3 |

### SET_L2_18：缩放上限 32px

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_18_zoom_max_limit |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | fontSize = 32 |
| **验证内容** | Cmd+= → fontSize 不超过 32 |
| **期望结果** | fontSize 保持 32 |
| **对应 PRD** | 08-settings-shortcuts.md §6.2 缩放参数 |

### SET_L2_19：缩放下限 8px

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_19_zoom_min_limit |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | fontSize = 8 |
| **验证内容** | Cmd+- → fontSize 不低于 8 |
| **期望结果** | fontSize 保持 8 |
| **对应 PRD** | 08-settings-shortcuts.md §6.2 缩放参数 |

### SET_L2_20：fontSize 边界值输入 — 7 被修正为 8

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_20_font_size_clamp_low |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | Settings 中 fontSize 输入框 |
| **验证内容** | 用户输入 7 → 自动修正为 8 |
| **期望结果** | fontSize = 8 |
| **对应 PRD** | 08-settings-shortcuts.md §2.4 异常处理 |

### SET_L2_21：fontSize 边界值输入 — 33 被修正为 32

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_21_font_size_clamp_high |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | Settings 中 fontSize 输入框 |
| **验证内容** | 用户输入 33 → 自动修正为 32 |
| **期望结果** | fontSize = 32 |
| **对应 PRD** | 08-settings-shortcuts.md §2.4 异常处理 |

### SET_L2_22：缩放全局生效

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_22_zoom_global_effect |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | 3 个终端已打开 |
| **验证内容** | 在终端 1 中 Cmd+= → 所有 3 个终端 fontSize 均 +1 |
| **期望结果** | 全局统一缩放 |
| **对应 PRD** | 08-settings-shortcuts.md §6.4 全局生效 |

### SET_L2_23：SettingsModal 视图模式切换 UI

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_23_view_mode_ui |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | SettingsModal 打开 |
| **验证内容** | (1) 按钮组包含 Tiling 和 List 两个选项 (2) 选中态为琥珀色背景 + 白色文字 (3) 未选中态为透明背景 + 灰色文字 |
| **期望结果** | UI 呈现与 PRD 规格一致 |
| **对应 PRD** | 08-settings-shortcuts.md §7.2 视图模式切换 UI 规格 |

### SET_L2_24：SettingsModal 新增 props

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_24_settings_modal_props |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | SettingsModal 组件 |
| **验证内容** | 新增 props: viewMode ('Tiling' | 'List') 和 onViewModeChange ((mode) => void) |
| **期望结果** | 切换按钮点击时调用 onViewModeChange 回调 |
| **对应 PRD** | 08-settings-shortcuts.md §7.1 SettingsModal.tsx 改动 |

### SET_L2_25：i18n — 新增 settings.viewMode 相关 key

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L2_25_i18n_view_mode_keys |
| **层级** | L2 |
| **优先级** | P1 |
| **前置条件** | i18n 配置加载 |
| **验证内容** | 4 个新 key 存在且有中英文值：settings.viewMode, settings.viewModeDesc, settings.viewModeTiling, settings.viewModeList |
| **期望结果** | 中英文翻译均存在且非空 |
| **对应 PRD** | 08-settings-shortcuts.md §7.3 新增 i18n Key |

---

## L3 场景层测试

### SET_L3_01：Settings 切换 Tiling → List 布局变化

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L3_01_switch_layout_visible |
| **层级** | L3 |
| **优先级** | P0 |
| **前置条件** | 3 个终端已打开，viewMode = 'Tiling' |
| **操作步骤** | 1. 打开 Settings → 通用 section 2. 点击 List 按钮 3. 关闭 Settings |
| **期望结果** | 立即看到左侧列表面板 + 右侧全屏终端的 List 布局 |
| **验证方式** | Playwright E2E — 截图或检查 DOM 结构 |
| **对应 PRD** | 08-settings-shortcuts.md §1.2 |

### SET_L3_02：连续放大到上限后重置

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L3_02_zoom_to_max_then_reset |
| **层级** | L3 |
| **优先级** | P0 |
| **前置条件** | 终端已创建，fontSize = 14 |
| **操作步骤** | 1. 点击终端获得焦点 2. 连续按 Cmd+= 共 18 次（14→32） 3. 再按一次 Cmd+= → 无变化（已达上限） 4. 按 Cmd+0 → 重置到 14 |
| **期望结果** | fontSize 从 14 逐步增大到 32 后停止，Cmd+0 重置到 14 |
| **验证方式** | Playwright E2E |
| **对应 PRD** | 08-settings-shortcuts.md §6.2-6.3 |

### SET_L3_03：主题 Dark→Light 终端配色同步

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L3_03_theme_sync |
| **层级** | L3 |
| **优先级** | P0 |
| **前置条件** | 当前主题 = dark，2 个终端已打开 |
| **操作步骤** | 1. 打开 Settings → 主题切换 2. 选择 Light 主题 |
| **期望结果** | 所有终端的配色方案同步切换为 light 色系 |
| **验证方式** | Playwright E2E — 检查终端背景色变化 |
| **对应 PRD** | 08-settings-shortcuts.md §3.1-3.2 |

### SET_L3_04：Esc 退出聚焦完整交互

| 项目 | 说明 |
|------|------|
| **用例编号** | SET_L3_04_esc_exit_focused_e2e |
| **层级** | L3 |
| **优先级** | P0 |
| **前置条件** | 2 个终端已打开，Tiling 模式 |
| **操作步骤** | 1. 双击终端 Tile 进入 Focused 模式 2. 点击 Focused 视图外的区域使焦点离开 xterm 3. 按 Esc |
| **期望结果** | 退出 Focused 模式，回到 Tiling 布局 |
| **验证方式** | Playwright E2E |
| **对应 PRD** | 08-settings-shortcuts.md §5.2 |

---

## 用例统计

| 层级 | 数量 |
|------|------|
| L1 | 6 |
| L2 | 20 |
| L3 | 4 |
| **总计** | **30** |
