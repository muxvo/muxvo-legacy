# 测试覆盖映射

> 本文件建立测试用例 ID ↔ PRD REQ-ID 的双向映射，确保 `docs/Muxvo_测试_v2/02_modules/*.md` 里的每条测试用例都能映射到 PRD 的某个 REQ。
> V2 相关测试用例（BROWSER / INSTALL / SECURITY / SCORE / SHOWCASE / PUBLISH / COMMUNITY / AUTH）本次 PRD 不含，不做映射。

---

## 映射原则

- 一条测试用例 **必须** 对应一个或多个 REQ-ID
- 一个 REQ **可以** 被多条测试用例覆盖
- 测试用例如果找不到对应 REQ → 列入"漏覆盖清单"
- REQ 如果没有测试覆盖 → 列入"冗余清单"（可能是新增需求或测试遗漏）

---

## 测试模块 ↔ PRD 模块 总览

| 测试文件 | 对应 PRD 模块 |
|---|---|
| `test_TERM.md` | M01 / M02 / M03 / M04 |
| `test_EDITOR.md` | M05 / M06 / M07 |
| `test_CHAT.md` | M08 / M09 / M10 |
| `test_FILE_CONFIG.md` (FILE 部分) | M11 / M12 |
| `test_FILE_CONFIG.md` (CONFIG 部分) | M13 |
| `test_CROSS.md` (ONBOARD / APP) | M14 |
| `test_CROSS.md` (PERF / ERROR / DATA) | M15 |

---

## 详细映射表（按测试 ID 递增）

> **状态**：本映射表的详细行需在首次测试团队对齐时填充。下面给出骨架示例和方法论。

### 示例（M01 TERM_LIFECYCLE）

| 测试 ID | 测试描述 | REQ-ID | 备注 |
|---|---|---|---|
| TERM_L1_01 | 首次启动默认创建 1 个终端 | REQ-TERM_LIFECYCLE-008 | |
| TERM_L1_02 | ⌘T 创建新终端 | REQ-TERM_LIFECYCLE-010 | |
| TERM_L1_03 | 有前台任务时关闭弹确认 | REQ-TERM_LIFECYCLE-018 | |
| TERM_L2_01 | 命名持久化 | REQ-TERM_LIFECYCLE-025 | |
| ... | ... | ... | ... |

### 填充方法

1. 打开 `docs/Muxvo_测试_v2/02_modules/test_TERM.md`
2. 逐条读测试用例，在 PRD 模块中找对应 REQ
3. 填入本表
4. 无法对应的列入 §漏覆盖清单

---

## 漏覆盖清单（待填）

本节列出"测试文档有但 PRD 未覆盖"的用例。

| 测试 ID | 测试描述 | 建议处理 |
|---|---|---|
| — | — | — |

### 处理建议
- **补写 REQ**：测试用例反映了用户需求，应补进 PRD
- **移除测试**：测试用例已过时或与用户需求无关
- **归入 V2**：测试用例属于未在本次 PRD 范围的功能

---

## 冗余清单（PRD 有但测试未覆盖）

本节列出"PRD 定义了但没有测试用例"的 REQ。

| REQ-ID | 需求描述 | 建议处理 |
|---|---|---|
| — | — | — |

### 处理建议
- **补写测试**：推动测试团队补用例
- **降级为 P2**：需求不核心，可延后测试
- **删除 REQ**：需求是 Writer 过度推断，应精简

---

## 下一步

此映射表建议在以下时机填充：
1. **首次测试团队对齐**：与测试团队一起对照测试文档逐条映射
2. **Rust 重构启动前**：作为 Rust 团队接收 PRD 的交付检查之一
3. **每次 PRD 修订后**：保持同步

---

## 快速开始脚本（建议）

可写一个脚本自动提取 test_*.md 里所有形如 `TERM_L1_01` 的 ID，对照 PRD 里的 `REQ-TERM_LIFECYCLE-NNN`，初步匹配后人工复核。

此脚本留给首次对齐时一并实现。
