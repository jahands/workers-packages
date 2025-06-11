# PRD: Dynamic Log Level Management

2025-06-11

## Problem Statement

Currently, the `workers-tagged-logger` supports setting a minimum log level only at logger instantiation time via the `minimumLogLevel` constructor option. This creates limitations in scenarios where:

1. **Dynamic log level adjustment**: Applications need to change log verbosity during runtime based on request context, user permissions, or debugging needs
2. **Context-specific logging**: Different parts of the application require different log levels (e.g., debug logs for admin users, error-only for regular users)
3. **Temporary debugging**: Developers want to enable verbose logging for specific requests or operations without affecting the entire application

## Proposed Solution

Add two new methods to the `WorkersLogger` class that mirror the existing tag management pattern:

1. **`withLogLevel(level: LogLevel)`**: Returns a new logger instance with the specified minimum log level
2. **`setLogLevel(level: LogLevel)`**: Sets the minimum log level in the current AsyncLocalStorage context

## Feature Specifications

### 1. `withLogLevel(level: LogLevel)` Method

**Purpose**: Create a context-specific logger with a different minimum log level without affecting the parent logger or global context.

**Behavior**:

- Returns a new `WorkersLogger` instance
- The new instance inherits all existing configuration (tags, fields) from the parent
- Only the minimum log level is overridden for the new instance
- Does not affect the parent logger or global ALS context
- Can be chained with other methods (`withTags`, `withFields`)

**Type Signature**:

```typescript
withLogLevel(level: LogLevel): WorkersLogger<T>
```

### 2. `setLogLevel(level: LogLevel)` Method

**Purpose**: Set the minimum log level for all loggers in the current AsyncLocalStorage context.

**Behavior**:

- Modifies the log level stored in the current ALS context
- Affects all logger instances that read from the same ALS context
- Follows the same pattern as `setTags()` - requires an established ALS context
- Logs a warning if called outside an ALS context (similar to `setTags`)
- Child contexts inherit the log level unless overridden

**Type Signature**:

```typescript
setLogLevel(level: LogLevel): void
```

## Implementation Details

### AsyncLocalStorage Context Extension

The existing ALS context needs to be restructured to store both tags and log level information:

```typescript
// Current ALS stores LogTags directly
export const als = new AsyncLocalStorage<LogTags>()

// Needs to be restructured to:
type LogContext = {
  tags: LogTags
  logLevel?: LogLevel
}
export const als = new AsyncLocalStorage<LogContext>()
```

The log level will be exposed in logs through the existing `$logger` object to maintain a single top-level tag injection point:

```typescript
// Log output will include log level in the $logger object:
{
  "message": "Debug message",
  "level": "debug",
  "tags": {
    "$logger": {
      "method": "handleRequest",
      "rootMethod": "handleRequest",
      "level": "debug"  // Current effective log level
    },
    // ... other tags
  }
}
```

### Log Level Resolution Priority

The logger should resolve the minimum log level using the following priority (highest to lowest):

1. **Instance-specific level**: Set via `withLogLevel()` on the current logger instance
2. **Context level**: Set via `setLogLevel()` in the current ALS context (`context.logLevel`)
3. **Constructor level**: Set via `minimumLogLevel` option during instantiation
4. **Default level**: `'debug'` (current default)

### Context Access Pattern

The logger will need to adapt its context access methods to work with the new structure:

```typescript
// Current pattern (accessing tags directly)
const tags = als.getStore()

// New pattern (accessing structured context)
const context = als.getStore()
const tags = context?.tags ?? {}
const contextLogLevel = context?.logLevel
```

### Impact on Existing Functions

The `withLogTags()` function and `@WithLogTags` decorator will need updates to work with the new context structure:

```typescript
// withLogTags will need to preserve existing log level
export function withLogTags<T extends LogTags, R>(
  opts: WithLogTagsOptions<Partial<T & LogTags>>,
  fn: () => R
): R {
  const existingContext = als.getStore()
  const newContext: LogContext = {
    tags: { ...existingContext?.tags, ...opts.tags },
    logLevel: existingContext?.logLevel, // Preserve existing log level
  }
  return als.run(newContext, fn)
}
```

### Integration with Existing Code

The new methods should integrate seamlessly with existing patterns:

```typescript
// Can be chained with existing methods
const logger = new WorkersLogger()
  .withTags({ userId: '123' })
  .withLogLevel('warn')
  .withFields({ component: 'auth' })

// Works within existing ALS contexts
withLogTags({ source: 'api' }, () => {
  logger.setTags({ requestId: 'req-456' })
  logger.setLogLevel('debug') // Enable debug logging for this request

  // All subsequent logs in this context use debug level
  logger.debug('This will now be logged')
  // Output includes: tags: { $logger: { level: 'debug', ... }, requestId: 'req-456', source: 'api' }
})
```

## API Examples

### Example 1: Context-Specific Debug Logging

```typescript
import { withLogTags, WorkersLogger } from 'workers-tagged-logger'

const logger = new WorkersLogger({ minimumLogLevel: 'info' })

export default {
  async fetch(request: Request): Promise<Response> {
    return withLogTags({ source: 'worker' }, async () => {
      const isDebugMode = request.headers.get('x-debug') === 'true'

      if (isDebugMode) {
        logger.setLogLevel('debug') // Enable debug logs for this request
        logger.debug('Debug mode enabled for request')
      }

      logger.info('Processing request') // Always logged
      logger.debug('Request details', { url: request.url }) // Only logged in debug mode

      return new Response('OK')
    })
  },
}
```

### Example 2: Instance-Specific Log Levels

```typescript
const logger = new WorkersLogger({ minimumLogLevel: 'warn' })

// Create a debug logger for detailed operations
const debugLogger = logger.withLogLevel('debug').withTags({ component: 'database' })

// Create an error-only logger for critical paths
const errorLogger = logger.withLogLevel('error').withTags({ component: 'payment' })

async function processPayment() {
  errorLogger.info('Processing payment') // Not logged (below error level)
  errorLogger.error('Payment failed') // Logged
}

async function queryDatabase() {
  debugLogger.debug('Executing query') // Logged
  debugLogger.info('Query completed') // Logged
}
```

### Example 3: Decorator Integration

```typescript
class RequestHandler {
  @WithLogTags({ source: 'handler' })
  async handleRequest(request: Request) {
    const userRole = request.headers.get('x-user-role')

    if (userRole === 'admin') {
      logger.setLogLevel('debug') // Admins get verbose logging
    } else {
      logger.setLogLevel('warn') // Regular users get minimal logging
    }

    logger.debug('Request handler started') // Only for admins
    logger.info('Processing request') // Only for admins (warn+ for others)
    logger.warn('Potential issue detected') // Logged for everyone
  }
}
```

## Testing Requirements

### Unit Tests

1. **`withLogLevel()` method**:

   - Returns new logger instance with correct log level
   - Preserves existing tags and fields
   - Does not affect parent logger
   - Can be chained with other methods
   - Respects log level hierarchy in filtering

2. **`setLogLevel()` method**:

   - Sets log level in ALS context
   - Affects all loggers reading from same context
   - Logs warning when called outside ALS context
   - Child contexts inherit log level
   - Can be overridden in child contexts

3. **Log level resolution**:

   - Correct priority order (instance > context > constructor > default)
   - Proper filtering based on resolved level
   - Integration with existing `logLevelToNumber()` function

4. **Integration tests**:
   - Works with existing `withTags()` and `withFields()` methods
   - Compatible with `@WithLogTags` decorator
   - Functions correctly in nested ALS contexts
   - Maintains backward compatibility

### Performance Considerations

- Log level resolution should be efficient (avoid repeated ALS lookups)
- Consider caching resolved log level within logger instances
- Ensure minimal overhead when logs are filtered out

## Migration and Backward Compatibility

- **Fully backward compatible**: No breaking changes to existing API
- **Existing behavior preserved**: Current `minimumLogLevel` constructor option continues to work
- **Gradual adoption**: Teams can adopt new methods incrementally
- **No configuration changes required**: Existing logger configurations remain valid

## Documentation Updates

1. **README.md**: Add new section demonstrating log level management
2. **API documentation**: Document new methods with examples
3. **Migration guide**: Show how to upgrade from static to dynamic log levels
4. **Best practices**: Guidelines for when to use each method

## Success Criteria

1. **Functionality**: Both methods work as specified with proper log filtering
2. **Performance**: No significant performance regression in logging operations
3. **Compatibility**: All existing tests pass without modification
4. **Usability**: Clear, intuitive API that follows existing patterns
5. **Documentation**: Comprehensive examples and clear usage guidelines

## Future Considerations

- **Log level inheritance**: Consider more sophisticated inheritance rules for nested contexts
- **Runtime log level changes**: Potential integration with external configuration systems
- **Metrics integration**: Track log level changes for observability
- **Performance optimizations**: Advanced caching strategies for high-throughput scenarios
