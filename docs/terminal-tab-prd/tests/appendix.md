# 测试附录

> **所属 PRD**：Muxvo 终端 Tab — 前端 UI 重写
> **类型**：测试附录

---

## 附录 G：遗漏检查记录

对照 9 类常见测试遗漏规则，逐一检查 PRD 全文（模块 01-08 + 附录 A/B），记录已识别的测试点和覆盖情况。

### G.1 API 契约类

| 检查项 | 检查结果 | 覆盖情况 |
|--------|---------|----------|
| IPC 调用参数格式 | `terminal:create({ cwd })`, `terminal:close({ id, force? })` 等 10 个通道 | L1 层已覆盖（模块 01 测试文件）。IPC 接口不变，契约测试验证调用签名 |
| IPC 返回值结构 | `{ success, data: { id, pid } }` 等 | L1 层已覆盖 |
| Push 事件数据格式 | `terminal:output { id, data }`, `terminal:state-change { id, state, processName? }` | L1 层已覆盖 |
| CustomEvent 数据格式 | `muxvo:theme-change { theme }`, `muxvo:global-zoom-request direction` | SET_L2_06, SET_L2_15 已覆盖 |
| config.terminal 默认值 | 7 个配置项 | SET_L1_01 已覆盖 |

### G.2 隐式转换类

| 检查项 | 检查结果 | 覆盖情况 |
|--------|---------|----------|
| fontSize 边界修正 | 输入 < 8 → 8，输入 > 32 → 32 | SET_L2_20, SET_L2_21 已覆盖 |
| cursorStyle 非法值 | 非 block/underline/bar 的值 | SET_L1_02 已覆盖 |
| defaultViewMode 非法值 | 'Focused' 不可作为默认值 | SET_L1_03 已覆盖 |
| terminalNames 空字符串 | 命名为空串等同于未命名 | 模块 01 测试已覆盖 |

### G.3 多场景差异类

| 检查项 | 检查结果 | 覆盖情况 |
|--------|---------|----------|
| terminalNames 三模式一致 | Tiling Tile header / Focused header + sidebar / List 列表项 | INTG_L3_09 已覆盖 |
| 进程状态三处一致 | Tile 状态点 / List 状态点 / Sidebar CompactTile | INTG_L3_10 已覆盖 |
| CWD 多处同步 | Tile header / List 列表项 / Focused header | INTG_L3_11 已覆盖 |
| Esc 行为差异 | Focused（退出）vs Tiling（无效）vs xterm 内（消费） | SET_L2_09, SET_L2_10, SET_L2_11 已覆盖 |

### G.4 组合测试类

| 检查项 | 检查结果 | 覆盖情况 |
|--------|---------|----------|
| 模式切换链 | List→Tiling→Focused→Tiling | INTG_L3_18 已覆盖 |
| Tour + 终端关闭 | Tour 中终端被关闭 | TOUR_L2_17, INTG_L3_13 已覆盖 |
| 缩放 + 多终端 | 一终端缩放全局生效 | SET_L2_22 已覆盖 |
| 主题 + 多终端 | 主题切换所有终端同步 | SET_L2_07, SET_L3_03 已覆盖 |

### G.5 前置条件类

| 检查项 | 检查结果 | 覆盖情况 |
|--------|---------|----------|
| Tour 前置 tourCompleted | false → 启动，true → 跳过 | TOUR_L2_10, TOUR_L2_11 已覆盖 |
| Esc 前置 viewMode + focus + transition | 三条件全满足才触发 | SET_L2_09, SET_L2_11, SET_L2_12 已覆盖 |
| List→Focused 不支持 | viewMode=List 时不可双击进入 Focused | INTG_L3_19 已覆盖 |
| Tour 步骤前置条件 | 每步依赖前一步完成 | TOUR_L2_06~09 已覆盖 |

### G.6 副作用类

| 检查项 | 检查结果 | 覆盖情况 |
|--------|---------|----------|
| 视图切换 → focusedId 重置 | Tiling→List 时 focusedId = null | SET_L2_01 已覆盖 |
| COMPLETE_TOUR → 不影响其他面板 | filePanel 等状态保持 | TOUR_L2_19 已覆盖 |
| START_TOUR → 重置所有面板 | 关闭 filePanel、侧边栏 | TOUR_L2_13 已覆盖 |
| config 写入失败 → UI 仍切换 | 内存态更新，持久化失败 | SET_L2_03 已覆盖 |
| 缩放 → fitAddon.fit() | 每次缩放后所有终端 refit | SET_L2_15 已覆盖 |

### G.7 负向用例类

