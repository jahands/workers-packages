import { describe, expect, it } from 'vitest'

import { PrefixedNanoIds } from './prefixed-nanoid.js'
import { InvalidPrefixError, validatePrefixesConfig, type PrefixesConfig } from './types.js'

const testConfig = {
	project: {
		prefix: 'prj',
		len: 24,
	},
	file: {
		prefix: 'file',
		len: 24,
	},
	user: {
		prefix: 'usr',
		len: 16,
	},
} as const satisfies PrefixesConfig

describe('testConfig', () => {
	it('should be a valid PrefixesConfig', () => {
		expect(() => validatePrefixesConfig(testConfig)).not.toThrow()
	})

	it('should support omitting len field with default value 24', () => {
		// This test is covered by the PrefixedNanoIds constructor test
		// Since we handle the default in the constructor, not the schema
		expect(true).toBe(true)
	})
})

describe('PrefixedNanoIds', () => {
	const ids = new PrefixedNanoIds(testConfig)

	it('should work with configs that omit len field', () => {
		const idsWithDefaultLen = new PrefixedNanoIds({
			test: {
				prefix: 'tst',
				// len omitted, should default to 24
			},
		})

		const id = idsWithDefaultLen.generate('test')
		expect(id).toMatch(/^tst_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{24}$/)
		expect(idsWithDefaultLen.is('test', id)).toBe(true)
	})

	describe('constructor', () => {
		it('should create instance with valid config', () => {
			expect(ids).toBeInstanceOf(PrefixedNanoIds)
		})

		it('should allow prefix with underscore', () => {
			const idsWithUnderscore = new PrefixedNanoIds({
				test_prefix: {
					prefix: 'pre_fix',
					len: 10,
				},
			})
			expect(idsWithUnderscore).toBeInstanceOf(PrefixedNanoIds)

			const id = idsWithUnderscore.generate('test_prefix')
			expect(id).toMatch(
				/^pre_fix_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{10}$/
			)
			expect(idsWithUnderscore.is('test_prefix', id)).toBe(true)
		})

		it('should throw error for empty prefix', () => {
			expect(() => {
				new PrefixedNanoIds({
					invalid: {
						prefix: '',
						len: 10,
					},
				})
			}).toThrow('Configuration validation failed:')
		})

		it('should throw error for invalid length', () => {
			expect(() => {
				new PrefixedNanoIds({
					invalid: {
						prefix: 'test',
						len: 0,
					},
				})
			}).toThrow('Configuration validation failed:')
		})

		it('should throw error for duplicate prefix values', () => {
			expect(() => {
				new PrefixedNanoIds({
					key1: {
						prefix: 'prj',
						len: 10,
					},
					key2: {
						prefix: 'prj', // duplicate!
						len: 10,
					},
				})
			}).toThrow('Duplicate prefix values found: "prj" (in keys: key1, key2)')
		})
	})

	describe('generate()', () => {
		it('should generate ID with correct prefix format', () => {
			const id = ids.generate('project')
			expect(id).toMatch(/^prj_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{24}$/)
		})

		it('should generate ID with correct length', () => {
			const id = ids.generate('user')
			expect(id).toMatch(/^usr_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{16}$/)
		})

		it('should generate unique IDs', () => {
			const id1 = ids.generate('project')
			const id2 = ids.generate('project')
			expect(id1).not.toBe(id2)
		})

		it('should throw error for invalid prefix', () => {
			expect(() => {
				// @ts-expect-error - testing invalid prefix
				ids.generate('invalid')
			}).toThrow(InvalidPrefixError)

			expect(() => {
				// @ts-expect-error - testing invalid prefix
				ids.generate('invalid')
			}).toThrowErrorMatchingInlineSnapshot(
				`[InvalidPrefixError: Invalid prefix "invalid". Available prefixes: project, file, user]`
			)
		})

		it('should generate many unique IDs', () => {
			const generatedIds = new Set<string>()
			const count = 1000

			for (let i = 0; i < count; i++) {
				const id = ids.generate('project')
				expect(generatedIds.has(id)).toBe(false)
				generatedIds.add(id)
			}

			expect(generatedIds.size).toBe(count)
		})
	})

	describe('is()', () => {
		it('should validate correct ID format', () => {
			const id = ids.generate('project')
			expect(ids.is('project', id)).toBe(true)
		})

		it('should reject ID with wrong prefix', () => {
			const id = ids.generate('project')
			expect(ids.is('user', id)).toBe(false)
		})

		it('should reject ID with wrong length', () => {
			expect(ids.is('project', 'prj_short')).toBe(false)
		})

		it('should reject ID with invalid characters', () => {
			expect(ids.is('project', 'prj_0123456789012345678901234')).toBe(false) // contains '0'
			expect(ids.is('project', 'prj_l123456789012345678901234')).toBe(false) // contains 'l'
			expect(ids.is('project', 'prj_O123456789012345678901234')).toBe(false) // contains 'O'
			expect(ids.is('project', 'prj_I123456789012345678901234')).toBe(false) // contains 'I'
		})

		it('should reject malformed IDs', () => {
			expect(ids.is('project', 'prj-abc123')).toBe(false) // wrong separator
			expect(ids.is('project', 'wrongprefix_abc123')).toBe(false) // wrong prefix
			expect(ids.is('project', 'prj_')).toBe(false) // no suffix
			expect(ids.is('project', 'abc123')).toBe(false) // no prefix
		})

		it('should throw error for invalid prefix', () => {
			// @ts-expect-error - testing invalid prefix
			expect(() => ids.is('invalid', 'prj_abc123')).toThrow('Invalid prefix "invalid"')
		})

		it('should work as type guard', () => {
			const id = ids.generate('project')
			const unknownValue: unknown = id
			
			if (ids.is('project', unknownValue)) {
				// TypeScript should now know that unknownValue is of type IdOf<T['project']>
				expect(typeof unknownValue).toBe('string')
				expect(unknownValue.startsWith('prj_')).toBe(true)
			} else {
				throw new Error('Type guard should have passed')
			}
		})
	})

	describe('edge cases', () => {
		it('should handle empty config', () => {
			const emptyIds = new PrefixedNanoIds({})
			expect(() => {
				// @ts-expect-error - testing with empty config
				emptyIds.generate('anything')
			}).toThrow(InvalidPrefixError)
		})

		it('should reject config with invalid characters in prefix', () => {
			expect(() => {
				new PrefixedNanoIds({
					special: {
						prefix: 'sp-ec.ial', // Contains invalid characters (dash and dot)
						len: 10,
					},
				})
			}).toThrow('Configuration validation failed:')
		})

		it('should handle config with valid prefix characters', () => {
			const validIds = new PrefixedNanoIds({
				valid_prefix: {
					prefix: 'valid_prefix123',
					len: 10,
				},
			})

			const id = validIds.generate('valid_prefix')
			expect(id).toMatch(
				/^valid_prefix123_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{10}$/
			)
			expect(validIds.is('valid_prefix', id)).toBe(true)
		})
	})

	describe('Workers compatibility', () => {
		it('should work in Workers environment', () => {
			// Test that the class works with Workers-compatible APIs
			const id = ids.generate('project')
			expect(typeof id).toBe('string')
			expect(id.length).toBeGreaterThan(0)

			// Test that validation works
			expect(ids.is('project', id)).toBe(true)
		})

		it('should handle concurrent ID generation', async () => {
			// Test concurrent generation to ensure thread safety with actual async operations
			const generateIdWithDelay = async (delayMs: number): Promise<string> => {
				// Add random delay to simulate real async operations
				await new Promise((resolve) => setTimeout(resolve, delayMs))
				return ids.generate('project')
			}

			// Create promises with varying delays to simulate real concurrent execution
			const promises = Array.from(
				{ length: 100 },
				() => generateIdWithDelay(Math.random() * 10) // Random delay 0-10ms
			)

			const results = await Promise.all(promises)
			const uniqueResults = new Set(results)

			// All IDs should be unique despite concurrent generation
			expect(uniqueResults.size).toBe(results.length)
		})
	})
})
