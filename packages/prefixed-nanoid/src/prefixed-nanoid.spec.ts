import { describe, expect, it } from 'vitest'

import { PrefixedNanoId } from './prefixed-nanoid.js'
import { CategoryExtractionError, InvalidPrefixError, PrefixesConfig } from './types.js'

const testConfig = {
	project: {
		prefix: 'prj',
		category: 'projects',
		len: 24,
	},
	file: {
		prefix: 'file',
		category: 'projects',
		len: 24,
	},
	user: {
		prefix: 'usr',
		category: 'users',
		len: 16,
	},
} as const satisfies PrefixesConfig

describe('testConfig', () => {
	it('should be a valid PrefixesConfig', () => {
		expect(() => PrefixesConfig.parse(testConfig)).not.toThrow()
	})
})

describe('PrefixedNanoId', () => {
	const ids = new PrefixedNanoId(testConfig)

	describe('constructor', () => {
		it('should create instance with valid config', () => {
			expect(ids).toBeInstanceOf(PrefixedNanoId)
		})

		it('should allow prefix with underscore', () => {
			const idsWithUnderscore = new PrefixedNanoId({
				test_prefix: {
					prefix: 'pre_fix',
					category: 'test',
					len: 10,
				},
			})
			expect(idsWithUnderscore).toBeInstanceOf(PrefixedNanoId)

			const id = idsWithUnderscore.new('test_prefix')
			expect(id).toMatch(
				/^pre_fix_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{10}$/
			)
			expect(idsWithUnderscore.is('test_prefix', id)).toBe(true)
			expect(idsWithUnderscore.getCategory(id)).toBe('test')
		})

		it('should throw error for empty prefix', () => {
			expect(() => {
				new PrefixedNanoId({
					invalid: {
						prefix: '',
						category: 'test',
						len: 10,
					},
				})
			}).toThrow('Configuration validation failed:')
		})

		it('should throw error for invalid length', () => {
			expect(() => {
				new PrefixedNanoId({
					invalid: {
						prefix: 'test',
						category: 'test',
						len: 0,
					},
				})
			}).toThrow('Configuration validation failed:')
		})

		it('should throw error for duplicate prefix values', () => {
			expect(() => {
				new PrefixedNanoId({
					key1: {
						prefix: 'prj',
						category: 'projects',
						len: 10,
					},
					key2: {
						prefix: 'prj', // duplicate!
						category: 'other',
						len: 10,
					},
				})
			}).toThrow('Duplicate prefix values found: "prj" (in keys: key1, key2)')
		})
	})

	describe('new()', () => {
		it('should generate ID with correct prefix format', () => {
			const id = ids.new('project')
			expect(id).toMatch(/^prj_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{24}$/)
		})

		it('should generate ID with correct length', () => {
			const id = ids.new('user')
			expect(id).toMatch(/^usr_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{16}$/)
		})

		it('should generate unique IDs', () => {
			const id1 = ids.new('project')
			const id2 = ids.new('project')
			expect(id1).not.toBe(id2)
		})

		it('should throw error for invalid prefix', () => {
			expect(() => {
				// @ts-expect-error - testing invalid prefix
				ids.new('invalid')
			}).toThrow(InvalidPrefixError)

			expect(() => {
				// @ts-expect-error - testing invalid prefix
				ids.new('invalid')
			}).toThrowErrorMatchingInlineSnapshot(
				`[InvalidPrefixError: Invalid prefix "invalid". Available prefixes: project, file, user]`
			)
		})

		it('should generate many unique IDs', () => {
			const generatedIds = new Set<string>()
			const count = 1000

			for (let i = 0; i < count; i++) {
				const id = ids.new('project')
				expect(generatedIds.has(id)).toBe(false)
				generatedIds.add(id)
			}

			expect(generatedIds.size).toBe(count)
		})
	})

	describe('is()', () => {
		it('should validate correct ID format', () => {
			const id = ids.new('project')
			expect(ids.is('project', id)).toBe(true)
		})

		it('should reject ID with wrong prefix', () => {
			const id = ids.new('project')
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
	})

	describe('getCategory()', () => {
		it('should extract category from valid ID', () => {
			const projectId = ids.new('project')
			const fileId = ids.new('file')
			const userId = ids.new('user')

			expect(ids.getCategory(projectId)).toBe('projects')
			expect(ids.getCategory(fileId)).toBe('projects')
			expect(ids.getCategory(userId)).toBe('users')
		})

		it('should throw error for invalid ID format', () => {
			expect(() => ids.getCategory('invalid-id')).toThrow(CategoryExtractionError)
			expect(() => ids.getCategory('prj-abc123')).toThrow(CategoryExtractionError)
			expect(() => ids.getCategory('unknown_abc123')).toThrow(CategoryExtractionError)
		})

		it('should throw error for ID without underscore', () => {
			expect(() => ids.getCategory('prjabc123')).toThrow(CategoryExtractionError)
		})

		it('should throw error for ID with wrong length', () => {
			expect(() => ids.getCategory('prj_short')).toThrow(CategoryExtractionError)
		})
	})

	describe('edge cases', () => {
		it('should handle empty config', () => {
			const emptyIds = new PrefixedNanoId({})
			expect(() => {
				// @ts-expect-error - testing with empty config
				emptyIds.new('anything')
			}).toThrow(InvalidPrefixError)
		})

		it('should reject config with invalid characters in prefix', () => {
			expect(() => {
				new PrefixedNanoId({
					special: {
						prefix: 'sp-ec.ial', // Contains invalid characters (dash and dot)
						category: 'special',
						len: 10,
					},
				})
			}).toThrow('Configuration validation failed:')
		})

		it('should handle config with valid prefix characters', () => {
			const validIds = new PrefixedNanoId({
				valid_prefix: {
					prefix: 'valid_prefix123',
					category: 'valid',
					len: 10,
				},
			})

			const id = validIds.new('valid_prefix')
			expect(id).toMatch(
				/^valid_prefix123_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{10}$/
			)
			expect(validIds.is('valid_prefix', id)).toBe(true)
			expect(validIds.getCategory(id)).toBe('valid')
		})
	})

	describe('Workers compatibility', () => {
		it('should work in Workers environment', () => {
			// Test that the class works with Workers-compatible APIs
			const id = ids.new('project')
			expect(typeof id).toBe('string')
			expect(id.length).toBeGreaterThan(0)

			// Test that validation works
			expect(ids.is('project', id)).toBe(true)

			// Test that category extraction works
			expect(ids.getCategory(id)).toBe('projects')
		})

		it('should handle concurrent ID generation', async () => {
			// Test concurrent generation to ensure thread safety
			const promises = Array.from({ length: 100 }, () => Promise.resolve(ids.new('project')))

			const results = await Promise.all(promises)
			const uniqueResults = new Set(results)

			expect(uniqueResults.size).toBe(results.length)
		})
	})
})
