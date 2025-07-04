import { customAlphabet } from 'nanoid'
import { z } from 'zod/v4-mini'

import {
	ALPHABET,
	CategoryExtractionError,
	createPrefixedIdSchema,
	InternalError,
	InvalidPrefixError,
	PrefixesConfig,
} from './types.js'

import type { PrefixConfig, PrefixKeys } from './types.js'

/**
 * Class-based API for managing prefixed nanoid generation with type safety
 */
export class PrefixedNanoId<T extends PrefixesConfig> {
	private readonly config: T
	private readonly nanoid: (size: number) => string
	private readonly prefixKeys: Set<string>
	private readonly prefixSchemas: Map<string, ReturnType<typeof createPrefixedIdSchema>>
	private readonly prefixToConfig: Map<string, { key: string; config: PrefixConfig }>
	private readonly sortedPrefixes: string[]

	/**
	 * Create a new PrefixedNanoId instance
	 * @param config Configuration object mapping prefix keys to their configurations
	 * 
	 * @example
	 * // Basic usage with single prefix
	 * const idGenerator = new PrefixedNanoId({
	 *   user: { prefix: 'usr', category: 'users', len: 12 }
	 * })
	 * 
	 * @example
	 * // Multiple prefix configuration
	 * const idGenerator = new PrefixedNanoId({
	 *   user: { prefix: 'usr', category: 'users', len: 12 },
	 *   post: { prefix: 'pst', category: 'posts', len: 16 },
	 *   comment: { prefix: 'cmt', category: 'comments', len: 10 },
	 *   tag: { prefix: 'tag', category: 'tags', len: 8 }
	 * })
	 * 
	 * @example
	 * // Error case: Invalid prefix format (contains uppercase)
	 * try {
	 *   const idGenerator = new PrefixedNanoId({
	 *     user: { prefix: 'USR', category: 'users', len: 12 } // Will throw!
	 *   })
	 * } catch (error) {
	 *   console.error(error.message) // Configuration validation failed...
	 * }
	 * 
	 * @example
	 * // Error case: Duplicate prefixes
	 * try {
	 *   const idGenerator = new PrefixedNanoId({
	 *     user: { prefix: 'usr', category: 'users', len: 12 },
	 *     admin: { prefix: 'usr', category: 'admins', len: 12 } // Same prefix!
	 *   })
	 * } catch (error) {
	 *   console.error(error.message) // Duplicate prefix values found...
	 * }
	 * 
	 * @example
	 * // Error case: Invalid length
	 * try {
	 *   const idGenerator = new PrefixedNanoId({
	 *     user: { prefix: 'usr', category: 'users', len: 0 } // Invalid length!
	 *   })
	 * } catch (error) {
	 *   console.error(error.message) // Configuration validation failed...
	 * }
	 */
	constructor(config: T) {
		try {
			// Validate configuration using zod
			const validatedConfig = PrefixesConfig.parse(config)
			this.config = validatedConfig as T
			this.nanoid = customAlphabet(ALPHABET)
			this.prefixKeys = new Set(Object.keys(config))

			// Initialize prefix schemas and prefix-to-config map
			this.prefixSchemas = new Map()
			this.prefixToConfig = new Map()
			
			for (const [key, prefixConfig] of Object.entries(this.config)) {
				const schema = createPrefixedIdSchema(prefixConfig.prefix, prefixConfig.len)
				this.prefixSchemas.set(key, schema)
				this.prefixToConfig.set(prefixConfig.prefix, { key, config: prefixConfig })
			}
			
			// Sort prefixes by length descending to match longest first
			this.sortedPrefixes = Array.from(this.prefixToConfig.keys()).sort((a, b) => b.length - a.length)
		} catch (e) {
			// In zod/v4-mini, we check for error shape rather than instanceof
			if (e && typeof e === 'object' && 'issues' in e && Array.isArray((e as any).issues)) {
				throw new Error(`Configuration validation failed:\n${z.prettifyError(e as any)}`)
			}
			throw e
		}
	}

