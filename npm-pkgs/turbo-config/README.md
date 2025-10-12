# turbo-config

[![npm version](https://badge.fury.io/js/turbo-config.svg)](https://badge.fury.io/js/turbo-config)

`turbo-config` lets you author your Turborepo configuration in TypeScript via `turbo.config.ts` instead of `turbo.json`.

It does this by generating `turbo.json` from `turbo.config.ts` via `npx turbo-config`.

## Why use `turbo.config.ts`?

I found that more advanced configuration was tedious and error-prone when editing `turbo.json` directly.

## Install

```bash
# npm
npm install --save-dev turbo-config
# pnpm
pnpm add --save-dev turbo-config
# bun
bun add --dev turbo-config
# yarn
yarn add --dev turbo-config
```

`turbo-config` searches upward from the current working directory to find your `turbo.config.ts`, so
install it wherever you run your repo tasks.

## Create `turbo.config.ts`

```ts
// turbo.config.ts
import { defineConfig } from 'turbo-config'

export default defineConfig(async () => ({
  globalEnv: ['CI', 'FORCE_COLOR'],
  remoteCache: { enabled: true },
  tasks: {
    build: {
      dependsOn: ['^build'],
      outputs: ['dist/**'],
    },
    lint: {
      cache: false,
      dependsOn: ['build'],
    },
  },
}))
```

## Keep `turbo.json` up to date

Add a `postinstall` script in your root `package.json` to ensure `turbo.json` stays up to date:

```json
{
  "scripts": {
    "postinstall": "turbo-config"
  }
}
```

Commit both `turbo.config.ts` and the generated `turbo.json`. `turbo.json` remains the single source
Turborepo consumes, but `turbo-config` only rewrites it when the config changes, keeping installs fast.

## CLI commands

Run the CLI with `npx turbo-config`, `pnpm turbo-config`, etc depending on your package manager.

Available commands:

- `turbo-config`: Generates `turbo.json` locally, or runs `check` when the `CI` environment variable is
  truthy.
- `turbo-config generate`: Regenerates `turbo.json` from `turbo.config.ts`.
- `turbo-config check`: Validates that `turbo.config.ts` matches the existing `turbo.json`; exits with an
  error if they differ.

Pair `check` with CI to guarantee committed `turbo.json` stays aligned with your source configuration.
