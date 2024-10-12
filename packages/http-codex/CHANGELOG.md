# http-codex

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
