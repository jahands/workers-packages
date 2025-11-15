---
'cron-workflow': patch
---

fix: use next run time in workflows instance id

ensures we don't create duplicate instances (which we occasionally saw happen)
