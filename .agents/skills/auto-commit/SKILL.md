---
name: auto-commit
description: Git commit guidelines for incremental commits. Read this when user asks you to auto commit as you go
---

Commit incrementally as you work, one logical change per commit.

- Format: `<type>: <subject>` with an optional body. Types: feat, fix, chore, docs, style, refactor, test, perf. If `git log` shows a different style (e.g. scopes), follow it
- Subject: imperative, lowercase, no trailing period, at most 90 characters
- Body: only when the change needs context; explain what and why, wrapped at 72 characters
- Stage only your own changes, since the working tree may hold the user's work; in files they also edited, stage only your hunks
