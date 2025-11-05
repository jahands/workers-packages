import { describe, expect, it, vi } from 'vitest'
import * as z from 'zod'

import { defer, deferSync } from './defer.js'

describe('defer()', () => {
	it('calls cleanup when disposed', async () => {
		const cleanup = vi.fn()
		const d = defer(cleanup)

		await d[Symbol.asyncDispose]()

		expect(cleanup).toHaveBeenCalledTimes(1)
	})

	it('awaits async cleanup function', async () => {
		let completed = false
		const cleanup = vi.fn(async () => {
			await Promise.resolve()
			completed = true
		})
		const d = defer(cleanup)

		await d[Symbol.asyncDispose]()

		expect(completed).toBe(true)
		expect(cleanup).toHaveBeenCalledTimes(1)
	})

	it('propagates cleanup errors', async () => {
		const err = new Error('cleanup failed')
		const cleanup = vi.fn(() => {
			throw err
		})
		const d = defer(cleanup)

		await expect(d[Symbol.asyncDispose]()).rejects.toBe(err)
		expect(cleanup).toHaveBeenCalledTimes(1)
	})

	it('cleans up when used with await using', async () => {
		const events: string[] = []
		const cleanup = vi.fn(async () => {
			events.push('cleanup start')
			await Promise.resolve()
			events.push('cleanup end')
		})

		async function run() {
			events.push('before')
			await using _cleanup = defer(cleanup)
			events.push('after')
		}

		await run()

		expect(events).toEqual(['before', 'after', 'cleanup start', 'cleanup end'])
		expect(cleanup).toHaveBeenCalledTimes(1)
	})

	it('does not double-invoke when disposed twice (or concurrently)', async () => {
		const cleanup = vi.fn(async () => {
			await Promise.resolve()
		})
		const d = defer(cleanup)

		await Promise.all([d[Symbol.asyncDispose](), d[Symbol.asyncDispose]()])
		expect(cleanup).toHaveBeenCalledTimes(1)
	})

	it('runs cleanup when the body throws', async () => {
		const called: string[] = []
		const cleanup = vi.fn(async () => called.push('cleanup'))

		await expect(async () => {
			async function run() {
				await using _ = defer(cleanup)
				throw new Error('boom')
			}
			await run()
		}).rejects.toThrow('boom')

		expect(called).toEqual(['cleanup'])
	})

	it('wraps errors with SuppressedError when body and cleanup both throw', async () => {
		const cleanupErr = new Error('cleanup failed')
		const bodyErr = new Error('body failed')
		const cleanup = vi.fn(() => {
			throw cleanupErr
		})
		let caught: unknown
		try {
			async function run() {
				await using _ = defer(cleanup)
				throw bodyErr
			}
			await run()
		} catch (e) {
			caught = e
		}

		expect(caught).toMatchInlineSnapshot(
			`[SuppressedError: An error was suppressed during disposal]`
		)

		const err = z
			.object({
				name: z.literal('SuppressedError'),
				message: z.literal('An error was suppressed during disposal'),
				error: z.instanceof(Error), // defer error
				suppressed: z.instanceof(Error), // body error
			})
			.parse(caught)

		// wrapper error
		expect(err.name).toBe('SuppressedError')
		expect(err.message).toBe('An error was suppressed during disposal')

		// defer error
		expect(err.error).toStrictEqual(cleanupErr)

		// body error
		expect(err.suppressed).toStrictEqual(bodyErr)
	})
})

describe('deferSync()', () => {
	describe('manual', () => {
		it('calls cleanup when disposed', () => {
			const cleanup = vi.fn()
			const d = deferSync(cleanup)

			d[Symbol.dispose]()

			expect(cleanup).toHaveBeenCalledTimes(1)
		})

		it('is idempotent if disposed twice', () => {
			const cleanup = vi.fn()
			const d = deferSync(cleanup)

			d[Symbol.dispose]()
			d[Symbol.dispose]() // no-op

			expect(cleanup).toHaveBeenCalledTimes(1)
		})

		it('propagates cleanup errors', () => {
			const err = new Error('cleanup failed')
			const cleanup = vi.fn(() => {
				throw err
			})
			const d = deferSync(cleanup)

			expect(() => d[Symbol.dispose]()).toThrow(err)
			expect(cleanup).toHaveBeenCalledTimes(1)
		})
	})

	describe('using', () => {
		it('cleans up when used with `using` (ordering)', () => {
			const events: string[] = []
			function run() {
				events.push('before')
				using _ = deferSync(() => {
					events.push('cleanup')
				})
				events.push('after')
			}

			run()

			expect(events).toEqual(['before', 'after', 'cleanup'])
		})

		it('runs cleanup if the body throws', () => {
			const cleanup = vi.fn()
			const run = () => {
				using _ = deferSync(cleanup)
				throw new Error('body failed')
			}

			expect(run).toThrow('body failed')
			expect(cleanup).toHaveBeenCalledTimes(1)
		})

		it('combines body+cleanup errors using SuppressedError', () => {
			const bodyErr = new Error('body failed')
			const cleanupErr = new Error('cleanup failed')

			let caught: unknown
			try {
				function run() {
					using _ = deferSync(() => {
						throw cleanupErr
					})
					throw bodyErr
				}
				run()
			} catch (e) {
				caught = e
			}

			expect(caught).toMatchInlineSnapshot(
				`[SuppressedError: An error was suppressed during disposal]`
			)

			const err = z
				.object({
					name: z.literal('SuppressedError'),
					message: z.literal('An error was suppressed during disposal'),
					error: z.instanceof(Error), // defer error
					suppressed: z.instanceof(Error), // body error
				})
				.parse(caught)

			// wrapper error
			expect(err.name).toBe('SuppressedError')
			expect(err.message).toBe('An error was suppressed during disposal')

			// defer error
			expect(err.error).toStrictEqual(cleanupErr)

			// body error
			expect(err.suppressed).toStrictEqual(bodyErr)
		})
	})

	describe('validation', () => {
		it('rejects when cleanup returns a Promise (manual)', async () => {
			const cleanup = vi.fn(async () => {
				await Promise.resolve()
			})
			const d = deferSync(cleanup)

			expect(() => d[Symbol.dispose]()).toThrowErrorMatchingInlineSnapshot(
				`[TypeError: deferSync(): cleanup returned a Promise; use \`await using defer()\`]`
			)
		})

		it('rejects when cleanup returns a Promise (using)', async () => {
			let caught: unknown
			try {
				function run() {
					using _ = deferSync(async () => {
						await Promise.resolve()
					})
				}
				run()
			} catch (e) {
				caught = e
			}

			expect(caught).toMatchInlineSnapshot(
				`[TypeError: deferSync(): cleanup returned a Promise; use \`await using defer()\`]`
			)
		})
	})
})
