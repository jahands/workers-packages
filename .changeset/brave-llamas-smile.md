---
'@repo/typescript-config': minor
---

fix: Add tsconfig for workers without node types

Some packages don't need @types/node, and this was a bit annoying to work with.
