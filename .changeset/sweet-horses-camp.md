---
'workers-tagged-logger': minor
---

feat: Remove Zod peer dependency

workers-tagged-logger no longer requires Zod as a peer dependency.
Zod was only used for generating types used for testing, and should not have been exported.

Consumers of this package shouldn't be relying on these Zod schemas, so hopefully this is not a breaking change for anyone.
