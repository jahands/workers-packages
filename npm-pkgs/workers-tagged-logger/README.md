# workers-tagged-logger

A wrapper around `console.log()` for structured logging in Cloudflare Workers, powered by AsyncLocalStorage.

## Features

- Add tags to all logs (e.g. user_id) without needing to pass a logger to every function via `setTags()`.
- **Class method decorator (`@WithLogTags`)** for automatically establishing logging context within class methods, including automatic `source` tagging based on the class name.
- **Dynamic log level management** with priority-based resolution - control logging granularity at runtime using `withLogLevel()` and `setLogLevel()`.
- Can create a context-specific logger using `withTags()` when global tags aren't desired.
- Can create a context-specific logger using `withFields()` that adds fields to the top level (similar to `withTags()`.)
- Can create a sub-context using `withLogTags` or `@WithLogTags` where `setTags()` will apply to that context but not the parent scope (powered by AsyncLocalStorage.)
- Optional Hono middleware to easily initialize the top-level logger context.
- Supports passing in custom tag hints to make consistent tagging easy across your application.

## Usage

### Install

```shell
# Install using your favorite package manager:
npm install workers-tagged-logger
pnpm add workers-tagged-logger
bun add workers-tagged-logger
yarn add workers-tagged-logger
```

### Important! Update wrangler.jsonc Compatibility Flags

This logger requires `nodejs_als` or `nodejs_compat` to function. To enable this, add one of them to your `wrangler.jsonc`:

```jsonc
{
  "compatibility_flags": ["nodejs_compat"]
  // or "compatibility_flags": ["nodejs_compat"]
}
```

### Important! Enable Decorators in tsconfig.json

To use the `@WithLogTags` decorator, you need to enable experimental decorators in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    // ... other options
    "experimentalDecorators": true
  }
}
```

### Create a Logger

The first thing we need is a logger. This can be safely instantiated in the global scope anywhere in your file:

```ts
import { WorkersLogger } from 'workers-tagged-logger'

// Optional type hints for tag auto-completion
type Tags = {
  user_id: string
  request_id: string
  source?: string // source is often added automatically
}

// Basic logger (logs everything by default)
const logger = new WorkersLogger<Tags>()

// Logger with minimum log level (only logs warn and error by default)
const prodLogger = new WorkersLogger<Tags>({ minimumLogLevel: 'warn' })

// Logger with debug mode enabled (shows internal warnings)
const debugLogger = new WorkersLogger<Tags>({ debug: true })
```

### Debug Mode

By default, the logger suppresses internal warning messages (such as when AsyncLocalStorage context is missing) to reduce noise in production environments. You can enable debug mode to see these warnings:

```ts
// Enable debug mode to see internal warnings
const logger = new WorkersLogger({ debug: true })

// This will now log a debug-level warning if called outside withLogTags()
logger.setTags({ user_id: 'test' })

// Debug mode is inherited by derived loggers
const childLogger = logger.withTags({ component: 'auth' })
childLogger.setTags({ session_id: 'abc' }) // Also shows debug warning if outside context
```

**When to use debug mode:**

- **Development**: Enable to catch missing `withLogTags()` wrappers
- **Debugging**: Enable temporarily to diagnose context issues
- **Production**: Keep disabled (default) to reduce log noise

### Establishing Logging Context

Setting global tags via `logger.setTags()` requires establishing an `AsyncLocalStorage` context. You can do this using either the `withLogTags` function (for standalone functions or arbitrary blocks) or the `@WithLogTags` decorator (for class methods).

#### Option 1: Using `withLogTags` (Function Wrapper)

Wrap your code using `withLogTags`. This is ideal for the entry point of your Worker, standalone functions, or specific blocks of code.

```ts
import { withLogTags, WorkersLogger } from 'workers-tagged-logger'

