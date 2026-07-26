# dagger-env

A type-safe, reusable environment configuration abstraction for Dagger modules with full Zod v4 validation and Infisical or 1Password integration.

## Features

- 🔒 **Type-safe**: Full TypeScript support with Zod v4 validation
- 🔄 **Reusable**: Create multiple environment configurations for different projects
- 🎯 **Consistent**: Standardized API across all Dagger modules
- 🛡️ **Validated**: Runtime validation of arguments, environment variables, and secrets
- 📦 **Modular**: Secret presets and derived environment variables
- 🔐 **Infisical & 1Password Integration**: Built-in command runner backed by `infisical export` or `op run`
- 🚀 **Easy to use**: Simple configuration-based setup

## Installation

```bash
npm install dagger-env zod
```

**Note:** The command runner functionality (`dagger-env/run`) requires either the Infisical CLI (`infisical`) or the 1Password CLI (`op`) to be installed and authenticated, depending on which provider you configure.

## Quick Start

```typescript
import { createDaggerEnv } from 'dagger-env'
import { z } from 'zod/v4'

// Define your environment configuration
const myDaggerEnv = createDaggerEnv({
  args: z.object({
    push: z.string().optional(),
    environment: z.enum(['dev', 'staging', 'prod']).optional()
  }),
  env: z.object({
    CI: z.string().optional(),
    NODE_ENV: z.string().optional()
  }),
  secrets: z.object({
    API_TOKEN: z.string(),
    DATABASE_URL: z.string(),
    REDIS_URL: z.string()
  }),
  secretPresets: {
    api: ['API_TOKEN', 'DATABASE_URL'],
    cache: ['REDIS_URL']
  },
  derivedEnvVars: {
    API_TOKEN: {
      API_BASE_URL: 'https://api.example.com',
      API_VERSION: 'v1'
    },
    DATABASE_URL: {
      DB_POOL_SIZE: '10'
    }
  }
})
```

```typescript
// Use in your Dagger module
import { Container, dag, func, object, Secret } from '@dagger.io/dagger'

@object()
export class MyModule {
  @func()
  async build(options: Secret): Promise<Container> {
    const opts = await myDaggerEnv.parseDaggerOptions(options)
    const { withEnv } = await myDaggerEnv.getWithEnv(options, ['api'], ['REDIS_URL'])

    return withEnv(dag.container().from('node:18')).withExec(['npm', 'run', 'build']).sync()
  }
}
```

## Command Runner (Infisical or 1Password Integration)

`dagger-env` provides a convenient command runner that fetches secrets from Infisical (via `infisical export`) or 1Password (via `op item get`) and passes them to `dagger call` via the `DAGGER_OPTIONS` environment variable. The provider is selected by the shape of the config you pass to `createDaggerCommandRunner()`:

```typescript
import { createDaggerEnv } from 'dagger-env'
import { createDaggerCommandRunner } from 'dagger-env/run'
import { z } from 'zod/v4'

// Create your DaggerEnv configuration
const myDaggerEnv = createDaggerEnv({
  args: z.object({
    environment: z.enum(['dev', 'staging', 'prod']).optional()
  }),
  env: z.object({
    CI: z.string().optional(),
    NODE_ENV: z.string().optional()
  }),
  secrets: z.object({
    API_TOKEN: z.string()
  }),
  secretPresets: {
    api: ['API_TOKEN']
  },
  derivedEnvVars: {}
})

// Create a command runner with Infisical - simply pass your DaggerEnv instance
const runDaggerCommand = createDaggerCommandRunner({
  projectId: 'your-project-id',
  env: 'prod',
  path: '/ci/my-repo',
  dockerCommands: ['build', 'deploy', 'test'],
  daggerEnv: myDaggerEnv
})

// Run a Dagger command
await runDaggerCommand('test', {
  args: { environment: 'dev' },
  env: { NODE_ENV: 'development' }
})
```

### 1Password Integration

To use 1Password instead of Infisical, pass `opVault`/`opItem`/`opSections` instead of `projectId`/`env`/`path`. Secrets are read from the specified sections of a 1Password item, and `dagger call` is wrapped in `op run --no-masking` so that `op://` references in the environment are resolved:

```typescript
const runDaggerCommand = createDaggerCommandRunner({
  opVault: 'your-vault-id',
  opItem: 'your-item-id',
  opSections: [
    {
      id: 'your-section-id',
      label: 'Shared'
    }
  ],
  dockerCommands: ['build', 'deploy', 'test'],
  daggerEnv: myDaggerEnv
})
```

### Advanced Configuration

```typescript
// Advanced configuration with pre-command setup
const runDaggerCommand = createDaggerCommandRunner({
  projectId: 'your-project-id',
  env: 'prod',
  path: '/ci/my-repo',
  dockerCommands: ['build', 'deploy', 'test'],
  beforeCommand: async () => {
    // Setup vendor files, modules, etc.
    console.log('Setting up environment...')
    // await setupDaggerVendorFiles()
  },
  daggerEnv: myDaggerEnv
})
```

## API Reference

### Environment Configuration

#### `createDaggerEnv(config)`

Creates a new DaggerEnv instance with the provided configuration.

**Parameters:**

