# dagger-env

## 1.2.0

### Minor Changes

- 5598524: feat: add `additionalSecrets` to the command runner
  - `createDaggerCommandRunner()` accepts `additionalSecrets`, a record of secrets
    merged into the ones fetched from the provider (Infisical or 1Password),
    taking precedence on conflict
  - Entries with an undefined value are skipped, so a credential that only exists
    in some environments (e.g. a token issued to the CI runner) can be forwarded
    without a separate config path
  - Forwarded secrets still have to be declared in the `DaggerEnv` secrets schema
    to survive parsing, and reach the container as Dagger secrets rather than
    cached env vars

## 1.1.0

### Minor Changes

- 68dae55: feat: re-add 1Password support to the command runner alongside Infisical
  - `createDaggerCommandRunner()` now accepts either Infisical config (`{ projectId, env, path }`) or 1Password config (`{ opVault, opItem, opSections }`) — the provider is selected by the config shape
  - With 1Password config, secrets are fetched via `op item get` and `dagger call` is wrapped in `op run --no-masking` (restoring the pre-1.0 behavior); in CI, `DAGGER_CLOUD_TOKEN` is passed as an `op://` reference
  - Restored the `dagger-env/op` entrypoint (1Password item schemas)

## 1.0.0

### Major Changes

- 1f8a4f4: feat(BREAKING): replace 1Password integration with Infisical in the command runner
  - `createDaggerCommandRunner()` config is now `{ projectId, env, path }` (Infisical project ID, environment slug, and folder path) instead of `{ opVault, opItem, opSections }`
  - Removed the `dagger-env/op` entrypoint (1Password item schemas)
  - Secrets are fetched via `infisical export` and the command runs `dagger call` directly instead of wrapping it in `op run --no-masking`
  - In CI, `DAGGER_CLOUD_TOKEN` is read from the same Infisical fetch and passed to the runner env (it is still stripped from `DAGGER_OPTIONS` by the options schema)

## 0.6.8

### Patch Changes

- ee71a39: fix: embed sourcesContent in published .js.map files

  Enable `inlineSources` in the shared lib-emit tsconfig so that published
  source maps embed source content rather than referencing `../src/*.ts`
  files that aren't included in the npm tarball. Resolves bundler warnings
  (e.g. Vite) when consuming these packages.

- 9660506: chore: update dagger to 0.20.3

## 0.6.7

### Patch Changes

- fc8fec7: chore: update dagger to 0.20.0

## 0.6.6

### Patch Changes

- 80ff81c: chore: bump @dagger.io/dagger to 0.19.9 in dev deps

## 0.6.5

### Patch Changes

- e21bcec: chore: formatting

## 0.6.4

### Patch Changes

- 40a18da: chore: bump min zod 4 version to 4.1.12

## 0.6.3

### Patch Changes

- 3e51a90: chore: bump version

## 0.6.2

### Patch Changes

- ed3c346: chore: add publishConfig to package.json
- 051259d: chore: update readme
- ed3c346: chore: add bugs field to package.json
- ed3c346: chore: update deps
- ed3c346: chore: update package path in package.json

## 0.6.1

### Patch Changes

- fffdffd: chore: update deps

## 0.6.0

### Minor Changes

- ffa453f: feat(BREAKING): add withoutEnv() to getWithEnv() and switch to returning an object

## 0.5.2

### Patch Changes

- 1332152: chore: update deps (zod@4.1.1)

## 0.5.1

### Patch Changes

- d540cab: chore: update deps (zod@3.25.76)

## 0.5.0

### Minor Changes

- 1014656: feat: add type safety for secret names

### Patch Changes

- 0c5ddeb: chore: simplify dagger-env test configs

## 0.4.2

### Patch Changes

- ccae119: fix: use range for Zod peer dependency

## 0.4.1

### Patch Changes

- 70ac37f: chore: change order of opSection params

## 0.4.0

### Minor Changes

- 6db8e9b: feat: add 1password integration and command runner to dagger-env

  Extends dagger-env package with new features:
  - Adds command runner with 1Password secret integration
  - Provides new `/run` export for executing Dagger commands
  - Updates README with comprehensive documentation for new functionality
  - Introduces type-safe command execution with environment validation

  Enables more robust secret management and simplified Dagger command execution across different environments

### Patch Changes

- 4943347: chore: update deps (zod)
- 434c569: fix: improve secret type checking in dagger environment

  Enhances type validation for secret objects by adding function type checks for 'id' and 'plaintext' methods

  Ensures more robust type checking by verifying that secret objects not only have the required properties but also that those properties are functions

## 0.3.0

### Minor Changes

- 352d201: feat: add 1Password schema to dagger-env

## 0.2.1

### Patch Changes

- f3c6014: fix: actually export dagger-env

## 0.2.0

### Minor Changes

- cd492ec: feat: add dagger-env package

### Patch Changes

- cd492ec: chore: update deps (zod)
