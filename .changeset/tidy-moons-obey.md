---
'dagger-env': major
---

feat(BREAKING): replace 1Password integration with Infisical in the command runner

- `createDaggerCommandRunner()` config is now `{ projectId, env, path }` (Infisical project ID, environment slug, and folder path) instead of `{ opVault, opItem, opSections }`
- Removed the `dagger-env/op` entrypoint (1Password item schemas)
- Secrets are fetched via `infisical export` and the command runs `dagger call` directly instead of wrapping it in `op run --no-masking`
- In CI, `DAGGER_CLOUD_TOKEN` is read from the same Infisical fetch and passed to the runner env (it is still stripped from `DAGGER_OPTIONS` by the options schema)
