---
'create-workers-monorepo': minor
---

feat: always keep AGENTS.md, make CLAUDE.md the only optional agent file

- The template consolidated all agent docs into AGENTS.md (with CLAUDE.md as a
  symlink to it) and removed the `.cursor`, `.windsurf`, and `.claude` rule
  directories, so the per-assistant checkbox no longer maps to real files
- The AI rules prompt is now a single yes/no question for including
  Claude-specific files (CLAUDE.md), defaulting to yes when the `claude` CLI is
  installed; AGENTS.md is always included
