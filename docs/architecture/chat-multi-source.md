# Multi-Source Chat Architecture

Chat history reads from both Claude Code (`~/.claude/projects/`) and Codex (`~/.codex/sessions/`):

```
chat-handlers.ts → chat-multi-source.ts (aggregator)
                        ├── chat-dual-source.ts (CC reader + archive)
                        └── codex-chat-source.ts (Codex reader)
```

- Same project directory merges into one project (same `projectHash`)
- `SessionSummary.source` field (`'claude-code'` | `'codex'`) identifies origin
- Config/skills scanning also supports both `~/.claude/` and `~/.codex/` paths
