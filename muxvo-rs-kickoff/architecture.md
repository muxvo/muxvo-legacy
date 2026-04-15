# Muxvo Rust Native 架构蓝本（V1 开工版）

> 范围：Muxvo V1，15 模块 / 449 REQ / 214 US。V2 Skill Marketplace 不在本蓝本。
>
> 前提：团队人员充沛；追求极致效果；**全新项目、零旧包袱**；不保留老 Electron/Tauri 代码。
>
> 本文件是开工蓝本。所有技术决策已定版，不再辩论；所有"候选对比"已移出到项目决策日志。

---

## 0. Context

### 0.1 为什么要从零做一遍

老版本（无论 Electron 还是 Tauri）在生产上暴露结构性问题：WebView 文本栈扛不住 20 路并发终端的渲染节奏（幽灵行 / 撕裂 / reflow jank）；6 个终端空闲 RSS 已经 1–2 GB；IPC 60+ channel 横跨 main/renderer 难以维护；dev/prod 数据目录串台导致过真实数据事故；终端渲染 bug 多次"修好了又回来"。WebView 是问题的根源，在壳上修补救不了。

### 0.2 新产品的目标

用 Rust 原生 GPU 渲染栈重建 Muxvo，目标是**Zed/Ghostty 同级性能** + **Lapce 级工程可扩展性**，具备：

- 20 路终端并发 @ 60 FPS 稳定（M 系列 / Linux Wayland / Windows 11）
- 20 终端空闲 RSS ≤ 350 MB，1M scrollback 上限 ≤ 900 MB
- 冷启动 ≤ 250 ms（M 系列）/ ≤ 600 ms（x86_64 中端）
- 崩溃可证恢复；graceful vs abnormal 严格区分
- V2 Skill Marketplace 可作为 plugin 接入而不动内核

### 0.3 三条绝对约束

1. **零旧包袱** — 新仓库、新代码、新依赖树；老 Muxvo 的任何代码、架构、命名、IPC channel 定义**一律不继承**。老仓库归档只读。
2. **追求极致** — 在性能、可扩展性、可维护性、可测试性任意一个维度上，拒绝"差不多就行"的妥协。每条决策的优先级：正确性 > 可维护性 > 性能 > 开发速度。
3. **人力充沛** — 9 人架构委员会 + 多条并行工程支线。不做"因为人少所以妥协"式的决策。

---

## 1. 9 人架构委员会

| 席位 | 角色 | 职责域 |
|---|---|---|
| **A1** | Chief Architect | 全局一致性、跨层仲裁、本蓝本维护者 |
| **A2** | Rendering Lead | GPUI vendor、cosmic-text 字形管线、damage tracking、glyph atlas |
| **A3** | Terminal Core Lead | `alacritty_terminal` 封装、VT 解析、OSC 7/133、scrollback 内存模型 |
| **A4** | Runtime Lead | 进程/线程模型、tokio 调度、主线程协议、PTY 事件流 |
| **A5** | Domain Lead | Crate 拓扑、bounded context、seam 类型、总线 3 原语 |
| **A6** | Extensibility Lead | Plugin WIT ABI、CLI 适配、SendStrategy、WaitDetector 设计 |
| **A7** | Data Lead | 存储引擎、FTS 索引、schema 版本化、迁移 |
| **A8** | Platform Lead | PTY / 信号 / Dock / 通知 / IME / HiDPI / 代码签名公证 |
| **A9** | Reliability Lead | 崩溃恢复、原子写纪律、可观测性、time budget |

委员会下辖工程支线（动态 scope）：UI 支线 / 终端支线 / 编辑器支线 / 聊天支线 / 平台支线 / 插件支线 / QA-Bench 支线。

---

## 2. 技术栈（已定版，不再争论）

### 2.1 UI 框架：GPUI（vendored from Zed）

**选定理由（committed）：**

1. **唯一有真实生产背书的"高密度文本面"Rust 框架**。Zed 的多 buffer + AI 流式 + 文件树 + 终端面板在 M 系列上已验证类似 Muxvo 的负载形态。Floem/iced/egui 均无等量级公开案例。
2. **追求极致效果**的前提下，raw 渲染上限优先级最高——GPUI 的 retained scene graph + damage tracking + 集成 frame loop 的 async executor 是 Zed 为自身工作台场景打磨出来的。
3. **macOS 平台尾巴已被 Zed 用真金白银抛光过**：IME 候选窗、焦点切换、HiDPI、多显示器、Dock 集成。这些坑 Floem（基于 winit）和 iced（同上）没踩平。
4. **人力充沛背景下**，GPUI 的两个真实成本都可吸收：
   - Editor 原语要自建（Floem editor_core 省不下来的那 2–3 周）
   - Terminal view 层要 clean-room 自写（见 2.2、§2.9）

**Vendor 策略：**

- `third_party/gpui/` 存放 vendored 源码，pin 到固定 commit
- 本地维护 `third_party/gpui-patches/` 补丁队列
- 上游升级走单独 PR，必须过 5 个 bench + L1/L2/L3 全绿 + 手动 golden path 验证才合入
- `Cargo.toml` 用 `path = "third_party/gpui"` 依赖；不从 crates.io / git URL 直接拉

### 2.2 License 纪律

GPUI 本体 Apache 2.0 / MIT，可随意使用。**但 Zed 仓库中以下模块是 GPL-3.0-or-later，严格禁入：**

- `crates/terminal`（终端 grid model 实现）
- `crates/terminal_view`（终端 UI 面板）
- `crates/multi_buffer`（多缓冲编辑器）
- Zed 主 app 本体

**执行纪律：**

1. **Clean-room 开发**：实现 Muxvo 终端 view 层的工程师**绝不阅读**上述 GPL 文件的源码；参考资料限制为 `alacritty_terminal` API 文档、Ghostty Apache 文档、公开论文、VT100.net 规范。Git history 留痕证明独立开发。
2. **Sprint 0 律所级 license 审计**：对 vendored GPUI 每个 crate 的 SPDX 标识做一次权威确认；建立白名单文件 `docs/license-audit.md`，列出允许进依赖树的 SPDX。
3. **CI `cargo deny` 白名单**：Apache-2.0 / MIT / BSD-2/3-Clause / ISC / Zlib / Unicode-DFS-2016 / CC0-1.0 允许；MPL-2.0 / LGPL 需单独评审；**GPL / AGPL 任何变种 一律拒绝**；任何 PR 引入黑名单依赖 CI 硬失败。
4. **第三方代码引入 checklist**：新加 dependency 或 vendored code 前，作者必须在 PR 描述填写 SPDX + license 文件路径 + 简要合规评估，reviewer 不过检查 merge 按钮不可点。

### 2.3 终端模拟器核心：`alacritty_terminal` + 自写 view

**选型：** `alacritty_terminal` crate 作 VT parser + grid model（Apache 2.0 / MIT，成熟度最高）。拒绝 libghostty（Zig 构建链污染 + view 耦合）、拒绝裸 vte（缺 grid 模型）。

**自写 view 层 `muxvo-term-view`（clean-room）：**

- 基于 GPUI 元素树 + wgpu instance buffer
- **Ring-buffer scrollback**（不用 alacritty 默认的 `VecDeque<Row>`）：
  - **Style 内联**：SGR 属性 run 存成 `(start, len, style_id)`，非 per-cell → 90% 压缩
  - **冷块 zstd**：视口 + 2 页外的行按 64 行块 zstd 压缩 → 6×
  - **Arc<[Cell]> COW**：滚动区域 bump Arc ref，不 memcpy
  - **默认 scrollback 10K 行 / 终端**，用户可调至 1M（ceiling）
