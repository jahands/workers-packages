# create-workers-monorepo

## 0.8.5

### Patch Changes

- fffdffd: chore: update deps

## 0.8.4

### Patch Changes

- 09824ac: fix: correct spelling of just cmd

## 0.8.3

### Patch Changes

- b26d86c: fix: update AmpCode integration to use AGENTS.md instead of AGENT.md

  AmpCode now prefers AGENTS.md

## 0.8.2

### Patch Changes

- 1332152: chore: update deps (zod@4.1.1)

## 0.8.1

### Patch Changes

- d540cab: chore: update deps (zod@3.25.76)

## 0.8.0

### Minor Changes

- 92490d7: feat: allow picking just install method and add npm as an install method

## 0.7.0

### Minor Changes

- f6ff299: feat: check for just installation and offer to install

  Checks if just is installed and offers to install it automatically. Supports Windows (winget), macOS (mise/brew), and Linux (apt/dnf/pacman).

## 0.6.4

### Patch Changes

- 4b71aca: fix: remove .claude/ directory from template

## 0.6.3

### Patch Changes

- 4943347: chore: update deps (zod)

## 0.6.2

### Patch Changes

- cd492ec: chore: update deps (zod)

## 0.6.1

### Patch Changes

- f6ce031: fix: update rule list

## 0.6.0

### Minor Changes

- e9b5509: feat: remove various files from template

### Patch Changes

- a1e9531: chore: update deps
- 555ea67: chore: rename monorepo.ts -> create-monorepo.ts
- a1e9531: chore: upgrade to eslint 9

## 0.5.3

### Patch Changes

- e463724: chore: add license

## 0.5.2

### Patch Changes

- ac31858: feat: detect amp command for AmpCode

## 0.5.1

### Patch Changes

- 86cd851: chore: ask for AI preferences before creating monorepo

## 0.5.0

### Minor Changes

- 42e2147: feat: Add AI coding assistant rules

### Patch Changes

- be2804b: chore: update dependencies (zod, etc.)
- bf36f95: chore: update deps
- 347a85c: chore: update deps (@jahands/cli-tools)

## 0.4.3

### Patch Changes

- 5dd0695: chore: update wording

## 0.4.2

### Patch Changes

- d4db359: chore: add demo to readme

## 0.4.1

### Patch Changes

- 5bd4e5d: chore: exit with code 0 when operation is cancelled

## 0.4.0

### Minor Changes

- 9f65465: feat: add option to install dependencies during setup

### Patch Changes

- a0ddf82: fix: don't print stack trace when prompt is inturrupted

## 0.3.1

### Patch Changes

- c160ac8: chore: refactor cli into separate file
- c9c290a: chore: move helpers to separate files

## 0.3.0

### Minor Changes

- 6950914: feat: make GitHub Actions optional and offer to open in vscode or cursor

## 0.2.2

### Patch Changes

- 778e9e3: fix: add shebang to create-workers-monorepo.ts
- 28918a1: chore: update readme

## 0.2.1

### Patch Changes

- b6b6dea: fix: update main and bin fields
- 832e30f: chore: add additional metadata to package.json

## 0.2.0

### Minor Changes

- 3670fb6: feat: scaffold cli

### Patch Changes

- c245d31: chore: don't output types
- 4c2037f: chore: switch to zx/core for smaller bundle size
- 48d93b4: fix: add files list in package.json
- 26a9fd1: chore: mark sourcemap as external to reduce bundle size
- 412468a: chore: switch to zx/globals import
- f3cf356: chore: update deps
- 76a373d: chore: add --minify flag to build command
- 22c584b: chore: switch to tree-shakable import
