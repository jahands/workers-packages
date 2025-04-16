---
'workers-tagged-logger': patch
---

chore: change log level from error to warn when unable to get logs from ALS

The logger can still function without it and this is causing Workers Observability to show a lot of errors for these messages, which makes it harder to identify actual errors.
