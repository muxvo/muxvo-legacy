# ADR-001：GPUI 框架决策作废，领域设计资产保留

- **日期**：2026-06-10
- **状态**：已定（用户确认）
- **影响范围**：本目录 `architecture.md`（4 月蓝本）的框架层决策；领域设计部分继续有效
- **接替方案**：方案 A 混合架构，权威计划见新仓库 `../../muxvo/docs/REBUILD-PLAN.md`

## 1. 决策

`architecture.md` §2.1 确立的 **GPUI（vendored from Zed）+ Rust 全栈** 框架决策**作废**。新版采用：

- **Swift + AppKit 原生壳**：每路终端一个原生 NSView，Metal GPU 直渲
- **终端核心**：首选 libghostty（MIT；探针阶段双轨评估 GhosttyKit 完整嵌入 API 与 libghostty-vt headless 核心），备选链 alacritty_terminal(Rust FFI) → SwiftTerm(MIT)
- **面板区**：WKWebView 承载全新 Web 前端（低频 UI 从未出过性能问题，留在 Web 技术栈）
- **后端逻辑**：Swift；Rust 仅以「终端核心成品库 + 小 C 接口」形式备选进入

## 2. 作废依据

1. **病根定位不变，药方更直接**。老 Electron 版的病根是「浏览器画终端」：高频流式文本逼迫浏览器渲染管线高频重绘（多路 CC 并发时卡顿、乱码、内存 1-2GB）。GPUI 方案与方案 A 都对症（GPU 直渲终端），但 GPUI 意味着 Rust 全栈重写 + vendor 一个非通用 UI 框架（Zed 内部件，文档与生态近零），单人 + AI 维护成本远超必要。
2. **低频面板无需迁移技术栈**。4 月蓝本把聊天/配置/编辑器等低频面板也拉进 GPUI 重写；实际上这些面板从未出过性能问题，是「人类打磨的资产」，用 WKWebView 1:1 复刻成本最低、保真最高。
3. **2026-06 新增编排需求改变了架构重心**（AI harness 编排：多项目托管、跨 harness 流水线、AI 代答确认、自主迭代）。重心从「渲染框架」转向「会话/视图分离 + 编排内核 + 控制面 MCP server」，Swift + AppKit 对 macOS 单平台目标是阻力最小路径（只做 macOS 已定版）。
4. 28 周 / 9 人 / 20 crate 的 Sprint 路线图（§12、§4）按团队规模设计，与单人 + AI 的实际执行模型不匹配，随框架决策一并作废。

## 3. 保留资产清单（继续有效，迁移进新仓库实现）

| 资产 | 蓝本出处 | 去向 |
|---|---|---|
| `CliAdapter` trait + `SendPlan` DSL | §2.6 | 新版多 CLI 适配层（Swift protocol 化）；并预留「远程会话 adapter」接缝（V1 非目标，只留缝） |
| WaitDetector 分层检测 | §2.9 | 保留并**修订**：新增 Layer 0（见 §4） |
| 磁盘布局 + 原子写纪律 | §6 | 新版 Swift 实现（tmp + rename 唯一入口不变） |
| 崩溃检测 + 恢复（类型级强制启动/退出流） | §7 | 新版 Swift 实现，SIGKILL 测试照搬 |
| 性能预算量化 KPI | §3、§13.1 | 新版 bench 门槛：`bench_pty_fanout`(20路×10MB/s)、`bench_input_to_pixel`(p99<16ms)、`bench_mem_per_terminal`(<20MB 边际)、`bench_scroll_throughput`，M0 起 CI 常驻 |
| 三层测试 + spec↔test 1:1 纪律 | §13.2 | 老仓库 `tests/specs/` 225 case 复制进新仓库由 spec-runner 消费 |
| PRD 体系（449 REQ + 214 US） | `prd/` | 需求权威来源第二位（第一位：跑起来的老 app） |

## 4. WaitDetector 设计修订：新增 Layer 0 = harness 原生 hook 事件

§2.9 原四层（① OSC 133 语义 prompt 标记 → ② CLI 内置硬编码模式 → ③ shell integration 脚本注入 → ④ regex 兜底）之上，新增最高优先级一层：

- **Layer 0：harness 原生 hook / 结构化事件**。CC 的 PreToolUse / Notification / Stop hook 事件、`claude -p --output-format stream-json`、`codex exec --json`、JSONL tail——由 harness 直接给出的机器可读状态，不经终端字节流推断。
- **原四层降级为非 CC 类 CLI 的兜底**：CC/Codex 这类有机器通道的 harness，等待状态判定必走 Layer 0；OSC 133 / 硬编码 / regex 只服务没有结构化通道的普通 CLI。
- 配套原则（新版核心原则二）：**编排控制面走结构化通道，终端只给人看**。禁止「刮终端屏幕 + 模拟按键」作为控制面；hook 管不到的 TUI 弹窗一律定义为升级人类的场景，呼出窗口，绝不机器盲按。
- §2.9 的 Layer 4 regex 实现纪律（worker thread、UTF-8 字符边界、≥15 条回归测试）继续有效。

## 5. 备注

- 本 ADR 是对老仓库的纯文档新增，不改任何代码（老版功能冻结，只修致命 bug）。
- 编排能力的完整设计（生存定位、五原则、自主分级、并发隔离、丝滑接手）见 `../../muxvo/docs/REBUILD-PLAN.md`，此处不重复。
