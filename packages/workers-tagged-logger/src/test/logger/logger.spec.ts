import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest'
import { z } from 'zod/v4'

import { stringifyMessage, stringifyMessages, withLogTags, WorkersLogger } from '../../logger.js'
import { setupTest } from '../harness.js'

import type { ParsedConsoleLog } from '../harness.js'

beforeEach(() => {
	vi.useFakeTimers()
	const date = Date.UTC(2024, 9, 26, 12, 30)
	vi.setSystemTime(date)
})
afterEach(() => {
	vi.useRealTimers()
	vi.clearAllMocks()
})

describe('WorkersLogger', () => {
	describe('writing logs', () => {
		it(`does not log warning when not wrapped in withLogTags() by default (ALS context missing)`, () => {
			const h = setupTest()
			h.log.info('hello')
			// By default, debug warnings are suppressed to reduce noise
			expect(h.logs, 'only logs the actual message, no warning').toMatchInlineSnapshot(`
				[
				  {
				    "level": "info",
				    "message": "hello",
				    "time": "2024-10-26T12:30:00.000Z",
				  },
				]
			`)
		})

		it(`logs debug warning when not wrapped in withLogTags() and debug: true (ALS context missing)`, () => {
			const h = setupTest({ debug: true })
			h.log.info('hello')
			// With debug: true, warnings are shown at debug level
			expect(h.logs, 'logs the debug warning + the log without any tags').toMatchInlineSnapshot(`
				[
				  {
				    "level": "debug",
				    "message": "Warning: unable to get log tags from async local storage. did you forget to wrap the function using withLogTags() ?",
				    "time": "2024-10-26T12:30:00.000Z",
				  },
				  {
				    "level": "info",
				    "message": "hello",
				    "time": "2024-10-26T12:30:00.000Z",
				  },
				]
			`)
		})

		it('logs to console when wrapped in withLogTags()', async () => {
			const h = setupTest()
			let didRunFn = false
			await withLogTags({ source: 'worker-a' }, async () => {
				didRunFn = true
				h.log.info('hello')
				expect(h.oneLog()).toMatchInlineSnapshot(`
					{
					  "level": "info",
					  "message": "hello",
					  "tags": {
					    "source": "worker-a",
					  },
					  "time": "2024-10-26T12:30:00.000Z",
					}
				`)
			})
			expect(didRunFn).toBe(true)
		})

		describe('can log multiple types of data', () => {
			test('objects', async () => {
				const h = setupTest()
				await withLogTags({ source: 'worker-a' }, async () => {
					h.log.info({ hello: 'world' })
					expect(h.oneLog().message).toMatchInlineSnapshot(`"{"hello":"world"}"`)
				})
			})

			test('arrays', async () => {
				const h = setupTest()
				await withLogTags({ source: 'worker-a' }, async () => {
					h.log.info(['hello', 'world'])
					expect(h.oneLog().message).toMatchInlineSnapshot(`"["hello","world"]"`)
				})
			})

			test('errors', async () => {
				const h = setupTest()
				await withLogTags({ source: 'worker-a' }, async () => {
					h.log.info(new Error('boom!'))
					expect(h.oneLog().message?.split('\n').slice(0, 2).join('\n')).toMatchInlineSnapshot(`
						"Error: boom!
						Error: boom!"
					`)
				})
			})

			test('null', async () => {
				const h = setupTest()
				await withLogTags({ source: 'worker-a' }, async () => {
					h.log.info(null)
					expect(h.oneLog().message).toMatchInlineSnapshot(`"null"`)
				})
			})

			test('number', async () => {
				const h = setupTest()
				await withLogTags({ source: 'worker-a' }, async () => {
					h.log.info(123)
					expect(h.oneLog().message).toMatchInlineSnapshot(`"123"`)
				})
			})

			test('undefined', async () => {
				const h = setupTest()
				await withLogTags({ source: 'worker-a' }, async () => {
					h.log.info(undefined)
					expect(h.oneLog().message).toMatchInlineSnapshot(`"undefined"`)
				})
			})

			test('empty logs undefined', async () => {
				const h = setupTest()
				await withLogTags({ source: 'worker-a' }, async () => {
					h.log.info()
					expect(h.oneLog().message).toMatchInlineSnapshot(`undefined`)
				})
			})
		})

		test('multiple values are logged to the same log', async () => {
			const h = setupTest()
			await withLogTags({ source: 'worker-a' }, async () => {
				h.log.info('hello', 123, new Error('boom!'), { banda: 'rocks' }, ['a', 'b'], {
					foo: { bar: { baz: 'abc' } },
				})
				expect(h.oneLog().message).toMatchInlineSnapshot(
					`"["hello",123,{},{"banda":"rocks"},["a","b"],{"foo":{"bar":{"baz":"abc"}}}]"`
				)
			})
		})

		describe('follow minimum logging levels', () => {
			test('default should be the debug level', async () => {
				const h = setupTest()
				await withLogTags({}, async () => {
					h.log.debug('something')
					expect(h.oneLog().message).toMatchInlineSnapshot(`"something"`)
				})
			})

			it('should not print if below minimum level', async () => {
				const h = setupTest({ minimumLogLevel: 'warn' })
				await withLogTags({}, async () => {
					h.log.debug('something')
					expect(h.logs).toHaveLength(0)
				})
			})

			it('should print at minimum level', async () => {
				const h = setupTest({ minimumLogLevel: 'warn' })
				await withLogTags({}, async () => {
					h.log.warn('something')
					expect(h.logs).toHaveLength(1)
				})
			})
		})

		test('tags are not shared across async contexts', async () => {
			const h = setupTest()
			const promises: Array<Promise<unknown>> = []

			const start = Date.now()
			for (let i = 0; i < 1000; i++) {
				promises.push(
					withLogTags({ source: 'worker-a' }, async () => {
						h.log.setTags({ id: crypto.randomUUID() })
						h.log.info('hello')
						await new Promise((r) => setTimeout(r, 1000))
					})
				)
			}
			vi.runAllTimers()
			// Make sure it only took 1 second to ensure withLogTags
			// is not blocking the event loop.
			expect(Date.now() - start).toBe(1000)

			await Promise.all(promises)
			expect(h.logs.length).toBe(1000)

			// Make sure they are all unique
			const tags = new Set<string>()
			for (const l of h.logs) {
				const { id } = z.object({ id: z.string() }).parse(l.tags)
				expect(tags.has(id)).toBe(false)
				tags.add(id)
			}
			expect(tags.size).toBe(1000)
		})

		describe('logging functions', () => {
			it('should add the corresponding level', async () => {
				const h = setupTest()
				await withLogTags({ source: 'worker-a' }, async () => {
					const ctxLogger = h.log.withTags({ a: 1 })
					ctxLogger.info('log.info()')
					ctxLogger.log('log.log()')
					ctxLogger.warn('log.warn()')
					ctxLogger.error('log.error()')
					ctxLogger.debug('log.debug()')
				})
				expect(h.logs.map((l) => ({ level: l.level, message: l.message }))).toMatchInlineSnapshot(`
				[
				  {
				    "level": "info",
				    "message": "log.info()",
				  },
				  {
				    "level": "log",
				    "message": "log.log()",
				  },
				  {
				    "level": "warn",
				    "message": "log.warn()",
				  },
				  {
				    "level": "error",
				    "message": "log.error()",
				  },
				  {
				    "level": "debug",
				    "message": "log.debug()",
				  },
				]
			`)
			})
		})
	})

	describe('withTags()', () => {
		it('adds tags to new logger but does not affect parent', async () => {
			const h = setupTest()
			await withLogTags({ source: 'worker-a' }, async () => {
				const ctxLogger = h.log.withTags({ foo: 'bar' })
				const ctxLogger2 = ctxLogger.withTags({ banda: 'rocks' })

				h.log.info('a message')
				expect(h.logAt(0).message).toBe('a message')
				expect(h.logAt(0).tags, 'no tags from either logger').toMatchInlineSnapshot(`
					{
					  "source": "worker-a",
					}
				`)

				ctxLogger.info('hello')
				expect(h.logAt(1).message).toBe('hello')
				expect(h.logAt(1).tags, 'no tags from ctxLogger2').toMatchInlineSnapshot(`
					{
					  "foo": "bar",
					  "source": "worker-a",
					}
				`)

				ctxLogger2.info('world')
				expect(h.logAt(2).message).toBe('world')
				expect(h.logAt(2).tags, 'all tags from self + parents').toMatchInlineSnapshot(`
					{
					  "banda": "rocks",
					  "foo": "bar",
					  "source": "worker-a",
					}
				`)
			})
		})

		it('overrides existing tags', async () => {
			const h = setupTest()
			await withLogTags({ source: 'worker-a' }, async () => {
				h.log.setTags({ foo: 'bar' })
				const ctxLogger = h.log.withTags({ foo: 'updated!' })
				ctxLogger.info('hello')
				expect(h.oneLog().tags, 'updated existing tag').toMatchInlineSnapshot(`
					{
					  "foo": "updated!",
					  "source": "worker-a",
					}
				`)
			})
		})

		it('overrides existing existing tags when using nested objects', async () => {
			const h = setupTest()
			await withLogTags({ source: 'worker-a' }, async () => {
				h.log.setTags({ foo: { bar: 'baz', banda: 'rocks' } })
				const ctxLogger = h.log.withTags({ foo: { bar: 'updated!' } })
				ctxLogger.info('hello')
				expect(h.oneLog().tags, 'nested objects are not merged').toMatchInlineSnapshot(`
					{
					  "foo": {
					    "bar": "updated!",
					  },
					  "source": "worker-a",
					}
				`)
			})
		})

		it('does not throw error when missing ALS context', () => {
			const h = setupTest()
			expect(() => {
				h.log.withTags({ foo: 'bar' })
			}).not.toThrow()

			expect(h.logs, 'nothing logged when calling withTags').toStrictEqual([])

			h.log.info('hi')
			expect(h.logs, 'only logs our message with no tags, no warning by default')
				.toMatchInlineSnapshot(`
				[
				  {
				    "level": "info",
				    "message": "hi",
				    "time": "2024-10-26T12:30:00.000Z",
				  },
				]
			`)

			const ctxLogger = h.log.withTags({ banda: 'rocks' })
			ctxLogger.info('hello, world!')
			expect(h.logs.slice(1), 'contains our log from ctxLogger but no global tags, no warning')
				.toMatchInlineSnapshot(`
					[
					  {
					    "level": "info",
					    "message": "hello, world!",
					    "tags": {
					      "banda": "rocks",
					    },
					    "time": "2024-10-26T12:30:00.000Z",
					  },
					]
				`)
		})

		it('logs debug warning when missing ALS context and debug: true', () => {
			const h = setupTest({ debug: true })
			expect(() => {
				h.log.withTags({ foo: 'bar' })
			}).not.toThrow()

			expect(h.logs, 'nothing logged when calling withTags').toStrictEqual([])

			h.log.info('hi')
			expect(h.logs.slice(0, 2), 'logs debug warning + our message with no tags')
				.toMatchInlineSnapshot(`
				[
				  {
				    "level": "debug",
				    "message": "Warning: unable to get log tags from async local storage. did you forget to wrap the function using withLogTags() ?",
				    "time": "2024-10-26T12:30:00.000Z",
				  },
				  {
				    "level": "info",
				    "message": "hi",
				    "time": "2024-10-26T12:30:00.000Z",
				  },
				]
			`)

			const ctxLogger = h.log.withTags({ banda: 'rocks' })
			ctxLogger.info('hello, world!')
			expect(h.logs.slice(2), 'contains our log from ctxLogger but no global tags')
				.toMatchInlineSnapshot(`
					[
					  {
					    "level": "debug",
					    "message": "Warning: unable to get log tags from async local storage. did you forget to wrap the function using withLogTags() ?",
					    "time": "2024-10-26T12:30:00.000Z",
					  },
					  {
					    "level": "info",
					    "message": "hello, world!",
					    "tags": {
					      "banda": "rocks",
					    },
					    "time": "2024-10-26T12:30:00.000Z",
					  },
					]
				`)
		})

		it('cannot delete tags - can only set to undefined / null', async () => {
			const h = setupTest()
			await withLogTags({ source: 'worker-a' }, async () => {
				const ctxLogger = h.log.withTags({ foo: 'bar' })
				ctxLogger.info('hi')
				expect(h.logAt(0).tags).toMatchInlineSnapshot(`
					{
					  "foo": "bar",
					  "source": "worker-a",
					}
				`)

				const ctxLogger2 = ctxLogger.withTags({ foo: undefined })
				ctxLogger2.info('hi')
				expect(h.logAt(1).tags).toMatchInlineSnapshot(`
					{
					  "foo": undefined,
					  "source": "worker-a",
					}
				`)

				const ctxLogger3 = ctxLogger2.withTags({ foo: null })
				ctxLogger3.info('hi')
				expect(h.logAt(2).tags).toMatchInlineSnapshot(`
					{
					  "foo": null,
					  "source": "worker-a",
					}
				`)
			})
		})
	})

	describe('withFields()', () => {
		it('returns new logger with supplied fields', async () => {
			const h = setupTest()
			await withLogTags({}, async () => {
				const ctxLogger = h.log.withFields({ banda: 'rocks' })
				expect(ctxLogger).instanceOf(WorkersLogger)
				ctxLogger.info('hello')
				expect(h.oneLog(), 'added top level field').toMatchInlineSnapshot(`
					{
					  "banda": "rocks",
					  "level": "info",
					  "message": "hello",
					  "time": "2024-10-26T12:30:00.000Z",
					}
				`)
			})
		})

		it('overwrites other top-level fields', async () => {
			const h = setupTest()
			await withLogTags({}, async () => {
				const ctxLogger = h.log.withFields({ message: 'overwritten message' })
				ctxLogger.info('hello')
				expect(h.oneLog(), 'message is overwritten').toMatchInlineSnapshot(`
					{
					  "level": "info",
					  "message": "overwritten message",
					  "time": "2024-10-26T12:30:00.000Z",
					}
				`)
			})
		})

		it('replaces existing top-level fields in child but not parent', async () => {
			const h = setupTest()
			await withLogTags({}, async () => {
				const ctxLogger = h.log.withFields({ foo: 'bar' })
				const ctxLogger2 = h.log.withFields({ foo: 'baz' })

				ctxLogger.info('hello')
				expect(h.logAt(0)).toMatchInlineSnapshot(`
					{
					  "foo": "bar",
					  "level": "info",
					  "message": "hello",
					  "time": "2024-10-26T12:30:00.000Z",
					}
				`)

				ctxLogger2.info('world')
				expect(h.logAt(1), 'foo is overwritten').toMatchInlineSnapshot(`
					{
					  "foo": "baz",
					  "level": "info",
					  "message": "world",
					  "time": "2024-10-26T12:30:00.000Z",
					}
				`)

				ctxLogger.info('hi')
				expect(h.logAt(2), 'parent still has original value').toMatchInlineSnapshot(`
					{
					  "foo": "bar",
					  "level": "info",
					  "message": "hi",
					  "time": "2024-10-26T12:30:00.000Z",
					}
				`)
			})
		})

		it('does not throw error when missing ALS context', () => {
			const h = setupTest()
			expect(() => {
				h.log.withFields({ foo: 'bar' })
			}).not.toThrow()
		})

		it('can set fields to multiple types', async () => {
			const h = setupTest()
			await withLogTags({}, async () => {
				const ctxLogger = h.log.withFields({
					foo: 'bar',
					days: 23,
					works: true,
					banda: {
						team: 'best team',
					},
					an: ['array', 'of', 'stuff'],
				})
				ctxLogger.info('hello')
				expect(h.oneLog()).toMatchInlineSnapshot(`
						{
						  "an": [
						    "array",
						    "of",
						    "stuff",
						  ],
						  "banda": {
						    "team": "best team",
						  },
						  "days": 23,
						  "foo": "bar",
						  "level": "info",
						  "message": "hello",
						  "time": "2024-10-26T12:30:00.000Z",
						  "works": true,
						}
					`)
			})
		})
	})

	describe('setTags()', () => {
		it('does not throw error when missing ALS context', () => {
			const h = setupTest()
			expect(() => h.log.setTags({ foo: 'bar' })).not.toThrow()
			expect(h.logs, 'no warning logged by default').toStrictEqual([])
		})

		it('logs debug warning when missing ALS context and debug: true', () => {
			const h = setupTest({ debug: true })
			expect(() => h.log.setTags({ foo: 'bar' })).not.toThrow()
			expect(h.logs, 'it logs a debug warning').toMatchInlineSnapshot(`
				[
				  {
				    "level": "debug",
				    "message": "Warning: unable to get log tags from async local storage. did you forget to wrap the function using withLogTags() ?",
				    "time": "2024-10-26T12:30:00.000Z",
				  },
				]
			`)
		})

		it('sets tags globally for all loggers in the same (or lower) async context', async () => {
			const h = setupTest()
			await withLogTags({ source: 'worker-a' }, async () => {
				h.log.setTags({ banda: 'rocks' })
				h.log.info('hello')
				expect(h.logAt(0).tags).toMatchInlineSnapshot(`
					{
					  "banda": "rocks",
					  "source": "worker-a",
					}
				`)

				await withLogTags({ source: 'worker-a' }, async () => {
					h.log.setTags({ foo: 'bar' })
					h.log.info('world')
					expect(h.logAt(1).tags, 'includes tags from parent + child').toMatchInlineSnapshot(`
						{
						  "banda": "rocks",
						  "foo": "bar",
						  "source": "worker-a",
						}
					`)
				})

				h.log.info('cows')
				expect(h.logAt(2).tags, 'does not include tag from child').toMatchInlineSnapshot(`
					{
					  "banda": "rocks",
					  "source": "worker-a",
					}
				`)
			})
		})

		it('overrides existing existing tags when using nested objects', async () => {
			const h = setupTest()
			await withLogTags({ source: 'worker-a' }, async () => {
				h.log.setTags({ foo: { bar: 'baz', banda: 'rocks' } })
				h.log.setTags({ foo: { bar: 'updated!' } })
				h.log.info('hello')
				expect(h.oneLog().tags, 'nested objects are not merged').toMatchInlineSnapshot(`
					{
					  "foo": {
					    "bar": "updated!",
					  },
					  "source": "worker-a",
					}
				`)
			})
		})

		it('cannot delete tags - can only set to undefined / null', async () => {
			const h = setupTest()
			await withLogTags({ source: 'worker-a' }, async () => {
				h.log.setTags({ foo: 'bar' })
				h.log.info('hi')
				expect(h.logAt(0).tags).toMatchInlineSnapshot(`
					{
					  "foo": "bar",
					  "source": "worker-a",
					}
				`)

				h.log.setTags({ foo: undefined })
				h.log.info('hi')
				expect(h.logAt(1).tags).toMatchInlineSnapshot(`
					{
					  "foo": undefined,
					  "source": "worker-a",
					}
				`)

				h.log.setTags({ foo: null })
				h.log.info('hi')
				expect(h.logAt(2).tags).toMatchInlineSnapshot(`
					{
					  "foo": null,
					  "source": "worker-a",
					}
				`)
			})
		})
	})

	describe('setLogLevel()', () => {
		it('does not throw error when missing ALS context', () => {
			const h = setupTest()
			expect(() => h.log.setLogLevel('warn')).not.toThrow()
			expect(h.logs, 'no warning logged by default').toStrictEqual([])
		})

		it('logs debug warning when missing ALS context and debug: true', () => {
			const h = setupTest({ debug: true })
			expect(() => h.log.setLogLevel('warn')).not.toThrow()
			expect(h.logs, 'it logs a debug warning').toMatchInlineSnapshot(`
				[
				  {
				    "level": "debug",
				    "message": "Warning: unable to get log tags from async local storage. did you forget to wrap the function using withLogTags() ?",
				    "time": "2024-10-26T12:30:00.000Z",
				  },
				]
			`)
		})
	})
})

