# i18n 审计报告：英文版中文泄露排查

**日期**: 2026-03-01
**结论**: **英文版不是全英文**。约 100 处硬编码中文绕过了 i18n 系统。

---

## 总览

| 层级 | P0 用户可见 UI | P1 错误消息 | P2 纯注释 | 涉及文件数 |
|------|---------------|-------------|----------|-----------|
| Renderer | 60+ | 15 | 56 | 20 |
| Main | 21 | 18 | 16 | 16 |
| **合计** | **~81** | **~33** | **~72** | **36** |

- i18n 系统本身正常：`en.ts` / `zh.ts` 各 205 个 key，1:1 对齐
- 问题在于大量字符串直接硬编码，没走 `t()` 函数

---

## P0 — 用户可见 UI（必须修复）

### Renderer 层（20 个文件，60+ 处）

#### 1. `components/chat/SessionList.tsx`
| 行 | 中文 |
|----|------|
| 59 | `今天 ${time}` |
| 61 | `昨天 ${time}` |
| 228 | `搜索会话...` (placeholder) |
| 258 | `标题匹配 (N)` |
| 268 | `搜索会话内容...` |
| 284 | `内容匹配 (N)` |
| 292 | `无匹配会话` |

#### 2. `components/settings/SettingsModal.tsx`
| 行 | 中文 |
|----|------|
| 179 | `检查更新` / `Check for Updates` (内联三元) |
| 181 | `当前版本` / `Current version` |
| 186 | `检查更新` / `Check` |
| 190 | `检查中...` / `Checking...` |
| 193 | `已是最新版本` / `Up to date` |
| 197 | `下载 v${newVersion}` / `Download v${newVersion}` |
| 202 | `检查失败` / `Check failed` |

#### 3. `components/markdown/MarkdownViewer.tsx`
| 行 | 中文 |
|----|------|
| 70 | `预览` / `编辑` |
| 91 | `文件有未保存的修改` |
| 93 | `保存` |
| 94 | `放弃` |
| 95 | `取消` |

#### 4. `components/layout/UpdateProgress.tsx`
| 行 | 中文 |
|----|------|
| 98 | `正在下载更新...` |
| 99 | `v${version} 下载完成` |
| 100 | `下载失败` |
| 115 | `下次启动时自动更新` |

#### 5. `stores/terminal-process-ui-map.ts`
| 行 | 中文 |
|----|------|
| 23 | `启动中...` |
| 33 | `处理中...` |
| 45 | `正在关闭...` |
| 56 | `已断开` |

#### 6. `App.tsx`
| 行 | 中文 |
|----|------|
| 249 | `无法创建终端：...` / `未知错误` |

#### 7. `components/chat/SessionDetail.tsx`
| 行 | 中文 |
|----|------|
| 427 | `— 已加载全部 —` |
| 453 | `选择一个会话查看详情` |

#### 8. `components/SearchInput.tsx`
| 行 | 中文 |
|----|------|
| 58 | `{resultCount} 个结果` |

#### 9. `components/mcp/McpPanel.tsx`
| 行 | 中文 |
|----|------|
| 509 | `系统` (分组标签) |
| 510 | `项目` (分组标签) |

#### 10. `components/skill/SkillList.tsx`
| 行 | 中文 |
|----|------|
| 49 | `系统 Skills` |

#### 11. `components/skill/SkillsPanel.tsx`
| 行 | 中文 |
|----|------|
| 357 | `选择一个文件查看内容` / `选择左侧技能查看详情` |

#### 12. `features/config-manager/empty-state.ts`
| 行 | 中文 |
|----|------|
| 8 | `还没有 Skills，可以在终端中使用 claude code 自动创建` |
| 9 | `还没有配置 Hooks` |
| 10 | `还没有创建 Plans` |
| 11 | `还没有 Tasks` |
| 12 | `还没有项目记忆` |
| 13 | `还没有配置 MCP` |
| 17 | `还没有 ${type}` (fallback) |

#### 13. `features/config-manager/error-state.ts`
| 行 | 中文 |
|----|------|
| 15 | `无法读取 settings.json` |
| 17 | `[重试]` |
| 20 | `无法读取 CLAUDE.md` |
| 22 | `[重试]` |
| 27 | `未知错误` / `[重试]` |

#### 14. `components/chat/empty-state.ts`
| 行 | 中文 |
|----|------|
| 12 | `未检测到 Claude Code 聊天记录，请先安装并使用 Claude Code。` |
| 15 | `了解 Claude Code` |
| 23 | `还没有聊天记录，开始使用 Claude Code 后这里会自动显示。` |
| 26 | `开始使用` |

#### 15. `components/chat/search-empty-state.ts`
| 行 | 中文 |
|----|------|
| 9 | `没有找到匹配的记录` |
| 10 | `请尝试其他关键词` |
| 13 | `清除搜索` |

#### 16. `components/chat/sync-status.ts`
| 行 | 中文 |
|----|------|
| 9 | `Muxvo 镜像 · 最后同步 HH:MM` |

#### 17. `features/terminal/cd-strategy.ts`
| 行 | 中文 |
|----|------|
| 46 | `${foregroundProcess} 正在运行，是否退出并切换目录？` |

#### 18. `features/file-viewer/empty-state.ts`
| 行 | 中文 |
|----|------|
| 14 | `此目录为空` |
| 18 | `无法读取此目录，请检查权限` |