- **OSC 7**：解析 `file://host/path`，URL 解码、UTF-8 校验，更新终端 cwd
- **OSC 133**：prompt 生命周期标记钩子，喂给 WaitDetector Layer 1（§2.9）
- **Kitty graphics protocol**：V1 仅此协议，Sixel 延后（CC/Codex/Gemini 均不发）
- **图像 / 附件路径**：M06 编辑器图片粘贴走独立管线（剪贴板 + `muxvo-fs-atomic`），不经终端图形协议

### 2.4 文本 / 字形管线

- **Shaping**：cosmic-text（BiDi / CJK / ligature 控制全覆盖；Zed / Lapce 双验证）
- **Rasterization**：swash
- **Glyph atlas**：**单个进程级 R8 单色 4096×4096 + RGBA8 emoji 2048×2048**，LRU 逐出；**跨所有终端 + 编辑器 + 文件查看器共享**；字体/尺寸变化才重建
- **Damage tracking**：每终端持 `DirtyRegions` bitset（按行）；PTY 写脏行 → 帧开始时 drain 到 GPU instance buffer；绝不每帧全重绘
- **60 FPS drag reflow 秘诀**：drag 过程中**不 reflow PTY grid**，只用 GPU affine transform 缩放已渲染纹理；drag 结束时统一发一次 `TIOCSWINSZ`。这是 Ghostty 思路，避免 prompt redraw 风暴。

### 2.5 进程 / 线程模型：单进程 + 分层 runtime

```
Main thread (GPUI event loop + wgpu submit)
   │ 从不阻塞，从不做 I/O
   ├─ Tokio PTY runtime (multi_thread, 2–4 workers)
   │    └─ 20 个 PTY read tasks，各自拥有 fd + bounded mpsc(256)
   └─ Rayon 后台池
        ├─ tantivy 索引
        ├─ 文件查看器解析（PDF / Excel）
        ├─ 图像解码
        └─ WaitDetector regex worker（§2.9 Layer 4）
```

**PTY → 帧路径：**

PTY task 读 chunk → `alacritty_terminal::Parser::advance` → 写入 per-terminal `parking_lot::Mutex<Grid>`（持锁 <1 ms） → 标脏行 → 通过 `AsyncAppContext::on_next_frame` 唤醒 GPUI → main 在 vsync 时 drain 脏行到 glyph instance buffer。**纯事件驱动，零轮询。**

**注册表：** `Arc<DashMap<TerminalId, Arc<TerminalState>>>`（20 并发 reader 不会在 RwLock 上竞争）。

### 2.6 多 CLI 适配：`CliAdapter` trait + `SendPlan` DSL

```rust
pub trait CliAdapter: Send + Sync {
    fn kind(&self) -> CliKind;
    fn detect(&self, probe: &DetectProbe) -> Detection;
    fn send_strategy(&self) -> &dyn SendStrategy;
    fn session_source(&self) -> Option<&dyn SessionSource>;
    fn wait_detector(&self) -> Box<dyn WaitDetector>;   // §2.9
}

pub trait SendStrategy: Send + Sync {
    fn encode(&self, intent: &SendIntent, ctx: &SendCtx) -> Result<SendPlan>;
}

/// SendPlan 是极小 DSL，表达"剪贴板 + 快捷键 + 写字节 + 等待"四种原语。
/// 让 Claude Code 的"图片粘贴"路径可表达，同时不让 editor-core 接触剪贴板权限。
pub enum SendStep {
    WriteBytes(Bytes),
    ClipboardSet(ClipPayload),
    KeyChord(KeyChord),
    SleepMs(u16),
}
pub struct SendPlan(pub SmallVec<[SendStep; 4]>);

pub trait SessionSource: Send + Sync {
    fn watch(&self, on_event: Box<dyn Fn(SessionEvent) + Send + Sync>) -> WatchHandle;
    fn scan_cold(&self, since: Option<i64>) -> BoxStream<'static, MessageEnvelope>;
}
```

**内置四个 adapter：**

- `ClaudeCodeAdapter` → send = `[ClipboardSet(Image), KeyChord(CmdV), WriteBytes(text), KeyChord(Enter)]`
- `CodexAdapter` → send = `[WriteBytes(json_line)]`
- `GeminiAdapter` → send = `[WriteBytes(text), KeyChord(Enter)]`
- `ShellAdapter` → send = `[WriteBytes(bytes)]`（null case）

V2 marketplace 新增 CLI = 新注册一个 `CliAdapter`，内核零改动。

### 2.7 消息总线：3 原语，零字符串类型

- **Typed pub-sub** — `Publisher<E> / Subscriber<E>`，每事件一个 `const TOPIC: &str`；背后 sharded `tokio::sync::broadcast`。用于 `TerminalOpened / DraftChanged / SessionAppended / PreferenceDelta / FilePanelCwdChanged / TerminalWaitStateChanged` 等 fire-and-forget。
- **Request/reply** — `Service<Req, Resp>` trait + `ServiceRegistry`，启动时强制单实现者。用于 `ResolveSendStrategy(CliKind) / LoadSession(SessionRef) / RenderMarkdown(Bytes)` 等需要答复的 case。
- **Actor mailboxes** — `TerminalActor / HistoryIndexerActor / WatchHubActor / PtySupervisorActor` 等长期状态持有者。外界发类型化 command，收类型化 event。**彻底消灭 `Arc<Mutex<World>>`**。

**总线纪律（CI 强制）：**

- 禁止 `serde_json::Value` / `HashMap<String, String>` 作为事件 payload
- 禁止跨 crate `pub use` 破边界（`cargo deny` + `xtask check-deps` 硬失败）
- 总线仅在进程内；远程 IPC 如未来需要是独立 adapter crate

### 2.8 插件系统：wasmtime + WIT（V1 小开口）

**技术选型：** wasmtime + WIT component model。拒绝 native dylib（无沙箱、ABI 漂移、V2 市场安全无救）；拒绝 Lua/Rhai（表达力不足）。

**V1 开放两类：**

1. **主题** — 声明式 TOML，无 wasm。
2. **Send strategy** — wasm 导出 `serialize(ctx, text, attachments) -> bytes`。让社区加 Aider / Cursor CLI。

**V1 内置（不走 plugin）：** file viewer 格式、CLI 适配器（CC/Codex/Gemini/Shell）、WaitDetector——先作为内置 crate 打入主分发，ABI 稳定后（V2）再转插件。

**ABI 版本化：** `muxvo:plugin@1.0` WIT 包 Sprint 4 末尾冻结；不同 major 版本可并存；host 拒绝加载 major 不匹配的插件。

**沙箱：** WASI preview2，manifest 声明能力 `fs.read = ["~/.claude/plugins/<id>/**"] / net = false / clock = true / env = ["LANG"]`。插件不能直触总线，host 把 WIT 调用翻译成类型化事件。

### 2.9 WaitDetector：M04 等待输入的 4 层分级（关键子系统）

**为什么关键：** "哪个 session 在等用户回答"是 Muxvo 区别于 iTerm / Ghostty 的核心 USP（[M04]）。**OSC 7 只解 CWD，不解 prompt 状态**——必须独立设计。

**Trait：**

```rust
pub trait WaitDetector: Send + Sync {
    /// Feed post-VT-parse lines. Edge-triggered, idempotent.
    fn ingest(&mut self, lines: &[Line], ts: Instant) -> WaitState;
    fn reset_on_user_input(&mut self);
}

pub enum WaitState { Running, Idle, WaitingInput }
```

每个 `CliAdapter` 实现自己的 `WaitDetector`，可叠加多层信号。

**四层分级（从最可靠到兜底）：**

