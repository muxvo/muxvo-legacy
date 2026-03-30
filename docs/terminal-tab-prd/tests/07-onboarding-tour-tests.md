# 模块 07：新手引导 Tour — 测试用例

> **所属 PRD**：Muxvo 终端 Tab — 前端 UI 重写
> **模块**：新手引导 Tour
> **来源文档**：`modules/07-onboarding-tour.md`

---

## 测试分层说明

| 层级 | 名称 | 验证内容 | 实现方式 |
|------|------|----------|----------|
| L2 | 规则层 | Tour 步骤定义、自动推进机制、启动/完成逻辑、面板状态保护 | Vitest + React Testing Library |
| L3 | 场景层 | 多步骤用户旅程、Tour 完整流程 | Playwright E2E |

> 说明：Tour 模块无 L1 契约层测试，因为 Tour 不直接发起 IPC 调用，而是通过已有状态（terminalCount、viewMode 等）间接触发。

---

## L2 规则层测试

### TOUR_L2_01：4 步引导步骤定义完整性

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_01_steps_definition |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | Tour 步骤配置已加载 |
| **验证内容** | Tour 定义恰好 4 个步骤，每步包含 id、element（CSS 选择器）、popover（title + description）、检测逻辑 |
| **期望结果** | steps 数组长度 === 4；每步包含完整字段 |
| **对应 PRD** | 07-onboarding-tour.md §2.1 步骤总览 |

### TOUR_L2_02：步骤 1 目标元素为 FAB 按钮

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_02_step1_target_fab |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | Tour 步骤配置已加载 |
| **验证内容** | steps[0].element === '.terminal-grid__fab'，popover 标题 key === 'tour.step1.title' |
| **期望结果** | 目标元素和文案 key 匹配 PRD 定义 |
| **对应 PRD** | 07-onboarding-tour.md §2.2 步骤 1 |

### TOUR_L2_03：步骤 2 目标元素为最大化按钮

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_03_step2_target_max_btn |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | Tour 步骤配置已加载 |
| **验证内容** | steps[1].element === '.tile-max-btn'，popover 标题 key === 'tour.step2.title' |
| **期望结果** | 目标元素和文案 key 匹配 PRD 定义 |
| **对应 PRD** | 07-onboarding-tour.md §2.2 步骤 2 |

### TOUR_L2_04：步骤 3 目标元素为名称区域

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_04_step3_target_name |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | Tour 步骤配置已加载 |
| **验证内容** | steps[2].element 为 '.tile-custom-name--placeholder' 或 '.tile-custom-name'，popover 标题 key === 'tour.step3.title' |
| **期望结果** | 目标元素和文案 key 匹配 PRD 定义 |
| **对应 PRD** | 07-onboarding-tour.md §2.2 步骤 3 |

### TOUR_L2_05：步骤 4 目标元素为文件按钮

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_05_step4_target_file_btn |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | Tour 步骤配置已加载 |
| **验证内容** | steps[3].element === '.tile-file-btn'，popover 标题 key === 'tour.step4.title' |
| **期望结果** | 目标元素和文案 key 匹配 PRD 定义 |
| **对应 PRD** | 07-onboarding-tour.md §2.2 步骤 4 |

### TOUR_L2_06：步骤 1 自动推进 — terminalCount 增加触发

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_06_step1_auto_advance |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | Tour active，currentStep = 0 |
| **验证内容** | terminalCount 从 0 增加到 1 → useEffect 检测 → 500ms 延迟后 moveNext() 被调用 |
| **期望结果** | currentStep 从 0 推进到 1 |
| **对应 PRD** | 07-onboarding-tour.md §3.1-3.3 自动推进机制 |

### TOUR_L2_07：步骤 2 自动推进 — viewMode 变为 Focused 触发

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_07_step2_auto_advance |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | Tour active，currentStep = 1 |
| **验证内容** | viewMode 变为 'Focused' → 500ms 延迟后 moveNext() |
| **期望结果** | currentStep 从 1 推进到 2 |
| **对应 PRD** | 07-onboarding-tour.md §3.2 状态变化检测 |

### TOUR_L2_08：步骤 3 自动推进 — terminalNames 新值触发

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_08_step3_auto_advance |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | Tour active，currentStep = 2 |
| **验证内容** | terminalNames 中出现新值 → 500ms 延迟后 moveNext() |
| **期望结果** | currentStep 从 2 推进到 3 |
| **对应 PRD** | 07-onboarding-tour.md §3.2 状态变化检测 |

### TOUR_L2_09：步骤 4 检测 — filePanel.open 为 true 时 Tour 完成

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_09_step4_complete |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | Tour active，currentStep = 3 |
| **验证内容** | filePanel.open === true → 触发 Tour 完成流程 |
| **期望结果** | Tour 完成，tourCompleted = true |
| **对应 PRD** | 07-onboarding-tour.md §2.2 步骤 4 |

