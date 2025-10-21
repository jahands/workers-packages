# create-wrangler-config

## 0.2.9

### Patch Changes

- e21bcec: chore: formatting

## 0.2.8

### Patch Changes

- 3e51a90: chore: bump version

## 0.2.7

### Patch Changes

- ed3c346: chore: add publishConfig to package.json
- ed3c346: chore: update author url in package.json
- ed3c346: chore: add bugs field to package.json
- ed3c346: chore: update deps
- ed3c346: chore: update package path in package.json

## 0.2.6

### Patch Changes

- fffdffd: chore: update deps

## 0.2.5

### Patch Changes

- 1332152: chore: update deps (zod@4.1.1)

## 0.2.4

### Patch Changes

- d540cab: chore: update deps (zod@3.25.76)

## 0.2.3

### Patch Changes

- 4943347: chore: update deps (zod)

## 0.2.2

### Patch Changes

- cd492ec: chore: update deps (zod)

## 0.2.1

### Patch Changes

- 4b82f6c: chore: install wrangler after generating config

## 0.2.0

### Minor Changes

- **Improved error handling**: `sanitizeWorkerName()` now throws descriptive errors instead of using fallbacks when sanitization fails
- **Enhanced validation**: Worker names are now validated to prevent leading or trailing hyphens
- **Streamlined UX**: Wrangler is now automatically installed as a dev dependency without prompting the user
- **Async improvements**: Package manager detection is now asynchronous for better performance

### Patch Changes

- Updated test coverage to include new validation rules
- Improved error messages for better developer experience
- Enhanced type safety with stricter validation schemas

## 0.1.0

### Minor Changes

- Initial release of create-wrangler-config CLI tool
- Interactive prompts for Worker configuration
- Smart feature detection (entry points and static assets)
- Package manager detection and wrangler installation
- Comprehensive validation using Zod v4
- Support for all major package managers (npm, yarn, pnpm, bun)
- Safety checks to prevent overwriting existing configurations
