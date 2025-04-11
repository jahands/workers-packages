import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest'
import { z } from 'zod'

import {
	ConsoleLog,
	LogTags,
	stringifyMessage,
	stringifyMessages,
	WithLogTags,
	withLogTags,
	WorkersLogger,
} from './logger.js'

import type { WorkersLoggerOptions } from './logger.js'

type ParsedConsoleLog = z.infer<typeof ParsedConsoleLog>
const ParsedConsoleLog = ConsoleLog.merge(
	z
		.object({
			message: z.union([z.string(), z.undefined()]), // Allow undefined message
			// Make tags optional for easier matching when no tags are expected
			tags: LogTags.optional(),
		})
		// Allow any extra fields from withFields
		.passthrough()
).describe('same as ConsoleLog but message is converted to a string when logged')

class TestHarness<T extends LogTags> {
	private _logs: ParsedConsoleLog[] = []
	readonly log: WorkersLogger<T>

	constructor(opts?: WorkersLoggerOptions) {
		this.log = new WorkersLogger(opts)
		vi.spyOn(console, 'log').mockImplementation((...msgs: ParsedConsoleLog[]) => {
			this._logs.push(...structuredClone(msgs))
		})
	}

	get logs(): ParsedConsoleLog[] {
		return ParsedConsoleLog.array().parse(this._logs)
	}
	/** Get the first log (asserting that there is only one) */
	oneLog(): ParsedConsoleLog {
		const log = ParsedConsoleLog.array().min(1).max(1).parse(this._logs)[0]
		if (log === undefined) throw new Error('no logs')
		return log
	}
	/** Get log at specific index. Supports negative numbers. */
	logAt(n: number): ParsedConsoleLog {
		return ParsedConsoleLog.parse(this.logs.at(n))
	}
}

