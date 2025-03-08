# @jahands/otel-cf-workers

## 0.1.17

### Patch Changes

- 277a7ac: chore: switch to shared bundle script

## 0.1.16

### Patch Changes

- 52486bb: chore: include NOTICE in package

## 0.1.15

### Patch Changes

- 5ae7660: chore: Only include dist directory in published package

## 0.1.14

### Patch Changes

- 03df0b2: chore: update dependencies

## 0.1.13

### Patch Changes

- 8cd7263: Remove bun from dependencies to speed up pnpm install time

  I originally added bun as a dep here for "correctness", but it made pnpm install time ~tripple. We already have bun in `.mise.toml`, which is good enough for me.

## 0.1.12

### Patch Changes

- 7ec60a9: fix: Stop building lib twice

## 0.1.11

### Patch Changes

- 8f1ce67: chore: simplify build scripts
- 393ebec: fix: Don't rename .d.ts files so that types actually work

## 0.1.10

### Patch Changes

- 4c80af9: chore: update log level in build-lib.ts

## 0.1.9

### Patch Changes

- b6447f2: chore: update readme to shorten install instructions

## 0.1.8

### Patch Changes

- 9d8540b: chore: Add installation instructions for other package managers
- bdbe259: fix: remove hono from packages that don't need it
- 10cd896: chore: update dependencies
- e89bf36: fix: revert hono version due to breaking change

## 0.1.7

### Patch Changes

- 05820d6: chore: Simplify build scripts
- 7268a6e: chore: simplify esbuild script
- 275888f: chore: run esbuild with bun instead of tsx

## 0.1.6

### Patch Changes

- b2a1bb1: Unset platform (doesn't seem to be needed, and makes bundle slightly smaller)

## 0.1.5

### Patch Changes

- aca9d27: chore: add homepage to package.json

## 0.1.4

### Patch Changes

- 2260542: chore: add repository to package.json

## 0.1.3

### Patch Changes

- 3866cd1: chore: update readme
- 951fcba: fix: Switch to public registry

## 0.1.2

### Patch Changes

- 6f45e9e: chore: Mark package as public

## 0.1.1

### Patch Changes

- a5894b1: fix: use correct eslint config name
- 748bd88: fix: Use tsx instead of bun in build scripts
