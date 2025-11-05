/**
 * Defers running `fn` until the surrounding scope exits.
 *
 * Designed for ECMAScript Explicit Resource Management (`await using`).
 * Produces an `AsyncDisposable` whose cleanup is invoked exactly once.
 *
 * - Awaits `fn` if it returns a promise.
 * - **Idempotent:** multiple or concurrent disposals coalesce to a single run; all awaiters share the same promise.
 * - **Error propagation:** if `fn` throws/rejects, disposal rejects with that error.
 * - With `await using`, cleanup runs after the last statement in the scope; if both the body and cleanup throw,
 *   runtimes that support it may surface a `SuppressedError`.
 *
 * @param fn - Cleanup function (sync or async). Its return value is ignored.
 * @returns An `AsyncDisposable` suitable for `await using` or manual `[Symbol.asyncDispose]()`.
 *
 * @example
 * // Automatic cleanup on scope exit
 * await (async () => {
 *   await using _cleanup = defer(async () => {
 *     await closeResources();
 *   });
 *   // ...work...
 * })();
 *
 * @example
 * // Manual disposal; safe to call more than once (runs only once)
 * const d = defer(() => console.log('cleanup'));
 * await Promise.all([d[Symbol.asyncDispose](), d[Symbol.asyncDispose]()]);
 *
 * @remarks
 * Requires a runtime that implements Explicit Resource Management (`await using` and `Symbol.asyncDispose`).
 */
export function defer(fn: () => unknown | PromiseLike<unknown>): AsyncDisposable {
	let done = false
	let inflight: PromiseLike<void> | null = null

	return {
		async [Symbol.asyncDispose]() {
			if (done) return inflight ?? undefined

			// mark as done to prevent double-invocation
			done = true

			// GPT-5 told me this was a good idea because:
			// Promise.resolve().then(fn) makes the call safe for both sync
			// and async fn, turns sync throws into a rejected Promise
			// (instead of a synchronous throw), and lets you assign inflight
			// before fn runs - important for coalescing concurrent calls. fn().then()
			// can explode if fn returns void, and sync throws happen before you
			// can capture state.
			inflight = Promise.resolve()
				.then(fn)
				.then(() => {
					inflight = null
				})
			await inflight
		},
	}
}

function isPromiseLike<T = unknown>(v: unknown): v is PromiseLike<T> {
	return (
		v != null &&
		(typeof v === 'object' || typeof v === 'function') &&
		typeof (v as PromiseLike<T>).then === 'function'
	)
}

/**
 * Defers running `fn` until the surrounding scope exits (synchronous).
 *
 * Designed for ECMAScript Explicit Resource Management with `using`
 * and `Symbol.dispose`. The cleanup runs **exactly once** even if
 * disposed multiple times.
 *
 * - **Idempotent:** multiple disposals are ignored after the first.
 * - **Error propagation:** if `fn` throws, disposal rethrows that error.
 * - With `using`, cleanup runs after the last statement in the scope; if both
 *   the body and the cleanup throw, runtimes that support it may surface a
 *   `SuppressedError`.
 *
 * @param fn - Synchronous cleanup function. Return value is ignored.
 * @returns A `Disposable` suitable for `using` or manual `[Symbol.dispose]()`.
 *
 * @see {@link defer} for async cleanup.
 *
 * @example
 * // Automatic cleanup on scope exit (sync)
 * (function run() {
 *   using _cleanup = deferSync(() => closeFile());
 *   // ...work...
 * })();
 *
 * @example
 * // Manual disposal; safe to call more than once (runs only once)
 * const d = deferSync(() => console.log('cleanup'));
 * d[Symbol.dispose]();
 * d[Symbol.dispose](); // no-op
 *
 * @remarks
 * Requires a runtime that implements `using` and `Symbol.dispose`
 * (enable `ESNext` libs in TypeScript).
 */
export function deferSync(fn: () => unknown): Disposable {
	let done = false
	return {
		[Symbol.dispose]() {
			if (done) return
			done = true

			const ret = (fn as () => unknown)()

			if (isPromiseLike(ret)) {
				throw new TypeError('deferSync(): cleanup returned a Promise; use `await using defer()`')
			}
		},
	}
}