const logger = new WorkersLogger<Tags>()

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Establish context for the entire request
    return withLogTags({ source: 'my-worker' }, async () => {
      const requestId = crypto.randomUUID()
      logger.setTags({ request_id: requestId }) // Set tags for this context

      logger.info('Handling request')
      // ... your request handling logic ...

      if (request.url.includes('/admin')) {
        // Create a sub-context if needed
        await withLogTags({ source: 'admin-handler' }, async () => {
          logger.setTags({ user_id: 'admin-user' })
          logger.warn('Admin access detected')
          // Logs here have source: 'admin-handler', request_id, user_id
        })
      }

      // Logs here still have source: 'my-worker', request_id (but not user_id)
      logger.info('Finished handling request')
      return new Response('Hello!')
    })
  }
}
```

The first log (`Handling request`) would look like:

```json
{
  "level": "info",
  "message": "Handling request",
  "tags": {
    "request_id": "...",
    "source": "my-worker"
  },
  "time": "..."
}
```

#### Option 2: Using `@WithLogTags` (Class Method Decorator)

If you structure your code using classes (e.g., for services, or within the Worker object syntax), the `@WithLogTags` decorator provides a convenient way to establish context automatically for specific methods.

```ts
import { WithLogTags, WorkersLogger } from 'workers-tagged-logger'

const logger = new WorkersLogger<Tags>() // Assumes logger is defined

class MyRequestHandler {
  // Decorate the method
  // Source will be automatically inferred as "MyRequestHandler"
  @WithLogTags()
  async handle(request: Request) {
    const userId = request.headers.get('x-user-id') ?? 'anonymous'
    logger.setTags({ user_id: userId }) // Set tags for this method's context

    // Logs here automatically get { source: "MyRequestHandler", $logger..., user_id }
    logger.info(`Processing request for user ${userId}`)

    await this.processData(request.url)

    logger.info('Finished processing request')
    return { success: true }
  }

  // Decorator can also be used on nested methods
  // Explicit source overrides inference. Inherits user_id from handle's context.
  @WithLogTags({ source: 'DataProcessor', stage: 'processing' })
  async processData(url: string) {
    // Logs here get { source: "DataProcessor", $logger..., user_id, stage: "processing" }
    logger.debug(`Processing data for URL: ${url}`)
    // ... processing ...
  }

  // Decorator can take just a string for the source
  @WithLogTags('CleanupService')
  async cleanup() {
    // Logs here get { source: "CleanupService", $logger... }
    logger.debug('Cleaning up resources')
  }
}

// Example Usage (within a Worker fetch handler wrapped by withLogTags)
// export default {
//   async fetch(request: Request): Promise<Response> {
//     return withLogTags({ source: 'worker-entry' }, async () => {
//       logger.setTags({ request_id: '...' });
//       const handler = new MyRequestHandler();
//       const result = await handler.handle(request);
//       return new Response(JSON.stringify(result));
//     });
//   }
// }
```

**Decorator Behavior:**

- **Context:** Automatically wraps the method execution in `als.run`.
- **Tags:**
  - `$logger.method`: Automatically added, showing the name of the decorated method.
  - `$logger.rootMethod`: Automatically added, showing the name of the _first_ decorated method entered in the current async call chain.
  - `source`: Automatically added. Precedence:
    1.  Explicit source provided via `@WithLogTags("MySource")` or `@WithLogTags({ source: "MySource" })`.
    2.  Source inherited from an existing `AsyncLocalStorage` context (e.g., from an outer `withLogTags` or `@WithLogTags` call).
    3.  Inferred from the class name (e.g., `MyRequestHandler`).
  - `tags`: You can provide additional tags via `@WithLogTags({ source: 'MySource', ... })` that will be set for the duration of that method's execution.
- **Usage:** Ideal for adding context to specific stages of processing within your classes without manual `withLogTags` wrapping around method calls.

### Hono Middleware (optional)

If you use Hono, we provide a middleware that can be used instead of manually wrapping your top-level handler with `withLogTags()`:

```ts
import { Hono } from 'hono'
import { useWorkersLogger } from 'workers-tagged-logger/hono' // Note the /hono path

