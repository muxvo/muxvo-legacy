# 模块 08：设置与快捷键 — 前端配置管理

> **所属 PRD**：Muxvo 终端 Tab — 前端 UI 重写
> **模块**：设置与快捷键

> **范围声明**：本模块仅涉及前端 UI 层。设置持久化通过 `app:saveConfig` IPC 调用（接口不变），后端存储逻辑不在重写范围内。

---

## 1. 视图模式设置

### 1.1 概述

| 属性 | 说明 |
|------|------|
| 位置 | Settings Modal → 通用 section |
| 控件 | 切换按钮组（Button Group）：Tiling / List |
| 持久化 | `config.terminal.defaultViewMode`（通过 `app:saveConfig` IPC，接口不变） |
| 生效方式 | 切换后立即生效 |

### 1.2 交互规格

| 操作 | 系统反馈 |
|------|---------|
| 选择 Tiling | 立即切换到 Tiling 模式 + 写入 config |
| 选择 List | 立即切换到 List 模式 + 重置 `focusedId = null` + 写入 config |

**说明**：Focused 不是默认视图模式（只能通过双击 Tile 或点击最大化按钮进入），因此不出现在设置选项中。

### 1.3 异常处理

| 异常场景 | 处理 |
|---------|------|
| config 写入失败 | UI 仍切换（内存态已更新），下次启动回退到旧值 |
| 切换时有终端正在输出 | 不影响输出流，仅改变布局 |

---

## 2. 终端配置

### 2.1 配置项清单

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `themeName` | `string` | `'dark'` | 终端颜色主题 |
| `fontSize` | `number` | `14` | 字体大小（px） |
| `fontFamily` | `string` | `'Menlo, monospace'` | 字体族 |
| `cursorStyle` | `string` | `'block'` | 光标样式 |
| `cursorBlink` | `boolean` | `true` | 光标闪烁 |
| `startupTerminals` | `number` | `1` | 启动时自动创建的终端数 |
| `defaultViewMode` | `string` | `'Tiling'` | 默认视图模式 |

### 2.2 cursorStyle 可选值

| 值 | 视觉效果 |
|-----|---------|
| `'block'` | 实心方块覆盖字符 |
| `'underline'` | 字符下方横线 |
| `'bar'` | 字符左侧竖线 |

### 2.3 持久化与生效

| 项目 | 说明 |
|------|------|
| 存储位置 | App config（通过 `app:saveConfig` IPC，接口不变） |
| 写入方式 | 原子写入（tmp + rename），由后端提供，不在重写范围 |
| 生效方式 | 修改后实时应用到所有已打开的终端 |
| 通知机制 | Dispatch `muxvo:theme-change` 等自定义事件 |

### 2.4 异常处理

| 异常场景 | 处理 |
|---------|------|
| fontSize 超出范围 | 限制在 [8, 32] 区间 |
| fontFamily 不存在 | 浏览器自动 fallback 到 monospace |
| config 文件损坏 | 使用默认值初始化（由后端处理，不在重写范围） |

---

## 3. 主题切换

### 3.1 切换流程

```
用户在 Settings 切换 dark/light
  → 更新 App 主题
  → Dispatch muxvo:theme-change { theme: 'dark' | 'light' }
  → 所有 XTermRenderer 监听事件
  → 应用对应终端颜色方案
```

### 3.2 终端主题跟随规则

| 项目 | 说明 |
|------|------|
| 跟随策略 | 终端主题始终跟随 UI 主题 |
| 事件通道 | `muxvo:theme-change` CustomEvent |
| 监听方 | 所有 XTermRenderer 实例 |
| 应用方式 | 更新 xterm.js 的 `theme` option |

---

## 4. 引导重启

| 项目 | 说明 |
|------|------|
| 入口 | Settings → 帮助 section → "重新开始引导" 按钮 |
| 操作流程 | 点击按钮 → 关闭 Settings Modal → 延迟 100ms → dispatch `START_TOUR` |
| 100ms 延迟原因 | 等待 Settings Modal 完全关闭，避免 overlay 层叠冲突 |
| 参考模块 | `07-onboarding-tour.md` 第 5 节 |

---

## 5. 键盘快捷键

### 5.1 快捷键汇总

