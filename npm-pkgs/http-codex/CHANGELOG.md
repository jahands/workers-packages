# http-codex

## 0.6.6

### Patch Changes

- e21bcec: chore: formatting

## 0.6.5

### Patch Changes

- 7de9d94: chore: update deps
- f88228f: chore: bump compat date to 2025-10-08
- ccf4780: chore: update compat date to 2025-09-20 due to issues with 9/21+

## 0.6.4

### Patch Changes

- 3e51a90: chore: bump version

## 0.6.3

### Patch Changes

- ed3c346: chore: add publishConfig to package.json
- c40dffe: chore: update deps and modernize monorepo
- ed3c346: chore: add bugs field to package.json
- ed3c346: chore: update package path in package.json

## 0.6.2

### Patch Changes

- 6ddcd10: chore: don't use object spreading in eslint.config.ts

## 0.6.1

### Patch Changes

- 06744db: chore: update deps (zod)

## 0.6.0

### Minor Changes

- 0feff92: feat: add httpMethod to http-codex

## 0.5.11

### Patch Changes

- dccaff1: chore: update deps (zod)

## 0.5.10

### Patch Changes

- 36621f6: chore: add eslint-config as a dependency to all packages

## 0.5.9

### Patch Changes

- 4052d19: chore: update deps (zod)

## 0.5.8

### Patch Changes

- 0c79cde: chore: update deps

## 0.5.7

### Patch Changes

- d7f5555: chore: update zod to latest v3 beta

## 0.5.6

### Patch Changes

- 0afdbb3: chore: update deps (zod)

## 0.5.5

### Patch Changes

- 1620010: fix: actually run typechecks

## 0.5.4

### Patch Changes

- cff3263: chore: update deps (zod 4)

## 0.5.3

### Patch Changes

- 976c2cf: chore: update dependencies

## 0.5.2

### Patch Changes

- 1bd4a22: fix: add missing .js extensions to relative imports

## 0.5.1

### Patch Changes

- 84e2513: chore: Switch to ES2022

## 0.5.0

### Minor Changes

- 3433a68: chore: Switch from esbuild to tsc
- 204f849: chore: Switch from esbuild to tsc

## 0.4.6

### Patch Changes

- 5ae7660: chore: Only include dist directory in published package

## 0.4.5

### Patch Changes

- 03df0b2: chore: update dependencies

## 0.4.4

### Patch Changes

- f15b06c: fix example in README

## 0.4.3

### Patch Changes

- 8cd7263: Remove bun from dependencies to speed up pnpm install time

  I originally added bun as a dep here for "correctness", but it made pnpm install time ~tripple. We already have bun in `.mise.toml`, which is good enough for me.

## 0.4.2

### Patch Changes

- 3b5dd29: fix: improve tree-shaking of root import when only importing isNullBodyStatus

## 0.4.1

### Patch Changes

- 24dd518: fix: hardcode null body statuses to improve tree shaking

## 0.4.0

### Minor Changes

- 0194ca5: feat: Add `isNullBodyStatus()`

  This helper is useful in situations where you need to fetch a resource and then customize the response returned.

  Example:

  ```ts
  import { httpStatus, isNullBodyStatus } from 'http-codex'

  const res = await fetch(url) // Might be 204, 304, etc.
  return new Response(isNullBodyStatus(res.status) ? null : res.body, {
    // Useful for when we need to customize response headers/init/etc.
  })
  ```

## 0.3.2

### Patch Changes

- 92f7c87: chore: update readme

## 0.3.1

### Patch Changes

- 84770fd: chore: update readme (formatting)

## 0.3.0

### Minor Changes

- 5dc4d1c: feat: Rename http -> httpStatus for improved readability

  `http` felt like too broad a name given that this package only contains status codes.

### Patch Changes

- 7ec60a9: fix: Stop building lib twice
- 6eda69c: chore: Make type a bit more narrow

## 0.2.2

### Patch Changes

- 8f1ce67: chore: simplify build scripts
- 393ebec: fix: Don't rename .d.ts files so that types actually work

## 0.2.1

### Patch Changes

- 70592b5: chore: update readme

## 0.2.0

### Minor Changes

- 4eec9b8: Refactor http-codex to create a smaller bundle

## 0.1.2

### Patch Changes

- b6447f2: chore: update readme to shorten install instructions

## 0.1.1

### Patch Changes

- bdbe259: fix: remove hono from packages that don't need it
- bfac029: feat: add http-codex package

  I love using Go's http package for status codes and always find myself missing it in TypeScript projects. This project aims to be a lightweight adaption of Go's [http status codes](https://go.dev/src/net/http/status.go).

  Enjoy!

- 10cd896: chore: update dependencies
- e89bf36: fix: revert hono version due to breaking change
- 7e6ba85: fix: Convert RFC comments to docstrings
