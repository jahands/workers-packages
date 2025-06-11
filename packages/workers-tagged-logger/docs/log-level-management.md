# Dynamic Log Level Management

The workers-tagged-logger supports dynamic log level management with a priority-based system that allows you to control logging granularity at different levels.

## Log Level Priority

Log levels are resolved using the following priority order (highest to lowest):

1. **Instance-specific level** - Set via `withLogLevel()` method
2. **Context level** - Set via `setLogLevel()` in AsyncLocalStorage context  
3. **Constructor level** - Set via `minimumLogLevel` option during instantiation
4. **Default level** - `'debug'` (logs everything)

## Methods

### `withLogLevel(level: LogLevel): WorkersLogger<T>`

Creates a new logger instance with the specified minimum log level. This level has the highest priority and will override context and constructor levels.

```typescript
const logger = new WorkersLogger({ minimumLogLevel: 'warn' })
const debugLogger = logger.withLogLevel('debug')

await withLogTags({ source: 'app' }, async () => {
  logger.debug('Not shown - constructor level is warn')
  debugLogger.debug('Shown - instance level is debug')
})
```

### `setLogLevel(level: LogLevel): void`

Sets the minimum log level for all loggers in the current AsyncLocalStorage context. This overrides constructor-level settings but is overridden by instance-specific levels.

```typescript
const logger = new WorkersLogger({ minimumLogLevel: 'warn' })

await withLogTags({ source: 'app' }, async () => {
  logger.debug('Not shown - constructor level is warn')
  
  logger.setLogLevel('debug') // Override constructor level
  logger.debug('Now shown - context level is debug')
})
```

## Priority Examples

### Instance Level Overrides Context Level

```typescript
const logger = new WorkersLogger()
const errorLogger = logger.withLogLevel('error')

await withLogTags({ source: 'app' }, async () => {
  logger.setLogLevel('debug') // Set context to debug
  
  logger.debug('Shown - uses context level (debug)')
  errorLogger.debug('Not shown - uses instance level (error)')
  errorLogger.error('Shown - meets instance level requirement')
})
```

### Context Level Overrides Constructor Level

```typescript
const logger = new WorkersLogger({ minimumLogLevel: 'warn' })

await withLogTags({ source: 'app' }, async () => {
  logger.debug('Not shown - constructor level is warn')
  
  logger.setLogLevel('debug') // Override constructor level
  logger.debug('Now shown - context level overrides constructor')
})
```

### Method Chaining

The `withLogLevel()` method can be chained with other logger methods:

```typescript
const logger = new WorkersLogger({ minimumLogLevel: 'warn' })

const specialLogger = logger
  .withLogLevel('debug')
  .withTags({ component: 'auth' })
  .withFields({ service: 'api' })

await withLogTags({ source: 'app' }, async () => {
  specialLogger.debug('Shown with tags and fields')
})
```

## Log Level in Output

When using decorators or when `$logger` tags are explicitly set, the effective log level is included in the log output:

```typescript
await withLogTags({ source: 'app' }, async () => {
  logger.setTags({ $logger: { method: 'myMethod' } })
  logger.setLogLevel('info')
  logger.info('Message')
  // Output includes: tags: { $logger: { method: 'myMethod', level: 'info' } }
})
```

## Use Cases

### Development vs Production

```typescript
const isDev = process.env.NODE_ENV === 'development'
const logger = new WorkersLogger({ 
  minimumLogLevel: isDev ? 'debug' : 'warn' 
})
```

### Feature-Specific Debugging

```typescript
const logger = new WorkersLogger({ minimumLogLevel: 'warn' })

// Enable debug logging for specific feature
await withLogTags({ source: 'auth' }, async () => {
  if (env.DEBUG_AUTH) {
    logger.setLogLevel('debug')
  }
  
  await authenticateUser(request)
})
```

### Component-Specific Log Levels

```typescript
const logger = new WorkersLogger()
const dbLogger = logger.withLogLevel('warn').withTags({ component: 'database' })
const apiLogger = logger.withLogLevel('debug').withTags({ component: 'api' })

// Database logs only warnings and errors
// API logs everything (debug+)
```

## Backward Compatibility

This feature is fully backward compatible. Existing code using `minimumLogLevel` in the constructor will continue to work exactly as before. The new methods provide additional flexibility without breaking existing functionality.
