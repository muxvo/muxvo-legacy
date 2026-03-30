# Build, Packaging & Release

## Playwright E2E Testing (Electron)

Muxvo 是 Electron 应用，E2E 测试需要特殊的启动方式：

**前提条件**: `npx electron-vite dev` 必须正在运行（vite renderer server 在 5173 端口）。

**在测试脚本中启动 Electron**:

```js
import { _electron } from '@playwright/test';

const app = await _electron.launch({
  args: [resolve(PROJECT, 'out/main/index.js')],
  cwd: PROJECT,
  env: { ...process.env, ELECTRON_RENDERER_URL: 'http://localhost:5173' },
});
const window = await app.firstWindow();
await window.waitForTimeout(6000); // 等待 React 挂载
await window.waitForLoadState('networkidle');
```

**常见错误**:
- 白屏 (body 84 chars) → vite server 没在跑，或没设 `ELECTRON_RENDERER_URL`
- `is.dev` 始终为 true → 来自 `@electron-toolkit/utils`，检查 `app.isPackaged`（未打包=true），设 `NODE_ENV` 无效
- `window.api` undefined → 不能用 `chromium.launch()` + `page.goto()`，必须用 `_electron.launch()` 才有 preload

## Build & Packaging

```bash
# Dev build + package (arm64 Mac)
npx electron-vite build && npx electron-builder --mac --arm64

# Dev build + package (Intel Mac)
npx electron-vite build && npx electron-builder --mac --x64

# Apple notarization (requires keychain profile)
ditto -c -k --keepParent dist/mac-arm64/Muxvo.app /tmp/Muxvo.zip
xcrun notarytool submit /tmp/Muxvo.zip --keychain-profile "muxvo-notary" --wait
xcrun stapler staple dist/mac-arm64/Muxvo.app
```

**Note**: node-pty 交叉编译不可靠。arm64 必须在 Apple Silicon 上构建，x64 必须在 Intel Mac（或 CI 的 macos-13 runner）上构建。

Config: `electron-builder.yml`. Signing credentials: see `1apple-developer-signing.md` (not in repo).

## Release Workflow (发版流程)

**发版四步（CC 自动执行），其余全自动：**

1. **写 CHANGELOG**：在 `CHANGELOG.md` 中按 Keep a Changelog 格式写本版更新内容
   - 格式：`## [x.y.z] - YYYY-MM-DD`，分类用 `### Added` / `### Changed` / `### Fixed`
   - 此内容会被 app 内 "What's New" 弹窗展示，并追加到帮助按钮的 guide.md 末尾
   - **注意**：数据统计、埋点、内部分析等不面向用户的功能不写入 CHANGELOG
2. **融合旧 changelog 到帮助文档**：
   - 读取 `CHANGELOG.md` 中上一版本的条目 + 当前 `docs/muxvo-guide.md`
   - 把上一版本的功能描述融合到 guide.md 对应章节中（终端管理、聊天历史等）
   - 融合后从 guide.md 末尾删除旧 changelog 区块，只保留功能说明本体
   - （app 启动时会自动把最新版 changelog 追加到 guide.md 末尾，无需手动处理）
3. **改版本号**：修改 `package.json` 的 `version` 字段
4. **提交发布**：

```bash
git add package.json CHANGELOG.md docs/muxvo-guide.md
git commit -m "chore: bump version to X.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

**CI 自动完成（`.github/workflows/release.yml`）：**
- 运行测试
- **并行构建 arm64 (macos-14) + x64 (macos-13) 两个架构**
- Apple 签名 + 公证（两个架构各自签名）
- 合并 `latest-mac.yml`（electron-updater 自动更新用）
- 上传到 GitHub Releases（含两个架构的 DMG + ZIP + 稳定链接）
- 自动部署两个 DMG 到官网服务器：
  - `https://muxvo.com/download/Muxvo-arm64.dmg` 始终指向最新 arm64 版
  - `https://muxvo.com/download/Muxvo-x64.dmg` 始终指向最新 Intel 版
- 官网自动检测用户 Mac 架构（WebGL renderer），提供对应下载链接

**所需 GitHub Secrets：** `SERVER_SSH_KEY`, `SERVER_HOST`, `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`

## Cloud Infrastructure

- **GitHub**: `muxvo` org — `muxvo/muxvo` (Public) + `muxvo/server` (Private)
- **Server**: Aliyun Hong Kong ECS, Ubuntu 24.04
- **Domains**: `muxvo.com` (web), `api.muxvo.com` (Fastify API), `admin.muxvo.com` (admin panel)
- **CI/CD**: `.github/workflows/` — `ci.yml`, `deploy-server.yml`, `deploy-web.yml`, `release.yml`

### Subproject Layout

| Directory | Stack | Purpose |
|-----------|-------|---------|
| `server/` | Fastify 5 + PostgreSQL 16 + Redis 7 | Backend API (auth, user, showcase, analytics) |
| `web/` | React 19 + Vite + Tailwind CSS v4 | Public website at muxvo.com |
| `admin/` | React 19 + Vite + Tailwind CSS | Admin panel (stub) |