export function setupTest<T extends LogTags>(opts?: WorkersLoggerOptions): TestHarness<T> {
	return new TestHarness<T>(opts)
}

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
		it(`logs error when not wrapped in withLogTags() (ALS context missing)`, () => {
			const h = setupTest()
			h.log.info('hello')
			// NOTE: We don't get a stack trace here, but the Workers
			// runtime implementation of console.log() will include the
			// stack trace when we log errors.
			expect(h.logs, 'logs the error + the log without any tags').toMatchInlineSnapshot(`
				[
				  {
				    "level": "error",
				    "message": "Error: unable to get log tags from async local storage. did you forget to wrap the function using withLogTags() ?",
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
					expect(h.oneLog().message?.split('\n').slice(0, 2).join('\n')).toMatchInlineSnapshot(
						`"Error: boom!"`
					)
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

		it('does not throw error when missing ASL context', () => {
			const h = setupTest()
			expect(() => {
				h.log.withTags({ foo: 'bar' })
			}).not.toThrow()

			expect(h.logs, 'nothing logged when calling withTags').toStrictEqual([])

			h.log.info('hi')
			expect(h.logs.slice(0, 2), 'logs error + our message with no tags').toMatchInlineSnapshot(`
				[
				  {
				    "level": "error",
				    "message": "Error: unable to get log tags from async local storage. did you forget to wrap the function using withLogTags() ?",
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
				    "level": "error",
				    "message": "Error: unable to get log tags from async local storage. did you forget to wrap the function using withLogTags() ?",
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

		it('does not throw error when missing ASL context', () => {
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
		it('does not throw error when missing ASL context', () => {
			const h = setupTest()
			expect(() => h.log.setTags({ foo: 'bar' })).not.toThrow()
			expect(h.logs, 'it logs an error').toMatchInlineSnapshot(`
				[
				  {
				    "level": "error",
				    "message": "Error: unable to get log tags from async local storage. did you forget to wrap the function using withLogTags() ?",
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
				// to the above ASL scope.
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

describe('@WithLogTags', () => {
	type TestTags = {
		requestId?: string
		userId?: number
		source?: string
		'$logger.methodName'?: string
		'$logger.rootMethodName'?: string
		customTag?: string
		overrideMe?: string
	}

	class TestService {
		constructor(private h: TestHarness<TestTags>) {}

		@WithLogTags<TestTags>({ source: 'TestServiceEntry' })
		async entryPoint(requestId: string, shouldCallNested: boolean) {
			this.h.log.setTags({ requestId })
			this.h.log.info('Entering entryPoint')

			if (shouldCallNested) {
				await this.nestedMethod(123)
			} else {
				await this.undecoratedMethod()
			}

			this.h.log.info('Exiting entryPoint')
			return `Finished ${requestId}`
		}

		@WithLogTags<TestTags>({ tags: { customTag: 'nestedValue' } })
		async nestedMethod(userId: number) {
			this.h.log.setTags({ userId })
			this.h.log.info('Entering nestedMethod')
			await new Promise((r) => setTimeout(r, 10)) // Simulate async work
			this.h.log.debug('Async work done in nestedMethod')
			await this.deeplyNestedMethod()
			this.h.log.info('Exiting nestedMethod')
		}

		@WithLogTags<TestTags>({ source: 'DeepNestedSource' })
		async deeplyNestedMethod() {
			this.h.log.info('Entering deeplyNestedMethod')
			// Test using logger instance methods within decorator context
			const fieldLogger = this.h.log.withFields({ extraField: true })
			fieldLogger.warn('Log with extra field')
			const tagLogger = this.h.log.withTags({ instanceTag: 'hello' })
			tagLogger.debug('Log with instance tag')
			this.h.log.info('Exiting deeplyNestedMethod')
		}

		async undecoratedMethod() {
			this.h.log.info('Entering undecoratedMethod')
			// Logs here should inherit context from the caller (entryPoint)
			await new Promise((r) => setTimeout(r, 5))
			this.h.log.info('Exiting undecoratedMethod')
		}

		@WithLogTags<TestTags>({ source: 'StaticContext' })
		static async staticMethod(h: TestHarness<TestTags>, value: string) {
			h.log.info(`Entering staticMethod with value: ${value}`)
			await new Promise((r) => setTimeout(r, 5))
			h.log.info('Exiting staticMethod')
			return `Static ${value}`
		}

		// Method to test `this` context
		instanceValue = 'initial'
		@WithLogTags<TestTags>({})
		async methodAccessingThis() {
			this.instanceValue = 'modified'
			this.h.log.info(`this.instanceValue is now: ${this.instanceValue}`)
			return this.instanceValue
		}

		// Method to test error handling
		@WithLogTags<TestTags>({ source: 'ErrorSource' })
		async methodWithError() {
			this.h.log.warn('About to throw error')
			throw new Error('Test error inside decorated method')
		}

		// Method to test tag override precedence
		@WithLogTags<TestTags>({
			tags: {
				'$logger.methodName': 'userAttempt', // Should be overridden
				'$logger.rootMethodName': 'userAttemptRoot', // Should be overridden
				overrideMe: 'decoratorValue',
			},
		})
		async methodWithTagOverrides() {
			this.h.log.setTags({ overrideMe: 'setTagsValue' }) // setTags overrides decorator opts.tags
			this.h.log.info('Testing tag overrides')
		}

		@WithLogTags<TestTags>({ source: 'SyncSource', tags: { syncTag: true } })
		synchronousMethod(value: number): string {
			this.h.log.info(`Entering synchronousMethod with value: ${value}`)
			const result = `Sync result: ${value * 2}`
			this.h.log.info(`Exiting synchronousMethod with result: ${result}`)
			return result
		}

		// Synchronous method calling another synchronous decorated method
		@WithLogTags<TestTags>({ source: 'SyncCaller' })
		synchronousCaller(startValue: number): string {
			this.h.log.info(`Entering synchronousCaller with value: ${startValue}`)
			const intermediateResult = this.synchronousMethod(startValue + 1) // Call sync decorated method
			this.h.log.info(`Returned from synchronousMethod: ${intermediateResult}`)
			return `Final from caller: ${intermediateResult}`
		}

		// Synchronous method accessing 'this'
		syncInstanceValue = 'sync initial'
		@WithLogTags<TestTags>({})
		syncMethodAccessingThis(): string {
			this.syncInstanceValue = 'sync modified'
			this.h.log.info(`this.syncInstanceValue is now: ${this.syncInstanceValue}`)
			return this.syncInstanceValue
		}
	}

	it('should add basic tags ($logger.methodName, $logger.rootMethodName, source)', async () => {
		const h = setupTest<TestTags>()
		const service = new TestService(h)

		await service.entryPoint('req-1', false)

		expect(h.logAt(0).tags).toEqual({
			source: 'TestServiceEntry',
			'$logger.methodName': 'entryPoint',
			'$logger.rootMethodName': 'entryPoint',
			requestId: 'req-1',
		})
		expect(h.logAt(0).message).toBe('Entering entryPoint')

		// Check logs from undecorated method inherit context
		expect(h.logAt(1).tags).toEqual(h.logAt(0).tags) // Same tags
		expect(h.logAt(1).message).toBe('Entering undecoratedMethod')
		expect(h.logAt(2).tags).toEqual(h.logAt(0).tags) // Same tags
		expect(h.logAt(2).message).toBe('Exiting undecoratedMethod')

		// Check final log in entryPoint
		expect(h.logAt(3).tags).toEqual(h.logAt(0).tags) // Same tags
		expect(h.logAt(3).message).toBe('Exiting entryPoint')
	})

	it('should handle nested decorated calls correctly', async () => {
		const h = setupTest<TestTags>()
		const service = new TestService(h)

		await service.entryPoint('req-2', true) // Call nested methods

		// 1. First log in entryPoint
		expect(h.logAt(0).tags).toEqual({
			source: 'TestServiceEntry',
			'$logger.methodName': 'entryPoint',
			'$logger.rootMethodName': 'entryPoint',
			requestId: 'req-2',
		})
		expect(h.logAt(0).message).toBe('Entering entryPoint')

		// 2. First log in nestedMethod
		expect(h.logAt(1).tags).toEqual({
			source: 'TestServiceEntry', // Inherited source
			'$logger.methodName': 'nestedMethod', // Current method
			'$logger.rootMethodName': 'entryPoint', // Root method
			requestId: 'req-2', // Inherited from entryPoint context
			customTag: 'nestedValue', // From decorator options
			userId: 123, // Set in nestedMethod
		})
		expect(h.logAt(1).message).toBe('Entering nestedMethod')

		// 3. Debug log in nestedMethod (after await)
		expect(h.logAt(2).tags).toEqual(h.logAt(1).tags) // Same tags
		expect(h.logAt(2).message).toBe('Async work done in nestedMethod')

		// 4. First log in deeplyNestedMethod
		expect(h.logAt(3).tags).toEqual({
			source: 'DeepNestedSource', // Overridden source
			'$logger.methodName': 'deeplyNestedMethod', // Current method
			'$logger.rootMethodName': 'entryPoint', // Root method
			requestId: 'req-2', // Inherited
			customTag: 'nestedValue', // Inherited
			userId: 123, // Inherited
		})
		expect(h.logAt(3).message).toBe('Entering deeplyNestedMethod')

		// 5. Log with extra field from deeplyNestedMethod
		expect(h.logAt(4).tags).toEqual(h.logAt(3).tags) // Same ALS tags
		expect(h.logAt(4).message).toBe('Log with extra field')
		expect((h.logAt(4) as any).extraField).toBe(true) // Check the field

		// 6. Log with instance tag from deeplyNestedMethod
		expect(h.logAt(5).tags).toEqual({
			...h.logAt(3).tags, // Inherit ALS tags
			instanceTag: 'hello', // Add instance tag
		})
		expect(h.logAt(5).message).toBe('Log with instance tag')

		// 7. Exit log from deeplyNestedMethod
		expect(h.logAt(6).tags).toEqual(h.logAt(3).tags) // Back to ALS tags for this scope
		expect(h.logAt(6).message).toBe('Exiting deeplyNestedMethod')

		// 8. Exit log from nestedMethod (context restored)
		expect(h.logAt(7).tags).toEqual(h.logAt(1).tags) // Same tags as entry to nestedMethod
		expect(h.logAt(7).message).toBe('Exiting nestedMethod')

		// 9. Final log in entryPoint (context restored)
		expect(h.logAt(8).tags).toEqual({
			// Should include tags set in nested contexts
			source: 'TestServiceEntry',
			'$logger.methodName': 'entryPoint',
			'$logger.rootMethodName': 'entryPoint',
			requestId: 'req-2',
			customTag: 'nestedValue', // Inherited from nested call!
			userId: 123, // Inherited from nested call!
		})
		expect(h.logAt(8).message).toBe('Exiting entryPoint')
	})

	it('should preserve `this` context', async () => {
		const h = setupTest<TestTags>()
		const service = new TestService(h)

		expect(service.instanceValue).toBe('initial')
		const result = await service.methodAccessingThis()
		expect(result).toBe('modified')
		expect(service.instanceValue).toBe('modified')

		expect(h.oneLog().message).toBe('this.instanceValue is now: modified')
		expect(h.oneLog().tags).toEqual({
			'$logger.methodName': 'methodAccessingThis',
			'$logger.rootMethodName': 'methodAccessingThis',
		})
	})

	it('should preserve arguments and return values', async () => {
		const h = setupTest<TestTags>()
		const service = new TestService(h)

		const returnValue = await service.entryPoint('req-args', false)
		expect(returnValue).toBe('Finished req-args')
		// Check logs to ensure requestId was used correctly
		expect(h.logAt(0).tags?.requestId).toBe('req-args')
	})

	it('should work with static methods', async () => {
		const h = setupTest<TestTags>()
		// Static methods don't have instance `this`, so pass harness explicitly
		const result = await TestService.staticMethod(h, 'test-val')

		expect(result).toBe('Static test-val')
		expect(h.logAt(0).message).toBe('Entering staticMethod with value: test-val')
		expect(h.logAt(0).tags).toEqual({
			source: 'StaticContext',
			'$logger.methodName': 'staticMethod',
			'$logger.rootMethodName': 'staticMethod',
		})
		expect(h.logAt(1).message).toBe('Exiting staticMethod')
		expect(h.logAt(1).tags).toEqual(h.logAt(0).tags)
	})

	it('should apply context even if method throws error', async () => {
		const h = setupTest<TestTags>()
		const service = new TestService(h)

		await expect(service.methodWithError()).rejects.toThrow('Test error inside decorated method')

		// Check that the log before the error had the correct context
		expect(h.oneLog().message).toBe('About to throw error')
		expect(h.oneLog().tags).toEqual({
			source: 'ErrorSource',
			'$logger.methodName': 'methodWithError',
			'$logger.rootMethodName': 'methodWithError',
		})
	})

	it('should correctly override tags based on precedence', async () => {
		const h = setupTest<TestTags>()
		const service = new TestService(h)

		await service.methodWithTagOverrides()

		expect(h.oneLog().tags).toEqual({
			// $logger tags take precedence over decorator opts.tags
			'$logger.methodName': 'methodWithTagOverrides',
			'$logger.rootMethodName': 'methodWithTagOverrides',
			// setTags takes precedence over decorator opts.tags
			overrideMe: 'setTagsValue',
		})
	})

	it('should throw error if applied to non-method property', () => {
		expect(() => {
			class InvalidUsage {
				// @ts-expect-error
				@WithLogTags({}) // Applying to a property
				public myProp: string = 'hello'
			}
			// Need to instantiate or reference the class to trigger decorator execution
			new InvalidUsage()
		}).toThrow('@WithLogTags decorator can only be applied to methods, not properties like myProp.')
	})

	it('should work with purely synchronous methods', () => {
		const h = setupTest<TestTags>()
		const service = new TestService(h)

		const returnValue = service.synchronousMethod(10)

		expect(returnValue).toBe('Sync result: 20')

		// Check logs have correct context
		const expectedTags = {
			source: 'SyncSource',
			'$logger.methodName': 'synchronousMethod',
			'$logger.rootMethodName': 'synchronousMethod',
			syncTag: true,
		}
		expect(h.logAt(0).message).toBe('Entering synchronousMethod with value: 10')
		expect(h.logAt(0).tags).toEqual(expectedTags)

		expect(h.logAt(1).message).toBe('Exiting synchronousMethod with result: Sync result: 20')
		expect(h.logAt(1).tags).toEqual(expectedTags)
	})

	it('should handle nested synchronous decorated calls', () => {
		const h = setupTest<TestTags>()
		const service = new TestService(h)

		const returnValue = service.synchronousCaller(5)

		expect(returnValue).toBe('Final from caller: Sync result: 12') // 5+1 = 6, 6*2 = 12

		// Log 1: Entry to synchronousCaller
		expect(h.logAt(0).message).toBe('Entering synchronousCaller with value: 5')
		expect(h.logAt(0).tags).toEqual({
			source: 'SyncCaller',
			'$logger.methodName': 'synchronousCaller',
			'$logger.rootMethodName': 'synchronousCaller',
		})

		// Log 2: Entry to synchronousMethod (called from synchronousCaller)
		expect(h.logAt(1).message).toBe('Entering synchronousMethod with value: 6')
		expect(h.logAt(1).tags).toEqual({
			source: 'SyncSource', // Overrides caller's source
			'$logger.methodName': 'synchronousMethod', // Current method
			'$logger.rootMethodName': 'synchronousCaller', // Root is the caller
			syncTag: true, // Added by synchronousMethod decorator
		})

		// Log 3: Exit from synchronousMethod
		expect(h.logAt(2).message).toBe('Exiting synchronousMethod with result: Sync result: 12')
		expect(h.logAt(2).tags).toEqual(h.logAt(1).tags) // Same context as entry

		// Log 4: Back in synchronousCaller after call returns
		expect(h.logAt(3).message).toBe('Returned from synchronousMethod: Sync result: 12')
		expect(h.logAt(3).tags).toEqual({
			// Context restored to synchronousCaller's context
			// *Including* tags added by the nested call's decorator
			source: 'SyncCaller',
			'$logger.methodName': 'synchronousCaller',
			'$logger.rootMethodName': 'synchronousCaller',
			syncTag: true, // Inherited from nested decorator!
		})
	})

	it('should preserve `this` context in synchronous methods', () => {
		const h = setupTest<TestTags>()
		const service = new TestService(h)

		expect(service.syncInstanceValue).toBe('sync initial')
		const result = service.syncMethodAccessingThis()
		expect(result).toBe('sync modified')
		expect(service.syncInstanceValue).toBe('sync modified')

		expect(h.oneLog().message).toBe('this.syncInstanceValue is now: sync modified')
		expect(h.oneLog().tags).toEqual({
			'$logger.methodName': 'syncMethodAccessingThis',
			'$logger.rootMethodName': 'syncMethodAccessingThis',
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
		expect(msg.length).toBe(1)
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
		expect(msg.length).toBe(1)
		expect(msg[0]).toMatchInlineSnapshot(`"Error: boom!"`)
	})
})
