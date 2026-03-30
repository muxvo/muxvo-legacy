# 终端文字乱码问题排查手册

> 最后更新：2026-03-29
> 状态：问题可检测、可自动修复（capturePage 方案），待长期验证

---

## 1. 问题现象

### 什么样的乱码
- xterm.js 终端中的文字显示为**错误的字符**（比如 `a` 显示成 `Z`，中文变成方块或其他汉字）
- 不是乱码（不是 encoding 问题），而是**字形映射错误** — 每个字符位置都有字，但是错的字
- 通常影响多个终端 tab，不是单个终端的问题
- **macOS 截图（Cmd+Shift+3/4）后立刻恢复正常**

### 典型触发场景
- 长时间运行（数小时/数天不重启）
- 多个终端 tab 同时打开（4+ 个）
- 频繁切换窗口（Muxvo ↔ 其他应用）
- CJK 字符（中文/日文）比 ASCII 更容易触发
- 开启 WebGL 渲染加速时更容易触发

### 不是这个问题的情况
- 终端输出编码错误（UTF-8 解码问题）→ 这是 pty 编码配置问题
- 字体缺失导致 tofu（□）→ 这是字体安装问题
- WebGL context lost 后的黑屏 → 这是 WebGL 生命周期问题，有单独处理

---

## 2. 根因分析

### 核心原因：Chromium GPU 合成器的纹理缓存损坏

```
文字渲染管线（简化）：

  字符 → Skia 字形缓存(CPU) → GPU 纹理上传 → GPU 合成器(tile) → 屏幕
          ↑                      ↑                ↑
          第1层                  第2层             第3层
          CPU glyph cache       texture upload    compositor tile cache
```

**损坏发生在第3层（GPU 合成器 tile cache）**，而不是第1层。

证据：
- OffscreenCanvas integrity check（读第1层）：5119 次检查，**0 次 FAIL**
- macOS 截图修复（强制重读第3层）：**100% 有效**
- 结论：CPU 侧字形数据完好，GPU 把它画到屏幕上时出了问题

### 为什么会损坏

Chromium 的 GPU 合成器维护了一个 tile cache，用于加速页面渲染。当以下因素叠加时，cache 会出错：

1. **GPU 内存压力**：多个 WebGL context（xterm.js WebGL addon）+ DOM 文字渲染 + CJK 大字符集，争抢有限的 GPU 纹理空间
2. **纹理 atlas 逐出/重建**：GPU 内存不足时，Chromium 会逐出旧的字形纹理，重建时可能出现映射错误
3. **Apple Silicon 特有**：macOS + Apple Silicon 的 GPU 驱动与 Chromium 合成器的交互存在已知问题（Chromium issue tracker 有相关 bug）

### 为什么 macOS 截图能修复

macOS 截图调用 `CGWindowListCreateImage`，这会触发：
1. GPU readback（从 GPU 回读像素到 CPU）
2. 合成器被迫重新光栅化所有 tile
3. 重新光栅化时从正确的 CPU 字形缓存重新上传纹理
4. 损坏的旧 tile 被替换

---

## 3. 修复历史时间线

### 第1阶段：WebGL 引入（2026-02-15）
- **commit** `df83411b`：引入 xterm.js WebGL addon
- 这增加了 GPU 内存压力，是乱码问题的触发因素之一

### 第2阶段：诊断基础设施（2026-03-02）
- **commit** `fb5a245d`：新增 `glyph-logger.ts`，写入 `~/.muxvo/logs/glyph-debug.log`
- 添加了 WebGL context loss 事件日志
- 结果：能记录事件，但无法检测到乱码本身

### 第3阶段：CSS translateZ(0) 方案（2026-03-03）
- **commit** `2e500e0e`：新增 `useCompositorGuard` + `forceCompositorFlush`
- 原理：`translateZ(0)` → 创建新 compositing layer → 期望强制重绘
- 三个触发器：30秒定时 / 窗口 focus / 面板关闭
- **结果：无效** — `translateZ(0)` 只标记 layer dirty，不强制 GPU 重新光栅化纹理

### 第4阶段：setZoomFactor 方案（2026-03-23）
- **commit** `ea1250a2`：改用 `setZoomFactor(current + 0.0001)` 微调缩放
- 原理：缩放改变有效渲染 DPI → 使字形缓存完全失效 → 强制重新光栅化
- **结果：有效但有副作用** — 触发 ResizeObserver → 所有终端 scroll-to-top
- 被回滚，恢复为 CSS transform

