import { describe, expect, it } from 'vitest'

import { stringifyMessage, stringifyMessages, WithLogTags } from '../../logger.js'
import { setupTest, TestHarness } from '../harness.js'

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

		// Adding tag hints is not required. It's only
		// helpful if tags are specified
		@WithLogTags<TestTags>({ tags: { customTag: 'nestedValue' } })
		async nestedMethod(userId: number) {
			this.h.log.setTags({ userId })
			this.h.log.info('Entering nestedMethod')
			await new Promise((r) => setTimeout(r, 1)) // Simulate async work
			this.h.log.debug('Async work done in nestedMethod')
			await this.deeplyNestedMethod()
			this.h.log.info('Exiting nestedMethod')
		}

		// Source can also be passed in as a string
		@WithLogTags('DeepNestedSource')
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
			await new Promise((r) => setTimeout(r, 1))
			this.h.log.info('Exiting undecoratedMethod')
		}

		@WithLogTags({ source: 'StaticContext' })
		static async staticMethod(h: TestHarness<TestTags>, value: string) {
			h.log.info(`Entering staticMethod with value: ${value}`)
			await new Promise((r) => setTimeout(r, 1))
			h.log.info('Exiting staticMethod')
			return `Static ${value}`
		}

		// Method to test `this` context
		instanceValue = 'initial'
		@WithLogTags({})
		async methodAccessingThis() {
			this.instanceValue = 'modified'
			this.h.log.info(`this.instanceValue is now: ${this.instanceValue}`)
			return this.instanceValue
		}

		// Method to test error handling
		@WithLogTags({ source: 'ErrorSource' })
		async methodWithError() {
			this.h.log.warn('About to throw error')
			throw new Error('Test error inside decorated method')
		}

		// Method to test tag override precedence
		@WithLogTags({
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

		@WithLogTags({ source: 'SyncSource', tags: { syncTag: true } })
		synchronousMethod(value: number): string {
			this.h.log.info(`Entering synchronousMethod with value: ${value}`)
			const result = `Sync result: ${value * 2}`
			this.h.log.info(`Exiting synchronousMethod with result: ${result}`)
			return result
		}

		// Synchronous method calling another synchronous decorated method
		@WithLogTags({ source: 'SyncCaller' })
		synchronousCaller(startValue: number): string {
			this.h.log.info(`Entering synchronousCaller with value: ${startValue}`)
			const intermediateResult = this.synchronousMethod(startValue + 1) // Call sync decorated method
			this.h.log.info(`Returned from synchronousMethod: ${intermediateResult}`)
			return `Final from caller: ${intermediateResult}`
		}

		// Synchronous method accessing 'this'
		syncInstanceValue = 'sync initial'
		@WithLogTags({})
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
			// Should not include tags set in nested contexts
			source: 'TestServiceEntry',
			'$logger.methodName': 'entryPoint',
			'$logger.rootMethodName': 'entryPoint',
			requestId: 'req-2',
			// no customTag or userId that were set in nested call
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
			// excluding tags added by the nested call's decorator
			source: 'SyncCaller',
			'$logger.methodName': 'synchronousCaller',
			'$logger.rootMethodName': 'synchronousCaller',
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