describe('withLogTags', () => {
	it('inherits context but does not leak setTags from lower context to upper', async () => {
		const h = setupTest()
		const ctxLogger = h.log.withTags({})

		await withLogTags({ source: 'worker-a' }, async () => {
			ctxLogger.setTags({ banda: 'rocks' })
			ctxLogger.info('hello from level 1!')

			await withLogTags({ source: 'subHandler' }, async () => {
				// setTags applies to async context, not the localized
				// logger instance tags, so these logs will not propagate
				// to the above ALS scope.
				ctxLogger.setTags({ sub: 'handler' })
				ctxLogger.info('hello from level 2!')
			})

			ctxLogger.info('hello again from level 1!')
		})
		const getLog = (n: number): Partial<ParsedConsoleLog> => ({
			message: h.logAt(n).message,
			tags: h.logAt(n).tags,
		})

		expect(getLog(0)).toMatchInlineSnapshot(`
			{
			  "message": "hello from level 1!",
			  "tags": {
			    "banda": "rocks",
			    "source": "worker-a",
			  },
			}
		`)
		expect(getLog(1), `updated source and 'sub' tag is added`).toMatchInlineSnapshot(
			`
			{
			  "message": "hello from level 2!",
			  "tags": {
			    "banda": "rocks",
			    "source": "subHandler",
			    "sub": "handler",
			  },
			}
		`
		)
		expect(getLog(2), `does not contain 'sub' tag from lower level and source is unchanged`)
			.toMatchInlineSnapshot(`
				{
				  "message": "hello again from level 1!",
				  "tags": {
				    "banda": "rocks",
				    "source": "worker-a",
				  },
				}
			`)
	})

	it('adds source to tags when provided', async () => {
		const h = setupTest()
		await withLogTags({ source: 'worker-a' }, async () => {
			h.log.info('hi')
			// Source added at top level
			expect(h.logAt(0).tags?.source).toBe('worker-a')

			// Overridden in lower level
			await withLogTags({ source: 'bananas' }, async () => {
				h.log.info('hi')
				expect(h.logAt(1).tags?.source).toBe('bananas')
			})

			// Unchanged in lower level
			await withLogTags({}, async () => {
				h.log.info('hi')
				expect(h.logAt(2).tags?.source).toBe('worker-a')
			})
		})
	})

	it('does not set source if not provided at top level', async () => {
		const h = setupTest()
		await withLogTags({}, async () => {
			h.log.info('hi')
			expect(h.logAt(0).tags?.source).toBeUndefined()
			expect(h.logAt(0)).toMatchInlineSnapshot(`
				{
				  "level": "info",
				  "message": "hi",
				  "time": "2024-10-26T12:30:00.000Z",
				}
			`)
		})
	})
})

