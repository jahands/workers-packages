---
'workers-tagged-logger': minor
---

feat: drop the zod dependency

`useWorkersLogger` checks `ENVIRONMENT` and `request.cf.colo` with plain type checks, so installing
the logger no longer installs zod. `LoggerHonoBindings` is now only a type; the runtime zod schema
it used to be is gone.
