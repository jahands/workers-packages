# @repo/tools

## 0.9.2

### Patch Changes

- 00147c2: chore: update deps
- 0afdbb3: chore: update deps (zod)
- Updated dependencies [0afdbb3]
  - @jahands/cli-tools@0.10.2

## 0.9.1

### Patch Changes

- Updated dependencies [1620010]
  - @jahands/cli-tools@0.10.1

## 0.9.0

### Minor Changes

- f2a5b99: feat: only import typescript when needed to speed up other commands

### Patch Changes

- 7f18c93: chore: update build commands based on workers-monorepo-template

## 0.8.2

### Patch Changes

- cff3263: chore: update deps (zod 4)

## 0.8.1

### Patch Changes

- 020c037: chore: remove unused build tests command

## 0.8.0

### Minor Changes

- 277a7ac: feat: add shared bundle-lib command

## 0.7.7

### Patch Changes

- 3433a68: Add / improve scripts

## 0.7.6

### Patch Changes

- 94e1ff2: chore: Remove unused functions

## 0.7.5

### Patch Changes

- 32560f8: chore: remove unused files

## 0.7.4

### Patch Changes

- 03df0b2: chore: update dependencies

## 0.7.3

### Patch Changes

- 8cd7263: Remove bun from dependencies to speed up pnpm install time

  I originally added bun as a dep here for "correctness", but it made pnpm install time ~tripple. We already have bun in `.mise.toml`, which is good enough for me.

## 0.7.2

### Patch Changes

- 0802957: chore: Add script to remove .turbo cache directories when creating release

## 0.7.1

### Patch Changes

- d16cd6d: fix: Don't allow eslint warnings in CI

## 0.7.0

### Minor Changes

- 8432257: feat: add run-vitest-ci script

### Patch Changes

- bdbe259: fix: remove hono from packages that don't need it
- 10cd896: chore: update dependencies
- e89bf36: fix: revert hono version due to breaking change
- bef7970: fix: make mise.toml plugins optional

## 0.6.6

### Patch Changes

- 275888f: chore: run esbuild with bun instead of tsx
- a394dc8: fix: move bun to deps instead of devdeps

## 0.6.5

### Patch Changes

- 8cda7b1: chore: update deps
- f7ae571: chore: remove unused import

## 0.6.4

### Patch Changes

- 0bf2131: chore: Use md5 function from node:crypto

## 0.6.3

### Patch Changes

- c7cb238: feat: Add WorkersLogger
