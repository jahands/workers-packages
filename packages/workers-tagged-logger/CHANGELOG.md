# workers-tagged-logger

## 0.13.1

### Patch Changes

- dccaff1: chore: update deps (zod)
- dccaff1: chore: switch to semver range for zod and nanoid

## 0.13.0

### Minor Changes

- d63e108: feat: add debug option to suppress noisy AsyncLocalStorage warnings

  Add a new `debug` option to `WorkersLoggerOptions` that controls whether internal warning messages about missing AsyncLocalStorage context are shown. By default (`debug: false`), these warnings are suppressed to reduce noise in production environments.

  **Breaking Change**: Warning messages that were previously logged at `warn` level are now only shown when `debug: true` is explicitly set, and they appear at `debug` level instead.

  **New Features**:

  - `debug?: boolean` option in `WorkersLoggerOptions` (defaults to `false`)
  - Debug mode is inherited by child loggers created with `withTags()`, `withFields()`, and `withLogLevel()`
  - Internal warnings now use `debug` level instead of `warn` level

  **Benefits**:

  - Cleaner production logs by default
  - Development aid when debug mode is enabled
  - Backward compatible API (existing code works without changes)
  - Better warning categorization

## 0.12.2

### Patch Changes

- 36621f6: chore: add eslint-config as a dependency to all packages

## 0.12.1

### Patch Changes

- 4021bc5: docs: log level management to README.md

## 0.12.0

### Minor Changes

- 5c0d963: feat: add dynamic log level management with priority-based resolution

  This release introduces comprehensive dynamic log level management capabilities that allow fine-grained control over logging granularity at runtime.

  ## New Features

  ### `withLogLevel(level: LogLevel)` Method

  - Creates new logger instance with specified minimum log level
  - Highest priority in resolution hierarchy
  - Supports method chaining with `withTags()` and `withFields()`

  ### `setLogLevel(level: LogLevel)` Method

  - Sets log level in current AsyncLocalStorage context
  - Affects all loggers in the context
  - Overrides constructor-level settings

  ### Priority-Based Log Level Resolution

  Log levels are resolved using priority order (highest to lowest):

  1. **Instance level** - Set via `withLogLevel()`
  2. **Context level** - Set via `setLogLevel()`
  3. **Constructor level** - Set via `minimumLogLevel` option
  4. **Default level** - `'debug'` (logs everything)

  ### Enhanced Log Output

  - Adds `level` property to existing `$logger` objects when present
  - Shows the effective log level being used
  - Only added when `$logger` tags exist (decorators or explicit setting)

  ## Usage Examples

  ```typescript
  // Instance-specific log level (highest priority)
  const debugLogger = logger.withLogLevel('debug')

  // Context-level override
  await withLogTags({ source: 'app' }, async () => {
    logger.setLogLevel('debug') // Overrides constructor level
    logger.debug('Now shown')
  })

  // Method chaining support
  const specialLogger = logger
    .withLogLevel('debug')
    .withTags({ component: 'auth' })
    .withFields({ service: 'api' })
  ```

  ## Backward Compatibility

  This feature is fully backward compatible. Existing code using `minimumLogLevel` in the constructor continues to work exactly as before. The new methods provide additional flexibility without breaking existing functionality.

  ## Technical Implementation

  - Separate tracking of constructor vs instance log levels
  - Enhanced `LogContext` structure with `{tags, logLevel}` in AsyncLocalStorage
  - Proper preservation of log levels across method chaining
  - Updated TypeScript 5+ decorator support
  - Memory-efficient context management

  ## Testing

  - 28 new comprehensive tests covering all functionality
  - Integration tests with existing features
  - Decorator compatibility tests
  - Edge case handling and error scenarios
  - Zod-based type validation in tests

## 0.11.2

### Patch Changes

- 4052d19: chore: update deps (zod)

## 0.11.1

### Patch Changes

- df6d56f: fix: move zod to dependencies (used in Hono middleware)
- 0c79cde: chore: update deps

## 0.11.0

### Minor Changes

- 6ce7ed9: feat: add ts3-compatible WithLogTags decorator

## 0.10.3

### Patch Changes

- d7f5555: chore: update zod to latest v3 beta

## 0.10.2

### Patch Changes

- 0afdbb3: chore: update deps (zod)

## 0.10.1

### Patch Changes

- 1620010: fix: actually run typechecks

## 0.10.0

### Minor Changes

- cf2fc4e: feat: Allow nested log tags and fields
- 721ead9: feat: allow logging dates

## 0.9.1

### Patch Changes

- 13b7678: chore: change log level from error to warn when unable to get logs from ALS

  The logger can still function without it and this is causing Workers Observability to show a lot of errors for these messages, which makes it harder to identify actual errors.

- 380fc8a: fix: update test snapshot

## 0.9.0

### Minor Changes

- 020c037: feat: Remove Zod peer dependency

  workers-tagged-logger no longer requires Zod as a peer dependency.
  Zod was only used for generating types used for testing, and should not have been exported.

  Consumers of this package shouldn't be relying on these Zod schemas, so hopefully this is not a breaking change for anyone.

## 0.8.1

### Patch Changes

- d605239: fix: update LogTags schema to be compatible with both Zod 3 and Zod 4

  workers-tagged-logger should now be compatible with Zod 4

## 0.8.0

### Minor Changes

- 0b92313: chore: rename methodName -> method and rootMethodName -> rootMethod

  this will save a lot of bytes in the long run

## 0.7.0

