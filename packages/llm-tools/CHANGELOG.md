# llm-tools

## 0.2.2

### Patch Changes

- 6ddcd10: chore: don't use object spreading in eslint.config.ts

## 0.2.1

### Patch Changes

- 752f75b: fix: trim final newlines in fmt.trim()

## 0.2.0

### Minor Changes

- 4439165: feat: create new llm-tools package with format utilities

  Adds a new `llm-tools` package containing formatting utilities for working with LLMs:

  - `fmt.trim()` - Removes unnecessary indentation while preserving relative spacing
  - `fmt.oneLine()` - Converts multi-line strings to single line
  - `fmt.asTSV()` - Converts object arrays to tab-separated values (better for LLMs than JSON)

  These utilities were moved from the `cli-tools` package to provide a focused package for LLM-related tooling.

### Patch Changes

- 36621f6: chore: add eslint-config as a dependency to all packages
