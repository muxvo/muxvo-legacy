# 模块 02：Tiling 模式 — 前端布局与交互

> **所属 PRD**：Muxvo 终端 Tab - PRD V1.0（前端 UI 重写）
> **模块编号**：02
> **优先级**：P0（重写）
> **依赖**：模块 01（终端生命周期）、模块 05（XTerm 渲染）

**本模块仅涉及前端 UI 层。终端数据由后端通过 IPC Push 事件提供（`terminal:onOutput`、`terminal:onStateChange` 等），后端与 IPC 接口不在重写范围。**

---

## 1. Grid 布局

### 1.1 布局方式

使用 CSS Grid 实现终端平铺，容器设置 `display: grid`，行列由 `calculateGridLayout()` 动态计算。

### 1.2 Grid 计算算法

`calculateGridLayout(count: number)` 根据终端数量返回最优的行列配置：

| 终端数 | 行 x 列 | 说明 |
|--------|---------|------|
| 1 | 1 x 1 | 单终端铺满 |
| 2 | 1 x 2 | 横向双列 |
| 3 | 1 x 3 或 2+1 | 三列或两行（上 2 下 1） |
| 4 | 2 x 2 | 标准四宫格 |
| 5-6 | 2 x 3 | 两行三列 |
| 7-9 | 3 x 3 | 三行三列 |
| 10-12 | 3 x 4 | 三行四列 |
| 13-16 | 4 x 4 | 四行四列 |
| 17-20 | 4 x 5 | 四行五列 |

**计算逻辑**：
- `cols = Math.ceil(Math.sqrt(count))`
- `rows = Math.ceil(count / cols)`
- 最后一行不满时，末尾 Tile 跨列居中

### 1.3 Grid CSS 生成

```
gridTemplateColumns: repeat({cols}, 1fr)
gridTemplateRows: repeat({rows}, 1fr)
```

- 每个 Tile 通过 `gridRow` / `gridColumn` 定位
- fr 单位确保等比分配空间
- Resize Handle 拖拽后，fr 值按比例调整（非等分）

---

## 2. Tile 组件

### 2.1 结构

每个终端在 Tiling 模式下渲染为一个 `TerminalTile` 组件：

```
TerminalTile
├── header
│   ├── 状态点（StatusDot）
│   ├── CWD 显示
│   ├── 名称区域（可编辑）
│   └── 操作按钮组
│       ├── 文件按钮（琥珀色）→ 打开 FilePanel
│       ├── 最大化按钮（蓝色）→ 进入 Focused 模式
│       └── 关闭按钮（红色）→ 关闭终端
└── terminal 区域
    └── XTermRenderer
```

### 2.2 选中态

**前置条件**：Tiling 模式下有多个终端

**操作**：用户单击某个 Tile

**系统行为**：
1. 该 Tile 标记为选中（`selectedId = clickedId`）
2. 选中 Tile 视觉变化：
   - 边框变为琥珀色（`--tile-selected-border-color`）
   - header 文字高亮
3. 之前选中的 Tile 恢复默认样式

### 2.3 双击进入 Focused

**操作**：用户双击 Tile 的 header 区域

**系统行为**：
1. 触发 `onDoubleClick(id)` 回调
2. 视图模式切换为 Focused
3. 双击的终端成为聚焦主终端
4. 详见 [模块 03](./03-focused-mode.md)

### 2.4 操作按钮

| 按钮 | 颜色 | 功能 | 回调 |
|------|------|------|------|
| 文件 | 琥珀色 | 打开终端关联的 FilePanel | — |
| 最大化 | 蓝色 | 进入 Focused 模式 | `onDoubleClick(id)` |
| 关闭 | 红色 | 关闭终端 | `onClose(id)` |

按钮默认隐藏，鼠标 hover Tile 时显示。

---

## 3. Staggered 入场动画

### 3.1 触发条件

新的 Tile 出现在 Grid 中（创建终端、切换到 Tiling 模式）。

### 3.2 动画效果

CSS 动画 `tileEnter`：