### Minor Changes

- 7c6cd99: fix: Export WithLogTags decorator and simplify signature

  Forgot to export WithLogTags in 0.6.0 so this fixes that.

  Also simplified WithLogTags signature to take either a source string, or an object containing tags.

## 0.6.1

### Patch Changes

- 81ef759: fix: add stack back into error messages

## 0.6.0

### Minor Changes

- 976c2cf: feat: Add `@WithLogTags` class method decorator for automatic context management within classes

  This release introduces a `@WithLogTags` class method decorator as a convenient alternative to the `withLogTags` function wrapper, specifically designed for use within classes.

  **Key Features:**

  - **Automatic Context:** Wraps method execution within an `AsyncLocalStorage` context, similar to `withLogTags`.
  - **Automatic Tagging:**
    - Adds `$logger.methodName` tag with the name of the decorated method.
    - Adds `$logger.rootMethodName` tag with the name of the first decorated method entered in the async call chain.
    - Adds a `source` tag, determined with the following precedence:
      1.  Explicit source provided via `@WithLogTags("MySource")` or `@WithLogTags({ source: "MySource" })`.
      2.  Source inherited from an active `AsyncLocalStorage` context (e.g., from an outer `withLogTags` or `@WithLogTags` call).
      3.  Inferred from the class name (e.g., `MyClassName`) if no explicit or inherited source is found.
  - **Configuration:** Accepts an optional configuration object (`@WithLogTags({ tags: {...} })`) to add specific tags for the duration of the method's execution.

  **Requirements:**

  - You **must** enable `experimentalDecorators` in your `tsconfig.json` to use this feature:
    ```json
    {
      "compilerOptions": {
        "experimentalDecorators": true
      }
    }
    ```

  **Usage Example:**

  ```typescript
  import { WithLogTags, WorkersLogger } from 'workers-tagged-logger'

  const logger = new WorkersLogger()

  class ExampleHandler {
    // Source will be inferred as "ExampleHandler"
    @WithLogTags()
    async handleEvent(eventId: string) {
      logger.setTags({ eventId })
      logger.info('Handling event') // Tags: { source: "ExampleHandler", $logger..., eventId }
      await this.processEvent()
    }

    // Source is explicit, inherits eventId tag from caller's context
    @WithLogTags({ source: 'EventProcessor', tags: { stage: 'processing' } })
    async processEvent() {
      logger.info('Processing event') // Tags: { source: "EventProcessor", $logger..., eventId, stage: "processing" }
    }
  }
  ```

### Patch Changes

- 976c2cf: chore: update dependencies

## 0.5.2

### Patch Changes

- 1bd4a22: fix: add missing .js extensions to relative imports

## 0.5.1

### Patch Changes

- 84e2513: chore: Switch to ES2022

## 0.5.0

### Minor Changes

- 204f849: chore: Switch from esbuild to tsc

## 0.4.5

### Patch Changes

- ab23181: Add optional minimum logging level
- 22f52e0: Expose `getTags` as a public method

## 0.4.4

### Patch Changes

- 42377e9: fix: Only include dist folder in published package

## 0.4.3

### Patch Changes

- 40c9aeb: BANDA-601 fix: Add node exports to support node targets

## 0.4.2

### Patch Changes

- 628e064: chore: export type LoggerHonoBindings

## 0.4.1

### Patch Changes

- 117e81d: BANDA-600 chore: Simplify type for withLogTags()

  This function doesn't need to be async because als.run() is not async.

## 0.4.0

### Minor Changes

- cf86b62: fix: bump minimum Hono version to 4.6.16 to resolve type issues

### Patch Changes

- 03df0b2: chore: update dependencies

## 0.3.8

### Patch Changes

- 794eb5b: fix: await als.run() for improved stack traces (hopefully)

## 0.3.7

### Patch Changes

- a50da50: fix: Update tests to expect string message
- 61feaf4: chore: Narrow ConsoleLog.message type
- 77f30ab: chore: Narrow message type

## 0.3.6

### Patch Changes

- b6447f2: chore: update readme to shorten install instructions

## 0.3.5

### Patch Changes

- 9d8540b: chore: Add installation instructions for other package managers
- 7ae8b95: chore: update tsconfig
- 10cd896: chore: update dependencies
- e89bf36: fix: revert hono version due to breaking change
- fdec52a: fix: spelling in readme

## 0.3.4

### Patch Changes

- aca9d27: chore: add homepage to package.json

## 0.3.3

### Patch Changes

- 8cda7b1: chore: update deps
- 1da8fb8: chore: update author url in package.json

## 0.3.2

### Patch Changes

- 148bfbd: fix: Update tests

## 0.3.1

### Patch Changes

- 74ac1bf: fix: Log error string instead of error object when unable to get log tags from AsyncLocalStorage

## 0.3.0

### Minor Changes

- cdb374e: fix: Ensure message field is always logged as a string

## 0.2.3

### Patch Changes

- 34bfb34: chore: Add top-level module/types to package.json

  This might be needed in some cases: https://stackoverflow.com/a/75097813

## 0.2.2

### Patch Changes

- 10b04a0: chore: update readme
- eefec7d: Update readme
- 2a9ba5a: chore: add keywords to package.json

## 0.2.1

### Patch Changes

- 5a92794: chore: Add usage guide to readme

## 0.2.0

### Minor Changes

- c7cb238: feat: Add WorkersLogger

## 0.1.1

### Patch Changes

- 129bb08: chore: Add repository and description to package.json
