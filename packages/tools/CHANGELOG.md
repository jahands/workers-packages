# @repo/tools

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