| 检查项 | 检查结果 | 覆盖情况 |
|--------|---------|----------|
| 目标元素不存在 | Tour 跳过该步骤 | TOUR_L2_16 已覆盖 |
| 终端数量超限 | 第 21 个创建失败 | INTG_L3_04 已覆盖（模块 01 测试也覆盖） |
| fontSize 超范围 | 被 clamp 到 [8, 32] | SET_L2_18~21 已覆盖 |
| WebGL 上下文丢失 | 自动回退 Canvas | INTG_L3_14 已覆盖 |

### G.8 幂等性类

| 检查项 | 检查结果 | 覆盖情况 |
|--------|---------|----------|
| 重复 START_TOUR | 多次 dispatch 不应叠加 | 通过 TOUR_L2_13（tour.active 重置逻辑）间接覆盖 |
| 重复 Esc 按键 | 已退出聚焦后再按 Esc 无效 | SET_L2_10（非 Focused 模式 Esc 无效）覆盖 |
| 重复缩放到边界 | 已 32px 再放大保持 32px | SET_L2_18 已覆盖 |
| 连续模式切换 | Tiling→List→Tiling 快速切换不残留 | INTG_L3_16, INTG_L3_17 覆盖 |

### G.9 并发安全类

| 检查项 | 检查结果 | 覆盖情况 |
|--------|---------|----------|
| focusTransition 互斥 | entering/exiting/idle 三态互斥，非 idle 时阻止新操作 | SET_L2_12 已覆盖 |
| 动画期间点击侧边栏 | focusTransition !== 'idle' 时无效 | SET_L2_12 间接覆盖 |
| requestFit rAF 防抖 | 多次 fit 请求合并为一次 rAF | 模块 05 测试覆盖 |
| 终端输出期间模式切换 | 不中断数据流 | SET_L2_04, INTG_L3_08 覆盖 |

---

## 附录 H：特殊规则识别记录

PRD 全文 8 次扫描结果（适配前端 UI 场景）。

### H.1 部分更新规则

| 规则 | 来源 | 覆盖用例 |
|------|------|----------|
| "如果关闭的不是当前选中终端：选中状态不变" | 01-terminal-lifecycle §2 | 模块 01 测试覆盖 |
| "从 List 切回 Tiling：listSelectedId 保留" | 04-list-mode | 模块 04 测试覆盖 |
| "suppressResize=true 时，跳过 fit 和 PTY resize" | 05-xterm-rendering §2 | 模块 05 测试覆盖 |
| "CLOSE_ALL 保留 tour.active" | 07-onboarding-tour §6 | TOUR_L2_18 |
| "COMPLETE_TOUR 不影响其他面板状态" | 07-onboarding-tour §6 | TOUR_L2_19 |
| "config 写入失败 UI 仍切换" | 08-settings-shortcuts §1.3 | SET_L2_03 |
| "Tiling→List 重置 focusedId=null" | 08-settings-shortcuts §1.2 | SET_L2_01 |

### H.2 多时间点规则

| 规则 | 说明 |
|------|------|
| 不适用 | 前端 UI 无基于服务端时间的规则 |

> 前端存在以下延迟时间常量，但属于本地 UI 时序而非"多时间点"：
> - Tour 自动启动延迟：1500ms
> - Tour 步骤推进延迟：500ms
> - 手动重启 Tour 延迟：100ms
> - Toast 显示时长：3s
> - 这些已在对应 L2 测试中覆盖（TOUR_L2_10, TOUR_L2_24, TOUR_L2_12, TOUR_L2_14）

### H.3 条件互斥规则

| 规则 | 来源 | 覆盖用例 |
|------|------|----------|
| focusTransition 三态互斥（entering / exiting / idle） | 03-focused-mode §4, 附录A §A.3 | SET_L2_12, INTG_L3_08 |
| "focusTransition !== 'idle' 时，侧边栏点击无效" | 03-focused-mode §3 | SET_L2_12（间接覆盖） |
| "List → Focused 不支持" | 附录A §A.3.3 | INTG_L3_19 |
| viewMode 三态（Tiling / Focused / List）— Focused 不可作为默认 | 08-settings-shortcuts §1.2 | SET_L1_03 |

### H.4 累积上限规则

| 规则 | 值 | 来源 | 覆盖用例 |
|------|-----|------|----------|
| MAX_TERMINALS | 20 | 附录B §B.5 | INTG_L3_04, 模块 01 测试 |
| sidebar 最多 3 个 compact | 3 | 03-focused-mode §2 | 模块 03 测试 |
| fontSize 范围 | [8, 32] | 08-settings-shortcuts §6.2 | SET_L2_18~21 |
| 缩放增量 | ±1px | 08-settings-shortcuts §6.2 | SET_L2_15~17 |
| OUTPUT_BUFFER_MAX_BYTES | 64KB | 附录B §B.5 | 后端约束，不在前端测试范围 |

