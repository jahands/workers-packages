# prefixed-nanoid

## 0.1.6

### Patch Changes

- 6ddcd10: chore: don't use object spreading in eslint.config.ts

## 0.1.5

### Patch Changes

- 4054cbc: chore: update readme to clarify features

## 0.1.4

### Patch Changes

- 37fe801: perf: optimize duplicate prefix detection in validatePrefixesConfig

## 0.1.3

### Patch Changes

- 994cf24: chore: update readme

## 0.1.2

### Patch Changes

- 5fb0c5e: chore: update readme

## 0.1.1

### Patch Changes

- dccaff1: chore: update deps (zod)
- dccaff1: chore: switch to semver range for zod and nanoid

## 0.1.0

### Major Changes

- Initial release of prefixed-nanoid package
- Class-based API for managing prefixed nanoid generation with type safety
- Support for configurable prefix and length settings
- Full TypeScript support with proper type inference
- Comprehensive test suite with Cloudflare Workers compatibility
- Built-in ID format validation
- Custom alphabet excluding confusing characters (0, O, l, I)
- Error handling with custom error types (ConfigurationError, InvalidPrefixError)
