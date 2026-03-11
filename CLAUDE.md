# CLAUDE.md

## Project Overview

Muxvo is an Electron desktop workbench for AI CLI tools (Claude Code, Codex, Gemini CLI). It provides terminal management, chat history browsing, config editing, a rich editor, and a V2 Skill marketplace with AI scoring and showcase publishing.

## 启动 Muxvo

**⚠️ 启动/重启 Muxvo（必须严格遵守，否则白屏）**：

```bash
pkill -f "electron-vite"; pkill -f "Electron"; lsof -ti:5173 2>/dev/null | xargs kill -9 2>/dev/null; sleep 5; nohup npx electron-vite dev > /dev/null 2>&1 & disown
```

**任何场景下启动 Muxvo 都必须用上面这条完整命令，禁止简化！** 步骤说明：
1. `pkill` 杀 electron-vite 和 Electron 进程
2. `lsof -ti:5173 | xargs kill -9` **强制释放 5173 端口（防白屏的关键，不可省略！）**
3. `sleep 5` 等端口完全释放（禁止用 2 秒或 3 秒）
4. `nohup ... & disown` 后台启动，确保关闭 Claude Code 后 Muxvo 不会被终止

**白屏根因**：`pkill` 发 SIGTERM 后旧 Vite 进程不一定立刻释放 5173 端口。如果不用 `lsof | kill -9` 强制释放，新 Vite 绑不到端口，Electron 加载空页面 → 白屏。

**⚠️ Dev vs Production 数据目录不同**：
- Dev 模式：`~/Library/Application Support/Muxvo Dev/`（preferences.json、config.json 等）
- Production：`~/Library/Application Support/muxvo/`
- 调试时修改 preferences 等文件，必须改 **Muxvo Dev** 目录下的，不是 `muxvo/` 或 `~/.muxvo/`

## 常用命令

```bash
npm run build              # Build for production
npm test                   # Run all tests (534 tests)
npm run test:l1            # L1 unit/contract tests
npm run test:l2            # L2 integration/rule tests
npm run test:l3            # L3 end-to-end user journey tests
npx vitest run tests/l2/chat.test.ts   # Run single test file
npx vitest run -t "TERM_L1_01"         # Run by pattern
npm run verify:coverage    # Verify JSON spec ↔ test code 1:1 match
npx tsc --noEmit           # Type check
```

## 代码规范

- State machine 用 `createXxxMachine()` 工厂 → `{ get state, get context, send() }`，不用 XState
  <!-- 因为：项目初期评估后选择轻量 switch-case 方案，所有 machine 已统一此模式，混用会增加依赖和复杂度 -->
- Store 用 `createXxxStore()` → `{ dispatch(), getState() }`
- Service 用 `createXxxManager()` → async method objects
- IPC handler 用 create + register 两函数模式（见 `docs/architecture/ipc-handlers.md`）
- Config/settings 写入用 tmp + rename 原子写
  <!-- 因为：直接写入在断电/崩溃时会导致文件损坏 -->
- 路径别名：`@/*` → `./src/*`，`@tests/*` → `./tests/*`（配置在 tsconfig.json + vitest.config.ts）
- Push events (M→R) 用 `pushToAllWindows(channel, payload)` + `!win.isDestroyed()` guard

## 安全底线（不要做的事）

- 不要修改 `src/shared/constants/channels.ts` 的 channel 名称
  <!-- 因为：60 个 channel 已全部连线（handler + preload + renderer），改名会导致 IPC 断连 -->
- 不要修改 `tests/specs/` 中 JSON spec 的 id 格式
  <!-- 因为：verify-coverage 脚本依赖 id 格式做 1:1 匹配，改格式会让 CI 报错 -->
- 不要用 XState 替换现有 state machine
- 不要在 model/service 层直接返回 HTTP 状态码
- File access handlers 必须校验路径在允许目录内（如 `~/.claude/`、`~/.muxvo/`）
  <!-- 因为：路径安全是防止任意文件读写的核心防线 -->

## 架构概要

```
Main Process (src/main/)          Renderer Process (src/renderer/)
├── ipc/        ← IPC handlers   ├── components/   ← UI components
├── services/   ← Core logic     ├── contexts/     ← React contexts
                                  ├── features/     ← Feature stores/views
                                  ├── hooks/        ← Custom React hooks
                                  ├── stores/       ← State management
                                  └── utils/        ← UI utilities
```

- **IPC 通信**：10 个域（terminal/fs/chat/config/app/auth/marketplace/score/showcase/analytics），60 个 channel，全部在 `src/shared/constants/channels.ts` 定义
- **`src/shared/`** — 跨进程代码：types（12 files）、state machines、utils、error definitions、constants
- **`src/modules/`** — 15 个领域模块，主要被 L3 测试使用的高层编排器
- **`src/main/services/`** — 主进程业务逻辑（terminal manager、chat sync、file watcher 等）
- **`src/renderer/features/`** — Feature-scoped UI 逻辑

详细架构文档见 `docs/architecture/`（按需查阅，不要一次性全部读取）：
- `ipc-handlers.md` — 12 个 handler 文件详情 + Preload API 表格
- `chat-multi-source.md` — 多源聊天架构（CC + Codex）
- `auth.md` — 三方登录架构
- `build-and-release.md` — 构建打包 + 发版流程 + E2E 测试 + 云基础设施

## 测试架构（3-Layer）

| Layer | Directory | Purpose | Style |
|-------|-----------|---------|-------|
| L1 | `tests/l1/` | IPC contracts, default values, data shapes | JSON-driven via `test.each` from `tests/specs/l1/*.spec.json` |
| L2 | `tests/l2/` | State machines, business rules, boundaries | Mixed: JSON-driven + hand-written |
| L3 | `tests/l3/` | Multi-step user journeys, cross-module flows | Hand-written, imports from `src/modules/` |

**JSON Spec System**: 225 test cases in `tests/specs/`。`tests/scripts/verify-coverage.ts` 确保 spec ID 与 test 函数 1:1 匹配。
**Test helpers** (`tests/helpers/`): `mock-ipc.ts`, `mock-electron.ts`, `test-fixtures.ts`。

## 关键文档

- `PRD.md` — 产品需求（3000+ lines）
- `DEV-PLAN.md` — 技术架构与 IPC 协议规范（1300+ lines）
- `docs/Muxvo_测试_v2/` — 测试文档（539 test cases, 8 modules）
- `docs/deployment-plan.md` — 云端部署计划（Phase 0-5）
