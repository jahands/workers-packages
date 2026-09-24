# AGENTS.md

## Zod

- Import Zod as a namespace: `import * as z from 'zod'`, never `import { z } from 'zod'`.
- Import from `'zod'`, not `'zod/v4'`, except in `cli-tools` and `dagger-env`, whose peer range still allows zod 3.25.

## Skills

Shared skills are declared in `agents.toml` and installed to `.agents/skills/` with [dotagents](https://github.com/getsentry/dotagents). Run `just update skills` to install and commit them.