describe('stringifyMessage()', () => {
	it('stringifies basic types', () => {
		expect(stringifyMessage('abc')).toMatchInlineSnapshot(`"abc"`)
		expect(stringifyMessage(123)).toMatchInlineSnapshot(`"123"`)
		expect(stringifyMessage(true)).toMatchInlineSnapshot(`"true"`)
	})

	it('stringifies objects', () => {
		expect(stringifyMessage({ foo: 'bar', a: 1 })).toMatchInlineSnapshot(`"{"foo":"bar","a":1}"`)
	})

	it('stringifies arrays', () => {
		expect(stringifyMessage(['a', 1, true])).toMatchInlineSnapshot(`"["a",1,true]"`)
		expect(stringifyMessage([{ foo: 'bar' }, { a: 1 }, [1, 2]])).toMatchInlineSnapshot(
			`"[{"foo":"bar"},{"a":1},[1,2]]"`
		)
	})

	it('stringifies functions', () => {
		expect(stringifyMessage(stringifyMessage)).toMatchInlineSnapshot(
			`"[function: stringifyMessage()]"`
		)
	})

	it('stringifies errors', () => {
		const msg = stringifyMessage(new Error('boom!')).split('\n')
		expect(msg.length).toBeGreaterThan(1)
		expect(msg[0]).toMatchInlineSnapshot(`"Error: boom!"`)
	})
})

describe('stringifyMessages()', () => {
	it('stringifies multiple messages', () => {
		expect(
			stringifyMessages('a', 1, true, stringifyMessage, { foo: 'bar' }, ['a', 1, true])
		).toMatchInlineSnapshot(`"a 1 true [function: stringifyMessage()] {"foo":"bar"} ["a",1,true]"`)
	})

	it('stringifies errors', () => {
		const msg = stringifyMessages(new Error('boom!')).split('\n')
		expect(msg.length).toBeGreaterThan(1)
		expect(msg[0]).toMatchInlineSnapshot(`"Error: boom!"`)
	})
})