	/**
	 * Generate a new prefixed nanoid for the given prefix
	 * @param prefix The prefix key to generate an ID for
	 * @returns A new prefixed ID in the format `{prefix}_{nanoid}`
	 * 
	 * @example
	 * // Generate user ID
	 * const idGenerator = new PrefixedNanoId({
	 *   user: { prefix: 'usr', category: 'users', len: 12 },
	 *   post: { prefix: 'pst', category: 'posts', len: 16 }
	 * })
	 * 
	 * const userId = idGenerator.new('user')
	 * console.log(userId) // 'usr_A1b2C3d4E5f6'
	 * 
	 * const postId = idGenerator.new('post')
	 * console.log(postId) // 'pst_X7y8Z9a0B1c2D3e4'
	 * 
	 * @example
	 * // Type safety example
	 * const idGenerator = new PrefixedNanoId({
	 *   user: { prefix: 'usr', category: 'users', len: 12 },
	 *   post: { prefix: 'pst', category: 'posts', len: 16 }
	 * })
	 * 
	 * // TypeScript will enforce valid prefix keys
	 * const validId = idGenerator.new('user') // ✓ OK
	 * // const invalidId = idGenerator.new('comment') // ✗ Type error!
	 * 
	 * @example
	 * // Generating multiple IDs
	 * const idGenerator = new PrefixedNanoId({
	 *   session: { prefix: 'ses', category: 'sessions', len: 20 }
	 * })
	 * 
	 * const sessionIds = Array.from({ length: 5 }, () => idGenerator.new('session'))
	 * console.log(sessionIds)
	 * // [
	 * //   'ses_A1b2C3d4E5f6G7h8J9k0',
	 * //   'ses_L1m2N3p4Q5r6S7t8U9v0',
	 * //   'ses_W1x2Y3z4A5b6C7d8E9f0',
	 * //   'ses_G1h2J3k4L5m6N7p8Q9r0',
	 * //   'ses_S1t2U3v4W5x6Y7z8A9b0'
	 * // ]
	 */
	new<K extends PrefixKeys<T>>(prefix: K): string {
		const prefixConfig = this.getPrefixConfig(prefix)
		const randomPart = this.nanoid(prefixConfig.len)
		return `${prefixConfig.prefix}_${randomPart}`
	}

	/**
	 * Validate if a string matches the expected format for a prefix
	 * @param prefix The prefix key to validate against
	 * @param candidateId The ID string to validate
	 * @returns True if the ID matches the expected format, false otherwise
	 * 
	 * @example
	 * // Basic validation
	 * const idGenerator = new PrefixedNanoId({
	 *   user: { prefix: 'usr', category: 'users', len: 12 },
	 *   post: { prefix: 'pst', category: 'posts', len: 16 }
	 * })
	 * 
	 * // Valid IDs
	 * console.log(idGenerator.is('user', 'usr_A1b2C3d4E5f6')) // true
	 * console.log(idGenerator.is('post', 'pst_X7y8Z9a0B1c2D3e4')) // true
	 * 
	 * // Invalid IDs - wrong prefix
	 * console.log(idGenerator.is('user', 'pst_A1b2C3d4E5f6')) // false
	 * console.log(idGenerator.is('post', 'usr_X7y8Z9a0B1c2D3e4')) // false
	 * 
	 * @example
	 * // Checking invalid ID formats
	 * const idGenerator = new PrefixedNanoId({
	 *   api_key: { prefix: 'ak', category: 'api_keys', len: 24 }
	 * })
	 * 
	 * // Too short
	 * console.log(idGenerator.is('api_key', 'ak_123')) // false
	 * 
	 * // Too long
	 * console.log(idGenerator.is('api_key', 'ak_' + 'A'.repeat(30))) // false
	 * 
	 * // Invalid characters (contains 0, O, I, l)
	 * console.log(idGenerator.is('api_key', 'ak_0OIl' + 'A'.repeat(20))) // false
	 * 
	 * // Missing underscore
	 * console.log(idGenerator.is('api_key', 'akA1b2C3d4E5f6G7h8J9k0L1')) // false
	 * 
	 * // Valid format
	 * console.log(idGenerator.is('api_key', 'ak_A1b2C3d4E5f6G7h8J9k0L1')) // true
	 * 
	 * @example
	 * // Using for validation in application logic
	 * const idGenerator = new PrefixedNanoId({
	 *   token: { prefix: 'tok', category: 'tokens', len: 32 }
	 * })
	 * 
	 * function validateAuthToken(token: string): boolean {
	 *   return idGenerator.is('token', token)
	 * }
	 * 
	 * const userProvidedToken = 'tok_A1b2C3d4E5f6G7h8J9k0L1m2N3p4Q5'
	 * if (validateAuthToken(userProvidedToken)) {
	 *   console.log('Valid token format')
	 * } else {
	 *   console.log('Invalid token format')
	 * }
	 */
	is<K extends PrefixKeys<T>>(prefix: K, candidateId: string): boolean {
		const schema = this.prefixSchemas.get(prefix as string)
		if (!schema) {
			throw new InvalidPrefixError(prefix as string, Array.from(this.prefixKeys))
		}
		return schema.safeParse(candidateId).success
	}