1. **OSC 133 语义 prompt 标记** — `OSC 133;A/B/C/D` 由现代 shell（zsh + p10k、starship、fish）发出。免费拿，最可靠。终端 core 在 VT 管道里截获并作为事件发给 detector。
2. **CLI 内置硬编码模式** — Claude Code 的 `"Press Enter to continue"` / `"(y/n)"` / Codex 特定 token / Gemini 固定 prompt，硬编码在各自 `CliAdapter::wait_detector()`。**CC 重度用户路径必走这一层**。
3. **Shell integration 脚本注入** — 首次启动征求用户授权写一行到 `~/.zshrc / ~/.bashrc`，强制 emit OSC 133。向导可跳过。
4. **Regex fallback** — 兜底，匹配通用 prompt 模式（`$ ` / `> ` / `# ` / `(y/N)`）。

**Layer 4 regex 实现纪律（对应已知事故的血教训，写入 clippy lint 强制）：**

- 必须跑在 **rayon worker thread**，**严禁**在 PTY reader hot path 同步调用
- 使用 **UTF-8 字符边界** slicing（`str::char_indices` / `unicode-segmentation`），**严禁** byte 边界 slice——这是过去导致 panic 的真实根因
- 50 ms 最小 interval polling，避免抖动
- `RegexSet` 启动时编译一次，运行期只查不重编
- 每条 regex 配套回归测试（≥ 15 条），新加 regex 前必须先加测试
- 模块级注释写明"任何改动需审阅者过 regex + UTF-8 边界 + thread 三条"

**层间合成：** 任一层报 WaitingInput 即触发；用户输入到达 PTY → detector `reset_on_user_input()` 全清；通过 pub-sub 发 `TerminalWaitStateChanged` 事件给 M04 subscribers（Dock badge / 通知卡片 / sidebar 红点）。**绝不进 main 线程。**

### 2.10 偏好系统：分层 + 类型化 + 热更新

**分层（低 → 高优先级）：** `builtin_defaults` → `user_prefs.toml` → `project_prefs.toml`（per-cwd） → `runtime_overrides`（插件临时强制）

```rust
pub struct PrefStore {
    layers: [PrefLayer; 4],
    schema: &'static PrefSchema,  // 编译期 const
    subs:   BusPublisher<PreferenceDelta>,
}
impl PrefStore {
    pub fn get<T: PrefTyped>(&self, path: PrefPath) -> T;
    pub fn set(&self, path: PrefPath, v: PrefValue, scope: Scope) -> Result<()>;
}
```

- **类型化 + 校验**：schema 是 `const` 树；未知 key 拒绝；range / enum / regex 校验在 `set` 时执行。25 项 V1 偏好 [M14 / A2] 全在一个 schema 文件
- **Diff + broadcast**：`set()` 算跨层有效值 → 产出 `PreferenceDelta` → 原子写归属层 → 总线发布；subscribers 按 `path` 模式匹配，绝无轮询
- **写路径**：通过 `muxvo-fs-atomic::write_atomic`；单进程 `PrefsWriter` 持进程级 advisory lock
- **项目作用域**：按终端 cwd 逐级向上找最近 ancestor 目录的 `project_prefs.toml`，结果缓存 + cwd 变化时失效

---

## 3. 性能预算（量化 KPI）

| 指标 | 目标 | 触发 | 来源 |
|---|---|---|---|
| 冷启动 → 首帧（M 系列） | ≤ 250 ms | boot 到首次 GPU submit | A2/A4 |
| 冷启动 → 首帧（x86_64 中端） | ≤ 600 ms | 同上 | A2/A4 |
| 20 终端空闲 RSS | ≤ 350 MB | 默认 10K scrollback | A2 |
| 20 终端 1M scrollback 上限 RSS | ≤ 900 MB | 压满 | A2 |
| 2 GB 警戒 | 软警告 + "compact scrollback" 动作 | RSS > 1.5 GB 吐 toast | [M15-REQ-APP_RELIABILITY-023] |
| Focus-mode 过渡 | ≤ 0.3 s，零掉帧 | 每次切换 | [M03-REQ-TERM_FOCUS-021] |
| Grid drag reflow | 稳定 60 FPS | 拖放过程 | [M02] |
| 键入 → 像素 p99 | < 16 ms | bench | A2 |
| 单路 PTY 吞吐 | > 200 MB/s | bench | A2 |
| 聊天搜索 @ 25K 消息 p99 | < 500 ms | bench | [M09] |
| Jank 检测阈值 | > 3 s 警示 / > 15 s 强退 | 内置 watchdog | [M15-REQ-APP_RELIABILITY-025] |
| 单终端边际 RSS（压满 100K 行后） | < 20 MB | bench | A2 |
| 变高度聊天虚拟滚动（1000 条 markdown） | 60 FPS 滚动 | bench | M08 |
| 中文 IME 合成 → 显示延迟 | < 40 ms | 手动 + spike | M05 |

**任意一项在 Sprint 0 不达标** → 升级为架构级决策点，委员会复议。

---

## 4. Workspace 拓扑：4 层 20 crate

**层次约束（CI 硬失败）：** 上层可依赖下层，同层横向依赖需架构签字，反向依赖严禁。`cargo deny` + 自定义 `xtask check-deps` 在 CI 强制。

### L0 — Kernel（纯类型，无 I/O）

| Crate | 职责 |
|---|---|
| `muxvo-ids` | 类型化 ID：`TerminalId / SessionId / DraftId / AttachmentId / PluginId`。Copy + Hash，无依赖 |
| `muxvo-model` | 领域值类型：`Message / Attachment / CliKind / PaneLayout / Preference / PreferenceDelta / ProjectScope / MessageEnvelope / SendIntent / SendPlan` |
| `muxvo-error` | 根 `Error` enum + `Result<T>`（thiserror）|

### L1 — Core（状态机 + 规则，无 OS）

| Crate | 职责 |
|---|---|
| `muxvo-bus` | 3 原语总线：pub-sub / req-reply / actor mailbox |
| `muxvo-prefs` | 分层偏好 + 热更新 + 类型 schema |
| `muxvo-terminal-core` | 终端生命周期 / 焦点 / 平铺网格 / 五态 UI + `WaitDetector` trait [M01–M04 / M15] |
| `muxvo-editor-core` | 每终端草稿 / 附件 / SendIntent 构造 [M05–M07]，**通过 `muxvo-editor-adapter` 收窄对 GPUI 底层调用** |
| `muxvo-history-core` | 统一消息模型 / 浏览状态机 / FTS 查询 DSL / 同步编排 [M08–M10] |
| `muxvo-config-core` | Skills/MCP/Hooks/Plugins 实体 + global/project 只读投影 [M13] |
| `muxvo-file-core` | 文件面板 cwd 模型 / 终端切换不关闭 / 查看器路由 [M11/M12] |

### L2 — Platform（OS / FS / 进程）

| Crate | 职责 |
|---|---|
| `muxvo-pty` | `portable-pty` 封装 + SIGCHLD 回收 + PID 管理 |
| `muxvo-term-view` | **Clean-room** 终端 view 层（GPUI 元素 + 字形 atlas + damage tracking + ring-buffer scrollback） |
| `muxvo-fs-atomic` | tmp+fsync+rename 原子写；全项目**唯一磁盘写入口** |
| `muxvo-paths` | `paths::root()` 单入口；dev/prod/XDG 路径解析；clippy lint 封死其他入口 |
| `muxvo-storage` | SQLite + rusqlite + schema + tantivy 索引封装 |
| `muxvo-source-claude` / `muxvo-source-codex` / `muxvo-source-gemini` | 各 CLI 的 `SessionSource` 实现 |
| `muxvo-viewers` | markdown / 代码 / 图像 / PDF / xlsx 渲染适配 [M12] |
| `muxvo-migrate` | schema 版本迁移模块 |
| `muxvo-editor-adapter` | Muxvo editor 对 GPUI 文本原语的收窄调用面（≤ 20 方法），将来可抽换 |

