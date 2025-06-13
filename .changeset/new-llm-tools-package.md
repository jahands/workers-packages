---
'llm-tools': minor
---

feat: create new llm-tools package with format utilities

Adds a new `llm-tools` package containing formatting utilities for working with LLMs:

- `fmt.trim()` - Removes unnecessary indentation while preserving relative spacing
- `fmt.oneLine()` - Converts multi-line strings to single line  
- `fmt.asTSV()` - Converts object arrays to tab-separated values (better for LLMs than JSON)

These utilities were moved from the `cli-tools` package to provide a focused package for LLM-related tooling.