### H.5 状态锁定规则

| 规则 | 说明 |
|------|------|
| 不适用 | 前端 UI 无需状态锁定逻辑（后端状态机处理） |

### H.6 默认值规则

| 规则 | 默认值 | 覆盖用例 |
|------|--------|----------|
| terminals | `[]`（空数组） | 模块 01 测试 |
| viewMode | `'Tiling'` | SET_L1_01 |
| focusedId | `null` | 模块 03 测试 |
| selectedId | `null` | 模块 01 测试 |
| terminalOrder | `[]` | 模块 01 测试 |
| terminalNames | `{}`（空对象） | 模块 01 测试 |
| config.terminal.themeName | `'dark'` | SET_L1_01 |
| config.terminal.fontSize | `14` | SET_L1_01 |
| config.terminal.fontFamily | `'Menlo, monospace'` | SET_L1_01 |
| config.terminal.cursorStyle | `'block'` | SET_L1_01 |
| config.terminal.cursorBlink | `true` | SET_L1_01 |
| config.terminal.startupTerminals | `1` | SET_L1_01 |
| config.terminal.defaultViewMode | `'Tiling'` | SET_L1_01 |
| tour.active | `false` | TOUR_L2_11 |
| tour.currentStep | `0` | TOUR_L2_10 |
| preferences.tourCompleted | `false` | TOUR_L2_10 |

### H.7 循环周期规则

| 规则 | 说明 |
|------|------|
| 不适用 | 前端 UI 无定期轮询或周期性任务（状态推送由后端去抖 50ms 后一次性推送） |

### H.8 并发安全规则

| 规则 | 实现机制 | 来源 | 覆盖用例 |
|------|---------|------|----------|
| 双重 rAF | 模式切换后双重 requestAnimationFrame 确保 DOM 更新 | 05-xterm-rendering | 模块 05 测试 |
| disposed 守卫 | XTermRenderer 卸载后不处理事件 | 05-xterm-rendering | 模块 05 测试 |
| requestFit rAF 防抖 | 多次 fit 请求合并为单次 rAF | 05-xterm-rendering §2 | 模块 05 测试 |
| focusTransition 互斥 | 非 idle 状态阻止新的模式切换 | 03-focused-mode §4 | SET_L2_12 |
| suppressResize 标记 | 隐藏终端不发送 PTY resize | 05-xterm-rendering §2 | 模块 05 测试 |

---

## 附录 I：集成测试覆盖矩阵

### I.1 集成类型覆盖

| 集成类型 | 用例数 | 覆盖的模块组合 |
|----------|--------|---------------|
| 完整用户旅程 | 5 | 01+02+03+04+05+06+07+08 |
| 跨模块联动 | 3 | 01+02+03+05+06 |
| 数据一致性 | 3 | 01+02+03+04+06 |
| 异常恢复 | 3 | 01+03+05+06+07 |
| 模式切换矩阵 | 5 | 02+03+04+06+08 |
| Bug 修复验证 | 3 | 03+05+06 |
| **合计** | **22** | — |

### I.2 模块被集成测试覆盖频次

| 模块 | 被引用次数 | 覆盖的集成类型 |
|------|-----------|---------------|
| 01 终端生命周期 | 12 | 旅程、联动、一致性、异常 |
| 02 Tiling 模式 | 11 | 旅程、联动、一致性、切换矩阵 |
| 03 Focused 模式 | 13 | 旅程、联动、一致性、异常、切换矩阵、Bug |
| 04 List 模式 | 8 | 旅程、一致性、切换矩阵 |
| 05 XTerm 渲染 | 7 | 旅程、联动、异常、Bug |
| 06 视觉效果 | 10 | 旅程、联动、一致性、切换矩阵、Bug |
| 07 新手引导 | 3 | 旅程、异常 |
| 08 设置快捷键 | 4 | 旅程、切换矩阵 |

### I.3 三个根因 Bug 验证覆盖

| Bug | 根因 | 集成用例 | 验证策略 |
|-----|------|---------|----------|
| 滚动跳顶 | 非聚焦终端缩到 1x1px → fit 错误 | INTG_L3_20 | 对比 Focused 前后 scrollTop 值 |
| 文字乱码 | 容器 1x1px → cols=2 → buffer rewrap | INTG_L3_21 | 截图或文本内容对比 |
| 模式切换闪烁 | JS 400ms vs CSS 350ms 时间不匹配 | INTG_L3_22 | 连续截图像素 diff + CSS 类 count 断言 |