### L3 — Shell / App

| Crate | 职责 |
|---|---|
| `muxvo-plugin-host` | wasmtime + WIT component loader + 能力门禁；仅依赖 core 的 trait 模块 |
| `muxvo-app` | 组装 crate，拥有 `App` struct，崩溃恢复编排，窗口生命周期 |
| `muxvo-ui` | GPUI 元素组件库；只 import `muxvo-bus / muxvo-model / muxvo-ids`；不触碰存储 |
| `muxvo-bin` | 薄 `main.rs`，CLI flags |
| `muxvo-bench` | 5 个 day-1 bench + 新增 2 个（chat virtual scroll, IME 合成延迟） |
| `muxvo-testkit`（dev-dep） | FakeBus / FakePty / FakeStorage / FakeClock / FakeFs / headless Muxvo-App driver |

### 依赖图（文本）

```
L0:  ids  error
       \   /
        model

L1:   model ─→ bus ─→ {prefs, terminal-core, editor-core, history-core,
                       config-core, file-core}
      editor-core ─→ editor-adapter

L2:   terminal-core ─→ {pty, term-view}
      model ─→ paths ─→ fs-atomic ─→ storage ─→ {source-claude,
                                                  source-codex,
                                                  source-gemini,
                                                  viewers, migrate}

L3:   (core trait 模块)  ─→ plugin-host
      L1 + L2            ─→ app ─→ ui ─→ bin
      app                ─→ bench (dev only)
```

**无环。** 任何新依赖边需 PR 描述说明为什么；CI `xtask check-deps` 比对白名单。

---

## 5. Bounded Contexts + Seam 类型

**跨 crate 边界只允许 5 种形状流动。新增 seam 类型需架构委员会签字。**

```rust
// muxvo-ids
pub struct TerminalId(pub u64);
pub struct SessionRef { pub source: CliKind, pub path: Arc<Path>, pub offset: u64 }
pub struct DraftId(pub Uuid);

// muxvo-model
pub struct PreferenceDelta {
    pub path: PrefPath,
    pub old: PrefValue,
    pub new: PrefValue,
}

pub struct MessageEnvelope {
    pub session: SessionRef,
    pub seq: u64,
    pub role: Role,
    pub body: MessageBody,
    pub ts: i64,
}

pub enum MessageBody {
    Text(String),
    Markdown(String),
    ToolCall { name: String, args: Value },
    ToolResult { name: String, output: Value },
    /// 必须存在——多源 schema 漂移保底：无法解析的原始 bytes + schema 指纹
    Raw(Bytes, SchemaId),
}

pub struct SendIntent {
    pub terminal: TerminalId,
    pub text: String,
    pub attachments: SmallVec<[AttachmentRef; 2]>,
}
```

### 所有权表

| 状态 | 独占 owner | 说明 |
|---|---|---|
| 终端状态 | `muxvo-terminal-core` | `muxvo-pty` 只持 OS 资源；authoritative `TerminalEntity` 在 core |
| 草稿 | `muxvo-editor-core` | 通过 `DraftRepo` port 写 `muxvo-storage`，**严禁与 history 共表** |
| 聊天历史 | `muxvo-history-core` | source-* crate 只产 `SessionEvent`，不知 SQLite / tantivy |
| 配置 | `muxvo-config-core` | 对外只暴露 `GlobalView / ProjectView` 只读投影 [M13-REQ-021/022/030] |
| 偏好 | `muxvo-prefs` | **与 config-core 严格拆开**——偏好是 app 设置，config 是用户可编辑工具配置 |
| 路径 | `muxvo-paths` | 全项目唯一磁盘路径入口 |
| 磁盘写 | `muxvo-fs-atomic` | 全项目唯一原子写入口 |

---

## 6. 数据层 + 磁盘布局

### 6.1 生产目录（macOS）

```
~/Library/Application Support/Muxvo/
├── SCHEMA_VERSION              # 启动第一个读，单整数 + channel 标
├── graceful_exit.flag          # 存在 = 上次正常退；不存在 = 崩溃
├── instance.lock               # fd-lock，防双开，存 pid
├── prefs.toml                  # 25 项 V1 偏好 [M14]
├── prefs.toml.bak              # 上一版，迁移保留
├── state/
│   ├── session.db              # SQLite + WAL：终端列表/顺序/名称/CWD/草稿键
│   ├── session.db-wal
│   └── session.db-shm
├── drafts/
│   ├── <term_uuid>.draft       # 每终端一个文件 [M05-M07]
│   └── <term_uuid>.draft.tmp
├── attachments/
│   └── <sha256>.<ext>          # 图像内容寻址去重 [M06]
├── chat/
│   ├── index.tantivy/          # FTS，可重建
│   ├── meta.db                 # (source, project, session_id, path, mtime, msg_count, last_indexed_offset)
│   └── mirror/                 # 按需镜像的 JSONL 副本
├── plugins/
│   └── <id>/                   # wasm 插件 + manifest + 数据
├── logs/
│   ├── muxvo.log(.YYYY-MM-DD)  # tracing-appender 日滚，7 天保留
│   ├── panic.log               # panic hook 直写
│   └── last-crash.json         # 结构化崩溃快照
└── cache/                      # 可弃；缩略图 + PDF 栅格
    ├── thumbs/
    └── pdf/
```

- **Dev 目录**：`~/Library/Application Support/Muxvo-dev/`，bundle id 后缀 `-dev`；`SCHEMA_VERSION` 含 channel 名；**dev build 编译期拒绝打开 prod 目录**
- **Linux (XDG)**：config → `$XDG_CONFIG_HOME/muxvo/`；state → `$XDG_STATE_HOME/muxvo/`；data → `$XDG_DATA_HOME/muxvo/`；cache → `$XDG_CACHE_HOME/muxvo/`
- **Windows**：prefs + state → `%LOCALAPPDATA%\Muxvo\`（不 roam）；不用 `%APPDATA%`——避免公司 profile 把聊天归档漫游到其他设备

### 6.2 存储引擎选型

| 数据 | 引擎 | 理由 |
|---|---|---|
| 偏好 | TOML (`toml_edit`) | 人读 / 可 diff / 可 comment；25 keys 足够 |
| Session 状态 | SQLite + WAL (rusqlite) | 多行原子更新 + 崩溃安全 + 可 VACUUM 备份 |
| 聊天归档 | JSONL 源 + SQLite meta + tantivy 索引 | JSONL 真身归 CC/Codex/Gemini，我们只镜像 meta + 索引；索引可重建让升级便宜 |
| FTS 搜索 | **tantivy** | 25K msg p99 <500 ms 轻松达标；CJK tokenization 优于 sqlite-fts5 |
| 插件 manifest | TOML | 声明式，易审计 |

### 6.3 原子写纪律（`muxvo-fs-atomic` 唯一入口）

1. 同目录写 `target.tmp.<random>`
2. `file.write_all(bytes)`
3. **macOS 用 `F_FULLFSYNC`**（APFS 普通 fsync 只刷到驱动缓存）；Linux/Windows 用普通 `sync_all`
4. `std::fs::rename(tmp, target)` — POSIX 原子
5. 打开父目录 `sync_all()`（Linux/macOS，Windows 跳过）
6. 启动时清扫残留 `.tmp.*`

**F_FULLFSYNC 成本分级：**

- **Hot path**（草稿 / 每次 keystroke 保存）：**普通 fsync + 500 ms debounce**
- **Cold path**（prefs / session.db checkpoint / `graceful_exit.flag`）：**F_FULLFSYNC 吃 8–20 ms 代价**

**SQLite 设置：** `PRAGMA synchronous=NORMAL; journal_mode=WAL; wal_autocheckpoint=1000`；干净退出前 `PRAGMA wal_checkpoint(TRUNCATE)`。

### 6.4 File-watch 策略

- `notify` v6 + `notify-debouncer-full`（250 ms quiet window）
- **单 `WatchHubActor`** 持所有 OS handle（避免 FSEvents 重复订阅放大事件流）
- 订阅者（chat-sync / config-tab）注册 glob + handler，不自开 watcher
- 背压：bounded `tokio::mpsc(1024)`；满则 drop + 标项目 dirty，下轮全扫；**绝不阻塞 FS 线程**
- 启动 10K+ `~/.claude/projects/` 策略：先查 `meta.db` 已知 path → 后台 `walkdir` reconcile → 显示"indexing 8,432 sessions…"横幅

---

## 7. 崩溃检测 + 恢复（类型级强制）

### 7.1 启动流

```
boot
  ├─ acquire instance.lock（失败 → focus 现有窗口，退出）
  ├─ read SCHEMA_VERSION → 若需 migrate 则 migrate
  ├─ check graceful_exit.flag
  │    ├─ 存在 → 删除，正常启动，按偏好恢复
  │    └─ 缺失 → CRASH PATH：
  │              ├─ 无条件恢复全部终端（从 session.db）
  │              ├─ 显示恢复横幅 [M15-REQ-APP_RELIABILITY-005]（5s 自隐）
  │              └─ append 一行 last-crash.json
  └─ open session.db → spawn PTYs → 窗口起
