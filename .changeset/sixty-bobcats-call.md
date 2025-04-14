---
'@repo/vanilla-worker': patch
'@repo/hono-app': patch
---

chore: remove Zod schema imports in tests

workers-tagged-logger no longer exports Zod schemas, so we had to change to type imports in these tests