### TOUR_L2_10：首次自动启动条件

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_10_auto_start_condition |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | preferences.tourCompleted = false |
| **验证内容** | App 启动 → 延迟 1500ms → dispatch START_TOUR |
| **期望结果** | tour.active = true，tour.currentStep = 0 |
| **对应 PRD** | 07-onboarding-tour.md §5.1 首次自动启动 |

### TOUR_L2_11：tourCompleted 为 true 时跳过引导

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_11_skip_when_completed |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | preferences.tourCompleted = true |
| **验证内容** | App 启动 → 不触发 START_TOUR |
| **期望结果** | tour.active 保持 false |
| **对应 PRD** | 07-onboarding-tour.md §5.1 |

### TOUR_L2_12：手动重启引导流程

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_12_manual_restart |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | tourCompleted = true，Settings Modal 打开 |
| **验证内容** | 点击"重新开始引导"→ 关闭 Settings Modal → 延迟 100ms → dispatch START_TOUR |
| **期望结果** | tour.active = true，tour.currentStep = 0 |
| **对应 PRD** | 07-onboarding-tour.md §5.2 手动重启 |

### TOUR_L2_13：START_TOUR 行为 — 重置面板 + 初始化 driver.js

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_13_start_tour_behavior |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | dispatch START_TOUR |
| **验证内容** | (1) 关闭所有面板（filePanel、侧边栏等）(2) tour.active = true (3) tour.currentStep = 0 (4) driver.js 实例初始化 |
| **期望结果** | 面板全部关闭，Tour 从步骤 0 开始 |
| **对应 PRD** | 07-onboarding-tour.md §5.3 START_TOUR dispatch |

### TOUR_L2_14：完成 Tour — tourCompleted 持久化 + Toast

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_14_complete_tour |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | 用户完成全部 4 步 |
| **验证内容** | (1) tourCompleted = true 持久化 (2) dispatch COMPLETE_TOUR (3) driver.js 实例清理 (4) 显示完成 Toast 持续 3s |
| **期望结果** | Tour 完成，tourCompleted 持久化，Toast 显示 |
| **对应 PRD** | 07-onboarding-tour.md §5.4 完成 Tour |

### TOUR_L2_15：跳过 Tour — 点 X 退出保存 skipped=true

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_15_skip_tour |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | Tour active，用户在任意步骤点击 X |
| **验证内容** | (1) tourCompleted = true (2) 分析埋点 onboarding.complete { skipped: true } |
| **期望结果** | Tour 标记为已完成（跳过模式），不会再次自动触发 |
| **对应 PRD** | 07-onboarding-tour.md §3.4 异常处理 + §7 分析埋点 |

### TOUR_L2_16：异常 — 目标元素不存在时跳过步骤

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_16_missing_element_skip |
| **层级** | L2 |
| **优先级** | P1 |
| **前置条件** | Tour active，某步骤目标 DOM 元素不存在 |
| **验证内容** | driver.js 自动跳过该步骤，不阻塞后续步骤 |
| **期望结果** | Tour 继续执行后续步骤 |
| **对应 PRD** | 07-onboarding-tour.md §3.4 异常处理 |

### TOUR_L2_17：异常 — Tour 中终端被关闭至零

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_17_terminal_closed_during_tour |
| **层级** | L2 |
| **优先级** | P1 |
| **前置条件** | Tour active，terminalCount > 0 |
| **验证内容** | 终端关闭导致 terminalCount === 0 → Tour 暂停，提示用户重新创建 |
| **期望结果** | Tour 暂停并显示提示 |
| **对应 PRD** | 07-onboarding-tour.md §3.4 异常处理 |

### TOUR_L2_18：Panel 状态保护 — CLOSE_ALL 保留 tour.active

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_18_close_all_preserves_tour |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | Tour active |
| **验证内容** | dispatch CLOSE_ALL → 面板全部关闭，但 tour.active 保持 true |
| **期望结果** | Tour 不因批量关闭面板而中断 |
| **对应 PRD** | 07-onboarding-tour.md §6 Panel 状态保护 |

### TOUR_L2_19：Panel 状态保护 — COMPLETE_TOUR 不影响其他面板

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_19_complete_tour_preserves_panels |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | Tour active，filePanel.open = true |
| **验证内容** | dispatch COMPLETE_TOUR → tour.active = false，但 filePanel.open 保持 true |
| **期望结果** | Tour 完成不影响用户已打开的面板 |
| **对应 PRD** | 07-onboarding-tour.md §6 Panel 状态保护 |

### TOUR_L2_20：分析埋点 — onboarding.complete 事件

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_20_analytics_complete |
| **层级** | L2 |
| **优先级** | P1 |
| **前置条件** | Tour 完成或跳过 |
| **验证内容** | 完成全部步骤 → { skipped: false }；点 X 退出 → { skipped: true } |
| **期望结果** | onboarding.complete 事件参数正确 |
| **对应 PRD** | 07-onboarding-tour.md §7 分析埋点 |

