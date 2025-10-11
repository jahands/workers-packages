# @jahands/otel-cf-workers

A bundled version of [@microlabs/otel-cf-workers](https://www.npmjs.com/package/@microlabs/otel-cf-workers) to work around issues with [@cloudflare/vitest-pool-workers](https://www.npmjs.com/package/@cloudflare/vitest-pool-workers)

- https://github.com/evanderkoogh/otel-cf-workers/issues/173
- https://github.com/cloudflare/workers-sdk/issues/6581

## IMPORTANT

Please note that this is primarily intended for my own use. You may want to copy [this package](https://github.com/jahands/workers-packages/blob/main/packages/otel-cf-workers) to your own repo rather than depending on this library directly.

## Usage

### Install

```shell
# Install using your favorite package manager:
npm install @jahands/otel-cf-workers
pnpm add @jahands/otel-cf-workers
bun add @jahands/otel-cf-workers
yarn add @jahands/otel-cf-workers
```

### Example

```ts
import { instrument, ResolveConfigFn, trace } from '@jahands/otel-cf-workers'

export interface Env {
  HONEYCOMB_API_KEY: string
  OTEL_TEST: KVNamespace
}

const handler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    await fetch('https://cloudflare.com')

    const greeting = "G'day World"
    trace.getActiveSpan()?.setAttribute('greeting', greeting)
    ctx.waitUntil(fetch('https://workers.dev'))
    return new Response(`${greeting}!`)
  },
}

const config: ResolveConfigFn = (env: Env, _trigger) => {
  return {
    exporter: {
      url: 'https://api.honeycomb.io/v1/traces',
      headers: { 'x-honeycomb-team': env.HONEYCOMB_API_KEY },
    },
    service: { name: 'greetings' },
  }
}

export default instrument(handler, config)
```

For more details, refer to documentation in [@microlabs/otel-cf-workers](https://www.npmjs.com/package/@microlabs/otel-cf-workers)
