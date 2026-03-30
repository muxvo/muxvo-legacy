# Muxvo 终端 Tab 前端 UI - PRD V2.0

> **所属产品**：Muxvo（Electron 桌面工作台）
> **模块**：终端 Tab（核心功能页）
> **版本**：V2.0
> **创建时间**：2026-03-01
> **状态**：前端 UI 重写版
> **重写范围**：仅前端 UI（Renderer 进程），后端服务和 IPC 接口不变

---

## 文档结构

| # | 文件 | 说明 |
|---|------|------|
| — | [`_SUMMARY.md`](./_SUMMARY.md) | 产品摘要：定位、功能清单、重写边界、核心策略、非功能需求 |
| 01 | [`modules/01-terminal-lifecycle.md`](./modules/01-terminal-lifecycle.md) | 终端生命周期 — 前端状态管理：创建/关闭的 UI 流程、状态展示、命名、CWD |
| 02 | [`modules/02-tiling-mode.md`](./modules/02-tiling-mode.md) | 平铺模式：Grid 布局、Tile 组件、动画、Resize Handle、拖拽重排 |
| 03 | [`modules/03-focused-mode.md`](./modules/03-focused-mode.md) | 聚焦模式：布局、visibility:hidden 策略、过渡动画、侧边栏、WaitingInput 通知 |
| 04 | [`modules/04-list-mode.md`](./modules/04-list-mode.md) | 列表模式：左侧列表、右侧全屏终端、选中态 |
| 05 | [`modules/05-xterm-rendering.md`](./modules/05-xterm-rendering.md) | XTerm 渲染：buffer 回放、fit 管理、搜索、缩放 |
| 06 | [`modules/06-visual-effects.md`](./modules/06-visual-effects.md) | 视觉效果：状态点动画、主题、WaitingInput 脉动、入场动画 |
| 07 | [`modules/07-onboarding-tour.md`](./modules/07-onboarding-tour.md) | 新手引导 Tour：4 步交互引导 |
| 08 | [`modules/08-settings-shortcuts.md`](./modules/08-settings-shortcuts.md) | 设置与快捷键 |
| A | [`appendix/appendix-a-state-machine.md`](./appendix/appendix-a-state-machine.md) | 附录 A：终端进程状态机完整定义（定义在 shared 层，不改动） |
| B | [`appendix/appendix-b-ipc-channels.md`](./appendix/appendix-b-ipc-channels.md) | 附录 B：IPC 接口契约（不变）——前端调用参考 |

---

## 模块间依赖关系

```
01-terminal-lifecycle ◄─── 所有视图模块的基础（02/03/04 均依赖终端实例）
        │
        ├── 02-tiling-mode ◄─── 默认视图，03 和 04 可从此切换进入
        ├── 03-focused-mode ◄─── 从 02 双击进入，依赖侧边栏组件
        └── 04-list-mode ◄─── 独立视图，与 02/03 互斥

05-xterm-rendering ◄─── 所有视图模块的渲染层（02/03/04 均内嵌 XTerm）
06-visual-effects ◄─── 横切关注点，为 01~04 提供动画和状态视觉
07-onboarding-tour ◄─── 依赖 01（创建终端）和 02（Tiling 演示）
08-settings-shortcuts ◄─── 独立模块，影响 02/03/04 的行为参数
```

---

## 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| V2.0 | 2026-03-01 | 前端 UI 重写版：范围限定为 Renderer 进程，后端服务和 IPC 接口不变。新增重写边界说明、React 状态管理章节、hooks 拆分设计 |
| V1.0 | 2026-03-01 | 初版：8 个功能模块 + 2 个附录，覆盖终端 Tab 完整功能 |