- `config.args`: Zod schema for command-line arguments
- `config.env`: Zod schema for environment variables
- `config.secrets`: Zod schema for secrets
- `config.secretPresets`: Object mapping preset names to arrays of secret names
- `config.derivedEnvVars`: Object mapping secret names to derived environment variables

**Returns:** `DaggerEnv<T>` instance

### `daggerEnv.parseDaggerOptions(options: Secret)`

Parses and validates dagger options from a Secret containing JSON.

**Parameters:**

- `options`: Dagger Secret containing JSON options

**Returns:** `Promise<DaggerOptionsFromConfig<T>>` - Parsed and typed options object

### `daggerEnv.getWithEnv(options, secretPresets, secretNames?)`

Creates a function that applies environment variables and secrets to a container.

**Parameters:**

- `options`: Secret or parsed options object
- `secretPresets`: Array of preset names to include (e.g., `['api', 'cache']`)
- `secretNames`: Optional array of additional individual secret names

**Returns:** `Promise<(con: Container) => Container>` - Function that applies env vars and secrets

### `daggerEnv.getOptionsSchema()`

Returns the Zod schema for the complete options object. Primarily used internally by the command runner, but available for advanced use cases.

**Returns:** `ZodObject` - The combined schema for args, env, and secrets

### `daggerEnv.getSecretPresets()`

Returns array of available secret preset names.

**Returns:** `Array<string>` - Available preset names

### `daggerEnv.getPresetSecrets(preset)`

Returns array of secret names for a specific preset.

**Parameters:**

- `preset`: Name of the preset

**Returns:** `readonly string[]` - Secret names in the preset

### Command Runner

#### `createDaggerCommandRunner(config)`

Creates a function to run Dagger commands with Infisical or 1Password integration. Pass either the Infisical or 1Password parameters to select the provider.

**Infisical parameters:**

- `config.projectId`: Infisical project ID
- `config.env`: Infisical environment slug (e.g. `prod`)
- `config.path`: Infisical folder path to fetch secrets from (e.g. `/ci/my-repo`)

**1Password parameters:**

- `config.opVault`: 1Password vault ID
- `config.opItem`: 1Password item ID
- `config.opSections`: Array of 1Password sections to include for secrets

**Shared parameters:**

- `config.dockerCommands`: Optional array of command names that should include Docker socket
- `config.beforeCommand`: Optional async function to run before executing the command
- `config.daggerEnv`: DaggerEnv instance for schema validation and type safety

**Returns:** `(commandName: string, options?: RunDaggerCommandOptions) => Promise<void>` - Function to execute Dagger commands

#### `RunDaggerCommandOptions`

Options for individual command execution:

- `args`: Optional record of arguments to pass to the Dagger command
- `env`: Optional record of additional environment variables
- `extraArgs`: Optional array of additional command-line arguments

## Configuration Examples

### Simple API Service

```typescript
const apiServiceEnv = createDaggerEnv({
  args: z.object({
    push: z.string().optional()
  }),
  env: z.object({
    CI: z.string().optional()
  }),
  secrets: z.object({
    API_TOKEN: z.string(),
    DATABASE_URL: z.string()
  }),
  secretPresets: {
    api: ['API_TOKEN', 'DATABASE_URL']
  } as const,
  derivedEnvVars: {
    API_TOKEN: {
      API_BASE_URL: 'https://api.example.com'
    }
  } as const
})
```

### Multi-Environment Setup

```typescript
const multiEnvDaggerEnv = createDaggerEnv({
  args: z.object({
    environment: z.enum(['dev', 'staging', 'prod']),
    push: z.string().optional()
  }),
  env: z.object({
    CI: z.string().optional()
  }),
  secrets: z.object({
    DEV_API_KEY: z.string(),
    STAGING_API_KEY: z.string(),
    PROD_API_KEY: z.string()
  }),
  secretPresets: {
    dev: ['DEV_API_KEY'],
    staging: ['STAGING_API_KEY'],
    prod: ['PROD_API_KEY']
  } as const,
  derivedEnvVars: {
    DEV_API_KEY: { API_URL: 'https://dev-api.example.com' },
    STAGING_API_KEY: { API_URL: 'https://staging-api.example.com' },
    PROD_API_KEY: { API_URL: 'https://api.example.com' }
  } as const
})
```

## Type Extraction

For advanced use cases where you need to extract TypeScript types:

```typescript
import { z } from 'zod/v4'

import type { DaggerOptionsFromConfig } from 'dagger-env'

// Extract the options type from your DaggerEnv configuration
type MyDaggerEnvConfig = typeof myDaggerEnv extends DaggerEnv<infer T> ? T : never
type MyOptions = DaggerOptionsFromConfig<MyDaggerEnvConfig>

// Access the schema if needed for validation or type extraction
const schema = myDaggerEnv.getOptionsSchema()
type SchemaOutput = z.output<typeof schema>
```

## Best Practices

1. **Use `as const`** for `secretPresets` and `derivedEnvVars` to ensure proper typing
2. **Group related secrets** into logical presets (e.g., `api`, `database`, `cache`)
3. **Validate early** by calling `parseDaggerOptions()` at the start of functions
4. **Reuse configurations** across multiple Dagger modules in the same project
5. **Document your schemas** with JSDoc comments for better developer experience

## Requirements

- Node.js 18+
- Dagger SDK
- Zod v4+

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our GitHub repository.
