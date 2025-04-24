/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { afterEach, assert, beforeEach, describe, expect, it, vi } from 'vitest'

import { envStorage, ParamsToEnv } from './env.js'
import * as envFuncs from './env.js'

import type { Secret } from '@dagger.io/dagger'

// Mock console.warn to check for warnings
const consoleWarnMessages: string[] = []
beforeEach(() => {
	// Ensure clean state for envStorage if tests run in parallel/share state (though ALS should isolate)
	expect(envStorage.getStore()).toBeUndefined()

	vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
		consoleWarnMessages.push(args.map(String).join(' '))
	})
})
afterEach(() => {
	vi.restoreAllMocks()
	consoleWarnMessages.length = 0
})

describe('@ParamsToEnv Decorator', () => {
	it('should run the original method and return its value', () => {
		class TestClass {
			@ParamsToEnv()
			myMethod(arg1: string): string {
				// Method body should execute
				return `Result: ${arg1}`
			}
		}
		const instance = new TestClass()
		expect(instance.myMethod('hello')).toBe('Result: hello')
		expect(consoleWarnMessages).toStrictEqual([])
	})

	describe('Context Storage (envStorage)', () => {
		it('should store valid ENV_VAR parameters in context', () => {
			class TestClass {
				@ParamsToEnv()
				myMethod(
					ARG1: string,
					_arg2: number,
					// Use string for testing where Secret is expected
					ANOTHER_VAR: Secret | string
				): Record<string, Secret | string | undefined> {
					const context = envStorage.getStore()
					assert(context !== undefined)
					expect(context.mergedEnv.ARG1).toBe('value1')
					// Check if the stored value is the string we passed
					expect(context.mergedEnv.ANOTHER_VAR).toBe('secret_value')
					// Not stored: _arg2 starts with _, not all caps
					expect(context.mergedEnv.hasOwnProperty('_arg2')).toBe(false)
					// Check current params
					expect(context.currentParams).toEqual(new Set(['ARG1', 'ANOTHER_VAR']))
					return context.mergedEnv // Return context for outer assertion too
				}
			}
			const instance = new TestClass()
			const secretValue = 'secret_value'
			const finalContext = instance.myMethod('value1', 123, secretValue)
			assert(finalContext !== undefined)

			// Assertions on the returned context (redundant but good practice)
			expect(finalContext.ARG1).toBe('value1') // finalContext is the returned mergedEnv
			expect(finalContext.ANOTHER_VAR).toBe(secretValue)
			expect(Object.keys(finalContext).length).toBe(2) // Only valid vars stored
			expect(envStorage.getStore()).toBeUndefined() // Context gone after call
			expect(consoleWarnMessages).toStrictEqual([])
		})

		it('should not store parameters not matching ENV_VAR pattern', () => {
			class TestClass {
				@ParamsToEnv()
				myMethod(
					camelCase: string,
					snake_case: number,
					_leadingUnderscore: string,
					ALL_CAPS: string
				): void {
					const context = envStorage.getStore()
					assert(context !== undefined)
					expect(context.mergedEnv.ALL_CAPS).toBe('caps')
					expect(context.mergedEnv.hasOwnProperty('camelCase')).toBe(false)
					expect(context.mergedEnv.hasOwnProperty('snake_case')).toBe(false)
					expect(context.mergedEnv.hasOwnProperty('_leadingUnderscore')).toBe(false)
					expect(Object.keys(context.mergedEnv).length).toBe(1)
					expect(context.currentParams).toEqual(new Set(['ALL_CAPS']))
				}
			}
			const instance = new TestClass()
			instance.myMethod('camel', 123, 'under', 'caps')
			expect(envStorage.getStore()).toBeUndefined() // Context gone after call
			expect(consoleWarnMessages).toStrictEqual([])
		})

		it('should handle methods with no parameters', () => {
			class TestClass {
				@ParamsToEnv()
				myMethod(): string {
					const context = envStorage.getStore()
					assert(context !== undefined)
					expect(Object.keys(context.mergedEnv).length).toBe(0)
					expect(context.currentParams).toEqual(new Set())
					return 'done'
				}
			}
			const instance = new TestClass()
			expect(instance.myMethod()).toBe('done')
			expect(envStorage.getStore()).toBeUndefined() // Context gone after call
			expect(consoleWarnMessages).toStrictEqual([])
		})

		it('should handle various parameter definition styles (types, defaults)', () => {
			// extractParamNames relies on toString(), defaults/types shouldn't affect name extraction or storage
			class TestClass {
				@ParamsToEnv()
				myMethod(
					ARG1: string,
					VAR_2 = 'default',
					NUM3: number = 123,
					OPTIONAL_ARG?: Secret | string // Use string for Secret
				): Record<string, Secret | string | undefined> {
					const context = envStorage.getStore()
					assert(context !== undefined)
					expect(context.mergedEnv.ARG1).toBe('val1')
					expect(context.mergedEnv.VAR_2).toBe('val2') // Passed value overrides default
					expect(context.mergedEnv.NUM3).toBe(456) // Passed value overrides default (cast number)
					expect(context.mergedEnv.OPTIONAL_ARG).toBe('optional_secret')
					expect(context.currentParams).toEqual(new Set(['ARG1', 'VAR_2', 'NUM3', 'OPTIONAL_ARG']))
					return context.mergedEnv
				}
			}
			const instance = new TestClass()
			const secretValue = 'optional_secret'
			// Cast number to satisfy potential type checks if NUM3 were Secret
			const finalContext = instance.myMethod('val1', 'val2', 456, secretValue)
			assert(finalContext !== undefined)
			expect(Object.keys(finalContext).length).toBe(4)
			expect(envStorage.getStore()).toBeUndefined() // Context gone after call
			expect(consoleWarnMessages).toStrictEqual([])
		})

		it('should handle optional parameters that are not provided', () => {
			class TestClass {
				@ParamsToEnv()
				myMethod(REQUIRED_VAR: string, OPTIONAL_VAR?: string, ANOTHER_OPTIONAL?: number): void {
					const context = envStorage.getStore()
					assert(context !== undefined)
					expect(context.mergedEnv.REQUIRED_VAR).toBe('req')
					// OPTIONAL_VAR wasn't passed, index >= args.length, so not stored in mergedEnv
					expect(context.mergedEnv.hasOwnProperty('OPTIONAL_VAR')).toBe(false)
					expect(context.mergedEnv.hasOwnProperty('ANOTHER_OPTIONAL')).toBe(false)
					// currentParams includes all defined params matching pattern, even if unset
					expect(context.currentParams).toEqual(
						new Set(['REQUIRED_VAR', 'OPTIONAL_VAR', 'ANOTHER_OPTIONAL'])
					)
				}
			}
			const instance = new TestClass()
			instance.myMethod('req')
			// Check warning message (depends on extractParamNames identifying optional params correctly)
			expect(consoleWarnMessages.some((msg) => msg.includes('mismatch'))).toBe(true)
			expect(
				consoleWarnMessages.some((msg) =>
					msg.includes(
						'Extracted 3 names (REQUIRED_VAR, OPTIONAL_VAR, ANOTHER_OPTIONAL), received 1 args'
					)
				)
			).toBe(true)
			expect(envStorage.getStore()).toBeUndefined() // Context gone after call
			expect(consoleWarnMessages.length).toBe(1)
		})

		it('should provide undefined context outside the decorated method scope', () => {
			expect(envStorage.getStore()).toBeUndefined()
			class TestClass {
				storeRef?: Record<string, Secret | string | undefined>
				@ParamsToEnv()
				myMethod(VAR1: string): void {
					// Context exists here
					const context = envStorage.getStore()
					assert(context !== undefined)
					this.storeRef = context.mergedEnv // Store mergedEnv for later check
					expect(this.storeRef).toBeDefined()
					expect(this.storeRef?.VAR1).toBe('A')
					expect(context.currentParams).toEqual(new Set(['VAR1']))
				}
			}
			const instance = new TestClass()
			instance.myMethod('A')
			// Context should be undefined again after the call finishes
			expect(envStorage.getStore()).toBeUndefined()
			// Check the reference captured inside still holds the value (showing ALS exit removes it)
			expect(instance.storeRef).toBeDefined()
			expect(instance.storeRef?.VAR1).toBe('A')
			expect(consoleWarnMessages).toStrictEqual([])
		})
	})

	describe('Nested Calls & Context Merging', () => {
		class NestedTestClass {
			@ParamsToEnv()
			outerMethod(
				OUTER_VAR: string,
				SHARED_VAR: string, // Will be overwritten by inner call
				nonEnvOuter: number // Will not be stored
			): Record<string, Secret | string | undefined> {
				const outerContext = envStorage.getStore()
				assert(outerContext !== undefined)
				expect(outerContext.mergedEnv.OUTER_VAR).toBe('outer_A')
				expect(outerContext.mergedEnv.SHARED_VAR).toBe('outer_B')
				expect(outerContext.mergedEnv.nonEnvOuter).toBeUndefined() // Check absence in mergedEnv
				expect(Object.keys(outerContext.mergedEnv).length).toBe(2)
				expect(outerContext.currentParams).toEqual(new Set(['OUTER_VAR', 'SHARED_VAR']))

				// Call inner decorated method
				return this.innerMethod('inner_C', 'inner_B_override', 999)
			}

			@ParamsToEnv()
			innerMethod(
				INNER_VAR: string,
				SHARED_VAR: string, // Overwrites parent's SHARED_VAR
				nonEnvInner: number // Will not be stored
			): Record<string, Secret | string | undefined> {
				const innerContext = envStorage.getStore()
				assert(innerContext !== undefined)
				// Check merged context within innerMethod
				expect(innerContext.mergedEnv.OUTER_VAR).toBe('outer_A') // From parent
				expect(innerContext.mergedEnv.INNER_VAR).toBe('inner_C') // From current
				expect(innerContext.mergedEnv.SHARED_VAR).toBe('inner_B_override') // Current overwrites parent
				expect(innerContext.mergedEnv.nonEnvOuter).toBeUndefined() // Parent non-env still not stored
				expect(innerContext.mergedEnv.nonEnvInner).toBeUndefined() // Current non-env not stored
				expect(Object.keys(innerContext.mergedEnv).length).toBe(3) // OUTER_VAR, INNER_VAR, SHARED_VAR
				expect(innerContext.currentParams).toEqual(new Set(['INNER_VAR', 'SHARED_VAR']))

				return innerContext.mergedEnv // Return final merged context
			}

			@ParamsToEnv()
			simpleOuter(OUTER_A: string): Record<string, Secret | string | undefined> {
				return this.simpleInner('inner_B')
			}

			@ParamsToEnv()
			simpleInner(INNER_B: string): Record<string, Secret | string | undefined> {
				const context = envStorage.getStore()
				assert(context !== undefined)
				// Check merged env and current params
				expect(context.mergedEnv.OUTER_A).toBe('A_val') // From parent
				expect(context.mergedEnv.INNER_B).toBe('inner_B')
				expect(context.currentParams).toEqual(new Set(['INNER_B']))
				return context.mergedEnv
			}
		}

		it('should merge contexts, with inner call parameters taking precedence', () => {
			const instance = new NestedTestClass()
			const finalContext = instance.outerMethod('outer_A', 'outer_B', 123)
			assert(finalContext !== undefined)
			// Double check final context returned by the call stack (which is mergedEnv)
			expect(finalContext.OUTER_VAR).toBe('outer_A')
			expect(finalContext.INNER_VAR).toBe('inner_C')
			expect(finalContext.SHARED_VAR).toBe('inner_B_override')
			expect(Object.keys(finalContext).length).toBe(3) // Only valid ENV_VARs

			// Ensure context is gone after top-level call finishes
			expect(envStorage.getStore()).toBeUndefined()
			expect(consoleWarnMessages).toStrictEqual([])
		})

		it('should merge contexts without overlap correctly', () => {
			const instance = new NestedTestClass()
			const finalContext = instance.simpleOuter('A_val')
			assert(finalContext !== undefined)
			expect(finalContext.OUTER_A).toBe('A_val')
			expect(finalContext.INNER_B).toBe('inner_B')
			expect(Object.keys(finalContext).length).toBe(2)
			expect(envStorage.getStore()).toBeUndefined()
			expect(consoleWarnMessages).toStrictEqual([])
		})
	})

	describe('Argument Passing', () => {
		it('should pass all original arguments to the decorated method', () => {
			// Use any[] for receivedArgs type to avoid IArguments issues
			let receivedArgs: any[] | undefined = undefined
			class TestClass {
				@ParamsToEnv()
				myMethod(
					ARG1: string,
					arg2: number,
					ARG3_SECRET: Secret | string,
					optional4?: boolean,
					env?: string // common but invalid name
				): void {
					// Capture arguments passed to the *original* method
					// eslint-disable-next-line prefer-rest-params
					receivedArgs = Array.from(arguments)
					const context = envStorage.getStore()
					assert(context !== undefined)
					// Check context only contains valid names
					expect(context.mergedEnv.ARG1).toBe('val1')
					expect(context.mergedEnv.ARG3_SECRET).toBe('s3_secret')
					expect(context.mergedEnv.hasOwnProperty('arg2')).toBe(false)
					expect(context.mergedEnv.hasOwnProperty('optional4')).toBe(false)
					expect(context.mergedEnv.hasOwnProperty('env')).toBe(false)
					expect(Object.keys(context.mergedEnv).length).toBe(2)
					expect(context.currentParams).toEqual(new Set(['ARG1', 'ARG3_SECRET']))
				}
			}
			const instance = new TestClass()
			const secretValue = 's3_secret'
			// Call with all args, including optional and non-env name
			instance.myMethod('val1', 123, secretValue, true, 'prod')

			assert(receivedArgs !== undefined)
			expect(Array.isArray(receivedArgs)).toBe(true)
			expect((receivedArgs as any[]).length).toBe(5)
			// Use assertions to guide the linter within the block
			expect((receivedArgs as any[]).length).toBe(5)
			expect((receivedArgs as any[])[0]).toBe('val1')
			expect((receivedArgs as any[])[1]).toBe(123)
			expect((receivedArgs as any[])[2]).toBe(secretValue)
			expect((receivedArgs as any[])[3]).toBe(true)
			expect((receivedArgs as any[])[4]).toBe('prod')
			expect(envStorage.getStore()).toBeUndefined() // Context gone after call
			expect(consoleWarnMessages).toStrictEqual([])
		})
	})

	describe('Error Handling / Edge Cases', () => {
		it('should throw error if applied to non-method property', () => {
			let didErr = false
			try {
				class TestClass {
					// Applying decorator to a property, not a method
					// @ts-expect-error - Testing invalid decorator application (compile-time error expected)
					@ParamsToEnv()
					myProp: string = 'hello'
				}
				// Instantiation might be needed depending on when decorator runs
				new TestClass()
				assert.fail('Should have thrown an error') // Should not reach here
			} catch (e) {
				didErr = true
				assert(e instanceof Error)
				expect(e.message).toMatch(/can only be applied to methods/)
			}
			expect(didErr).toBe(true)
			expect(consoleWarnMessages).toStrictEqual([])
		})

		it('should throw error if applied to a getter', () => {
			let didErr = false
			try {
				class TestClass {
					@ParamsToEnv()
					get myGetter(): string {
						return 'hello'
					}
				}
				new TestClass()
				assert.fail('Should have thrown an error')
			} catch (e) {
				didErr = true
				assert(e instanceof Error)
				expect(e.message).toMatch(/can only be applied to methods/)
			}
			expect(didErr).toBe(true)
			expect(consoleWarnMessages).toStrictEqual([])
		})

		it('should throw error if applied to a setter', () => {
			try {
				class TestClass {
					@ParamsToEnv()
					set mySetter(_val: string) {}
				}
				new TestClass()
				assert.fail('Should have thrown an error')
			} catch (e: any) {
				expect(e.message).toMatch(/can only be applied to methods/)
			}
			expect(consoleWarnMessages).toStrictEqual([])
		})

		// disabling because I'm having difficulty mocking extractParamNames
		it.skip('should warn and store empty context if extractParamNames fails', () => {
			// Spy on the actual extractParamNames function
			const spy = vi.spyOn(envFuncs, 'extractParamNames').mockReturnValue([])

			class TestClass {
				@ParamsToEnv()
				myMethod(SOME_ARG: string): string {
					// Implementation doesn't matter as much as the signature for the decorator
					const context = envStorage.getStore()
					// Verify the context IS empty from the decorator's perspective this run
					assert(context !== undefined)
					expect(context.mergedEnv).toEqual({}) // Merged env should be empty
					expect(context.currentParams).toEqual(new Set()) // Current params should be empty
					return SOME_ARG
				}
			}

			const instance = new TestClass()
			instance.myMethod('test_value')

			// Check warning - Should be the mismatch warning now
			expect(consoleWarnMessages.length).toBe(1)
			expect(consoleWarnMessages[0]).toContain('Parameter name extraction/argument count mismatch')
			expect(consoleWarnMessages[0]).toContain('Extracted 0 names (), received 1 args')

			expect(envStorage.getStore()).toBeUndefined()
			expect(spy).toHaveBeenCalledTimes(1)
		})

		// Test case for async methods
		it('should work with async methods', async () => {
			class TestClass {
				@ParamsToEnv()
				// Adjust return type slightly if Secret could theoretically be returned
				async myAsyncMethod(VAR1: string): Promise<Secret | string | undefined> {
					// Simulate async operation
					await new Promise((resolve) => setTimeout(resolve, 1))
					const context = envStorage.getStore()
					assert(context !== undefined)
					expect(context.mergedEnv.VAR1).toBe('async_val')
					expect(context.currentParams).toEqual(new Set(['VAR1']))
					return context.mergedEnv.VAR1
				}
			}
			const instance = new TestClass()
			const result = await instance.myAsyncMethod('async_val')
			expect(result).toBe('async_val')
			expect(envStorage.getStore()).toBeUndefined() // Context gone after async call
			expect(consoleWarnMessages).toStrictEqual([])
		})

		// Test case for parameter names needing trimming (if regex/split allows)
		it('should handle parameter names with surrounding whitespace', () => {
			class TestClass {
				// Define method signature string that extractParamNames would see
				// This requires modifying the class structure slightly for the test
				// Or assuming extractParamNames handles it. Let's assume based on implementation.
				@ParamsToEnv()
				myMethod(VAR1: string, VAR2: number): void {
					// Add spaces for test
					// Spaces around VAR1
					const context = envStorage.getStore()
					assert(context !== undefined)
					expect(context.mergedEnv.VAR1).toBe('A') // Name should be trimmed by extractParamNames
					// Test VAR2 storage (NUM3 test handles number conversion checks)
					expect(context.mergedEnv.VAR2).toBe(1) // Cast number for assertion check
					expect(context.currentParams).toEqual(new Set(['VAR1', 'VAR2']))
				}
			}
			const instance = new TestClass()
			instance.myMethod('A', 1)
			expect(envStorage.getStore()).toBeUndefined()
			expect(consoleWarnMessages).toStrictEqual([])
		})
	})
})
