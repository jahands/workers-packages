# prefixed-nanoid

[![npm version](https://badge.fury.io/js/prefixed-nanoid.svg)](https://badge.fury.io/js/prefixed-nanoid)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Tiny, type-safe ID generator (powered by [nanoid](https://github.com/ai/nanoid)) with human-readable prefixes — perfect for Cloudflare Workers, edge runtimes, Node, and Bun.**

## Features

- **Type-safe**: Full TypeScript support with proper type inference
- **Class-based API**: Clean, object-oriented interface for managing multiple prefix configurations
- **Compatible with Cloudflare Workers**: Tested with `@cloudflare/vitest-pool-workers`
- **Customizable**: Configure prefix and length for each ID type
- **Validation**: Built-in ID format validation
- **Error handling**: Comprehensive error types for different failure scenarios
- **Collision-resistant**: Uses nanoid with a carefully chosen alphabet excluding confusing characters

## Requirements

- **ESM-only package**: Node.js 18+, Bun, Deno, Cloudflare Workers, or any modern runtime supporting ES modules
- **TypeScript**: 4.5+ recommended for best type inference

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
import { createPrefixedNanoIds } from 'prefixed-nanoid'

// Create an instance using the factory function
// Note: len defaults to 24 if not specified
const ids = createPrefixedNanoIds({
  project: { prefix: 'prj' }, // len = 24 (default)
  user: { prefix: 'usr', len: 16 },
})

// Generate IDs
const projectId = ids.generate('project') // 'prj_fKusuLcXQZij5x7URG98aP2z'
const userId = ids.generate('user') // 'usr_abc123def456ghi7'

// Validate IDs
ids.is('project', projectId) // true
ids.is('user', projectId) // false

// Type guard usage in TypeScript:
const unknownValue: unknown = getIdFromSomewhere()
if (ids.is('project', unknownValue)) {
  // TypeScript now knows unknownValue is a valid project ID
  console.log(unknownValue.startsWith('prj_')) // ✅ Type-safe
}
```

## API Reference

### createPrefixedNanoIds

```typescript
createPrefixedNanoIds<T extends Record<string, PrefixConfigInput>>(config: T)
```

Creates a new prefixed nanoid generator with the given configuration.

**Parameters:**

- `config`: Configuration object mapping prefix keys to their configurations

**Configuration Format:**

```typescript
interface PrefixConfig {
  prefix: string // The prefix string (e.g., "prj", "file") - only letters, numbers, underscores, and dashes
  len?: number // Length of the random nanoid portion (1-255, defaults to 24 if not specified)
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

## Errors

### `InvalidPrefixError`

Thrown when an invalid prefix is used with the `generate()` or `is()` methods.

### `ConfigurationError`

Thrown when the configuration object passed to the constructor is invalid.

## Advanced Usage

### Multiple Configurations

You can create multiple instances for different contexts:

```typescript
const userIds = createPrefixedNanoIds({
  admin: { prefix: 'adm', len: 20 },
  member: { prefix: 'mbr', len: 16 },
})

const resourceIds = createPrefixedNanoIds({
  file: { prefix: 'file', len: 24 },
  folder: { prefix: 'dir', len: 20 },
})
```

### Type Safety

The library provides full TypeScript support with proper type inference:

```typescript
const ids = createPrefixedNanoIds({
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