```

### 7.2 干净退出流（严格有序）

```
user ⌘Q
  → app broadcasts Shutdown 事件
  → drafts flushed（普通 fsync）
  → session.db BEGIN; UPDATE ...; COMMIT
  → PRAGMA wal_checkpoint(TRUNCATE)
  → rusqlite Connection drop（WAL 清理）
  → tantivy writer commit
  → tracing flush
  → LAST: reliability::mark_clean_exit(guard: ShutdownGuard)
        → atomicfs::write("graceful_exit.flag", ..., fsync_mode=FullSync)
  → exit(0)
```

### 7.3 类型级强制顺序

```rust
/// 唯一能写 graceful_exit.flag 的函数。
/// 要求调用者已经从每个子系统收集到 ShutdownGuard（token），证明 flush 完成。
pub fn mark_clean_exit(guard: ShutdownGuard) -> Result<()> { ... }

/// ShutdownGuard 内部持有所有子系统的 flush 凭证。
/// 不提供 pub 构造；必须通过 ShutdownCoordinator 逐子系统 surrender 才能组装。
pub struct ShutdownGuard(PhantomData<*const ()>, ShutdownToken);
```

**编译期保证：** 任何"先写 flag 再 flush"或"flush 漏一个"的路径都无法编译通过。Sprint 1 集成测试用 SIGKILL 在 `wal_checkpoint` 中途杀进程，断言下次启动走 crash path。

### 7.4 Panic hook

- `std::panic::set_hook`：**直接 `std::fs::write` 写 `panic.log` + 追加 `last-crash.json`**（不经 tracing——panic 时 subscriber 可能已死）
- 结构化 `last-crash.json`：`{ version, ts, panic_msg, backtrace, terminal_count, recent_ops[32] }`
- **绝不触碰 `graceful_exit.flag`**
- 始终以 `PANIC:` 前缀在列 0 写入日志（便于 `grep panic` 5 秒自诊）

---

## 8. 平台集成

| 子系统 | 方案 |
|---|---|
| **PTY** | `portable-pty`（wezterm 维护，三平台生产验证） |
| **SIGCHLD** | `tokio::signal::unix::signal(child())` + `waitpid(-1, WNOHANG)` 循环回收；映射为 `TerminalExited` 事件 |
| **SIGWINCH** | 不走 OS 信号；窗口 resize 事件 → `PtyPair::master.resize()` |
| **OSC 7** | `vte` 解析器层截获 `file://host/path`，URL 解码 + UTF-8 校验 → 更新 cwd |
| **OSC 133** | 同管道截获 A/B/C/D 事件 → 喂 WaitDetector Layer 1 |
| **macOS Dock badge** | `objc2` + `objc2-app-kit` 的 `NSApp.dockTile.setBadgeLabel`；`DockBadge` trait 对 Linux/Windows no-op；realtime 立写 / 5-min-timed 用 tokio interval 批处理 [M04] |
| **系统通知** | `notify-rust`；macOS 未签名时静默失败 → dev 模式 fallback 到 stderr + in-app toast |
| **窗口焦点 / 后台** | GPUI 原生事件；隐藏窗口保持 PTY + 文件监听运行，暂停 tantivy commit 省 CPU |
| **中文 IME** | GPUI macOS IME 桥（Zed 已抛光）；Sprint 0 spike 跑搜狗 / 系统拼音 / 五笔三家 candidate window + preedit composition |
| **HiDPI / 多显示器** | Sprint 0 PLATFORM-TAIL spike：1.25× / 1.5× / 2× 缩放 + 双显示器拖窗 known issues 清单 |
| **代码签名 + 公证** | Developer ID Application；`codesign --deep --options runtime`；hardened runtime；`notarytool` 公证 + staple；未走此流程则通知 + FSEvents on `~/.claude` 会被 TCC 拦截 |

---

## 9. 观测与诊断

- **`tracing` + `tracing-subscriber`** 以 `EnvFilter` 默认 `info,muxvo=debug` 启动
- **`tracing-appender`** 日滚 `logs/muxvo.log`，7 天保留；非阻塞 writer；**绝不阻塞 UI 线程**
- **Panic hook 绕过 tracing** 直写 `panic.log`
- **`last-crash.json`** 结构化，恢复横幅链接显示
- **`PANIC:` 前缀保留字**：仅 panic 使用，handled error 不许占用——保留 `grep panic /path/to/logs/*.log` 的纯信号
- **启动自检**（≤ 1 s）：磁盘剩余 ≥ 500 MB / Linux watch descriptor 上限充足 / 写测试 → 失败 loud 提示

---

## 10. 工程纪律（9 条不可妥协规则，CI 强制）

1. **路径单入口** — 只允许 `muxvo_paths::root()` 读磁盘路径；clippy lint 封死其他入口；`dirs / directories` 直接 import 禁止
2. **原子写单入口** — 只允许 `muxvo_fs_atomic::write_atomic`；grep 不到其他 `.tmp.` 写法；禁止 `std::fs::write` 写持久化状态
3. **类型化 seam 强制** — `cargo deny` + `xtask check-deps` CI 强制层次约束；跨 crate `pub use` 破边界 = 硬失败；新 seam 类型需架构签字
4. **总线零字符串类型** — `serde_json::Value` / `HashMap<String, String>` 作为事件 payload 禁止；所有事件类型化
5. **`mark_clean_exit(ShutdownGuard)` 类型级退出顺序** — 唯一退出路径
6. **Plugin V1 小开口 + WIT@1.0 冻结** — V1 只开主题 + send strategy；其他插件种类 V2 再开
7. **WaitDetector regex 纪律** — worker thread / UTF-8 边界 / 50 ms interval / `RegexSet` / 15 回归测试；clippy 自定义 lint 阻止 `&str` byte slice
8. **License 白名单** — `cargo deny` 白名单；GPL / AGPL 黑名单；每次引入新 dep 作者填 SPDX + reviewer 签字
9. **五态 UI 组件** — 每模块覆盖 empty / loading / normal / error / restricted 五态；测试 `muxvo-testkit` 提供 state matrix assert

