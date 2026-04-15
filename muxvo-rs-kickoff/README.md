# Muxvo RS Kickoff Pack

从零重写 Muxvo（Rust 原生版）的启动包。把这个目录整包复制到新仓库就能开 Sprint 0。

## 里面有什么

```
muxvo-rs-kickoff/
├── README.md             ← 你正在读的这份，使用说明
├── architecture.md       ← 开工蓝本（18 节完整架构方案）
└── prd/                  ← 产品需求（15 模块 / 449 REQ / 214 US）
    ├── _INDEX.md         ← PRD 主索引，先读这个
    ├── _GLOSSARY.md      ← 全局术语表，全团队共享
    ├── _STYLE_GUIDE.md   ← PRD 写作风格指南
    ├── _COVERAGE.md      ← REQ ↔ 测试覆盖映射
    ├── _CHANGELOG.md     ← PRD 版本记录
    ├── _TEMPLATE.md      ← 模块 PRD 模板
    ├── modules/          ← M01 ~ M15 共 15 个模块 PRD
    └── appendix/         ← A1 ~ A5 共 5 个附录（快捷键 / 偏好 / 画像 / 错误文案 / 五态矩阵）
```

## 怎么用这个包启动新项目

### 步骤 1：新建空仓库

```bash
# 随便起个名字，比如 muxvo-rs 或 muxvo-native
mkdir -p ~/Code/muxvo-rs
cd ~/Code/muxvo-rs
git init
```

### 步骤 2：把本 kickoff 包整包搬进去

```bash
# 把整个 kickoff 包复制成新项目的 docs
cp -r /Users/rl/Nutstore_Files/my_nutstore/520-program/muxvo/muxvo-rs-kickoff docs

# 或者你想保持分层结构：
# mkdir docs
# cp -r /Users/rl/Nutstore_Files/my_nutstore/520-program/muxvo/muxvo-rs-kickoff/* docs/
```

最终新仓库结构：

```
muxvo-rs/
└── docs/
    ├── README.md             ← 本文件
    ├── architecture.md       ← 开工蓝本
    ├── prd/                  ← 产品需求
    └── decisions/            ← 新建空目录，存未来 ADR（见下文）
```

### 步骤 3：按蓝本 §14 scaffold 清单建空壳 crate

打开 `docs/architecture.md`，翻到 **§14 Scaffold 文件清单**，按清单建 20 个 crate 的空壳：

```
crates/
├── muxvo-ids/              (L0)
├── muxvo-model/            (L0)
├── muxvo-error/            (L0)
├── muxvo-bus/              (L1)
├── muxvo-prefs/            (L1)
├── muxvo-terminal-core/    (L1)
├── muxvo-editor-core/      (L1)
├── muxvo-history-core/     (L1)
├── muxvo-config-core/      (L1)
├── muxvo-file-core/        (L1)
├── muxvo-pty/              (L2)
├── muxvo-term-view/        (L2, clean-room)
├── muxvo-fs-atomic/        (L2)
├── muxvo-paths/            (L2)
├── muxvo-storage/          (L2)
├── muxvo-source-claude/    (L2)
├── muxvo-source-codex/     (L2)
├── muxvo-source-gemini/    (L2)
├── muxvo-viewers/          (L2)
├── muxvo-migrate/          (L2)
├── muxvo-editor-adapter/   (L2)
├── muxvo-plugin-host/      (L3)
├── muxvo-app/              (L3)
├── muxvo-ui/               (L3)
├── muxvo-bin/              (L3)
├── muxvo-bench/            (L3)
└── muxvo-testkit/          (L3, dev-dep)
```

同时根目录建：

- `Cargo.toml` — workspace 定义 + `profile.release = { lto = "fat", codegen-units = 1, panic = "abort", strip = "symbols" }`
- `rust-toolchain.toml` — pin stable
- `deny.toml` — cargo deny 配置（license 白名单 + advisories）
- `.github/workflows/ci.yml` — 三平台 × lint / test / bench
- `xtask/src/main.rs` + `xtask/src/check_deps.rs` — 层次约束检查
- `third_party/gpui/` — vendored GPUI（Sprint 0 第 1 周 pin commit）
- `third_party/gpui-patches/` — 本地补丁队列

### 步骤 4：按蓝本 §12 Sprint 0 跑完 SLA gate

**Sprint 0 必须全部通过才进 Sprint 1：**

