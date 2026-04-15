# PRD 写作风格指南

> 本文件在 Batch 1 结束后冻结，后续批次必须对齐。

---

## 1. 核心原则

**一句话总结**：只描述"用户能看到/操作/感受"的一切，屏蔽任何"怎么实现"。

一条 REQ 如果删掉"实现方式"后就不成立，说明它本身不是用户需求，是技术决策，应该删除。

---

## 2. 技术词黑名单

以下词在 PRD 正文中**零出现**。Writer 交付前必须自扫。

### 2.1 架构/通信词
```
IPC · channel · emit · dispatch · reducer · listener · 监听器
event bus · 事件总线 · pub/sub · subscribe · publisher
socket · WebSocket · HTTP · REST · API · endpoint · DTO
protocol · 协议 · binary · payload
```

### 2.2 系统/运行时词
```
process · 进程 · thread · 线程 · mutex · lock · 锁
spawn · fork · signal · SIGTERM · SIGKILL · exec
pty · xterm · shell · bash · zsh
buffer · stream · pipe · 管道
memory · 内存 · heap · stack · GC
```

### 2.3 数据/存储词
```
schema · table · column · row · index · 索引
database · sqlite · redis · cache
json · yaml · toml · xml · parser · serialize
DTO · model · entity · ORM
文件系统 · filesystem · inode · vnode
```

### 2.4 技术选型词
```
Rust · Electron · Tauri · React · Vue · Dioxus · Preact
Node.js · npm · cargo · vite · webpack
FFI · binding · wrapper · shim
backend · frontend · fullstack · 后端 · 前端
```

### 2.5 权限/安全词（部分）
```
token · JWT · OAuth · session · cookie · CSRF
sandbox · capability · seccomp · permission system
```

### 2.6 状态机术语
```
state machine · 状态机 · finite state · FSM
reducer · action · mutation · store
side effect · pure function
```

### 2.7 具体路径/配置
```
~/.claude/ · ~/.muxvo/ · /tmp/ · %APPDATA%
ENV_VAR · process.env · NODE_ENV
config.json · settings.json · preferences.json
.env · dotenv
```

---

## 3. 白名单（可以用的产品语言）

这些是**产品名词**，不是技术词，保留使用：

```
Skill · MCP · Hook · Plugin · Claude · Muxvo · Codex · Gemini CLI
终端 · 聊天历史 · 会话 · 项目 · 工作区 · 偏好设置
```

---

## 4. 替换规则（常见错译）

| ❌ 禁用 | ✓ 改写为 |
|---|---|
| "调用 API" | "用户看到数据刷新" |
| "监听文件变化" | "文件变化时用户会看到提示" |
| "状态机切换到 waiting" | "终端进入等待状态（用户看到黄色点）" |
| "IPC channel 传递消息" | "主界面与终端之间的数据同步" |
| "存到 sqlite" | "数据会被保留，下次打开仍可见" |
| "OAuth 登录" | "使用 GitHub 账号登录" |
| "异步加载" | "列表逐条出现" |
| "缓存失效" | "数据过期后会自动刷新" |
| "parse 失败" | "文件内容无法识别，显示降级提示" |
| "默认值存储在 config.json" | "偏好设置的默认值见附录 A2" |

---

## 5. 文案口吻

### 5.1 主语
- 规范描述用**"用户"**（第三人称）
- 旅程 §6 可用**"你"**（第二人称，增加代入感）
- 禁止用"我"或"系统"（"系统"会诱发技术描述）

### 5.2 动词白名单
优先使用这些动词：
```
点击 · 选择 · 查看 · 打开 · 关闭 · 保存 · 撤销
拖拽 · 双击 · 长按 · 滚动 · 输入 · 粘贴
进入 · 退出 · 切换 · 返回 · 跳转
显示 · 出现 · 消失 · 闪烁 · 高亮 · 滑出
```

### 5.3 禁止模糊词
```
"合理地" · "适当地" · "智能地" · "友好地"
"快速响应" · "高性能" · "可扩展"
```
改用具体描述："3 秒内"/"不超过 100 条"/"最多同时 10 个"。

### 5.4 文案示例格式
所有文案示例用区块引用 + 明确语境：

> 空态文案："还没有创建终端，按 ⌘T 开始。"
> 错误对话框标题："终端关闭失败"
> 错误对话框正文："终端内有正在运行的进程，是否强制关闭？"
> 按钮："强制关闭" / "取消"

---

## 6. ID 命名规则

### 6.1 格式

| 类型 | 格式 | 示例 |
|---|---|---|
| 用户故事 | `US-<CODE>-NNN` | `US-TERM_LIFECYCLE-001` |
| 需求条目 | `REQ-<CODE>-NNN` | `REQ-TERM_GRID-015` |
| 跨模块引用 | `[M??-REQ-NNN]` | `[M02-REQ-015]` |

### 6.2 规则
- `NNN` 三位数字，补零（001 而非 1）
- 同模块内**递增无跳号**
- 跨模块引用**必须指向已存在的 ID**
- 代号用全大写下划线分隔（`TERM_LIFECYCLE`）

### 6.3 代号 ↔ 模块号对照

| 模块号 | 代号 | 中文名 |
|---|---|---|
| M01 | TERM_LIFECYCLE | 终端生命周期 |
| M02 | TERM_GRID | 终端网格布局 |
| M03 | TERM_FOCUS | 终端聚焦模式 |
| M04 | TERM_NOTIFY | 等待输入通知 |
| M05 | EDITOR_INPUT | 编辑器输入与草稿 |
| M06 | EDITOR_ATTACH | 编辑器附件与图片粘贴 |
| M07 | EDITOR_SEND | 输入发送与协议 |
| M08 | CHAT_BROWSE | 聊天历史浏览 |
| M09 | CHAT_SEARCH | 聊天搜索与筛选 |
| M10 | CHAT_SYNC | 聊天同步与导出 |
| M11 | FILE_PANEL | 文件面板 |
| M12 | FILE_VIEWER | 文件三栏临时视图 |
| M13 | CONFIG_MGMT | Claude 配置管理 |
| M14 | ONBOARD_PREFS | 首次引导与偏好设置 |
| M15 | APP_RELIABILITY | 应用生命周期与异常 |

---

## 7. 五态必写规则

每个"页面/面板"都必须描述 5 种状态。不要省略任何一种：

1. **空态**：用户从未有过数据 / 全新安装
2. **加载态**：数据正在获取
3. **正常态**：有内容、能操作
4. **错误态**：数据加载失败 / 操作失败
5. **受限态**：权限不足 / 功能被禁用 / 需要先做某事

如果某个状态对本模块不适用，**写"不适用 + 理由"**，不得删除。

---

## 8. 行数纪律

- 每个 M??.md 落在**预算 ±15%** 区间
- 不足：说明覆盖不完整，必须补细节
- 超过：说明有废话或技术泄漏，必须精简
- `wc -l docs/PRD_rewrite/modules/*.md` 自查

---

## 9. 自检三问（提交前必答）

1. **技术词零泄漏？** grep 黑名单 60 词零命中
2. **覆盖用户全路径？** 首次 / 主路径 / 异常 / 退出 四类都有故事
3. **代码里能看到的每个 UI 元素都写进 PRD 了？** 文案 / 按钮 / 状态 / 边界数值无遗漏

三问任一"否"：返工，不得提交。
