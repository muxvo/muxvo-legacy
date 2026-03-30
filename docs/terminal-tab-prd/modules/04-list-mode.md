# 模块 04：List 模式 — 前端列表导航与终端切换

> **所属 PRD**：Muxvo 终端 Tab - PRD V1.0（前端 UI 重写）
> **模块编号**：04
> **优先级**：P0（新增功能）
> **依赖**：模块 01（终端生命周期）、模块 05（XTerm 渲染）

**本模块仅涉及前端 UI 层。List 模式为新增功能。终端数据由后端通过 IPC Push 事件提供（接口不变），后端不在重写范围。**

---

## 1. 概述

### 1.1 定位

List 模式是终端 Tab 的第三种视图模式，补充 Tiling（平铺）和 Focused（聚焦）的场景覆盖：

| 模式 | 适用场景 | 终端可见数 |
|------|---------|-----------|
| Tiling | 同时观察 2~6 个终端 | 全部（等分空间） |
| Focused | 专注一个，兼顾全局 | 1 主 + 3 缩略 |
| **List** | **终端数量多（>6）时高效导航** | **1 全屏** |

### 1.2 布局概览

```
┌──────────────┬─────────────────────────────────────────┐
│ 列表面板      │ 终端显示区                               │
│ 220px 固定    │ 剩余空间全屏                             │
│              │                                         │
│ ┌──────────┐ │ ┌─ header ──────────────────────────┐   │
│ │ ● term-1 │ │ │ ● Terminal 1  ~/projects/muxvo    │   │
│ │   ~/proj  │ │ └──────────────────────────────────┘   │
│ ├──────────┤ │                                         │
│ │ ○ term-2 │ │  ┌──────────────────────────────────┐   │
│ │   ~/docs  │ │  │                                  │   │
│ ├──────────┤ │  │        xterm 全屏渲染              │   │
│ │ ● term-3 │ │  │                                  │   │
│ │   ~/test  │ │  │                                  │   │
│ ├──────────┤ │  └──────────────────────────────────┘   │
│ │          │ │                                         │
│ │ + 新建   │ │                                         │
│ └──────────┘ │                                         │
└──────────────┴─────────────────────────────────────────┘
```

### 1.3 进入方式

- Settings 面板中切换默认视图模式为 "List"
- 模式切换后立即生效，无过渡动画

---

## 2. 左侧列表面板

### 2.1 面板容器

| 属性 | 值 |
|------|------|
| 宽度 | 220px 固定 |
| 右边框 | 1px solid var(--border) |
| 背景 | var(--bg-deep) |
| 溢出 | overflow-y: auto（列表超出时可滚动） |

### 2.2 列表项

每个列表项高度 48px，内部布局：

```
┌─ 48px ────────────────────────────────┐
│ ● Terminal Name             [X]       │
│   ~/projects/muxvo                    │
└───────────────────────────────────────┘
```

| 元素 | 样式 |
|------|------|
| 状态指示点 | 6px 圆点，颜色/动画与 Tiling 模式一致（见 `06-visual-effects.md`） |
| 终端名称 | 优先显示自定义名，fallback 为 CWD 最后一级目录名；font-size 12px, font-weight 600, font-family var(--font-mono) |
| CWD 路径 | 缩短为 `~/...` 格式；font-size 10px, color var(--text-secondary), font-family var(--font-mono) |
| 关闭按钮 | X 图标，仅 hover 时显示于项右侧；点击关闭该终端 |

**注意**：列表项直接渲染终端信息，不复用 TerminalTile 组件。

### 2.3 选中项样式

| 属性 | 值 |
|------|------|
| 左边框 | 3px solid var(--accent)（琥珀色） |
| 背景 | rgba(232, 167, 72, 0.08) |

### 2.4 WaitingInput 列表项

| 属性 | 值 |
|------|------|
| 背景动画 | 红色脉动，2.5s 循环（与 Tile `borderGlow` 同节奏） |
| 左边框（选中时） | 3px solid #ef4444（红色替代琥珀色） |
| 状态点 | 红色 + statusPulse 1s 动画 |

### 2.5 新建终端按钮