### 第5阶段：OffscreenCanvas integrity check（2026-03-23）
- 在 `glyph-integrity-check.ts` 中用 OffscreenCanvas 渲染测试字符串，对比 hash
- **结果：完全无效** — OffscreenCanvas 走 CPU 软渲染路径，永远检测不到 GPU 层面的损坏
- 日志证据：5119 次 flush，0 次 integrity=FAIL

### 第6阶段：GPU 内存预算（同期）
- 在 `src/main/index.ts` 添加 `app.commandLine.appendSwitch('force-gpu-mem-available-mb', '4096')`
- 原理：给 GPU 更多内存（4GB），减少纹理逐出
- **结果：降低了频率但没根除** — 内存压力减小了，但合成器 bug 仍然存在

### 第7阶段：capturePage GPU readback 方案（2026-03-29，当前）
- 新增 `glyph:capture-flush` IPC handler，用 `webContents.capturePage()` 做 GPU readback
- 两层检测：CPU integrity（旧）+ GPU integrity（新）
- capturePage 等同于 macOS 截图 → **检测和修复在同一个调用中完成**
- **待验证** — 需要长时间运行确认

---

## 4. 当前防护机制

### 4.1 自动防护（useCompositorGuard）

**文件**：`src/renderer/hooks/useCompositorGuard.ts`

三个自动触发器，每次触发都调用 `forceCompositorFlush()`：

| 触发器 | 间隔 | 条件 | 原理 |
|--------|------|------|------|
| 定时器 | 30秒 | 页面可见时 | 定期预防性修复 |
| 窗口 focus | 即时 | 从其他应用切回 | 长时间后台后修复 |
| 面板关闭 | 即时 | overlay 面板关闭时 | GPU 层级变化后修复 |

### 4.2 GPU Readback 修复（force-repaint）

**文件**：`src/renderer/utils/force-repaint.ts`

`forceCompositorFlush()` 的核心动作：
1. 调用 `checkGpuIntegrity()` → 内部调用 `window.api.captureFlush(rect)`
2. `captureFlush` 通过 IPC 调用 main process 的 `webContents.capturePage(rect)`
3. `capturePage()` 触发 GPU readback → 合成器被迫重新光栅化
4. 返回像素 bitmap → renderer 计算 hash 对比基准 → 记录 OK/FAIL

### 4.3 GPU 内存预算

**文件**：`src/main/index.ts` (line ~29)

```typescript
app.commandLine.appendSwitch('force-gpu-mem-available-mb', '4096');
```

Apple Silicon 统一内存架构下，4GB GPU 预算是安全的。减少纹理 atlas 逐出频率。

### 4.4 WebGL Context 管理

**文件**：`src/renderer/utils/terminal-addon-manager.ts`

- 全局限制 4 个 WebGL context（Chromium 上限 ~16）
- 等待 `document.fonts.ready` 后才初始化 WebGL
- Context loss 后指数退避重试，3 次失败后降级为 Canvas 2D

### 4.5 参考元素

**文件**：`src/renderer/App.tsx`

```html
<div id="glyph-ref" style="position:fixed;top:0;left:0;width:64;height:16;
  opacity:0.01;pointer-events:none;z-index:-1;
  font-family:monospace;font-size:14px;color:#fff;background:#000">
  ABCDEFG
</div>
```

这个 DOM 元素是 GPU integrity check 的参照物。capturePage 截取这个区域的像素做 hash 对比。

---

## 5. 排查 SOP（下次复现时怎么做）

### Step 1：确认是这个问题

- [ ] 终端文字是"错字"（不是乱码/方块）？
- [ ] 多个终端 tab 都受影响？
- [ ] macOS 截图（Cmd+Shift+3）后恢复了？

如果以上都是 → 确认是 GPU 合成器纹理损坏。

### Step 2：查看日志

```bash
# 查最近的 glyph 日志
tail -50 ~/.muxvo/logs/glyph-debug.log

# 关注这些字段：
# gpu_integrity=OK    → GPU 检测正常（capturePage 方案工作中）
# gpu_integrity=FAIL  → GPU 检测到损坏！
# gpu_not_initialized → GPU 检测未初始化（启动太早）
# capture_failed      → capturePage 调用失败

# 搜索所有 GPU FAIL
grep "gpu_integrity=FAIL" ~/.muxvo/logs/glyph-debug.log

# 搜索所有 GPU MISMATCH
grep "GPU_MISMATCH" ~/.muxvo/logs/glyph-debug.log

# 查看 WebGL context 事件
grep "GLYPH:webgl" ~/.muxvo/logs/glyph-debug.log | tail -20

# 查看内存情况
tail -20 ~/.muxvo/logs/mem-diag.log
```

