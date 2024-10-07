# workers-tagged-logger

A wrapper around `console.log()` for structured logging in Cloudflare Workers, powered by AsyncLocalStorage.

## Features

- Add tags to all logs (e.g. user_id) without needing to pass a logger to every function via `setTags()`.
- Can create a context-specific logger using `withTags()` when global tags aren't desired.
- Can create a context-specific logger using `withFields()` that adds fields to the top level (similar to `withTags()`.)
- Can create a sub-context where `setTags()` will apply to that context but not the parent scope (powered by AsyncLocalStorage.)
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

### Important! Update wrangler.toml Compatibility Flags

This logger requires `nodejs_als` or `nodejs_compat` to function. To enable this, add one of them to your `wrangler.toml`:

```toml
compatibility_flags = ["nodejs_compat"]
```

### Create a Logger

The first thing we need is a logger. This can be safely instantiated in the global scope anywhere in your file:

```ts
import { withLogTags, WorkersLogger } from 'workers-tagged-logger'

// Optional type hints for tag auto-completion
type Tags = {
	user_id: string
}
const logger = new WorkersLogger<Tags>()
```

### Wrap Your Code Within a Logger Context

Setting tags requires wrapping your code using `withLogTags` (this is a thin wrapper around `AsyncLocalStorage.run()`):

```ts
const res = await withLogTags({ source: 'my-app' }, async () => {
  logger.setTags({ foo: 'bar' })
  logger.info('hello, world!')
  return new Response('hello!)
})
```

The above example will log the following:

```json
{
	"level": "info",
	"message": "hello, world!",
	"tags": {
		"foo": "bar",
		"source": "my-app"
	},
	"time": "2024-10-26T12:30:00.000Z"
}
```

### Hono Middleware (optional)

If you use Hono, we provide a middleware that can be used instead of `withLogTags()`:

```ts
const app = new Hono()
	// Register the logger (must do this before calling logger.setTags())
	.use('*', useWorkersLogger('hono-app'))
```

### Context-specific Logger

Sometimes you may want to log a few lines that have additional tags without setting those tags on all remaining logs. To do this, use `withTags()`:

```ts
const ctxLogger = logger.withTags({
	some_temp_tag: 'hello!',
})

// All logs using ctxLogger will have the new tag added:
ctxLogger.info('hello from ctxLogger!')
// -> { ..., "tags": { ..., "some_temp_tag": "hello!" } }

logger.info('hi') // Won't include some_temp_tag

// setTags still applies globally, not just to ctxLogger:
ctxLogger.setTags({ global_tag: 'foo' })
```

These options can be chained:

```ts
logger.withTags({ foo: 'bar' }).info('hello!')
```

### Context-specific Fields

While tags should cover most cases, you may sometimes want to add top-level fields for things like overwriting `time`. To do this, use `withFields()`:

```ts
const ctxLogger = logger.withFields({ foo: 'bar' })
ctxLogger.info('hi')
// -> { ..., "foo": "bar" }
```

Note: There is currently no way to set fields for all logs like you can with `setTags()`.

### Additional Examples

We have full Workers examples in the [examples](../../examples/) directory.

## Why?

While `console.log()` works great in Workers, it can be frustrating trying to ensure that every log is tagged with information that helps you track down issues.

For example, let's say you want every log to be tagged with the user that sent a request. This might look something like this:

```ts
console.log({
  message: 'something happened!'
  user_id: userId
})
```

This means that everywhere you want to log something, you need to make sure `userId` is available, which can be complex in larger applications.

That's where this package comes in: you no longer need your metadata in the same place that you need to record a log. Simply set the metadata as you get it, and each log after that will have that tag!