### TOUR_L2_21：分析埋点 — onboarding.step 事件

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_21_analytics_step |
| **层级** | L2 |
| **优先级** | P1 |
| **前置条件** | Tour active，用户完成某步骤 |
| **验证内容** | 每步完成时触发 onboarding.step { step: N, total: 4 } |
| **期望结果** | step 参数从 1 到 4 递增，total 始终为 4 |
| **对应 PRD** | 07-onboarding-tour.md §7 分析埋点 |

### TOUR_L2_22：i18n — 8 对 key 中英文值验证

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_22_i18n_keys |
| **层级** | L2 |
| **优先级** | P1 |
| **前置条件** | i18n 配置加载 |
| **验证内容** | tour.step1.title ~ tour.step4.desc + tour.complete + tour.noTerminal.title/desc 共 11 个 key 均有中英文值 |
| **期望结果** | 中文和英文翻译均存在且非空 |
| **对应 PRD** | 07-onboarding-tour.md §8 i18n 支持 |

### TOUR_L2_23：List 模式下 START_TOUR 先切到 Tiling

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_23_list_to_tiling_before_tour |
| **层级** | L2 |
| **优先级** | P0 |
| **前置条件** | 当前 viewMode = 'List'，触发 START_TOUR |
| **验证内容** | START_TOUR 时检测 viewMode 为 List → 先切换到 Tiling → 再开始 Tour |
| **期望结果** | Tour 在 Tiling 模式下执行 |
| **对应 PRD** | 07-onboarding-tour.md §9.2 List 模式与 Tour |

### TOUR_L2_24：推进延迟时序验证

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L2_24_advance_timing |
| **层级** | L2 |
| **优先级** | P1 |
| **前置条件** | Tour active，当前步骤检测到状态变化 |
| **验证内容** | t=0 状态变化捕获 → t=0~500ms 隐藏当前 overlay → t=500ms moveNext() |
| **期望结果** | moveNext 在 500ms 延迟后调用（容差 ±50ms） |
| **对应 PRD** | 07-onboarding-tour.md §3.3 推进时序 |

---

## L3 场景层测试

### TOUR_L3_01：首次启动完整 Tour 流程

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L3_01_full_tour_flow |
| **层级** | L3 |
| **优先级** | P0 |
| **前置条件** | tourCompleted = false，App 首次启动 |
| **操作步骤** | 1. App 启动 → 等待 1500ms → Tour 自动开始 2. 看到步骤 1 popover → 点击 FAB 创建终端 → 自动推进到步骤 2 3. 看到步骤 2 popover → 点击最大化按钮 → 自动推进到步骤 3 4. 看到步骤 3 popover → 双击名称区域 → 输入名称 → Enter → 自动推进到步骤 4 5. 看到步骤 4 popover → 点击文件按钮 → Tour 完成 |
| **期望结果** | Tour 完成，显示完成 Toast 3s，tourCompleted = true |
| **验证方式** | Playwright E2E |
| **对应 PRD** | 07-onboarding-tour.md §2-5 全流程 |

### TOUR_L3_02：中途点 X 退出 Tour

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L3_02_exit_midway |
| **层级** | L3 |
| **优先级** | P0 |
| **前置条件** | tourCompleted = false，App 首次启动 |
| **操作步骤** | 1. Tour 自动开始 → 步骤 1 显示 2. 点击 popover 的关闭按钮 X |
| **期望结果** | tourCompleted = true，onboarding.complete { skipped: true } 触发，Tour overlay 消失 |
| **验证方式** | Playwright E2E |
| **对应 PRD** | 07-onboarding-tour.md §3.4 + §5.4 + §7 |

### TOUR_L3_03：Settings 手动重启引导

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L3_03_restart_from_settings |
| **层级** | L3 |
| **优先级** | P0 |
| **前置条件** | tourCompleted = true |
| **操作步骤** | 1. 打开 Settings Modal → 帮助 section 2. 点击"重新开始引导"按钮 3. Settings Modal 关闭 → 100ms 后 Tour 从步骤 1 开始 |
| **期望结果** | Tour 从头开始（currentStep = 0），面板已重置 |
| **验证方式** | Playwright E2E |
| **对应 PRD** | 07-onboarding-tour.md §5.2 手动重启 |

### TOUR_L3_04：Tour 中终端被关闭后恢复

| 项目 | 说明 |
|------|------|
| **用例编号** | TOUR_L3_04_terminal_closed_recovery |
| **层级** | L3 |
| **优先级** | P1 |
| **前置条件** | Tour active，步骤 2 进行中，已有 1 个终端 |
| **操作步骤** | 1. Tour 在步骤 2（等待进入聚焦模式） 2. 终端被意外关闭（terminalCount → 0） 3. Tour 暂停，提示创建终端 4. 用户点击 FAB 创建新终端 |
| **期望结果** | Tour 检测到 terminalCount === 0 暂停并显示提示 |
| **验证方式** | Playwright E2E |
| **对应 PRD** | 07-onboarding-tour.md §3.4 异常处理 |

---

## 用例统计

| 层级 | 数量 |
|------|------|
| L2 | 19 |
| L3 | 4 |
| **总计** | **23** |