### Step 3：根据日志判断

| 日志情况 | 含义 | 下一步 |
|----------|------|--------|
| `gpu_integrity=FAIL` 后变 `OK` | capturePage 检测到并自动修复了 | 机制正常，无需干预 |
| `gpu_integrity=FAIL` 持续 | capturePage readback 不够强 | 需要更强的修复手段（见 Step 4） |
| `gpu_integrity=OK` 但仍乱码 | 参考元素区域没被损坏，但终端区域被损坏了 | 说明损坏是局部的，需要扩大检测区域 |
| 没有 `gpu_integrity` 字段 | 旧版本代码，GPU 检测未启用 | 更新到最新代码 |
| `gpu_not_initialized` | 启动过程中 GPU 检测还没初始化 | 正常，等 2 秒后的 flush 会有 |

### Step 4：手动修复方法

按优先级尝试：

1. **macOS 截图**（最快）：Cmd+Shift+3，截图后丢弃即可
2. **切换窗口**：切到其他应用再切回（触发 windowFocus flush）
3. **打开/关闭面板**：打开聊天历史面板再关闭（触发 panelClose flush）
4. **重启 Muxvo**：彻底解决，但丢失终端会话

### Step 5：如果 capturePage 方案无效

如果长期运行后发现 capturePage 无法防止乱码，可能的下一步方向：

1. **加大 capturePage 截取区域**：当前只截 64x16 像素，改为截取整个窗口（开销更大但 readback 更彻底）
2. **用 `webContents.invalidate()`**：Electron API，调度整页重绘，比 capturePage 更直接但不确定是否触发 GPU 重新光栅化
3. **禁用 WebGL addon**：降级为 Canvas 2D 渲染，彻底避免 WebGL context 带来的 GPU 内存压力，但性能会下降
4. **升级 Electron/Chromium 版本**：此问题可能在新版 Chromium 中被修复
5. **用 `--disable-gpu-compositing` flag**：强制 CPU 合成，彻底绕过 GPU 合成器 bug，但渲染性能大幅下降

---

## 6. 相关文件索引

### 核心修复代码

| 文件 | 作用 |
|------|------|
| `src/renderer/utils/force-repaint.ts` | 合成器 flush 主逻辑（capturePage readback） |
| `src/renderer/utils/glyph-integrity-check.ts` | 两层检测（CPU hash + GPU 像素 hash） |
| `src/renderer/hooks/useCompositorGuard.ts` | 自动触发（30s / focus / panel close） |
| `src/renderer/App.tsx` | 参考 DOM 元素（#glyph-ref） |

### 基础设施

| 文件 | 作用 |
|------|------|
| `src/main/index.ts` | GPU 内存预算 + `glyph:capture-flush` IPC handler |
| `src/preload/index.ts` | `captureFlush` / `glyphLog` API 暴露 |
| `src/renderer/utils/glyph-logger.ts` | 写入 `~/.muxvo/logs/glyph-debug.log` |
| `src/renderer/utils/terminal-addon-manager.ts` | WebGL context 生命周期管理 |

### 诊断日志

| 日志文件 | 内容 |
|----------|------|
| `~/.muxvo/logs/glyph-debug.log` | flush 事件、integrity check、WebGL 事件 |
| `~/.muxvo/logs/terminal-debug.log` | 终端滚动、resize、输出可见性事件 |
| `~/.muxvo/logs/mem-diag.log` | 内存使用情况（每 30 秒） |

### 辅助工具

| 文件 | 作用 |
|------|------|
| `src/renderer/utils/scroll-event-ring.ts` | 滚动事件环形缓冲区（检测 flush 是否导致 scroll 跳跃） |
| `src/renderer/utils/term-debug-logger.ts` | 终端诊断日志 API |

---

## 7. 关键认知总结

1. **问题在 GPU，不在 CPU**：OffscreenCanvas 检测永远通过，因为它走的是 CPU 路径
2. **macOS 截图 = GPU readback**：这是已知的 100% 有效修复手段
3. **capturePage ≈ macOS 截图**：Electron 的 `webContents.capturePage()` 内部也是 GPU readback
4. **CSS translateZ(0) 无效**：只标记 dirty，不强制重新光栅化
5. **setZoomFactor 有效但有副作用**：会触发 ResizeObserver → scroll-to-top
6. **增加 GPU 内存能降低频率**：4096MB 比默认 512MB 好，但不能根除
7. **这是 Chromium 的 bug**：不是 Muxvo 的 bug，Muxvo 只能做 workaround