- 位于列表底部，固定显示
- 文案：`+  新建终端`（i18n）
- hover 时背景高亮
- 终端数达上限（20）时禁用灰显（disabled + opacity 0.35）

---

## 3. 右侧终端区域

### 3.1 顶部 Header

与 Tiling 模式 Tile Header 一致的信息展示：

```
┌─────────────────────────────────────────────┐
│ ● Terminal Name  ~/projects/muxvo           │
└─────────────────────────────────────────────┘
```

| 元素 | 说明 |
|------|------|
| 状态点 | 同列表项，与进程状态同步 |
| 终端名称 | 自定义名 > CWD 最后一级 |
| CWD 路径 | 完整缩短路径，可点击打开 CwdPicker |

### 3.2 终端全屏显示

- XTermRenderer 渲染区域占满右侧剩余空间
- 支持完整交互：输入、搜索（Cmd+F）、文件拖拽、缩放

### 3.3 多终端挂载策略（关键设计）

**所有终端实例保持挂载，不随切换而销毁/重建。** 非选中终端用 `visibility: hidden` 隐藏：

```css
/* 选中终端 */
.list-terminal--active {
  position: relative;
  visibility: visible;
}

/* 非选中终端 */
.list-terminal--hidden {
  position: absolute;
  visibility: hidden;
}
```

**设计理由**：
- 切换时不丢失 xterm buffer 内容和滚动位置
- 避免 XTermRenderer 重建导致的 buffer 回放延迟
- 与 Focused 模式的 `focus-cell--hidden` 策略一致

---

## 4. 前端组件设计

### 4.1 TerminalListView.tsx（新组件）

`TerminalListView` 是 List 模式的顶层组件，由 `TerminalGrid` 在 `viewMode === 'List'` 时渲染：

```
TerminalGrid (viewMode='List')
└── TerminalListView
    ├── ListPanel（左侧 220px）
    │   ├── ListItem × N（直接渲染，不复用 TerminalTile）
    │   └── CreateButton
    └── TerminalDisplayArea（右侧剩余空间）
        ├── Header（当前选中终端信息）
        └── XTermRenderer × N（所有终端保持挂载）
            ├── .list-terminal--active（选中的）
            └── .list-terminal--hidden × (N-1)（非选中的）
```

### 4.2 左侧列表面板

- 直接渲染终端列表项（状态点 + 名称 + CWD + 关闭按钮）
- **不复用 TerminalTile 组件**，避免引入 Tile 的 header/拖拽/双击等不需要的逻辑
- 列表项仅包含选中、hover、关闭、重命名交互

### 4.3 右侧终端区域

- 复用 `XTermRenderer` 组件渲染所有终端
- 所有终端 XTermRenderer 同时挂载在 DOM 中
- 通过 `visibility: hidden` + `position: absolute` 切换可见性
- 非选中终端不触发 fit、不发送 PTY resize

---

## 5. 交互操作

### 5.1 选中终端

| 操作 | 动作 | 系统反馈 |
|------|------|---------|
| 点击列表项 | 右侧切换到对应终端 | 列表项高亮变化，终端 visibility 切换 |
| 前置条件 | 列表中存在至少 1 个终端 | — |
| 异常处理 | 目标终端已被关闭 | 自动选中下一个可用终端 |

切换时滚动位置保持（visibility 切换不触发 ResizeObserver，不触发 fit）。

### 5.2 重命名终端

| 操作 | 动作 | 系统反馈 |
|------|------|---------|
| 双击列表项名称 | 进入编辑模式 | span 替换为 input，显示当前名称 |
| Enter | 确认名称 | input 替换回 span，名称更新 |
| Escape | 取消编辑 | 恢复原名称 |
| blur（点击其他区域） | 确认名称 | 同 Enter |

编辑时点击事件不冒泡到列表项（防止触发选中切换）。

### 5.3 关闭终端

| 操作 | 动作 | 系统反馈 |
|------|------|---------|
| hover 列表项 → 点击 X 按钮 | 发起关闭 | — |
| 无进程运行 | 直接关闭 | 从列表中移除 |
| 有进程运行 | 弹出 CloseConfirmDialog | 用户选择取消或强制关闭 |
| 关闭后 | 自动选中下一个终端 | 如无下一个则选中上一个；全部关闭则显示空状态 |