- ✅ 律所 license 审计 → 落地 `docs/license-audit.md`
- ✅ `bench_pty_fanout`（20 路 × 10 MB/s @ 60 FPS）绿
- ✅ `bench_chat_virtual_scroll`（1000 条变高度 markdown @ 60 FPS）绿
- ✅ `bench_focus_transition`（100 次进出 ≤ 0.3 s）绿
- ✅ PLATFORM-TAIL spike：中文 IME（搜狗 + 系统拼音）/ HiDPI（1.25× 1.5× 2×）/ 双显示器 / 焦点切换
- ✅ X11 focus-mode 撕裂实验
- ✅ Scrollback 对抗场景压测（vim / htop / cargo build / tmux replay）
- ✅ 5 + 2 bench harness 就位并跑在 CI 上

**任何一条不绿 → Sprint 0 不结束，架构委员会复议。**

---

## 三条开工前必读

### 1. 先看全局

1. `architecture.md` 的 **§0 Context**（为什么重写、目标、三条约束）
2. `prd/_INDEX.md`（PRD 主索引，列出 15 个模块的依赖关系）
3. `prd/_GLOSSARY.md`（全局术语表，统一说法）

### 2. 再看你的那一块

按角色读：

| 角色 | 必读 |
|---|---|
| **Chief Architect (A1)** | architecture.md 全部 |
| **Rendering Lead (A2)** | arch §2.1–§2.5 / §3 / §4 L2 `muxvo-term-view` / §11 风险 #1 #3 #6 |
| **Terminal Core Lead (A3)** | arch §2.3 / §2.9 / prd M01–M04 / M15 |
| **Runtime Lead (A4)** | arch §2.5 / §8 / §7 / prd M15 |
| **Domain Lead (A5)** | arch §4 / §5 / §10 |
| **Extensibility Lead (A6)** | arch §2.6 / §2.8 / §2.9 / prd M07 / M13 |
| **Data Lead (A7)** | arch §6 / prd M08 / M09 / M10 |
| **Platform Lead (A8)** | arch §8 / §2.2 / prd M14 (偏好) / appendix A2 |
| **Reliability Lead (A9)** | arch §7 / §9 / §10 / prd M15 / appendix A4 (错误文案) |

### 3. 决策纪律（不要违反）

- **不能改 `docs/architecture.md`**——它是开工版快照，冻结不动
- 新决策写 **`docs/decisions/NNNN-<slug>.md`** ADR（Context / Decision / Consequences / Status）
- 跨 crate 边界新 seam 类型必须经架构委员会签字
- 任何 PR 引入新 dependency 必须在描述里填 SPDX license
- CI 有 9 条硬纪律（见 arch §10），任一条红线不通过不 merge

---

## 老包袱清单（不要带到新项目）

绝对不要继承：

- ❌ 老 `src/` / `src-tauri/` / `web/` 任何代码
- ❌ 老 `PRD.md`（3000+ 行的旧版）/ `DEV-PLAN.md` / `CHANGELOG.md`
- ❌ 老 `package.json` / `Cargo.toml` / `electron-builder.*`
- ❌ 老 `tests/` 目录
- ❌ 老 `docs/` 除 `PRD_rewrite/`（已收进本 kickoff 包）之外的一切
- ❌ 老 `CLAUDE.md`（项目级）
- ❌ 老 cc-failure-cases 里 Electron/Tauri 的修 bug 案例（新项目没这些包袱）

全局 `~/.claude/CLAUDE.md` 仍然生效，不受影响。

---

## canonical 位置

- **architecture.md** 的 canonical 原件在 `~/.claude/plans/purring-kindling-whistle.md`
- **prd/** 的 canonical 原件在 `/Users/rl/Nutstore_Files/my_nutstore/520-program/muxvo/docs/PRD_rewrite/`
- **本 kickoff 包**在 `/Users/rl/Nutstore_Files/my_nutstore/520-program/muxvo/muxvo-rs-kickoff/`

新仓库里的 `docs/architecture.md` 和 `docs/prd/` 是**副本**。canonical 更新时手动同步一次（但蓝本已冻结，prd 也是 V1 定版，预计很少需要同步）。

---

## 路线图一眼看完

| Sprint | 周数 | 产出 |
|---|---|---|
| 0 | 2 | De-risk + 全部 SLA 跑通 + license 审计 |
| 1 | 4 | L0/L1 骨架 + 恢复路径 + WaitDetector 雏形 |
| 2 | 6 | L2 平台 + 终端核心 + 聊天同步 + M01/M02/M15 过 |
| 3 | 6 | 编辑器 / 聊天浏览 / 文件查看器 + M05-M12 过 |
| 4 | 4 | Config / Onboarding / Plugin host 冻结 + M13/M14 过 |
| 5 | 3 | 三平台打包 + 签名公证 + dogfood |
| 6 | 3 | 公测 + hardening → **V1.0 发布** |

**总计 28 周 ≈ 6.5 个月**，9 人团队 + 多支线并行。

Good luck.
