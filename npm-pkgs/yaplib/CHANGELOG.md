# yaplib

## 0.2.3

### Patch Changes

- ee71a39: fix: embed sourcesContent in published .js.map files

  Enable `inlineSources` in the shared lib-emit tsconfig so that published
  source maps embed source content rather than referencing `../src/*.ts`
  files that aren't included in the npm tarball. Resolves bundler warnings
  (e.g. Vite) when consuming these packages.

## 0.2.2

### Patch Changes

- 4a81f0b: chore: update readme

## 0.2.1

### Patch Changes

- 10927ad: fix: export deferSync in index.ts

## 0.2.0

### Minor Changes

- 2668d2e: feat: add defer() and deferSync()
