# http-codex

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
