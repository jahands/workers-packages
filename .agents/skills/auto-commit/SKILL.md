---
name: auto-commit
description: Git commit guidelines for incremental commits. Read this when user asks you to auto commit as you go
---

## Git Commit Guidelines

When making changes to code, commit your changes incrementally as you work.

### Commit Format

```
<type>: <subject>

<body>
```

### Commit Types

- **feat:** New feature or functionality
- **fix:** Bug fix
- **chore:** Maintenance tasks, dependency updates, configuration changes
- **docs:** Documentation only changes
- **style:** Code style/formatting changes (no functional changes)
- **refactor:** Code restructuring without changing functionality
- **test:** Adding or modifying tests
- **perf:** Performance improvements

### Subject Line Rules

- Maximum 90 characters
- Start with lowercase
- No period at the end
- Use imperative mood ("add" not "adds" or "added")

### Body Rules

- Separate from subject with blank line
- Wrap at 72 characters
- Explain what and why, not how
- Only include when the change requires context

### Commit Frequency

- Commit after each logical unit of change
- Each commit should represent one coherent change
- Don't bundle unrelated changes

## Examples

### Good Examples

```
feat: add user authentication middleware

Implements JWT-based authentication for API routes.
Includes token validation and refresh logic.
```

```
fix: resolve null pointer in user lookup
```

```
chore: update dependencies to latest versions
```

### Bad Examples

```
feat: added new feature to the application that allows users to authenticate using JWT tokens and also fixed some bugs and updated dependencies
```

```
fix: Fixed bug.
```

## Key Principles

- Be concise but descriptive
- One commit = one logical change
- Commit message should make sense without looking at the code
- Skip the body if the subject line is self-explanatory
