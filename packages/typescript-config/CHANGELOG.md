# @repo/typescript-config

## 0.3.8

### Patch Changes

- 3e51a90: chore: bump version

## 0.3.7

### Patch Changes

- c40dffe: chore: update deps and modernize monorepo
- ed3c346: chore: add missing include/exclude patterns in lib-emit.json

## 0.3.6

### Patch Changes

- 0654323: fix: update include/excludes in base.json
- 4ef6d88: chore: remove unused publishConfig

## 0.3.5

### Patch Changes

- 0c79cde: chore: update deps

## 0.3.4

### Patch Changes

- d605239: fix: add experimentalDecorators to workers.json

## 0.3.3

### Patch Changes

- 976c2cf: chore: update dependencies

## 0.3.2

### Patch Changes

- 1bd4a22: chore: change lib-emit.json to moduleResolution:bundler (instead of node)

  This seems to fix some issues I was having. Output still appears the same, so I think it's fine.

## 0.3.1

### Patch Changes

- 84e2513: chore: Switch to ES2022

## 0.3.0

### Minor Changes

- 3433a68: Add lib-emit.json

## 0.2.0

### Minor Changes

- 7ae8b95: fix: Add tsconfig for workers without node types

  Some packages don't need @types/node, and this was a bit annoying to work with.

### Patch Changes

- 7ae8b95: chore: update tsconfig
- bdbe259: fix: remove hono from packages that don't need it
- e89bf36: fix: revert hono version due to breaking change

## 0.1.8

### Patch Changes

- 8cda7b1: chore: update deps

## 0.1.7

### Patch Changes

- c7cb238: feat: Add WorkersLogger
