---
'@jahands/cli-tools': patch
'create-workers-monorepo': patch
'create-wrangler-config': patch
'llm-rules': patch
'turbo-config': patch
---

chore: import zx utilities explicitly instead of relying on `zx/globals`

`@jahands/cli-tools/proc` previously referenced `ProcessOutput` and `chalk` as globals, so helpers like `catchProcessError()` threw a `ReferenceError` unless the consumer had imported `zx/globals`. They are now imported from `zx` directly.