const app = new Hono()
  // Register the logger (must do this before calling logger.setTags())
  // Sets the initial context with source 'hono-app'
  .use('*', useWorkersLogger('hono-app'))
  .get('/', (c) => {
    logger.setTags({ user_agent: c.req.header('User-Agent') })
    logger.info('Handling GET /')
    return c.text('Hello Hono!')
  })
```

This is useful for setting the initial context for your entire request handler. For specific logic within class-based handlers you might write, consider using the `@WithLogTags` decorator instead of or in addition to this middleware.

### Context-specific Logger (`withTags`)

Sometimes you may want to log a few lines that have additional tags without setting those tags globally for all subsequent logs in the current context. To do this, use `withTags()`:

```ts
// Assuming we are inside a withLogTags or @WithLogTags context
logger.setTags({ request_id: 'req-123' })

const ctxLogger = logger.withTags({
  operation: 'user-lookup'
})

// All logs using ctxLogger will have the new tag added:
ctxLogger.info('Looking up user')
// -> { ..., "tags": { "request_id": "req-123", "operation": "user-lookup", ... } }

// Original logger instance is unaffected by withTags
logger.info('User lookup finished')
// -> { ..., "tags": { "request_id": "req-123", ... } } // No 'operation' tag

// setTags still applies globally within the current ALS context, affecting both loggers:
ctxLogger.setTags({ user_id: 'usr-abc' })
logger.info('Final log')
// -> { ..., "tags": { "request_id": "req-123", "user_id": "usr-abc", ... } }
```

These options can be chained:

```ts
logger.withTags({ foo: 'bar' }).info('hello!')
```

### Context-specific Fields (`withFields`)

While tags should cover most cases, you may sometimes want to add top-level fields (outside the `tags` object), perhaps for overwriting standard fields like `time` or adding custom root-level data. To do this, use `withFields()`:

```ts
const ctxLogger = logger.withFields({ custom_root_field: 'value', level: 'debug' }) // Overwrites level for this instance
ctxLogger.info('hi')
// -> { "level": "debug", "message": "hi", "custom_root_field": "value", "tags": {...}, "time": "..." }
```

Note: There is currently no way to set fields globally for all logs like you can with `setTags()`. `withFields` only affects the specific logger instance it's called on.

### Dynamic Log Level Management

The logger supports dynamic log level management with a priority-based system that allows fine-grained control over logging granularity at runtime.

#### Log Level Priority

Log levels are resolved using the following priority order (highest to lowest):

1. **Instance-specific level** - Set via `withLogLevel()` method
2. **Context level** - Set via `setLogLevel()` in AsyncLocalStorage context
3. **Constructor level** - Set via `minimumLogLevel` option during instantiation
4. **Default level** - `'debug'` (logs everything)

#### Creating Loggers with Specific Log Levels

Use `withLogLevel()` to create a new logger instance with a specific minimum log level. This level has the highest priority and will override context and constructor levels:

```ts
const logger = new WorkersLogger({ minimumLogLevel: 'warn' })
const debugLogger = logger.withLogLevel('debug')

await withLogTags({ source: 'app' }, async () => {
  logger.debug('Not shown - constructor level is warn')
  debugLogger.debug('Shown - instance level is debug')
})
```

#### Setting Context-Level Log Levels

Use `setLogLevel()` to set the minimum log level for all loggers in the current AsyncLocalStorage context. This overrides constructor-level settings but is overridden by instance-specific levels:

```ts
const logger = new WorkersLogger({ minimumLogLevel: 'warn' })

await withLogTags({ source: 'app' }, async () => {
  logger.debug('Not shown - constructor level is warn')

  logger.setLogLevel('debug') // Override constructor level
  logger.debug('Now shown - context level is debug')
})
```

#### Priority Examples

**Instance Level Overrides Context Level:**

```ts
const logger = new WorkersLogger()
const errorLogger = logger.withLogLevel('error')