---

## 11. 风险 Register

| # | 风险 | 严重 | 缓解 |
|---|---|---|---|
| 1 | GPUI pre-1.0 breaking change | 🟡 中 | vendored + 补丁队列；升级走单独 PR + 全 bench + L1/L2/L3 绿 |
| 2 | GPUI `crates/terminal` GPL 传染（clean-room 失败） | 🔴 高 | 工程师绝不看 GPL 源码；Git history 留痕；Sprint 0 律所审计；`cargo deny` 黑 GPL |
| 3 | 20 路终端 60 FPS 未在 GPUI 公开验证 | 🟡 中 | Sprint 0 `bench_pty_fanout` SLA 必须绿；不绿则架构复议 |
| 4 | 聊天变高度虚拟滚动工程量大 | 🟡 中 | Sprint 0 `bench_chat_virtual_scroll` SLA（1000 条 markdown @ 60 FPS） |
| 5 | Scrollback 在 adversarial 负载爆 2 GB | 🟡 中 | Sprint 0 对抗场景压测（vim/htop/cargo build/tmux replay）；不达标 → 默认 2K 行 + 磁盘 spill |
| 6 | 中文 IME / HiDPI / 多显示器尾巴坑 | 🔴 高 | Sprint 0 PLATFORM-TAIL spike 跑通四场景再往下写代码 |
| 7 | Linux X11 focus-mode 撕裂 | 🟡 中 | Sprint 0 X11 VM 实验；撕裂 → X11 专用 CPU cross-fade 兜底 |
| 8 | 多源 CLI schema 漂移丢数据 | 🟡 中 | `MessageBody::Raw(Bytes, SchemaId)` 强制保底；schema 升级后台重建索引 |
| 9 | 跨 crate 偷偷 `pub use` 破边界 | 🟡 中 | `cargo deny` + `xtask check-deps` 硬失败；seam 类型文件注释警告 |
| 10 | 启动 10K `~/.claude/projects/` watcher 洪水 | 🟡 中 | 索引器 2 worker + 100/批 + 500 ms / 5 MB 提交；持久化 `last_indexed_offset` |
| 11 | `graceful_exit.flag` 写序乱 | 🔴 高 | `ShutdownGuard` 类型级单路径 + SIGKILL mid-checkpoint 集成测试 |
| 12 | Dev/Prod 数据目录串台 | 🟡 中 | `muxvo-paths` 单入口 + bundle id `-dev` 后缀 + `SCHEMA_VERSION` channel；dev build 拒开 prod 目录 |
| 13 | WaitDetector regex panic 复发 | 🔴 高 | worker thread / UTF-8 边界 clippy lint / 15 回归测试 + 模块级警告注释 |
| 14 | 时间风险（计划 28 周 → 实际 38 周） | 🟡 中 | sprint 末尾留 3 天 buffer；Sprint 6 hardening 必有；关键路径月度复盘 |
| 15 | Plugin ABI 过早冻结拖累 V2 | 🟢 低 | V1 只开 2 类 plugin；其他内置，ABI 稳定后 V2 再开 |
| 16 | GPUI 单 vendor 风险（Zed 放缓） | 🟡 中 | vendored 源码本地可独立修复；关键 bug 不等 upstream；`third_party/gpui-patches` 维护 |
| 17 | `editor_core`-style 自建 rope + undo 质量不及成熟库 | 🟡 中 | `muxvo-editor-adapter` 收窄接口；rope 底层用 `ropey` crate（Apache-2.0，成熟）+ 自建 undo stack |
| 18 | `muxvo-ui` headless 测试栈 | 🟡 中 | Sprint 1 自写 `muxvo-testkit`：mock event loop + 状态断言；L3 通过 bus 断言不经渲染 |

---

## 12. Sprint 路线图（28 周，9 人 + 多支线并行）

### Sprint 0 — De-risk + Foundation（2 周）

**必须全部通过才进 Sprint 1：**

- ✅ `third_party/gpui/` vendored + 初次编译通过
- ✅ **Sprint 0 SLA**：
  - `bench_pty_fanout`（20 路 × 10 MB/s @ 60 FPS，主线程阻塞 < 2 ms）绿
  - `bench_chat_virtual_scroll`（1000 条变高度 markdown @ 60 FPS 滚动）绿
  - PLATFORM-TAIL spike：搜狗 + 系统拼音 IME / 1.25× 1.5× 2× HiDPI / 双显示器拖窗 / 焦点切换——全部手动验证通过并记录 known issues
  - `bench_focus_transition`（100 次进出 ≤ 0.3 s）绿
  - X11 focus-mode 撕裂实验通过或确定 CPU cross-fade 兜底路径
  - Scrollback 对抗场景压测（vim / htop / cargo build / tmux replay）通过
- ✅ 律所 license 审计完成，`docs/license-audit.md` 就位
- ✅ `cargo deny` license + advisory 白名单上线
- ✅ 5 个 day-1 bench harness（scroll / input-to-pixel / pty-fanout / mem-per-term / focus-transition）+ 2 个新 bench（chat-virtual-scroll / ime-latency）就位

**任何 SLA 不绿 → Sprint 0 不结束，架构复议。**

### Sprint 1 — L0/L1 骨架 + 恢复路径（4 周）

- `muxvo-ids` / `muxvo-model` / `muxvo-error` 全部编译通过
- `muxvo-bus` 3 原语实现 + 基础测试
- `muxvo-prefs` + 25 项 V1 schema + 热更新
- `muxvo-terminal-core` 最小 MVP（开 / 关 / 改名 / cwd）
- `muxvo-paths` + clippy lint + dev/prod 拒开
- `muxvo-fs-atomic` + F_FULLFSYNC 分级 + `ShutdownGuard` 雏形
- **SIGKILL mid-checkpoint 集成测试通过**
- `WaitDetector` trait 定义 + Layer 1（OSC 133）+ Layer 4（regex worker + UTF-8 边界 + 15 回归测试）
- `muxvo-testkit`：FakeBus / FakeFs / FakeClock / FakePty 基础

### Sprint 2 — L2 平台 + 终端核心（6 周）

- `muxvo-pty` 20 路稳定运行 + `bench_pty_fanout` 持续绿
- `muxvo-term-view` clean-room 自写 + ring-buffer scrollback + SGR run-length + zstd 冷块
- `muxvo-storage` + SQLite schema v1 + `muxvo-migrate`
- tantivy 索引 + `meta.db` + `muxvo-source-claude` 增量喂数据
- `WaitDetector` Layer 2（CC / Codex / Gemini 内置 prompt 硬编码）
- **M01 / M02 / M15 通过**；恢复横幅演示

### Sprint 3 — 编辑器 / 聊天 / 文件（6 周）

- `muxvo-editor-core` + `muxvo-editor-adapter`（M05-M07）
- `SendPlan` DSL 走通 Claude Code 剪贴板图像粘贴路径
- `muxvo-history-core`（M08-M10）三栏浏览 + 搜索 p99 < 500 ms
- `muxvo-file-core` + `muxvo-viewers`（M11/M12）：markdown / 代码 / 图像 / PDF 四类
- `muxvo-source-codex` + `muxvo-source-gemini` 各自实现

### Sprint 4 — Config / Onboarding / Polish（4 周）

- `muxvo-config-core` 四 tab（Skills / MCP / Hooks / Plugins）
- M14 首次引导 + 25 偏好设置 UI + 五态 UI 全模块走查
- `muxvo-plugin-host` + WIT `muxvo:plugin@1.0` 冻结 + 1 示范主题 + 1 示范 send strategy
- Dock badge / 系统通知 / Excel 1000 行查看器
- `WaitDetector` Layer 3 shell integration 注入向导
- 代码签名 + 公证管线首次 dry-run

