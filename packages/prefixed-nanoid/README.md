# prefixed-nanoid

A class-based API for managing prefixed nanoid generation with type safety, designed for Cloudflare Workers and other JavaScript environments.

## Features

- **Type-safe**: Full TypeScript support with proper type inference
- **Class-based API**: Clean, object-oriented interface for managing multiple prefix configurations
- **Cloudflare Workers compatible**: Tested with `@cloudflare/vitest-pool-workers`
- **Customizable**: Configure prefix and length for each ID type
- **Validation**: Built-in ID format validation
- **Error handling**: Comprehensive error types for different failure scenarios
- **Collision-resistant**: Uses nanoid with a carefully chosen alphabet excluding confusing characters

## Installation

```bash
npm install prefixed-nanoid
# or
pnpm add prefixed-nanoid
# or
bun add prefixed-nanoid
# or
yarn add prefixed-nanoid
```

## Quick Start

```typescript
import { PrefixedNanoIds } from 'prefixed-nanoid'

// Create an instance with inline configuration
const ids = new PrefixedNanoIds({
  project: { prefix: 'prj', len: 24 },
  user: { prefix: 'usr', len: 16 },
})

// Generate IDs
const projectId = ids.generate('project') // 'prj_fKusuLcXQZij5x7URG98aP2z'
const userId = ids.generate('user') // 'usr_abc123def456ghi7'

// Validate IDs
ids.is('project', projectId) // true
ids.is('user', projectId) // false
```

## API Reference

### Constructor

```typescript
new PrefixedNanoIds<T extends PrefixesConfig>(config: T)
```

Creates a new PrefixedNanoIds instance with the given configuration.

**Parameters:**

- `config`: Configuration object mapping prefix keys to their configurations

**Configuration Format:**

```typescript
interface PrefixConfig {
  prefix: string // The prefix string (e.g., "prj", "file") - only letters, numbers, underscores, and dashes
  len: number // Length of the random nanoid portion (defaults to 24 if not specified)
}
```

### Methods

#### `generate(prefix)`

Generate a new prefixed nanoid for the given prefix.

```typescript
ids.generate(prefix: PrefixKey): string
```

**Returns:** A new prefixed ID in the format `{prefix}_{nanoid}`

**Example:**

```typescript
const id = ids.generate('project') // 'prj_fKusuLcXQZij5x7URG98aP2z'
```

#### `is(prefix, maybeId)`

Validate if a string matches the expected format for a prefix.

```typescript
ids.is(prefix: PrefixKey, maybeId: string): boolean
```

**Returns:** `true` if the ID matches the expected format, `false` otherwise

**Example:**

```typescript
ids.is('project', 'prj_fKusuLcXQZij5x7URG98aP2z') // true
ids.is('project', 'usr_abc123def456ghi7') // false
ids.is('project', 'invalid-format') // false
```

## Error Types

### `InvalidPrefixError`

Thrown when an invalid prefix is used with the `generate()` or `is()` methods.

### `ConfigurationError`

Thrown when the configuration object passed to the constructor is invalid.

## Advanced Usage

### Multiple Configurations

You can create multiple instances for different contexts:

```typescript
const userIds = new PrefixedNanoIds({
  admin: { prefix: 'adm', len: 20 },
  member: { prefix: 'mbr', len: 16 },
})

const resourceIds = new PrefixedNanoIds({
  file: { prefix: 'file', len: 24 },
  folder: { prefix: 'dir', len: 20 },
})
```

### Type Safety

The library provides full TypeScript support with proper type inference:

```typescript
const ids = new PrefixedNanoIds({
  project: { prefix: 'prj', len: 24 },
  user: { prefix: 'usr', len: 16 },
})

// TypeScript will only allow 'project' or 'user' as valid prefixes
ids.generate('project') // ✅ Valid
ids.generate('user') // ✅ Valid
ids.generate('invalid') // ❌ TypeScript error
```

## Alphabet

The library uses a custom alphabet that excludes potentially confusing characters:

- **Excluded**: `0` (zero), `O` (capital O), `l` (lowercase L), `I` (capital i)
- **Included**: `123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz`

This reduces the chance of human error when reading or copying IDs.

## License

MIT