await withLogTags({ source: 'app' }, async () => {
  logger.setLogLevel('debug') // Set context to debug

  logger.debug('Shown - uses context level (debug)')
  errorLogger.debug('Not shown - uses instance level (error)')
  errorLogger.error('Shown - meets instance level requirement')
})
```

**Context Level Overrides Constructor Level:**

```ts
const logger = new WorkersLogger({ minimumLogLevel: 'warn' })

await withLogTags({ source: 'app' }, async () => {
  logger.debug('Not shown - constructor level is warn')

  logger.setLogLevel('debug') // Override constructor level
  logger.debug('Now shown - context level overrides constructor')
})
```

#### Method Chaining

The `withLogLevel()` method can be chained with other logger methods:

```ts
const logger = new WorkersLogger({ minimumLogLevel: 'warn' })

const specialLogger = logger
  .withLogLevel('debug')
  .withTags({ component: 'auth' })
  .withFields({ service: 'api' })

await withLogTags({ source: 'app' }, async () => {
  specialLogger.debug('Shown with tags and fields')
})
```

#### Log Level in Output

When using decorators or when `$logger` tags are explicitly set, the effective log level is included in the log output:

```ts
await withLogTags({ source: 'app' }, async () => {
  logger.setTags({ $logger: { method: 'myMethod' } })
  logger.setLogLevel('info')
  logger.info('Message')
  // Output includes: tags: { $logger: { method: 'myMethod', level: 'info' } }
})
```

#### Use Cases

**Development vs Production:**

```ts
const isDev = process.env.NODE_ENV === 'development'
const logger = new WorkersLogger({
  minimumLogLevel: isDev ? 'debug' : 'warn'
})
```

**Feature-Specific Debugging:**

```ts
const logger = new WorkersLogger({ minimumLogLevel: 'warn' })

// Enable debug logging for specific feature
await withLogTags({ source: 'auth' }, async () => {
  if (env.DEBUG_AUTH) {
    logger.setLogLevel('debug')
  }

  await authenticateUser(request)
})
```

**Component-Specific Log Levels:**

```ts
const logger = new WorkersLogger()
const dbLogger = logger.withLogLevel('warn').withTags({ component: 'database' })
const apiLogger = logger.withLogLevel('debug').withTags({ component: 'api' })

// Database logs only warnings and errors
// API logs everything (debug+)
```

### Additional Examples

We have full Workers examples, including decorator usage, in the [examples](../../examples/) directory.

## Why?

While `console.log()` works great in Workers, it can be frustrating trying to ensure that every log is tagged with information that helps you track down issues (like request IDs, user IDs, etc.).

Traditionally, this might mean passing logger instances or metadata objects down through your entire call stack:

```ts
// helper.ts
function doSomething(logData, input) {
  console.log({ ...logData, message: 'Doing something', input })
  // ...
}

// handler.ts
function handleRequest(request) {
  const userId = getUserId(request)
  const logData = { userId, requestId: request.id }
  console.log({ ...logData, message: 'Handling request' })
  doSomething(logData, request.body) // Must pass logData down
}
```

This becomes cumbersome. `workers-tagged-logger` solves this by leveraging `AsyncLocalStorage`. The `withLogTags` function and `@WithLogTags` decorator establish a context, and any tags set via `logger.setTags()` within that context are automatically associated with subsequent logs generated within the same asynchronous flow, without needing to explicitly pass anything down.

```ts
// helper.ts
import { withLogTags } from 'workers-tagged-logger'

// handler.ts
import { logger, logger } from './logger' // Assume logger is exported

function doSomething(input) {
  // No need for logData argument! logger reads from context.
  logger.info('Doing something', { input })
  // ...
}

async function handleRequest(request) {
  // Wrap the operation in a context
  return withLogTags({ source: 'handler' }, async () => {
    const userId = getUserId(request)
    // Set tags once
    logger.setTags({ userId, requestId: request.id })

    logger.info('Handling request') // Automatically gets userId and requestId tags
    await doSomething(request.body) // Automatically gets userId and requestId tags
  })
}
```
