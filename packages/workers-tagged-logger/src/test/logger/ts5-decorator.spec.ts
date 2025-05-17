/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'

import { withLogTags } from '../../logger.js'
import { WithLogTags } from '../../ts5-decorator.js'
import { setupTest } from '../harness.js'

import type { TestHarness } from '../harness.js'
import type { LogTags } from './types.js'

describe('@WithLogTags', () => {
	type TestTags = z.infer<typeof TestTags>
	const TestTags = z.object({
		requestId: z.string().optional(),
		userId: z.number().optional(),
		source: z.string().optional(),
		$logger: z.object({
			method: z.string().optional(),
			rootMethod: z.string().optional(),
		}),
		customTag: z.string().optional(),
		overrideMe: z.string().optional(),
	})

	function toTags(tags: LogTags | undefined): TestTags | undefined {
		return TestTags.passthrough().parse(tags)
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
		@WithLogTags<TestTags>({ customTag: 'nestedValue' })
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
		@WithLogTags<TestTags>({
			$logger: {
				method: 'userAttempt', // Should be overridden
				rootMethod: 'userAttemptRoot', // Should be overridden
			},
			overrideMe: 'decoratorValue',
		})
		async methodWithTagOverrides() {
			this.h.log.setTags({ overrideMe: 'setTagsValue' }) // setTags overrides decorator opts.tags
			this.h.log.info('Testing tag overrides')
		}

		@WithLogTags({ source: 'SyncSource', syncTag: true })
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

		// ========================================== //
		// === Methods for source inference tests === //
		// ========================================== //

		@WithLogTags() // No options, source should be inferred
		inferredSourceInstanceMethod() {
			this.h.log.info('Instance method with inferred source')
		}

		@WithLogTags() // No options, source should be inferred
		static inferredSourceStaticMethod(h: TestHarness<TestTags>) {
			h.log.info('Static method with inferred source')
		}

		@WithLogTags({}) // Empty options, source should be inferred
		inferredSourceEmptyOptions() {
			this.h.log.info('Instance method with inferred source (empty options)')
		}

		@WithLogTags({ only: 'tags' }) // Only tags, source should be inferred
		inferredSourceOnlyTags() {
			this.h.log.info('Instance method with inferred source (only tags)')
		}

		@WithLogTags({ source: 'ExplicitSourceFromObject' }) // Explicit source in object
		explicitSourceViaObject() {
			this.h.log.info('Instance method with explicit source (object)')
		}

		@WithLogTags('ExplicitSourceFromString') // Explicit source as string
		explicitSourceViaString() {
			this.h.log.info('Instance method with explicit source (string)')
		}

		@WithLogTags({ source: 'ExplicitStaticSource' }) // Explicit source for static
		static explicitSourceStaticMethod(h: TestHarness<TestTags>) {
			h.log.info('Static method with explicit source')
		}

		// ========================================== //
		// === Methods for Inherited Source Tests === //
		// ========================================== //

		@WithLogTags({ source: 'OuterExplicitSource' }) // Outer sets explicit source
		async callNestedInferredSource() {
			this.h.log.info('Entering outer explicit')
			await this.nestedInferredSource() // Inner has no explicit source
			this.h.log.info('Exiting outer explicit')
		}

		@WithLogTags() // Inner has no explicit source, should inherit
		async nestedInferredSource() {
			this.h.log.info('Entering nested inferred (should inherit)')
		}

		@WithLogTags({ source: 'OuterExplicitSource' }) // Outer sets explicit source
		async callNestedExplicitSource() {
			this.h.log.info('Entering outer explicit')
			await this.nestedExplicitSource() // Inner also sets explicit source
			this.h.log.info('Exiting outer explicit')
		}

		@WithLogTags({ source: 'InnerExplicitSource' }) // Inner sets explicit source
		async nestedExplicitSource() {
			this.h.log.info('Entering nested explicit (should override)')
		}

		// Method with no explicit source, to be called from different contexts
		@WithLogTags()
		genericInferredMethod() {
			this.h.log.info('Running generic inferred method')
		}
	}

	it('should add basic tags ($logger.method, $logger.rootMethod, source)', async () => {
		const h = setupTest<TestTags>()
		const service = new TestService(h)

		await service.entryPoint('req-1', false)

		expect(h.logAt(0).tags).toEqual({
			source: 'TestServiceEntry',
			$logger: {
				method: 'entryPoint',
				rootMethod: 'entryPoint',
			},
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
			$logger: {
				method: 'entryPoint',
				rootMethod: 'entryPoint',
			},
			requestId: 'req-2',
		})
		expect(h.logAt(0).message).toBe('Entering entryPoint')

		// 2. First log in nestedMethod
		expect(h.logAt(1).tags).toEqual({
			source: 'TestServiceEntry', // Inherited source
			$logger: {
				method: 'nestedMethod',
				rootMethod: 'entryPoint',
			},
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
			$logger: {
				method: 'deeplyNestedMethod',
				rootMethod: 'entryPoint',
			},
			requestId: 'req-2', // Inherited
			customTag: 'nestedValue', // Inherited
			userId: 123, // Inherited
		})
		expect(h.logAt(3).message).toBe('Entering deeplyNestedMethod')

		// 5. Log with extra field from deeplyNestedMethod
		expect(h.logAt(4).tags).toEqual(h.logAt(3).tags) // Same ALS tags
		expect(h.logAt(4).message).toBe('Log with extra field')
		expect(h.logAt(4).extraField).toBe(true) // Check the field

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
			$logger: {
				method: 'entryPoint',
				rootMethod: 'entryPoint',
			},
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
			$logger: {
				method: 'methodAccessingThis',
				rootMethod: 'methodAccessingThis',
			},
			source: 'TestService', // inferred
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
			$logger: {
				method: 'staticMethod',
				rootMethod: 'staticMethod',
			},
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
			$logger: {
				method: 'methodWithError',
				rootMethod: 'methodWithError',
			},
		})
	})

	it('should correctly override tags based on precedence', async () => {
		const h = setupTest<TestTags>()
		const service = new TestService(h)

		await service.methodWithTagOverrides()

		expect(h.oneLog().tags).toEqual({
			// $logger tags take precedence over decorator opts.tags
			$logger: {
				method: 'methodWithTagOverrides',
				rootMethod: 'methodWithTagOverrides',
			},
			// setTags takes precedence over decorator opts.tags
			overrideMe: 'setTagsValue',
			source: 'TestService', // inferred
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
			$logger: {
				method: 'synchronousMethod',
				rootMethod: 'synchronousMethod',
			},
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
			$logger: {
				method: 'synchronousCaller',
				rootMethod: 'synchronousCaller',
			},
		})

		// Log 2: Entry to synchronousMethod (called from synchronousCaller)
		expect(h.logAt(1).message).toBe('Entering synchronousMethod with value: 6')
		expect(h.logAt(1).tags).toEqual({
			source: 'SyncSource', // Overrides caller's source
			$logger: {
				method: 'synchronousMethod', // Current method
				rootMethod: 'synchronousCaller', // Root is the caller
			},
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
			$logger: {
				method: 'synchronousCaller',
				rootMethod: 'synchronousCaller',
			},
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
			$logger: {
				method: 'syncMethodAccessingThis',
				rootMethod: 'syncMethodAccessingThis',
			},
			source: 'TestService', // inferred
		})
	})

	describe('source inference', () => {
		it('should infer source from class name for instance method when no options provided', () => {
			const h = setupTest<TestTags>()
			const service = new TestService(h)
			service.inferredSourceInstanceMethod()

			expect(h.oneLog().tags?.source).toBe('TestService')
			expect(toTags(h.oneLog().tags)?.$logger.method).toBe('inferredSourceInstanceMethod')
			expect(toTags(h.oneLog().tags)?.$logger.rootMethod).toBe('inferredSourceInstanceMethod')
		})

		it('should infer source from class name for static method when no options provided', () => {
			const h = setupTest<TestTags>()
			TestService.inferredSourceStaticMethod(h)

			expect(h.oneLog().tags?.source).toBe('TestService')
			expect(toTags(h.oneLog().tags)?.$logger.method).toBe('inferredSourceStaticMethod')
			expect(toTags(h.oneLog().tags)?.$logger.rootMethod).toBe('inferredSourceStaticMethod')
		})

		it('should infer source from class name when empty options object provided', () => {
			const h = setupTest<TestTags>()
			const service = new TestService(h)
			service.inferredSourceEmptyOptions()

			expect(h.oneLog().tags?.source).toBe('TestService')
			expect(toTags(h.oneLog().tags)?.$logger.method).toBe('inferredSourceEmptyOptions')
		})

		it('should infer source from class name when only tags option provided', () => {
			const h = setupTest<TestTags>()
			const service = new TestService(h)
			service.inferredSourceOnlyTags()

			expect(h.oneLog().tags?.source).toBe('TestService')
			expect(h.oneLog().tags?.only).toBe('tags') // Verify tag is also present
			expect(toTags(h.oneLog().tags)?.$logger.method).toBe('inferredSourceOnlyTags')
		})

		it('should use explicit source from options object over inferred class name', () => {
			const h = setupTest<TestTags>()
			const service = new TestService(h)
			service.explicitSourceViaObject()

			expect(h.oneLog().tags?.source).toBe('ExplicitSourceFromObject')
			expect(toTags(h.oneLog().tags)?.$logger.method).toBe('explicitSourceViaObject')
		})

		it('should use explicit source from string argument over inferred class name', () => {
			const h = setupTest<TestTags>()
			const service = new TestService(h)
			service.explicitSourceViaString()

			expect(h.oneLog().tags?.source).toBe('ExplicitSourceFromString')
			expect(toTags(h.oneLog().tags)?.$logger.method).toBe('explicitSourceViaString')
		})

		it('should use explicit source for static method when provided', () => {
			const h = setupTest<TestTags>()
			TestService.explicitSourceStaticMethod(h)

			expect(h.oneLog().tags?.source).toBe('ExplicitStaticSource')
			expect(toTags(h.oneLog().tags)?.$logger.method).toBe('explicitSourceStaticMethod')
		})
	})

	describe('source inheritance', () => {
		it('should use inherited source from ALS context if no explicit source is provided', async () => {
			const h = setupTest<TestTags>()
			const service = new TestService(h)

			await service.callNestedInferredSource()

			// Log 1: Outer method with its explicit source
			expect(h.logAt(0).message).toBe('Entering outer explicit')
			expect(h.logAt(0).tags?.source).toBe('OuterExplicitSource')
			expect(toTags(h.logAt(0).tags)?.$logger.method).toBe('callNestedInferredSource')

			// Log 2: Inner method (@WithLogTags() - no explicit source)
			// Should inherit 'OuterExplicitSource' from the ALS context
			expect(h.logAt(1).message).toBe('Entering nested inferred (should inherit)')
			expect(h.logAt(1).tags?.source).toBe('OuterExplicitSource') // Inherited
			expect(toTags(h.logAt(1).tags)?.$logger.method).toBe('nestedInferredSource') // Own method name
			expect(toTags(h.logAt(1).tags)?.$logger.rootMethod).toBe('callNestedInferredSource') // Root is the caller

			// Log 3: Back in outer method
			expect(h.logAt(2).message).toBe('Exiting outer explicit')
			expect(h.logAt(2).tags?.source).toBe('OuterExplicitSource') // Context restored
		})

		it('should use explicit source from decorator even if source exists in ALS context', async () => {
			const h = setupTest<TestTags>()
			const service = new TestService(h)

			await service.callNestedExplicitSource()

			// Log 1: Outer method with its explicit source
			expect(h.logAt(0).message).toBe('Entering outer explicit')
			expect(h.logAt(0).tags?.source).toBe('OuterExplicitSource')

			// Log 2: Inner method (@WithLogTags({ source: 'InnerExplicitSource' }))
			// Should use its own explicit source, overriding the inherited one
			expect(h.logAt(1).message).toBe('Entering nested explicit (should override)')
			expect(h.logAt(1).tags?.source).toBe('InnerExplicitSource') // Overridden
			expect(toTags(h.logAt(1).tags)?.$logger.method).toBe('nestedExplicitSource')

			// Log 3: Back in outer method
			expect(h.logAt(2).message).toBe('Exiting outer explicit')
			expect(h.logAt(2).tags?.source).toBe('OuterExplicitSource') // Context restored
		})

		it('should infer source from class name if no explicit source and no source in ALS context', async () => {
			// This is the default top-level behavior, re-verified here
			const h = setupTest<TestTags>()
			const service = new TestService(h)

			// Call the generic method directly (no prior ALS context with source)
			service.genericInferredMethod()

			expect(h.oneLog().message).toBe('Running generic inferred method')
			expect(h.oneLog().tags?.source).toBe('TestService') // Inferred from class
			expect(toTags(h.oneLog().tags)?.$logger.method).toBe('genericInferredMethod')
			expect(toTags(h.oneLog().tags)?.$logger.rootMethod).toBe('genericInferredMethod')
		})

		it('should inherit source from withLogTags context if decorator has no explicit source', async () => {
			const h = setupTest<TestTags>()
			const service = new TestService(h)

			await withLogTags({ source: 'FromWithLogTags' }, async () => {
				// Now call the decorated method which has @WithLogTags()
				service.genericInferredMethod()
			})

			expect(h.oneLog().message).toBe('Running generic inferred method')
			// Should inherit source from the withLogTags context
			expect(h.oneLog().tags?.source).toBe('FromWithLogTags')
			expect(toTags(h.oneLog().tags)?.$logger.method).toBe('genericInferredMethod')
			// Root method name starts when the first decorator runs
			expect(toTags(h.oneLog().tags)?.$logger.rootMethod).toBe('genericInferredMethod')
		})

		it('should use decorator explicit source even when called from withLogTags context', async () => {
			const h = setupTest<TestTags>()
			const service = new TestService(h)

			await withLogTags({ source: 'FromWithLogTags' }, async () => {
				// Call the decorated method which has an explicit source
				service.explicitSourceViaObject() // Uses @WithLogTags({ source: 'ExplicitSourceFromObject' })
			})

			expect(h.oneLog().message).toBe('Instance method with explicit source (object)')
			// Decorator's explicit source should take precedence over withLogTags context
			expect(h.oneLog().tags?.source).toBe('ExplicitSourceFromObject')
			expect(toTags(h.oneLog().tags)?.$logger.method).toBe('explicitSourceViaObject')
			expect(toTags(h.oneLog().tags)?.$logger.rootMethod).toBe('explicitSourceViaObject')
		})
	})
})