### Sprint 5 — 发行预备（3 周）

- CI bench 回归门槛全开（任意 bench 退步 CI 失败）
- macOS / Linux / Windows 三平台打包
- 自动更新（sparkle / tauri-updater 调研后选型）
- L1 / L2 / L3 测试覆盖率全绿
- 内部 dogfood 一周

### Sprint 6 — Hardening + 公测（3 周）

- 公测灰度 100 用户
- 5 个 bench + 新增 2 个持续监控
- 反馈分流 → P0 修复
- **golden path（M01 + M05 + M08 + M14）全绿 + bench 全绿 → V1.0 发布**

**总计 28 周 ≈ 6.5 个月**。每 sprint 末尾留 3 天 buffer。关键路径每月委员会复盘。

---

## 13. 验证 + 测试

### 13.1 Day-1 Bench（CI 回归门槛）

| Bench | 目标 | 用途 |
|---|---|---|
| `bench_scroll_throughput` | > 200 MB/s，零掉帧 | VT 解析 + damage tracking 回归 |
| `bench_input_to_pixel` | p99 < 16 ms | 键入延迟 / 幽灵行回归 |
| `bench_pty_fanout` | 20 路 × 10 MB/s，主线程阻塞 < 2 ms | 线程模型回归 |
| `bench_mem_per_terminal` | 边际 < 20 MB / 终端（100K 行后） | 内存预算 |
| `bench_focus_transition` | 100 次进出 ≤ 0.3 s，全帧 < 16.7 ms | [M03-REQ-TERM_FOCUS-021] |
| `bench_chat_search` | p99 < 100 ms @ 25K 消息 | [M09] |
| `bench_chat_virtual_scroll` | 1000 条变高度 @ 60 FPS | M08 |
| `bench_ime_latency` | 中文合成 → 显示 < 40 ms | M05 |

**CI 纪律：** 任意一项退步 CI 硬失败；bench 结果上传到 dashboard 做趋势图；委员会每 2 周复盘 bench 趋势。

### 13.2 三层测试

| 层 | 位置 | 风格 | 运行时 |
|---|---|---|---|
| **L1 contract** | core crate 内部 | 纯状态 / 无 I/O；`PrefStore::set()` → 断言 delta | ms 级 |
| **L2 state machine** | 独立 test crate | `FakeBus / FakePty / FakeStorage`；例：开 20 PTY 杀 5 → crash-recovery 状态匹配 golden [M15] | 秒级 |
| **L3 user journey** | 独立 test crate | headless 驱动 `muxvo-app` 通过总线跑旅程；例："用户输入 → 切终端 → 文件面板不关 → 草稿留存" [M11-REQ-014] | 十秒级 |

**第三方 adapter 契约测试：** `tests::contract::<T: CliAdapter>()` / `tests::contract::<T: WaitDetector>()` 函数让未来插件作者对着自己的 adapter 跑协议测试，确保新 adapter 满足总线期望。

### 13.3 每 sprint DoD

1. 本 sprint 引入 REQ 全部覆盖到 L1/L2/L3
2. 5 + 3 bench 全绿
3. `cargo deny` + `xtask check-deps` + `clippy -D warnings` 全绿
4. macOS / Linux / Windows CI runner 全绿
5. 真实装 Claude Code，手动跑 M01 + M05 + M08 golden path 一次

---

## 14. Scaffold 文件清单（新项目 Day 1）

在全新仓库 `muxvo/`（或你喜欢的名字）里 Day 1 就创建：

### 根目录

- `Cargo.toml`（workspace definition + members + profile.release: lto=fat, codegen-units=1, panic=abort, strip=symbols）
- `rust-toolchain.toml`（pin stable 版本）
- `deny.toml`（cargo deny 配置：license 白名单 + advisories + sources）
- `.github/workflows/ci.yml`（三平台 × 三步骤：lint, test, bench）
- `docs/license-audit.md`（Sprint 0 律所结论落地）
- `docs/architecture.md`（本文件的项目内副本）
- `xtask/src/main.rs` + `xtask/src/check_deps.rs`（层次约束）

### L0

- `crates/muxvo-ids/src/lib.rs`
- `crates/muxvo-model/src/lib.rs`
- `crates/muxvo-error/src/lib.rs`

### L1

- `crates/muxvo-bus/src/{pubsub.rs, service.rs, actor.rs, lib.rs}`
- `crates/muxvo-prefs/src/{schema.rs, store.rs, lib.rs}`
- `crates/muxvo-terminal-core/src/{entity.rs, state.rs, wait_detector.rs, lib.rs}`
- `crates/muxvo-editor-core/src/{draft.rs, attach.rs, send.rs, lib.rs}`
- `crates/muxvo-history-core/src/{envelope.rs, browse.rs, search.rs, sync.rs, lib.rs}`
- `crates/muxvo-config-core/src/{view.rs, writer.rs, lib.rs}`
- `crates/muxvo-file-core/src/lib.rs`

### L2

- `crates/muxvo-pty/src/lib.rs`
- `crates/muxvo-term-view/src/{atlas.rs, scrollback.rs, pipeline.rs, lib.rs}` **(clean-room)**
- `crates/muxvo-fs-atomic/src/lib.rs`
- `crates/muxvo-paths/src/lib.rs`
- `crates/muxvo-storage/src/{schema.rs, repo.rs, lib.rs}`
- `crates/muxvo-source-claude/src/lib.rs`
- `crates/muxvo-source-codex/src/lib.rs`
- `crates/muxvo-source-gemini/src/lib.rs`
- `crates/muxvo-viewers/src/{markdown.rs, code.rs, image.rs, pdf.rs, xlsx.rs, lib.rs}`
- `crates/muxvo-migrate/src/lib.rs`
- `crates/muxvo-editor-adapter/src/lib.rs`

### L3

- `crates/muxvo-plugin-host/src/{wit.rs, sandbox.rs, lib.rs}`
- `crates/muxvo-app/src/{boot.rs, shutdown.rs, recovery.rs, lib.rs}`
- `crates/muxvo-ui/src/{terminal.rs, editor.rs, chat.rs, file.rs, config.rs, onboard.rs, lib.rs}`
- `crates/muxvo-bin/src/main.rs`
- `crates/muxvo-bench/benches/{scroll.rs, input_pixel.rs, pty_fanout.rs, mem_per_term.rs, focus.rs, chat_search.rs, chat_virtual_scroll.rs, ime_latency.rs}`
- `crates/muxvo-testkit/src/{fake_bus.rs, fake_pty.rs, fake_storage.rs, fake_clock.rs, fake_fs.rs, headless_app.rs, lib.rs}`

### Third-party

- `third_party/gpui/`（pinned vendor）
- `third_party/gpui-patches/`（本地补丁）

---

## 15. 决策日志（已定版，不再辩论）

