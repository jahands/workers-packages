import { customAlphabet } from 'nanoid'
import { z } from 'zod/v4-mini'
import { $ZodError } from 'zod/v4/core'

import { ALPHABET, createPrefixedIdSchema, InvalidPrefixError, PrefixesConfig } from './types.js'

import type { IdOf, PrefixConfig, PrefixConfigInput, PrefixKeys } from './types.js'

/**
 * Class-based API for managing prefixed nanoid generation with type safety
 */
export class PrefixedNanoIds<T extends Record<string, PrefixConfigInput>> {
	private readonly config: PrefixesConfig
	private readonly generators = new Map<number, () => string>()
	private readonly prefixKeys: Set<string>
	private readonly prefixSchemas = new Map<keyof T & string, z.ZodMiniString<string>>()

	/**
	 * Create a new PrefixedNanoIds instance
	 * @param config Configuration object mapping prefix keys to their configurations
	 * @example
	 * const ids = new PrefixedNanoIds({
	 *   user: { prefix: 'usr', len: 12 },
	 *   post: { prefix: 'pst', len: 16 },
	 *   project: { prefix: 'prj' } // len defaults to 24
	 * })
	 */
	constructor(config: T) {
		const cfg = config
		try {
			// Validate configuration using zod
			const validatedConfig = PrefixesConfig.parse(cfg)
			this.config = validatedConfig
			this.prefixKeys = new Set(Object.keys(cfg))

			// Initialize empty maps - will be populated lazily
		} catch (e) {
			if (e instanceof $ZodError) {
				throw new Error(`Configuration validation failed:\n${z.prettifyError(e)}`)
			}
			throw e
		}
	}

	/**
	 * Generate a new prefixed nanoid for the given prefix
	 * @param prefix The prefix key to generate an ID for
	 * @returns A new prefixed ID in the format `{prefix}_{nanoid}`
	 * @example
	 * const userId = idGenerator.new('user') // 'usr_A1b2C3d4E5f6'
	 * const postId = idGenerator.new('post') // 'pst_X7y8Z9a0B1c2D3e4'
	 */
	new<K extends PrefixKeys<T>>(prefix: K): IdOf<PrefixConfig> {
		const prefixConfig = this.getPrefixConfig(prefix)
		const randomPart = this.nano(prefixConfig.len)
		return `${prefixConfig.prefix}_${randomPart}`
	}

	/**
	 * Validate if a string matches the expected format for a prefix
	 * @param prefix The prefix key to validate against
	 * @param maybeId The ID string to validate
	 * @returns True if the ID matches the expected format, false otherwise
	 * @example
	 * idGenerator.is('user', 'usr_A1b2C3d4E5f6') // true
	 * idGenerator.is('user', 'pst_A1b2C3d4E5f6') // false (wrong prefix)
	 * idGenerator.is('user', 'usr_123')          // false (too short)
	 */
	is<K extends PrefixKeys<T>>(prefix: K, maybeId: string): boolean {
		// Cast to string is safe: K extends keyof T, where T's keys are validated as strings
		// by the PrefixesConfig zod schema (z.record(z.string(), ...)). TypeScript's keyof
		// returns string | number | symbol for compatibility, but we know all keys are strings.
		const prefixStr = prefix as string
		let schema = this.prefixSchemas.get(prefixStr)
		if (!schema) {
			const prefixConfig = this.config[prefix as string]
			if (!prefixConfig) {
				throw new InvalidPrefixError(prefixStr, Array.from(this.prefixKeys))
			}
			schema = createPrefixedIdSchema(prefixConfig.prefix, prefixConfig.len)
			this.prefixSchemas.set(prefixStr, schema)
		}
		return schema.safeParse(maybeId).success
	}

	/**
	 * Get the configuration for a specific prefix
	 * @param prefix The prefix key
	 * @returns The prefix configuration
	 * @throws {InvalidPrefixError} If the prefix is not found
	 */
	private getPrefixConfig<K extends PrefixKeys<T>>(prefix: K): PrefixConfig {
		const config = this.config[prefix as string]
		if (!config) {
			// Cast to string is safe - see comment in is() method for explanation
			throw new InvalidPrefixError(prefix as string, Array.from(this.prefixKeys))
		}
		return config
	}

	private nano(len: number): string {
		let generator = this.generators.get(len)
		if (!generator) {
			generator = customAlphabet(ALPHABET, len)
			this.generators.set(len, generator)
		}
		return generator()
	}
}
