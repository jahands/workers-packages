# @jahands/cli-tools

## 0.10.4

### Patch Changes

- a80f517: fix: adjust peerDependencies for Zod

## 0.10.3

### Patch Changes

- d7f5555: chore: update zod to latest v3 beta

## 0.10.2

### Patch Changes

- 0afdbb3: chore: update deps (zod)

## 0.10.1

### Patch Changes

- 1620010: fix: actually run typechecks

## 0.10.0

### Minor Changes

- 86c47d0: feat: add tree-shakable exports

## 0.9.3

### Patch Changes

- cff3263: chore: update deps (zod 4)

## 0.9.2

### Patch Changes

- 1107eb2: fix: add suffix if includeDuration is specified without groupSuffix
- 8bfbb3e: fix: output prefix/suffix at the same time as other lines (fixes race condition)
- 46c7dce: chore: remove unnecessary final newline logic
- 9e0e973: fix: properly combined stderr and stdout streams in prefixOutput
- 80f35b2: fix: consistently format duration

## 0.9.1

### Patch Changes

- 3386bdd: fix: add includeDuration support to prefixStdout and prefixStderr

## 0.9.0

### Minor Changes

- 41ea14b: feat: add includeDuration option to PrefixOptions

## 0.8.3

### Patch Changes

- a345a8b: fix: don't add newline to start of suffix
- a143009: fix: wait for all output before writing groupSuffix

## 0.8.2

### Patch Changes

- 254b7ea: chore: auto add newlines to start and end of groupPrefix/groupSuffix

## 0.8.1

### Patch Changes

- 5e40b78: fix: only output groupPrefix and groupSuffix in stderr to prevent duplicate output

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
