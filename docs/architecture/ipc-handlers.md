# IPC Handlers & Preload API Surface

## IPC Handler Pattern

All IPC handlers live in `src/main/ipc/*-handlers.ts` and follow a two-function pattern:

```typescript
// Factory returns handler methods
export function createXxxHandlers() {
  return { async method1(params), async method2(params), ... };
}
// Registration wires to ipcMain.handle
export function registerXxxHandlers(): void {
  const h = createXxxHandlers();
  ipcMain.handle(IPC_CHANNELS.XXX.METHOD, (_e, p) => h.method(p));
}
```

## All 12 Handler Files

- `terminal-handlers.ts` — accepts manager instance + persistence callback
- `chat-handlers.ts` — multi-source reader (CC + Codex + archive) for history/session
- `config-handlers.ts` — resource scanning, settings/CLAUDE.md with atomic writes
- `fs-handlers.ts`, `fs-watcher-handlers.ts`, `fs-image-handlers.ts` — file ops, watch, temp images
- `app-handlers.ts` — preferences + CLI detection with format conversion
- `auth-handlers.ts` — Multi-method auth: GitHub OAuth + Google OAuth + Email verification
- `marketplace-handlers.ts` — fetch sources, search, install/uninstall, updates + 3 push events
- `score-handlers.ts` — run scorer, check/get-cached + 2 push events
- `showcase-handlers.ts` — generate/publish/unpublish + publish-result push
- `analytics-handlers.ts` — track/getSummary/clear with DI tracker (`createAnalyticsHandlers(tracker)`)

All registered in `src/main/index.ts` at app startup. Legacy stub exports (e.g., `configHandlers`) maintained for L1 test compatibility.

## Preload API Surface

`window.api` exposes 10 domains to the renderer (type: `MuxvoAPI`):

| Domain | Methods | Push events (on*) |
|--------|---------|-------------------|
| terminal | create, write, resize, close, list, getState, getBuffer, getForegroundProcess, updateCwd | onOutput, onStateChange, onExit, onListUpdated |
| app | getConfig, saveConfig, getPreferences, savePreferences, detectCliTools, getHomePath | onMemoryWarning |
| fs | selectDirectory, readDir, readFile, writeFile, watchStart, watchStop, writeTempImage, writeClipboardImage | onFileChange |
| chat | getHistory, getSession, search, export | onSessionUpdate, onSyncStatus |
| config | getResources, getResourceContent, getSettings, saveSettings, getClaudeMd, saveClaudeMd, getMemory | onResourceChange |
| auth | loginGithub, loginGoogle, loginEmail, verifyEmail, logout, getStatus | — |
| marketplace | fetchSources, search, install, uninstall, getInstalled, checkUpdates | onInstallProgress, onPackagesLoaded, onUpdateAvailable |
| score | checkScorer, run, getCached | onProgress, onResult |
| showcase | generate, publish, unpublish | onPublishResult |
| analytics | track, getSummary, clear | — |

All `on*` event listeners return an unsubscribe cleanup function.
