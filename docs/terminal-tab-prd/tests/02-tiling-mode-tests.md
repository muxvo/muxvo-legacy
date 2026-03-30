# 模块 02：Tiling 模式 — 测试用例

> 来源 PRD：modules/02-tiling-mode.md
> 参考附录：appendix-b-ipc-channels.md
> 生成日期：2026-03-01

## 目录

- [一、L1 契约层测试](#一l1-契约层测试)
  - [1.1 布局计算函数返回格式](#11-布局计算函数返回格式)
  - [1.2 Tile 定位函数返回格式](#12-tile-定位函数返回格式)
  - [1.3 Handle 位置函数返回格式](#13-handle-位置函数返回格式)
- [二、L2 规则层测试](#二l2-规则层测试)
  - [2.1 Grid 计算算法](#21-grid-计算算法)
  - [2.2 Grid CSS 生成](#22-grid-css-生成)
  - [2.3 Tile 选中态](#23-tile-选中态)
  - [2.4 双击进入 Focused](#24-双击进入-focused)
  - [2.5 操作按钮](#25-操作按钮)
  - [2.6 Staggered 入场动画](#26-staggered-入场动画)
  - [2.7 Resize Handle](#27-resize-handle)
  - [2.8 拖拽重排序](#28-拖拽重排序)
  - [2.9 FAB 按钮](#29-fab-按钮)
  - [2.10 TerminalGrid 渲染分支](#210-terminalgrid-渲染分支)
- [三、L3 场景层测试](#三l3-场景层测试)
  - [3.1 四终端拖拽交换旅程](#31-四终端拖拽交换旅程)
  - [3.2 Resize Handle 持久化旅程](#32-resize-handle-持久化旅程)
  - [3.3 连续创建 Grid 动态更新旅程](#33-连续创建-grid-动态更新旅程)
  - [3.4 Tile 交互完整旅程](#34-tile-交互完整旅程)

---

## 一、L1 契约层测试

### 1.1 布局计算函数返回格式

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TILE_L1_01_gridLayout_return_shape | 无 | 调用 `calculateGridLayout(count)` | 返回 `{ rows: number, cols: number }`，rows 和 cols 均为正整数 | P0 |
| TILE_L1_02_gridLayout_param_type | 无 | 调用 `calculateGridLayout(count)` | 参数 `count` 为 number 类型（正整数） | P0 |

### 1.2 Tile 定位函数返回格式

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TILE_L1_03_tilePlacements_return_shape | 有效 layout 和 order | 调用 `computeTilePlacements(layout, order)` | 返回数组，每项包含 `{ id: string, gridRow: string, gridColumn: string }` | P0 |
| TILE_L1_04_tilePlacements_params | 无 | 检查函数签名 | 参数为 `(layout: { rows, cols }, order: string[])` | P0 |

### 1.3 Handle 位置函数返回格式

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TILE_L1_05_handlePositions_return_shape | 有效 layout | 调用 `computeHandlePositions(layout)` | 返回数组，每项包含 `{ type: 'col' | 'row', index: number, position: number }` | P0 |
| TILE_L1_06_handlePositions_col_handles | layout = { rows: 2, cols: 3 } | 调用 `computeHandlePositions(layout)` | 包含 2 个 col 类型的 handle（3列 → 2个列间隔） | P0 |
| TILE_L1_07_handlePositions_row_handles | layout = { rows: 3, cols: 2 } | 调用 `computeHandlePositions(layout)` | 包含 2 个 row 类型的 handle（3行 → 2个行间隔） | P0 |

---

## 二、L2 规则层测试

### 2.1 Grid 计算算法

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TILE_L2_01_grid_1 | 无 | `calculateGridLayout(1)` | `{ rows: 1, cols: 1 }` | P0 |
| TILE_L2_02_grid_2 | 无 | `calculateGridLayout(2)` | `{ rows: 1, cols: 2 }` | P0 |
| TILE_L2_03_grid_3 | 无 | `calculateGridLayout(3)` | `{ rows: 2, cols: 2 }` 或 `{ rows: 1, cols: 3 }`（实现可选） | P0 |
| TILE_L2_04_grid_4 | 无 | `calculateGridLayout(4)` | `{ rows: 2, cols: 2 }` | P0 |
| TILE_L2_05_grid_5 | 无 | `calculateGridLayout(5)` | `{ rows: 2, cols: 3 }` | P0 |
| TILE_L2_06_grid_6 | 无 | `calculateGridLayout(6)` | `{ rows: 2, cols: 3 }` | P0 |
| TILE_L2_07_grid_7 | 无 | `calculateGridLayout(7)` | `{ rows: 3, cols: 3 }` | P0 |
| TILE_L2_08_grid_9 | 无 | `calculateGridLayout(9)` | `{ rows: 3, cols: 3 }` | P0 |
| TILE_L2_09_grid_10 | 无 | `calculateGridLayout(10)` | `{ rows: 3, cols: 4 }` | P1 |
| TILE_L2_10_grid_12 | 无 | `calculateGridLayout(12)` | `{ rows: 3, cols: 4 }` | P1 |
| TILE_L2_11_grid_13 | 无 | `calculateGridLayout(13)` | `{ rows: 4, cols: 4 }` | P1 |
| TILE_L2_12_grid_16 | 无 | `calculateGridLayout(16)` | `{ rows: 4, cols: 4 }` | P1 |
| TILE_L2_13_grid_17 | 无 | `calculateGridLayout(17)` | `{ rows: 4, cols: 5 }` | P1 |
| TILE_L2_14_grid_20 | 无 | `calculateGridLayout(20)` | `{ rows: 4, cols: 5 }` | P1 |
| TILE_L2_15_grid_last_row_span | 5 个终端，layout={rows:2, cols:3} | 计算 Tile 定位 | 最后一行只有 2 个 Tile，末尾 Tile 应居中或跨列 | P1 |

### 2.2 Grid CSS 生成

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TILE_L2_16_css_columns | layout = { rows: 2, cols: 3 } | 生成 CSS | `gridTemplateColumns: 'repeat(3, 1fr)'` | P0 |
| TILE_L2_17_css_rows | layout = { rows: 2, cols: 3 } | 生成 CSS | `gridTemplateRows: 'repeat(2, 1fr)'` | P0 |
| TILE_L2_18_css_single | layout = { rows: 1, cols: 1 } | 生成 CSS | `gridTemplateColumns: 'repeat(1, 1fr)'`，`gridTemplateRows: 'repeat(1, 1fr)'` | P0 |
| TILE_L2_19_css_resize_custom_fr | grid-resize store 有自定义比例 [1, 2, 1] | 生成 CSS | `gridTemplateColumns: '1fr 2fr 1fr'`（非等分） | P1 |

### 2.3 Tile 选中态

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TILE_L2_20_select_click | Tiling 模式，3 个终端，selectedId=t1 | 单击 t2 的 Tile | `selectedId` 更新为 `t2` | P0 |
| TILE_L2_21_select_border | selectedId=t2 | 渲染 t2 的 Tile | t2 边框变为琥珀色（`--tile-selected-border-color`） | P0 |
| TILE_L2_22_select_header_highlight | selectedId=t2 | 渲染 t2 的 Tile | t2 header 文字高亮 | P1 |
| TILE_L2_23_deselect_previous | selectedId 从 t1 切到 t2 | 渲染 t1 的 Tile | t1 恢复默认样式（边框和 header 无高亮） | P0 |

### 2.4 双击进入 Focused

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TILE_L2_24_dblclick_header | Tiling 模式，3 个终端 | 双击 t2 的 header 区域 | 触发 `onDoubleClick('t2')` 回调 | P0 |
| TILE_L2_25_dblclick_switches_mode | Tiling 模式 | 双击后 | `focusedId` 设置为被双击的终端 ID，进入 Focused 布局 | P0 |
| TILE_L2_26_max_btn_enters_focused | Tiling 模式 | 点击 t2 的蓝色最大化按钮 | 触发 `onDoubleClick('t2')`，进入 Focused 模式 | P0 |

### 2.5 操作按钮

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TILE_L2_27_buttons_hidden_default | Tiling 模式，鼠标不在 Tile 上 | 渲染 Tile | 操作按钮组（文件/最大化/关闭）默认隐藏 | P0 |
| TILE_L2_28_buttons_show_on_hover | 鼠标不在 Tile 上 | 鼠标 hover 进入 Tile | 操作按钮组显示（文件=琥珀色、最大化=蓝色、关闭=红色） | P0 |
| TILE_L2_29_buttons_hide_on_leave | 操作按钮显示中 | 鼠标离开 Tile | 操作按钮组重新隐藏 | P0 |
| TILE_L2_30_close_btn_callback | hover Tile，按钮可见 | 点击关闭按钮（红色） | 触发 `onClose(id)` 回调 | P0 |
| TILE_L2_31_file_btn_color | hover Tile | 渲染文件按钮 | 按钮为琥珀色 | P2 |

### 2.6 Staggered 入场动画

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TILE_L2_32_stagger_delay_calc | 3 个 Tile 同时出现 | 计算 animation-delay | Tile 0: 0ms, Tile 1: 50ms, Tile 2: 100ms（`index * 50ms`） | P0 |
| TILE_L2_33_stagger_animation_name | 新 Tile 出现 | 检查 CSS animation | 使用 `tileEnter` 关键帧动画 | P0 |
| TILE_L2_34_stagger_duration | 新 Tile 出现 | 检查 animation-duration | 持续时间为 0.6s | P1 |
| TILE_L2_35_stagger_easing | 新 Tile 出现 | 检查 animation-timing-function | 缓动函数为 ease-out | P1 |
| TILE_L2_36_stagger_index_inline | 第 N 个 Tile | 检查 inline style | `--stagger-index` CSS 变量设置为 N | P0 |

### 2.7 Resize Handle

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TILE_L2_37_handle_col_render | Grid 2 列以上 | 渲染 | 列间出现垂直 Resize Handle | P0 |
| TILE_L2_38_handle_row_render | Grid 2 行以上 | 渲染 | 行间出现水平 Resize Handle | P0 |
| TILE_L2_39_handle_no_render_1col | Grid 1x1 布局 | 渲染 | 不渲染任何 Handle | P0 |
| TILE_L2_40_handle_default_style | Handle 可见 | 检查默认样式 | 半透明线条（`opacity: 0.3`），4px 宽/高 | P1 |
| TILE_L2_41_handle_hover_style | Handle 默认状态 | 鼠标 hover Handle | 高亮（`opacity: 0.7`），琥珀色 | P1 |
| TILE_L2_42_handle_drag_cursor_col | 列间 Handle | 开始拖拽 | 鼠标变为 `col-resize` | P0 |
| TILE_L2_43_handle_drag_cursor_row | 行间 Handle | 开始拖拽 | 鼠标变为 `row-resize` | P0 |
| TILE_L2_44_handle_drag_min_width | 拖拽列 Handle | 拖拽使某列接近 0px | 列宽最小限制为 100px | P0 |
| TILE_L2_45_handle_drag_min_height | 拖拽行 Handle | 拖拽使某行接近 0px | 行高最小限制为 100px | P0 |
| TILE_L2_46_handle_drag_persist | 拖拽完成 | 松手 | 新比例通过 `grid-resize` store 持久化 | P0 |
| TILE_L2_47_handle_drag_xterm_fit | 拖拽完成 | 松手 | 所有 Tile 中的 XTerm 触发 fit | P1 |
| TILE_L2_48_handle_dblclick_reset | 自定义比例 [1, 2, 1] | 双击 Handle | 所有列/行回到 1fr 等分比例 | P0 |
| TILE_L2_49_handle_drag_out_of_bounds | 拖拽中 | 鼠标拖出容器边界 | 限制在有效范围内 | P1 |

### 2.8 拖拽重排序

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TILE_L2_50_drag_start_condition | Tiling 模式，1 个终端 | 在 header 按住拖动 | 不启动拖拽（需要 2 个以上终端） | P0 |
| TILE_L2_51_drag_start_2plus | Tiling 模式，3 个终端 | 在 t1 header 按住拖动 | `dragSourceId = 't1'`，t1 Tile `opacity: 0.4` | P0 |
| TILE_L2_52_drag_200ms_guard | 3 个终端 | 按住 header 后 100ms 内松手 | 视为点击，不触发排序 | P0 |
| TILE_L2_53_drag_over_highlight | 正在拖拽 t1 | 拖到 t2 上方 | t2 出现琥珀色边框发光效果，`dragOverId = 't2'` | P0 |
| TILE_L2_54_drag_leave_unhighlight | t2 高亮中 | 拖离 t2 | t2 高亮消失，`dragOverId` 清除 | P0 |
| TILE_L2_55_drag_drop_reorder | 拖拽 t1 到 t3 位置 | 在 t3 上松手 | `onReorder` 触发，terminalOrder 更新（t1 移到 t3 位置） | P0 |
| TILE_L2_56_drag_drop_grid_rerender | 排序完成 | Grid 重新渲染 | Tile 按新 terminalOrder 排列 | P0 |
| TILE_L2_57_drag_cancel_outside | 正在拖拽 | 拖到 Grid 外松手 | 取消排序，恢复原位，drag-manager 重置 | P0 |
| TILE_L2_58_drag_cancel_escape | 正在拖拽 | 按 Escape | 取消排序，恢复原位 | P0 |
| TILE_L2_59_drag_only_header | 3 个终端 | 在 terminal（xterm）区域按住拖动 | 不启动拖拽（只有 header 是 drag source） | P0 |
| TILE_L2_60_drag_reset_state | 拖拽完成或取消 | 检查 drag-manager | `dragSourceId = null`，`dragOverId = null` | P0 |

### 2.9 FAB 按钮

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TILE_L2_61_fab_visible_tiling | viewMode='Tiling' | 渲染 | FAB 按钮可见，位于右下角 | P0 |
| TILE_L2_62_fab_visible_focused | viewMode='Tiling', focusedId 非 null | 渲染 | FAB 按钮可见 | P0 |
| TILE_L2_63_fab_visible_list | viewMode='List' | 渲染 | FAB 按钮可见 | P1 |
| TILE_L2_64_fab_hover_scale | FAB 正常态 | 鼠标 hover | FAB 放大 + 阴影增强 | P1 |
| TILE_L2_65_fab_click_create | FAB 正常态 | 点击 | 创建新终端 | P0 |
| TILE_L2_66_fab_disabled_at_max | 20 个终端 | 渲染 FAB | 灰色、不可点击 | P0 |
| TILE_L2_67_fab_disabled_tooltip | 20 个终端 | hover FAB | 显示 tooltip 提示 | P1 |
| TILE_L2_68_fab_visible_empty | terminals=[] | 渲染 | FAB 按钮可见（空状态页也有独立创建按钮） | P1 |

### 2.10 TerminalGrid 渲染分支

| 编号 | 初始状态 | 操作 | 期望结果 | 优先级 |
|------|----------|------|----------|--------|
| TILE_L2_69_branch_tiling | viewMode='Tiling', focusedId=null | 渲染 TerminalGrid | 渲染 TilingLayout 分支（CSS Grid 平铺） | P0 |
| TILE_L2_70_branch_focused | viewMode='Tiling', focusedId='t1' | 渲染 TerminalGrid | 渲染 FocusedLayout 分支（主终端 + 侧边栏） | P0 |
| TILE_L2_71_branch_list | viewMode='List' | 渲染 TerminalGrid | 渲染 TerminalListView 分支 | P0 |
| TILE_L2_72_branch_empty | terminals=[], viewMode='Tiling' | 渲染 TerminalGrid | 渲染空状态页 | P0 |

---

## 三、L3 场景层测试

### 3.1 四终端拖拽交换旅程

**编号**：TILE_L3_01_drag_swap_journey

**前置条件**：4 个终端 [t1, t2, t3, t4]，2x2 Grid 布局

**步骤**：

1. 验证 Grid 为 2x2 布局，4 个 Tile 按 [t1, t2, t3, t4] 顺序排列
2. 用户在 t1 的 header 区域按住鼠标（超过 200ms）
3. t1 Tile 变为半透明（opacity: 0.4），进入拖拽状态
4. 拖动到 t3 位置上方
5. t3 出现琥珀色边框发光高亮
6. 用户松手
7. terminalOrder 更新为 [t3, t2, t1, t4]（t1 和 t3 交换位置）
8. Grid 按新顺序重新渲染
9. drag-manager 状态重置（dragSourceId=null, dragOverId=null）

**期望**：拖拽交换后 Tile 顺序正确，Grid 布局仍为 2x2。

**优先级**：P0

---

### 3.2 Resize Handle 持久化旅程

**编号**：TILE_L3_02_resize_persist_journey

**前置条件**：4 个终端，2x2 Grid 布局，等分比例

**步骤**：

1. 验证初始列比例为 [1fr, 1fr]，行比例为 [1fr, 1fr]
2. 用户拖拽列间 Handle 向右，使左列宽度约为 60%
3. 松手后，`grid-resize` store 持久化新比例
4. 验证 CSS `gridTemplateColumns` 反映新比例（非 1fr:1fr）
5. 所有 Tile 中的 XTerm 触发 fit
6. 用户双击行间 Handle
7. 行比例重置为 [1fr, 1fr]
8. 列比例不受影响（仍为自定义比例）

**期望**：Resize Handle 拖拽比例持久化，双击重置仅影响对应维度。

**优先级**：P0

---

### 3.3 连续创建 Grid 动态更新旅程

**编号**：TILE_L3_03_continuous_create_journey

**前置条件**：已有 4 个终端，2x2 布局

**步骤**：

1. 验证 Grid 为 2x2（4 个终端）
2. 用户点击 FAB 创建第 5 个终端
3. Grid 自动调整为 2x3 布局
4. 新 Tile 以 tileEnter 动画入场（animation-delay = 4*50ms = 200ms）
5. 用户继续创建第 6 个终端
6. Grid 仍为 2x3 布局（2x3 可容纳 6 个）
7. 用户创建第 7 个终端
8. Grid 调整为 3x3 布局
9. 每次新增 Tile 都有 staggered 入场动画

**期望**：连续创建过程中 Grid 行列配置动态正确更新。

**优先级**：P0

---

### 3.4 Tile 交互完整旅程

**编号**：TILE_L3_04_tile_interaction_journey

**前置条件**：3 个终端 [t1, t2, t3]，selectedId=t1

**步骤**：

1. t1 边框为琥珀色（选中态），t2/t3 为默认样式
2. 用户单击 t2 → selectedId 切换为 t2，t2 高亮，t1 恢复默认
3. 用户 hover t2 → 操作按钮组显示（文件/最大化/关闭）
4. 用户鼠标移出 t2 → 按钮组隐藏
5. 用户再次 hover t2，点击最大化按钮
6. 触发 onDoubleClick('t2')，进入 Focused 模式
7. focusedId 设置为 't2'

**期望**：单击选中、hover 显示按钮、点击最大化进入 Focused 模式的完整交互链正确工作。

**优先级**：P0

---

## 统计

| 层级 | 数量 |
|------|------|
| L1 契约层 | 7 |
| L2 规则层 | 72 |
| L3 场景层 | 4 |
| **合计** | **83** |
