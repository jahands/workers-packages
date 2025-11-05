# p-tools

**Tiny promise utilities for modern JS.**

I find myself writing various promise helpers over time and decided to publish them in a package.

## Install

```sh
npm i p-tools
```

## Quick start

**Async cleanup (`await using`)**

```ts
import { defer } from 'p-tools'

async function run() {
  await using _cleanup = defer(async () => {
    await db.close()
  })
  // ...work...
}
await run()
```

**Sync cleanup (`using`)**

```ts
import { deferSync } from 'p-tools'

function run() {
  using _cleanup = deferSync(() => lock.release())
  // ...work...
}
run()
```

## API

### `defer(fn): AsyncDisposable`

```ts
export function defer(fn: () => unknown | PromiseLike<unknown>): AsyncDisposable
```

- Runs `fn` when the scope exits via `await using`.
- **Idempotent & coalesced:** multiple or concurrent disposals run `fn` once; later calls await the same promise.
- **Error propagation:** if `fn` throws/rejects, disposal rejects with that error.

### `deferSync(fn): Disposable`

```ts
export function deferSync(fn: () => unknown): Disposable
```

- Runs `fn` when the scope exits via `using` (synchronous path).
- **Idempotent:** multiple disposals after the first are no-ops.
- For async cleanups, use `defer` instead so callers can `await` completion.

## Semantics & edge cases

- With `await using`, cleanup runs after the last statement in the scope and before the function resolves.
- If both the body and the cleanup throw during `await using`, some runtimes surface a `SuppressedError` that preserves both errors.
- Double-dispose and overlapping disposals are safe: `defer` runs once and shares the same promise; `deferSync` runs once.

## TypeScript

Add the libs that declare `using`/`await using` and disposables:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "lib": "ESNext" // or ["ES2024", "ESNext.Disposable"]
  }
}
```

## Why not `try/finally`?

These helpers give the same guarantees with less boilerplate, integrate with `using`/`await using`, and coalesce concurrent disposal calls safely.

## Roadmap

More small, focused promise utilities will be added over time.