```css
@keyframes tileEnter {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

- 持续时间：0.6s
- 缓动函数：ease-out

### 3.3 Staggered 延迟

多个 Tile 同时出现时，按索引添加延迟：

```css
animation-delay: calc(var(--stagger-index) * 50ms);
```

- 第 1 个 Tile：0ms 延迟
- 第 2 个 Tile：50ms 延迟
- 第 3 个 Tile：100ms 延迟
- 以此类推
- `--stagger-index` 通过 inline style 设置

---

## 4. Resize Handle

### 4.1 功能描述

用户可以拖拽列间和行间的 handle 来调整 Tile 的相对大小。

### 4.2 Handle 渲染

**前置条件**：Grid 有 2 列以上或 2 行以上

**系统行为**：
1. `computeHandlePositions()` 根据当前 Grid 布局计算 handle 位置
2. 列间 handle：垂直线条，位于相邻列之间
3. 行间 handle：水平线条，位于相邻行之间
4. 位置按百分比计算，响应容器 resize

### 4.3 拖拽交互

**操作**：用户按住 handle 并拖拽

**系统行为**：
1. 鼠标变为 `col-resize`（列）或 `row-resize`（行）
2. 拖拽过程中实时更新 Grid 的 fr 比例
3. 松手后：
   - 新比例通过 `grid-resize` store 持久化
   - Grid 重新渲染，所有 Tile 中的 XTerm 触发 fit

**约束**：
- 最小列/行宽度：100px（防止 Tile 过小）
- 拖拽超出容器边界时，限制在有效范围内

### 4.4 视觉样式

| 状态 | 样式 |
|------|------|
| 默认 | 半透明线条（`opacity: 0.3`），4px 宽/高 |
| Hover | 高亮（`opacity: 0.7`），琥珀色 |
| 拖拽中 | 高亮 + 阴影 |

### 4.5 比例重置

双击 handle 可重置为等分比例（所有列/行回到 1fr）。

---

## 5. 拖拽重排序

### 5.1 功能描述

用户可以拖拽 Tile 到不同位置，重新排列终端顺序。

### 5.2 拖拽启动

**前置条件**：Tiling 模式，2 个以上终端

**操作**：用户在 Tile header 区域按住并拖动

**系统行为**：
1. `drag-manager` store 记录拖拽状态：`dragSourceId`、`dragOverId`
2. 被拖拽 Tile 视觉变化：`opacity: 0.4`
3. 开始拖拽后 200ms 内松手视为点击，不触发排序

### 5.3 拖拽过程

**操作**：拖拽 Tile 到另一个 Tile 上方

**系统行为**：
1. 目标 Tile 高亮：琥珀色边框发光效果
2. 拖离目标 Tile 后高亮消失
3. 只有 header 区域作为 drop target（terminal 区域不响应）

### 5.4 放下

**操作**：在目标 Tile 上松手

**系统行为**：
1. 触发 `onReorder(newOrder)` 回调
2. `newOrder` 是重排后的终端 ID 数组
3. `terminalOrder` 状态更新
4. Grid 按新顺序重新渲染 Tile
5. `drag-manager` 重置所有拖拽状态

**取消**：
- 拖到 Grid 外部松手 → 取消排序，恢复原位
- 按 Escape → 取消排序，恢复原位

---

## 6. FAB 按钮

### 6.1 位置与样式

- 固定定位于 Grid 容器的**右下角**
- 圆形按钮，"+" 图标
- 悬浮于 Tile 之上（`z-index` 高于 Tile）
- 阴影效果提升层次感

### 6.2 交互

| 状态 | 行为 |
|------|------|
| 正常 | 点击创建新终端 |
| Hover | 放大 + 阴影增强 |
| 禁用（达到上限） | 灰色，不可点击，tooltip 提示 |
| 终端为空 | 正常显示（空状态页也有独立创建按钮） |

### 6.3 可见性

- Tiling 模式：始终可见
- Focused 模式：始终可见
- List 模式：始终可见
- 所有模式下 FAB 位置一致（右下角）

---

## 7. 前端组件架构

### 7.1 TerminalGrid 组件

`TerminalGrid` 是终端 Tab 的核心渲染组件，负责根据 `viewMode` 切换渲染分支：

| viewMode | 渲染分支 | 说明 |
|----------|---------|------|
| `'Tiling'`（focusedId 为 null） | Tiling 布局 | CSS Grid 平铺所有终端 |
| `'Tiling'`（focusedId 非 null） | Focused 布局 | 主终端 + 侧边栏 |
| `'List'` | List 布局 | 左侧列表 + 右侧全屏终端 |

### 7.2 依赖的 Stores（不在重写范围）

以下 stores 设计良好，保留不动：

| Store | 职责 |
|-------|------|
| `grid-resize` | 管理 Grid 行列的 fr 比例，支持持久化和重置 |
| `drag-manager` | 管理 Tile 拖拽状态：dragSourceId、dragOverId、拖拽计时器 |

### 7.3 依赖的工具函数（不在重写范围）

| 函数 | 职责 |
|------|------|
| `calculateGridLayout(count)` | 根据终端数量计算最优行列配置 |
| `computeTilePlacements(layout, order)` | 计算每个 Tile 的 gridRow/gridColumn 定位 |
| `computeHandlePositions(layout)` | 计算 Resize Handle 的位置 |

---

## 8. 重写要点

### 8.1 TerminalGrid.tsx 从零重写

**旧问题**：TerminalGrid.tsx 包含 5 个渲染分支（Tiling、Focused-entering、Focused-idle、Focused-exiting、无终端），逻辑交织，难以维护。

**新设计**：清理为 3 个模式分支，每个分支职责清晰：

```typescript
// TerminalGrid 渲染逻辑
if (viewMode === 'List') {
  return <TerminalListView ... />;
}
if (focusedId !== null) {
  return <FocusedLayout ... />;  // 包含 entering/idle/exiting 状态
}
return <TilingLayout ... />;
```

### 8.2 focusTransition 时间常量化

旧代码中 focusTransition 的 setTimeout 使用硬编码 magic number。新设计统一使用常量：

```typescript
// constants.ts
const FOCUS_ENTER_DURATION = 300;   // 与 CSS --focus-enter-duration 一致
const FOCUS_ENTER_BUFFER = 50;      // 余量
const FOCUS_EXIT_DURATION = 250;    // 与 CSS --focus-exit-duration 一致
const FOCUS_EXIT_BUFFER = 50;       // 余量

// 使用
setTimeout(callback, FOCUS_ENTER_DURATION + FOCUS_ENTER_BUFFER);  // 350ms
```

### 8.3 Props 接口扩展

TerminalGrid 的 Props 接口新增 List 模式支持：

| 新增 Prop | 类型 | 说明 |
|-----------|------|------|
| `listSelectedId` | `string \| null` | List 模式当前选中终端 ID |
| `onListSelect` | `(id: string) => void` | List 模式选中终端回调 |

这两个 props 仅在 `viewMode === 'List'` 时使用，透传给 `TerminalListView` 组件。