#### 19. `components/tile/tile-naming.ts`
| 行 | 中文 |
|----|------|
| 6 | `命名...` |

#### 20. `components/tile/tile-interaction-styles.ts`
| 行 | 中文 |
|----|------|
| 22 | `光泽反射层` (data 结构中的描述) |
| 28 | `amber 边框 glow` |
| 34 | `半透明` |

---

### Main 层（6 个文件，21 处）

#### 1. `src/main/index.ts` — 原生对话框
| 行 | 中文 | 场景 |
|----|------|------|
| 448 | `Muxvo 有可用更新` | 更新检测 title |
| 449 | `发现新版本 v${version}` | 更新检测 message |
| 450 | `是否立即下载？下载完成后将在下次启动时自动更新。` | 更新检测 detail |
| 451 | `立即下载` / `暂不更新` / `不再提醒此版本` | 更新检测 buttons |
| 523 | `下载完成` | 下载完成 title |
| 524 | `v${info.version} 已下载完成` | 下载完成 message |
| 525 | `立即重启安装，还是下次启动时自动安装？` | 下载完成 detail |
| 526 | `立即重启` / `下次启动时安装` | 下载完成 buttons |
| 663 | `设备已被限制` | 设备限制 title |
| 664 | `此设备已被管理员禁止使用 Muxvo。` | 设备限制 message |
| 665 | `如有疑问请联系支持。` | 设备限制 detail |
| 666 | `退出` | 设备限制 button |

#### 2. `src/main/ipc/chat-handlers.ts` — 右键菜单
| 行 | 中文 |
|----|------|
| 193 | `📄 导出为 Markdown` |
| 195 | `🗑 删除聊天记录` |

#### 3. `src/main/services/file-watcher/scopes.ts`
| 行 | 中文 |
|----|------|
| 16 | `项目文件 -- 监听终端 cwd 目录下的文件变化` |
| 20 | `会话 JSONL -- 监听 Claude Code 会话文件变化` |
| 24 | `Claude 资源 -- 监听 ~/.claude/ 目录下的配置和资源` |

#### 4. `src/main/services/chat-search-indexer.ts`
| 行 | 中文 |
|----|------|
| 86 | `索引构建中，仅显示部分结果` |

#### 5. `src/main/services/data-sync/sync-manager.ts`
| 行 | 中文 |
|----|------|
| 44 | `无法写入数据目录，历史备份已暂停` |

#### 6. `src/main/services/app/lifecycle.ts`
| 行 | 中文 |
|----|------|
| 135 | `未检测到 Claude Code 数据目录，聊天历史和配置管理不可用` |

---

## P1 — 错误消息（应修复）

### Renderer 层

#### `contexts/AuthContext.tsx` — 15 处
所有 `dispatch({ type: 'LOGIN_FAILED', error: '...' })` 都是硬编码中文：
- `登录失败，请重试` (行 135, 251, 254)
- `登录超时，请重试` (行 164, 190)
- `GitHub 登录失败` (行 168)
- `Google 登录失败` (行 194)
- `发送失败` (行 202, 207)
- `验证码错误` (行 228, 231)
- `注册失败` (行 274, 277)
- `密码重置失败` (行 285, 288)

### Main 层

#### `services/auth/backend-client.ts` — 6 处
`ERROR_MESSAGE_MAP` 映射表：
- `邮箱或密码错误`, `验证码无效或已过期`, `该邮箱已注册`
- `登录已过期，请重试`, `登录已过期，请重新登录` (×2)

#### `services/auth/auth-manager.ts` — 6 处
- `Token 自动刷新失败`, `验证码验证失败`, `注册失败`
- `密码登录失败`, `OAuth 回调处理失败`, `Token 刷新失败`

#### `services/terminal/manager.ts` — 4 处
- `终端启动失败：进程已断开 -- 无效的工作目录`
- `终端启动失败：工作目录不存在 — ${options.cwd}`
- `最多支持 20 个终端`
- `终端启动失败: ${errMsg}`

#### `services/score/manager.ts` — 3 处
- `请先启动一个 Claude Code 终端`
- `评分失败：API 调用连续失败`
- `评分结果格式异常，已自动重试`

#### `services/showcase/publish.ts` — 2 处
- `GitHub API 配额已用尽，请稍后重试`
- `GitHub API 错误 (${options.status})`

#### 其他 — 各 1 处
- `services/fs/safe-ops.ts:18`: `文件读取失败：权限不足`
- `services/system/disk.ts:23-24`: `磁盘空间充足` / `磁盘空间不足`
- `index.ts:114`: `OAuth 回调处理失败`

---

## P2 — 纯注释（无需处理）

共 72 处，分布在 24 个文件中。均为 `//` 或 `/** */` 注释，不影响 UI 显示。详见各层子报告。

---

## 修复建议

1. **Renderer P0**：新增 i18n key 到 `en.ts` / `zh.ts`，将硬编码改为 `t()` 调用
2. **Renderer P1 (AuthContext)**：error message 改为 `t()` 调用
3. **Main P0**：需要在 Main 进程建立 i18n 机制（读 preferences 中的 locale，加载对应翻译），dialog/menu 文案走 `t()`
4. **Main P1**：error message 返回 i18n key 或英文原文，renderer 端显示时翻译
5. **`SettingsModal.tsx` 内联三元**：`locale === 'zh' ? X : Y` 模式统一改为 `t()` 调用
