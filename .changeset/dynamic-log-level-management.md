---
'workers-tagged-logger': minor
---

feat: add dynamic log level management with priority-based resolution

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