| 快捷键 | 作用域 | 功能 | 前置条件 |
|--------|--------|------|---------|
| `Esc` | 聚焦模式（焦点不在 xterm 时） | 退出聚焦模式，回到 Tiling 或 List | 当前处于 Focused 视图 |
| `Cmd/Ctrl+F` | 终端内 | 切换搜索栏显示/隐藏 | 终端已获得焦点 |
| `Cmd/Ctrl+= (+)` | 终端内 | 全局字体放大 | 终端已获得焦点 |
| `Cmd/Ctrl+-` | 终端内 | 全局字体缩小 | 终端已获得焦点 |
| `Cmd/Ctrl+0` | 终端内 | 重置缩放到默认值 | 终端已获得焦点 |
| 双击 Tile | Tiling 模式 | 进入聚焦模式 | 当前处于 Tiling 视图 |
| 双击名称 | 列表项 / Tile header | 进入重命名编辑 | 名称区域可见 |

### 5.2 Esc 退出聚焦规格

| 项目 | 说明 |
|------|------|
| 触发条件 | `viewMode === 'Focused'` 且焦点不在 xterm 元素内 |
| 操作 | 按下 Esc |
| 系统反馈 | 退出聚焦模式，回到进入前的视图（Tiling 或 List） |
| 焦点在 xterm 时 | Esc 由 xterm.js 消费（如退出 vim 模式），不触发退出聚焦 |

### 5.3 搜索栏快捷键

| 项目 | 说明 |
|------|------|
| 触发条件 | 终端已获得焦点 |
| `Cmd/Ctrl+F` | 打开搜索栏（已打开时关闭） |
| 搜索栏内 `Enter` | 搜索下一个 |
| 搜索栏内 `Shift+Enter` | 搜索上一个 |
| 搜索栏内 `Esc` | 关闭搜索栏 |

---

## 6. 缩放实现

### 6.1 事件流

```
终端内 Cmd+/-/0
  → XTermRenderer 捕获按键
  → Dispatch muxvo:global-zoom-request { direction: 'in' | 'out' | 'reset' }
  → App 层监听
  → 调整全局字体大小（config.terminal.fontSize）
  → Dispatch muxvo:global-zoom
  → 所有 XTermRenderer 监听
  → 调用 fitAddon.fit() 重新计算 cols/rows
```

### 6.2 缩放参数

| 参数 | 值 |
|------|-----|
| 最小字体 | 8px |
| 最大字体 | 32px |
| 每次增量 | 1px |
| 重置目标 | config 中的 `fontSize` 默认值（14px） |

### 6.3 缩放方向

| 快捷键 | direction | 效果 |
|--------|-----------|------|
| `Cmd/Ctrl+=` | `'in'` | fontSize += 1（不超过 32） |
| `Cmd/Ctrl+-` | `'out'` | fontSize -= 1（不低于 8） |
| `Cmd/Ctrl+0` | `'reset'` | fontSize = 默认值 |

### 6.4 全局生效

缩放为全局行为：一个终端内触发 → 所有终端统一调整。原因：

- 避免不同终端字体大小不一致造成视觉混乱
- 用户预期是"调整应用的终端字体大小"而非"调整某个终端的字体大小"

---

## 7. 前端改动

### 7.1 SettingsModal.tsx 改动

| 改动点 | 说明 |
|--------|------|
| 新增 props | `viewMode: 'Tiling' \| 'List'`、`onViewModeChange: (mode: 'Tiling' \| 'List') => void` |
| 视图模式切换 UI | 按钮组（Button Group）：Tiling / List，位于通用 section |
| 切换行为 | 选中后调用 `onViewModeChange(mode)` → 父组件更新 viewMode + 持久化 |

### 7.2 视图模式切换 UI 规格

| 项目 | 说明 |
|------|------|
| 控件类型 | 按钮组（两个互斥按钮） |
| 选项 | Tiling（平铺）/ List（列表） |
| 选中态 | 琥珀色背景 + 白色文字 |
| 未选中态 | 透明背景 + 灰色文字 |
| 位置 | Settings Modal → 通用 section → 视图模式行 |

### 7.3 新增 i18n Key

| Key | 中文 | English |
|-----|------|---------|
| `settings.viewMode` | 视图模式 | View Mode |
| `settings.viewModeDesc` | 选择终端的默认显示模式 | Choose the default display mode for terminals |
| `settings.viewModeTiling` | 平铺 | Tiling |
| `settings.viewModeList` | 列表 | List |
