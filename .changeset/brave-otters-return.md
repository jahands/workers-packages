---
'dagger-env': minor
---

feat: re-add 1Password support to the command runner alongside Infisical

- `createDaggerCommandRunner()` now accepts either Infisical config (`{ projectId, env, path }`) or 1Password config (`{ opVault, opItem, opSections }`) — the provider is selected by the config shape
- With 1Password config, secrets are fetched via `op item get` and `dagger call` is wrapped in `op run --no-masking` (restoring the pre-1.0 behavior); in CI, `DAGGER_CLOUD_TOKEN` is passed as an `op://` reference
- Restored the `dagger-env/op` entrypoint (1Password item schemas)