	/**
	 * Extract the category from a prefixed ID
	 * @param idWithPrefix The prefixed ID to extract category from
	 * @returns The category of the ID
	 * @throws {CategoryExtractionError} If the ID format is invalid or prefix not recognized
	 * 
	 * @example
	 * // Basic category extraction
	 * const idGenerator = new PrefixedNanoId({
	 *   user: { prefix: 'usr', category: 'users', len: 12 },
	 *   post: { prefix: 'pst', category: 'posts', len: 16 },
	 *   comment: { prefix: 'cmt', category: 'comments', len: 10 }
	 * })
	 * 
	 * console.log(idGenerator.getCategory('usr_A1b2C3d4E5f6')) // 'users'
	 * console.log(idGenerator.getCategory('pst_X7y8Z9a0B1c2D3e4')) // 'posts'
	 * console.log(idGenerator.getCategory('cmt_Q1w2E3r4T5')) // 'comments'
	 * 
	 * @example
	 * // Handling overlapping prefixes (longest match wins)
	 * const idGenerator = new PrefixedNanoId({
	 *   tag: { prefix: 'tag', category: 'tags', len: 8 },
	 *   tag_group: { prefix: 'tag_grp', category: 'tag_groups', len: 10 }
	 * })
	 * 
	 * // Correctly identifies based on longest matching prefix
	 * console.log(idGenerator.getCategory('tag_A1b2C3d4')) // 'tags'
	 * console.log(idGenerator.getCategory('tag_grp_X1y2Z3a4B5')) // 'tag_groups'
	 * 
	 * @example
	 * // Error cases
	 * const idGenerator = new PrefixedNanoId({
	 *   user: { prefix: 'usr', category: 'users', len: 12 }
	 * })
	 * 
	 * try {
	 *   // Unknown prefix
	 *   idGenerator.getCategory('adm_A1b2C3d4E5f6')
	 * } catch (error) {
	 *   console.error(error.message)
	 *   // Cannot extract category from ID "adm_A1b2C3d4E5f6". ID format is invalid or prefix not recognized.
	 * }
	 * 
	 * try {
	 *   // Invalid format (wrong length)
	 *   idGenerator.getCategory('usr_123') // Too short
	 * } catch (error) {
	 *   console.error(error.message)
	 *   // Cannot extract category from ID "usr_123". ID format is invalid or prefix not recognized.
	 * }
	 * 
	 * try {
	 *   // Not a valid ID at all
	 *   idGenerator.getCategory('not-an-id')
	 * } catch (error) {
	 *   console.error(error.message)
	 *   // Cannot extract category from ID "not-an-id". ID format is invalid or prefix not recognized.
	 * }
	 * 
	 * @example
	 * // Using in application logic for routing or permissions
	 * const idGenerator = new PrefixedNanoId({
	 *   user: { prefix: 'usr', category: 'users', len: 12 },
	 *   admin: { prefix: 'adm', category: 'admins', len: 12 },
	 *   service: { prefix: 'svc', category: 'services', len: 16 }
	 * })
	 * 
	 * function getResourceType(resourceId: string): string {
	 *   try {
	 *     return idGenerator.getCategory(resourceId)
	 *   } catch (error) {
	 *     return 'unknown'
	 *   }
	 * }
	 * 
	 * // Route to appropriate handler based on resource type
	 * const resourceId = 'usr_A1b2C3d4E5f6'
	 * switch (getResourceType(resourceId)) {
	 *   case 'users':
	 *     console.log('Handle user resource')
	 *     break
	 *   case 'admins':
	 *     console.log('Handle admin resource with elevated permissions')
	 *     break
	 *   case 'services':
	 *     console.log('Handle service resource')
	 *     break
	 *   default:
	 *     console.log('Unknown resource type')
	 * }
	 */
	getCategory(idWithPrefix: string): string {
		// Try to match against known prefixes (sorted by length descending to match longest first)
		for (const prefix of this.sortedPrefixes) {
			const expectedPrefix = `${prefix}_`
			if (idWithPrefix.startsWith(expectedPrefix)) {
				const prefixData = this.prefixToConfig.get(prefix)!
				
				// Validate the full ID format using prefix schema
				const schema = this.prefixSchemas.get(prefixData.key)
				if (!schema) {
					throw new InternalError(`Schema not found for prefix key: ${prefixData.key}`)
				}
				
				if (schema.safeParse(idWithPrefix).success) {
					return prefixData.config.category
				}
			}
		}
		
		throw new CategoryExtractionError(idWithPrefix)
	}

	/**
	 * Get the configuration for a specific prefix
	 * @param prefix The prefix key
	 * @returns The prefix configuration
	 * @throws {InvalidPrefixError} If the prefix is not found
	 */
	private getPrefixConfig<K extends PrefixKeys<T>>(prefix: K): PrefixConfig {
		if (!this.prefixKeys.has(prefix as string)) {
			throw new InvalidPrefixError(prefix as string, Array.from(this.prefixKeys))
		}
		const config = this.config[prefix]
		if (!config) {
			throw new InvalidPrefixError(prefix as string, Array.from(this.prefixKeys))
		}
		return config
	}
}
