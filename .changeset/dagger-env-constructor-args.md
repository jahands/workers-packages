---
'dagger-env': minor
---

feat: add `constructorArgs` to the command runner

- `runDaggerCommand()` accepts `constructorArgs`, module constructor flags
  placed before the command name (`dagger call --source=. <command>`), since
  `dagger call` rejects them after it
