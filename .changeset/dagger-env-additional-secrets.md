---
'dagger-env': minor
---

feat: add `additionalSecrets` to the command runner

- `createDaggerCommandRunner()` accepts `additionalSecrets`, a record of secrets
  merged into the ones fetched from the provider (Infisical or 1Password),
  taking precedence on conflict
- Entries with an undefined value are skipped, so a credential that only exists
  in some environments (e.g. a token issued to the CI runner) can be forwarded
  without a separate config path
- Forwarded secrets still have to be declared in the `DaggerEnv` secrets schema
  to survive parsing, and reach the container as Dagger secrets rather than
  cached env vars
