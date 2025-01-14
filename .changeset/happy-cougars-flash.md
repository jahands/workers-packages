---
'workers-tagged-logger': patch
---

BANDA-600 chore: Simplify type for withLogTags()

This function doesn't need to be async because als.run() is not async.
