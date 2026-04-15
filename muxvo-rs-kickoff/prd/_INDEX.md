# Muxvo PRD（Rust 重构版）— 主索引

> **本 PRD 为 Muxvo 产品从 Electron 迁移到 Rust 架构而重写。只描述用户需求，不含任何技术实现细节。**
> **本版本范围**：V1 终端工作台 + 跨模块基础能力。V2 Skill Showcase（市场/评分/发布/社区）不在本次范围。
> **交付状态**：✅ 全部 15 个模块完成（共 8626 行，449 REQ，214 US）

---

## 1. 阅读方法

| 你是谁 | 推荐阅读路径 |
|---|---|
| **产品经理** | _INDEX → _GLOSSARY → 各模块 §1 §2 §4 → _COVERAGE |
| **开发工程师** | _GLOSSARY → 各模块完整 → appendix 全部 |
| **测试工程师** | _COVERAGE → 各模块 §5 §6 §7 §9 |
| **新加入团队** | _GLOSSARY → M14（引导） → M01（终端） → 其他按需 |

---

## 2. 模块清单（15 个，全部 ✅）

### 终端核心（4 份）
| # | 模块 | 中文名 | 行数 | REQ | US | 状态 |
|---|---|---|---|---|---|---|
| M01 | [TERM_LIFECYCLE](modules/M01_TERM_LIFECYCLE.md) | 终端生命周期 | 618 | 40 | 15 | ✅ |
| M02 | [TERM_GRID](modules/M02_TERM_GRID.md) | 终端网格布局 | 519 | 30 | 12 | ✅ |
| M03 | [TERM_FOCUS](modules/M03_TERM_FOCUS.md) | 终端聚焦模式 | 516 | 28 | 15 | ✅ |
| M04 | [TERM_NOTIFY](modules/M04_TERM_NOTIFY.md) | 等待输入通知 | 514 | 18 | 13 | ✅ |

### 富编辑器（3 份）
| # | 模块 | 中文名 | 行数 | REQ | US | 状态 |
|---|---|---|---|---|---|---|
| M05 | [EDITOR_INPUT](modules/M05_EDITOR_INPUT.md) | 编辑器输入与草稿 | 528 | 30 | 15 | ✅ |
| M06 | [EDITOR_ATTACH](modules/M06_EDITOR_ATTACH.md) | 编辑器附件与图片粘贴 | 540 | 30 | 14 | ✅ |
| M07 | [EDITOR_SEND](modules/M07_EDITOR_SEND.md) | 输入发送与反馈 | 459 | 23 | 13 | ✅ |

### 聊天历史（3 份）
| # | 模块 | 中文名 | 行数 | REQ | US | 状态 |
|---|---|---|---|---|---|---|
| M08 | [CHAT_BROWSE](modules/M08_CHAT_BROWSE.md) | 聊天历史浏览 | 632 | 33 | 14 | ✅ |
| M09 | [CHAT_SEARCH](modules/M09_CHAT_SEARCH.md) | 聊天搜索与筛选 | 517 | 32 | 14 | ✅ |
| M10 | [CHAT_SYNC](modules/M10_CHAT_SYNC.md) | 聊天同步与导出 | 517 | 25 | 15 | ✅ |

### 文件与配置（3 份）
| # | 模块 | 中文名 | 行数 | REQ | US | 状态 |
|---|---|---|---|---|---|---|
| M11 | [FILE_PANEL](modules/M11_FILE_PANEL.md) | 文件面板 | 522 | 28 | 14 | ✅ |
| M12 | [FILE_VIEWER](modules/M12_FILE_VIEWER.md) | 文件三栏临时视图 | 631 | 40 | 15 | ✅ |
| M13 | [CONFIG_MGMT](modules/M13_CONFIG_MGMT.md) | Claude 配置管理 | 764 | 43 | 15 | ✅ |

### 跨模块（2 份）
| # | 模块 | 中文名 | 行数 | REQ | US | 状态 |
|---|---|---|---|---|---|---|
| M14 | [ONBOARD_PREFS](modules/M14_ONBOARD_PREFS.md) | 首次引导与偏好设置 | 726 | 34 | 14 | ✅ |
| M15 | [APP_RELIABILITY](modules/M15_APP_RELIABILITY.md) | 应用生命周期与异常 | 623 | 29 | 14 | ✅ |