### 5.4 新建终端

| 操作 | 动作 | 系统反馈 |
|------|------|---------|
| 点击底部 "+" 按钮 | 创建新终端 | 新终端出现在列表底部，自动选中 |
| 前置条件 | 终端数未达上限（20） | — |
| 异常处理 | 已达上限 | 按钮禁用灰显 |

---

## 6. 前端状态管理

### 6.1 核心状态

| 状态 | 类型 | 说明 |
|------|------|------|
| `listSelectedId` | `string \| null` | 列表当前选中终端 ID，**独立于 `focusedId` 和 `selectedId`** |
| `viewMode` | `'Tiling' \| 'List'` | 持久化到 config（不存 `'Focused'`，Focused 是从 Tiling 临时进入） |

### 6.2 listSelectedId 独立性

`listSelectedId` 是 List 模式专用状态，与其他模式的选中状态互不干扰：

| 状态 | 用于模式 | 说明 |
|------|---------|------|
| `selectedId` | Tiling | Tiling 模式下单击选中的 Tile |
| `focusedId` | Focused | Focused 模式下的主终端 |
| `listSelectedId` | List | List 模式下左侧列表选中项 |

### 6.3 状态流转规则

| 事件 | 状态变化 |
|------|---------|
| 进入 List 模式 | `focusedId` 设为 `null`；如 `listSelectedId` 为空，自动选中第一个终端 |
| 点击列表项 | `listSelectedId` 更新为目标 ID |
| 当前选中终端被关闭 | 自动选中下一个（或上一个，如已是最后一个） |
| 从 List 切回 Tiling | `listSelectedId` 保留（下次回到 List 时恢复选中） |
| 新建终端 | `listSelectedId` 更新为新终端 ID |

### 6.4 自动选中逻辑

| 场景 | 行为 |
|------|------|
| 首次进入 List 模式（listSelectedId 为 null） | 自动选中终端列表中的第一个 |
| 关闭当前选中终端 | 自动选中下一个；如果关闭的是最后一个，选中前一个 |
| 所有终端关闭 | listSelectedId 设为 null，显示空状态 |

### 6.5 viewMode 持久化

```typescript
// config 中只存 'Tiling' | 'List'
// 'Focused' 是 Tiling 模式下的临时叠加状态，不持久化
interface AppConfig {
  terminal: {
    defaultViewMode: 'Tiling' | 'List';
    // ...
  };
}
```

持久化通过 `window.api.app.saveConfig()` 实现（IPC 接口不变）。

---

## 7. 空状态

当无终端时，右侧区域显示：

```
┌─────────────────────────────────────────┐
│                                         │
│              暂无终端                    │
│              [ + ]                       │
│                                         │
└─────────────────────────────────────────┘
```

| 元素 | 样式 |
|------|------|
| 文案 | i18n `terminal.noTerminals`，font-size 13px, color var(--text-secondary) |
| 创建按钮 | 居中 "+" 按钮，样式同 Tiling 模式 FAB |

左侧列表面板同时也显示空列表 + 底部 "+" 按钮。

---

## 8. Light 主题适配

| 元素 | Dark 值 | Light 值 |
|------|---------|---------|
| 选中项背景 | rgba(232, 167, 72, 0.08) | rgba(196, 132, 42, 0.10) |
| 选中项左边框 | var(--accent) | var(--accent)（同色，无需覆写） |
| WaitingInput 脉动背景 | rgba(239, 68, 68, 0.08~0.15) | rgba(239, 68, 68, 0.06~0.12) |
| 面板边框 | var(--border) | var(--border)（通过 CSS variable 自动适配） |

---

## 9. 与其他模块的关系

| 依赖模块 | 关系 |
|---------|------|
| `01-terminal-lifecycle` | 复用终端创建/关闭/状态跟踪/命名全部逻辑 |
| `05-xterm-rendering` | 右侧区域内嵌 XTermRenderer 组件 |
| `06-visual-effects` | 状态指示点颜色/动画、WaitingInput 脉动样式 |
| `08-settings-shortcuts` | viewMode 切换入口在 Settings 面板 |