| # | 决策 | 结论 | 理由一句话 |
|---|---|---|---|
| D1 | UI 框架 | GPUI vendored | 唯一有真实重负载文本面 Rust 生产背书；macOS 平台尾巴 Zed 抛光过 |
| D2 | 终端 grid 模型 | `alacritty_terminal` + clean-room view | 成熟 VT 解析；绕 Zed GPL terminal_view 污染 |
| D3 | License 纪律 | `cargo deny` 白名单 + Sprint 0 律所审计 | GPL/AGPL 硬拒 |
| D4 | 字形 shaping | cosmic-text + swash | Zed / Lapce 双验证，BiDi/CJK 全覆盖 |
| D5 | 存储引擎 | SQLite + WAL + tantivy + TOML | 全部生产成熟，组合覆盖所有数据形态 |
| D6 | 进程模型 | 单进程 + Tokio PTY runtime + Rayon 后台 | GPUI 集成 async；避免 IPC 复杂度 |
| D7 | 插件系统 | wasmtime + WIT | 唯一有沙箱 + 版本化 ABI 的方案 |
| D8 | 插件 V1 开口 | 主题 + send strategy 两类 | 小开口冻结 ABI，不拖 V2 marketplace |
| D9 | 总线 | 3 原语（pub-sub + req/reply + actor） | 覆盖所有跨 crate 通信形态 |
| D10 | 崩溃恢复 | `mark_clean_exit(ShutdownGuard)` 类型级 | 编译期杜绝写序乱 |
| D11 | 路径入口 | `muxvo-paths::root()` + clippy lint 封死 | 解决 dev/prod 串台历史事故 |
| D12 | 原子写入口 | `muxvo-fs-atomic::write_atomic` 单入口 + F_FULLFSYNC 分级 | 解决部分写损坏历史事故 |
| D13 | WaitDetector | 4 层分级（OSC 133 > CLI 模式 > shell integration > regex fallback） | 覆盖所有 shell 场景；regex 兜底有严格纪律 |
| D14 | Clean break 无包袱 | 新仓库 / 新代码 / 零继承老 Muxvo | 老代码结构性问题修不透 |
| D15 | 时间预算 | 28 周（9 人团队） | 含 buffer 的工程诚实估计 |
| D16 | V2 Skill marketplace | 本蓝本不覆盖 | 等 V1 落地后独立立项 |

---

## 17. 启动 Readiness（用这个蓝本 + PRD 开干够不够）

**短答：够开 Sprint 0，不够覆盖 Sprint 0 全部产出。** 下面是清单。

### 17.1 这个蓝本 + PRD 已覆盖的部分

| 交付 | 来源 | 备注 |
|---|---|---|
| 技术栈定版（GPUI / alacritty_terminal / tantivy / SQLite / wasmtime / ...） | 本蓝本 §2 + §15 决策日志 | D1–D16 已定，不再辩论 |
| Workspace 拓扑（20 crate / 4 层） | 本蓝本 §4 | Day 1 即可 `cargo new` |
| Seam 类型（5 个跨边界 shape） | 本蓝本 §5 | L0 `muxvo-ids / muxvo-model` 先建 |
| 数据层 + 磁盘布局（三平台） | 本蓝本 §6 | 含 SQLite schema v1 起点 |
| 崩溃恢复（ShutdownGuard 强序） | 本蓝本 §7 | 类型级契约已写明 |
| 平台集成（PTY / Dock / IME / 签名） | 本蓝本 §8 | 含 Sprint 0 PLATFORM-TAIL 清单 |
| 性能预算（14 项 KPI） | 本蓝本 §3 | bench 阈值可直接落 CI |
| 工程纪律（9 条 CI 强制） | 本蓝本 §10 | `cargo deny / xtask check-deps / clippy lint` 可立即落地 |
| 风险 register（18 条） | 本蓝本 §11 | 按严重度排序，含 mitigation |
| Sprint 路线图（28 周） | 本蓝本 §12 | 含每 sprint DoD |
| Scaffold 文件清单 | 本蓝本 §14 | Day 1 建仓即可用 |
| **产品需求 449 REQ / 214 US** | `docs/PRD_rewrite/` 15 模块 | 行为级规范完整 |
| 全局快捷键 / 偏好清单 / 错误文案 / UI 五态矩阵 / 画像 | PRD appendix A1–A5 | 不要漏读 |
| 术语统一 | PRD `_GLOSSARY.md` | 全团队共享 |

### 17.2 蓝本 + PRD **不**覆盖，Sprint 0–1 必须产出

| 缺失交付 | 归属 | 何时做 |
|---|---|---|
| **UX / 视觉设计系统**（色板 / 间距 / 字号 / 图标 / 动效时长 / dark-light 主题 token） | 设计师 / A2 Rendering Lead 协作 | Sprint 0 并行 |
| **License 审计实际结果文件** `docs/license-audit.md` | 律所 + A9 | Sprint 0 内完成 |
| **GPUI vendor 固定 commit hash** | A2 | Sprint 0 第 1 周 |
| **rust-toolchain.toml 版本 pin** | A4 | Sprint 0 第 1 周 |
| **WIT `muxvo:plugin@1.0` 实际 surface** | A6 | Sprint 4 末冻结 |
| **WaitDetector Layer 4 的 15 条 regex + 配套测试** | A3 + A6 | Sprint 1 |
| **构建 / 打包 / 签名 / 公证脚本** | A8 | Sprint 5 |
| **CI 配置**（`.github/workflows/ci.yml` 三平台 × lint/test/bench） | A9 + 工程支线 | Sprint 0 第 2 周 |
| **`deny.toml`**（license + advisories + sources 白名单实例） | A9 | Sprint 0 第 2 周 |
| **README / CONTRIBUTING / CODE_OF_CONDUCT** | A1 | Sprint 5 |

### 17.3 Kickoff 目录（在当前老仓库里整理好，新项目直接拎走）

在老 muxvo 仓库根目录下新建一个独立的 kickoff 包 `muxvo-rs-kickoff/`，把全部必带文档一次性放进去，新项目启动时整包复制或 symlink。

**具体路径：** `/Users/rl/Nutstore_Files/my_nutstore/520-program/muxvo/muxvo-rs-kickoff/`

**目录结构：**

```
muxvo-rs-kickoff/
├── README.md                # 使用说明（如何把本包搬到新仓库 + 启动 Sprint 0）
├── architecture.md          # 本蓝本副本（canonical 仍在 ~/.claude/plans/）
└── prd/                     # PRD_rewrite/ 整包复制
    ├── _INDEX.md
    ├── _GLOSSARY.md
    ├── _STYLE_GUIDE.md
    ├── _COVERAGE.md
    ├── _CHANGELOG.md
    ├── _TEMPLATE.md
    ├── modules/             # M01 ~ M15 共 15 个模块
    └── appendix/            # A1 ~ A5 共 5 个附录
```

**新项目启动步骤：**

1. `cp -r muxvo-rs-kickoff/ <新项目路径>/docs/`（或 rsync / symlink）
2. 新项目目录下 `docs/architecture.md` 和 `docs/prd/` 就位
3. 按蓝本 §14 scaffold 清单建空壳 crate
4. 按蓝本 §12 Sprint 0 执行 SLA + license 审计
5. 新项目建 `docs/decisions/` 空目录准备放未来 ADR，不回头改 `architecture.md`

### 17.4 ADR 纪律（运行期增量决策）

- `docs/architecture.md` 是"开工版快照"，**冻结不动**
- 未来新决策（bump 依赖、架构微调、新纪律）写 `docs/decisions/NNNN-<slug>.md`
- 每次 §15 决策日志有增补 → 新开一条 ADR，不要回头改本蓝本
- ADR 格式：Context / Decision / Consequences / Status（Proposed / Accepted / Superseded）

---

## 18. 不在本蓝本范围

以下明确排除，避免 scope creep：

- V2 Skill Marketplace（市场浏览 / 评分 / 评论 / 展示页 / 发布 / 审核）
- GitHub OAuth / 账号系统
- 云同步（聊天 / 偏好 / 工作区跨设备）
- 协作编辑（Zed 的 collab 那一套）
- AI 侧功能（Muxvo 是工作台，不生成模型对话）
- 移动端 / Web 端
- 本地大语言模型集成

以上等 V1 GA 后独立立项。
