# A2. 偏好设置完整清单（25 项）

> 本附录汇总 Muxvo 所有用户可配置的偏好。每项给出：默认值 / 类型 / 用户可见效果 / 详细描述所在模块。

> 详细用户体验描述见 [M14 ONBOARD_PREFS](../modules/M14_ONBOARD_PREFS.md)

---

## 1. 常规设置（5 项）

| # | 偏好 | 默认值 | 类型 | 用户可见效果 | 详细位置 |
|---|---|---|---|---|---|
| 1 | `startupTerminalCount` | 1 | 数字 1-20 | 首次启动自动创建的终端数量 | [M14-REQ-ONBOARD_PREFS-008] |
| 2 | `doubleClickToFocus` | false | 布尔 | 双击终端 Tile 是否进入聚焦模式 | [M14-REQ-ONBOARD_PREFS-009] |
| 3 | `defaultTerminalCwd` | `$HOME` | 路径 | 新建终端的默认工作目录 | [M14-REQ-ONBOARD_PREFS-010] |
| 4 | `dockBadgeMode` | `realtime` | 枚举 off/realtime/timed | macOS Dock 角标显示模式 | [M14-REQ-ONBOARD_PREFS-011] |
| 5 | `dockBadgeIntervalMin` | 5 | 数字 ≥1 分钟 | timed 模式下的检查间隔 | [M14-REQ-ONBOARD_PREFS-012] |

---

## 2. 外观设置（3 项）

| # | 偏好 | 默认值 | 类型 | 用户可见效果 | 详细位置 |
|---|---|---|---|---|---|
| 6 | `theme` | `dark` | 枚举 dark/light | 全局 UI 主题切换 | [M14-REQ-ONBOARD_PREFS-013] |
| 7 | `zoomLevel` | 0 | 数字 -5 到 +10 | 界面整体缩放（每级 10%） | [M14-REQ-ONBOARD_PREFS-014] |
| 8 | `fontSize` | 14 | 数字 | 全局字体大小 | [M14-REQ-ONBOARD_PREFS-015] |

---

## 3. 终端样式（5 项）

| # | 偏好 | 默认值 | 类型 | 用户可见效果 | 详细位置 |
|---|---|---|---|---|---|
| 9 | `terminal.themeName` | `dark` | 枚举 | 终端色彩主题（dark/light/monokai/dracula/solarized-dark） | [M14-REQ-ONBOARD_PREFS-016] |
| 10 | `terminal.fontFamily` | 系统等宽 | 字符串 | 终端字体 | [M14-REQ-ONBOARD_PREFS-017] |
| 11 | `terminal.fontSize` | 14 | 数字 | 终端字号（独立于全局字号） | [M14-REQ-ONBOARD_PREFS-018] |
| 12 | `terminal.cursorStyle` | `block` | 枚举 block/underline/bar | 光标形状 | [M14-REQ-ONBOARD_PREFS-019] |
| 13 | `terminal.cursorBlink` | true | 布尔 | 光标闪烁开关 | [M14-REQ-ONBOARD_PREFS-020] |

**注**：M14 标注这 5 项终端样式在当前 SettingsModal 中未暴露 UI 入口，仅通过偏好记忆生效。**待确认**：首发是否补齐 UI。

---

## 4. 窗口与布局（4 项）

| # | 偏好 | 默认值 | 类型 | 用户可见效果 | 详细位置 |
|---|---|---|---|---|---|
| 14 | `window.{width,height,x,y}` | 自动 | 数字 | 主窗口位置和大小（启动恢复） | [M14-REQ-ONBOARD_PREFS-021] |
| 15 | `gridLayout` | 自动均分 | 复杂对象 | 终端网格的分割比例 | [M14-REQ-ONBOARD_PREFS-022] |
| 16 | `ftvLeftWidth` | 200 | 数字 80-700 | 文件三栏视图的左栏宽度 | [M14-REQ-ONBOARD_PREFS-023] |
| 17 | `ftvRightWidth` | 280 | 数字 80-700 | 文件三栏视图的右栏宽度 | [M14-REQ-ONBOARD_PREFS-023] |

---

## 5. 文件面板（1 项）

| # | 偏好 | 默认值 | 类型 | 用户可见效果 | 详细位置 |
|---|---|---|---|---|---|
| 18 | `showHiddenFiles` | false | 布尔 | 文件面板是否显示以 `.` 开头的隐藏文件 | [M14-REQ-ONBOARD_PREFS-024] |

---

## 6. 工作区（3 项）

| # | 偏好 | 默认值 | 类型 | 用户可见效果 | 详细位置 |
|---|---|---|---|---|---|
| 19 | `savedWorkspaces` | `[]` | 数组 ≤10 | 用户保存的工作区快照列表 | [M14-REQ-ONBOARD_PREFS-025] |
| 20 | —（同上） | —  | — | 工作区加载 | [M14-REQ-ONBOARD_PREFS-026] |
| 21 | —（同上） | — | — | 工作区删除 | [M14-REQ-ONBOARD_PREFS-027] |
| 22 | `sessionCustomTitles` | `{}` | 映射 | 会话自定义标题 | [M14-REQ-ONBOARD_PREFS-028] |

---

## 7. 语言与状态（3 项）

| # | 偏好 | 默认值 | 类型 | 用户可见效果 | 详细位置 |
|---|---|---|---|---|---|
| 23 | `language` | 跟随系统 | 枚举 zh/en | UI 语言切换 | [M14-REQ-ONBOARD_PREFS-029] |
| 24 | `tourCompleted` | false | 布尔 | 是否已完成新手引导（决定下次启动是否展示 Tour） | [M14-REQ-ONBOARD_PREFS-030] |
| 25 | `lastSeenVersion` | "" | 字符串 | 上次查看的应用版本（决定是否展示 What's New） | [M14-REQ-ONBOARD_PREFS-031] |

---

## 8. 偏好的通用行为

- **持久化**：所有偏好都会保存，下次启动恢复
- **即时生效**：大部分偏好修改后立即生效，无需重启
- **需重启的例外**：`language`（语言切换）可能需要重新进入主界面；`theme` 立即生效
- **重置**：M14 提到"重置所有偏好"入口在代码中未实现，**待确认**首发是否提供

---

## 9. 偏好冲突与关系

- `fontSize`（全局）vs `terminal.fontSize`（终端专用）：两者独立，终端字号不继承全局
- `zoomLevel`（整体缩放）影响所有界面，不改变 `fontSize`
- `dockBadgeMode = off` 时，`dockBadgeIntervalMin` 无意义（但值仍保留）
- `theme` 影响 UI，`terminal.themeName` 影响终端区域，两者独立

---

## 10. 明确不做的偏好

以下常见偏好在本次 PRD 中明确**不做**：
- 自定义快捷键
- 自定义主题（配色方案编辑）
- 终端背景图片
- 鼠标滚轮速度
- 拼写检查开关
- 自动备份频率（数据备份归 M14/M15）
