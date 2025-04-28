# @jahands/cli-tools

## 0.8.0

### Minor Changes

- 45a7abc: feat: enforce PrefixOptions at the type level

## 0.7.7

### Patch Changes

- 747615f: feat: add groupPrefix and groupSuffix options
- 2617c8b: chore(BREAKING): improve order of arguments in prefix functions

## 0.7.6

### Patch Changes

- 974ecfb: fix: improve reliability of prefixStdout and prefixStderr

## 0.7.5

### Patch Changes

- d605239: fix: force color in cli-tools tests
- d605239: fix: Don't use zod to parse not found errors

  Fixes issue introduced by Zod 4

## 0.7.4

### Patch Changes

- 1099c3c: fix: add require export

  fixes an issue I was having with a project that uses tsx

## 0.7.3

### Patch Changes

- 1bd4a22: fix: add missing .js extensions to relative imports

## 0.7.2

### Patch Changes

- 3f9d245: fix: add .js extensions to imports

  Fixes an issue with Node environments that are unable to resolve without bundling first

## 0.7.1

### Patch Changes

- 84e2513: chore: Switch to ES2022

## 0.7.0

### Minor Changes

- 204f849: chore: Switch from esbuild to tsc

## 0.6.0

### Minor Changes

- 2ad03f1: feat: Add catchProcessError for improved zx error handling with commander

## 0.5.2

### Patch Changes

- 5ae7660: chore: Only include dist directory in published package

## 0.5.1

### Patch Changes

- a58a02c: fix: export cmd in package

## 0.5.0

### Minor Changes

- f6ed04f: feat: Add cmdExists function

## 0.4.1

### Patch Changes

- ba71b8e: fix: explicitly import zx dependency (chalk)

## 0.4.0

### Minor Changes

- 826afb5: feat: Add dirExistsSync()

### Patch Changes

- 4ada922: fix: explicitly import zx utilities rather than relying on globals

## 0.3.0

### Minor Changes

- 2055c58: feat: Add sleep() helper

## 0.2.0

### Minor Changes

- 013b7dc: fix: bump minimum zod and zx versions to fix type issues

### Patch Changes

- 03df0b2: chore: update dependencies

## 0.1.1

### Patch Changes

- 8aca1fb: feat: Add @jahands/cli-tools package