**总计**：15 模块 / 8626 行 / 449 REQ / 214 US

---

## 3. 模块依赖关系

```
                 M14 ONBOARD_PREFS（偏好/引导，被所有模块引用）
                       │
                       ├── M15 APP_RELIABILITY（错误/离线/崩溃/关闭确认基调）
                       │
                       ├── M01 TERM_LIFECYCLE ─┬─ M02 TERM_GRID（平铺布局）
                       │                       ├─ M03 TERM_FOCUS（聚焦模式）
                       │                       └─ M04 TERM_NOTIFY（等待输入通知）
                       │
                       ├── M11 FILE_PANEL ──── M12 FILE_VIEWER（三栏视图）
                       │
                       ├── M13 CONFIG_MGMT（Skills/MCP/Hooks/Plugins）
                       │
                       ├── M05 EDITOR_INPUT ─┬─ M06 EDITOR_ATTACH（图片粘贴）
                       │                     └─ M07 EDITOR_SEND（发送反馈）
                       │                             │
                       │                             ↓（输入送达终端）
                       │                       M01 TERM_LIFECYCLE
                       │
                       └── M08 CHAT_BROWSE ─┬─ M09 CHAT_SEARCH（搜索筛选）
                                            └─ M10 CHAT_SYNC（归档导出）
                                                    │
                                                    ↓（恢复会话到终端）
                                              M01 TERM_LIFECYCLE
```

**共享基调 REQ**（被多模块引用）：
- `[M15-REQ-APP_RELIABILITY-019]` 离线横幅
- `[M15-REQ-APP_RELIABILITY-021/022]` 错误对话框三档视觉
- `[M15-REQ-APP_RELIABILITY-025]` 卡顿感知阈值（3 / 15 秒）
- `[M15-REQ-APP_RELIABILITY-007/008]` 关闭确认
- `[M15-REQ-APP_RELIABILITY-003/005]` 恢复语义

---

## 4. 附录清单

| 附录 | 内容 | 状态 |
|---|---|---|
| [A1_shortcuts](appendix/A1_shortcuts.md) | 全局快捷键 + 模块快捷键汇总 | ✅ |
| [A2_preferences](appendix/A2_preferences.md) | 25 项偏好设置完整清单 | ✅ |
| [A3_user_personas](appendix/A3_user_personas.md) | 用户画像细化 | ✅ |
| [A4_error_catalog](appendix/A4_error_catalog.md) | 用户可见错误文案目录 | ✅ |
| [A5_ui_state_matrix](appendix/A5_ui_state_matrix.md) | 五态交叉表 | ✅ |

---

## 5. 相关文件

- [_TEMPLATE.md](_TEMPLATE.md) — 模块 PRD 统一模板（11 章节）
- [_STYLE_GUIDE.md](_STYLE_GUIDE.md) — 风格指南 + 技术词黑名单
- [_GLOSSARY.md](_GLOSSARY.md) — 全局术语表
- [_CHANGELOG.md](_CHANGELOG.md) — 每批交付记录
- [_COVERAGE.md](_COVERAGE.md) — 测试用例 ↔ REQ-ID 映射

---

## 6. 不在本次 PRD 范围（明确排除）

以下 V2 功能**本次不写**，Rust 重构第一版也不实现：

- Skill 市场浏览、聚合、搜索
- Skill 一键安装、更新、卸载
- 安装前的安全审查
- 用户评分、评论、AI 自动评测
- Skill 展示页生成、分享链接、嵌入卡片
- Skill 发布流程、审核、下架
- 社区点赞、关注、讨论
- GitHub OAuth / 账号注册登录

以上功能的需求等到 V2 阶段单独立项再写。

---

## 7. 质量保证

**最终校验结果**：
- ✅ 15 个模块行数全部落在预算 ±15% 区间
- ✅ 技术词黑名单零泄漏（60 词全量扫描）
- ✅ 11 章节顺序合规
- ✅ 所有跨模块引用 `[M??-REQ-NNN]` 格式统一
- ✅ 每个模块都有 §10 明确不做的事
