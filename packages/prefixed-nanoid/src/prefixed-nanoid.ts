import { customAlphabet } from 'nanoid'
import { z, ZodError } from 'zod/v4'

import {
	CategoryExtractionError,
	createPrefixedIdSchema,
	InvalidPrefixError,
	PrefixesConfig,
} from './types.js'

import type { PrefixConfig, PrefixKeys } from './types.js'

// Alphabet excluding confusing characters (no lowercase 'l', '0', 'O', 'I')
// Based on the reference code's alphabet
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/**
 * Class-based API for managing prefixed nanoid generation with type safety
 */
export class PrefixedNanoId<T extends PrefixesConfig> {
	private readonly config: T
	private readonly nanoid: (size: number) => string
	private readonly prefixKeys: Set<string>

	/**
	 * Create a new PrefixedNanoId instance
	 * @param config Configuration object mapping prefix keys to their configurations
	 */
	constructor(config: T) {
		try {
			// Validate configuration using zod
			const validatedConfig = PrefixesConfig.parse(config)
			this.config = validatedConfig as T
			this.nanoid = customAlphabet(ALPHABET)
			this.prefixKeys = new Set(Object.keys(config))
		} catch (error) {
			if (error instanceof ZodError) {
				throw new Error(`Configuration validation failed:\n${z.prettifyError(error)}`)
			}
			throw error
		}
	}

	/**
	 * Generate a new prefixed nanoid for the given prefix
	 * @param prefix The prefix key to generate an ID for
	 * @returns A new prefixed ID in the format `{prefix}_{nanoid}`
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
	 */
	is<K extends PrefixKeys<T>>(prefix: K, candidateId: string): boolean {
		try {
			const prefixConfig = this.getPrefixConfig(prefix)
			const schema = createPrefixedIdSchema(prefixConfig.prefix, prefixConfig.len)
			return schema.safeParse(candidateId).success
		} catch {
			return false
		}
	}

	/**
	 * Extract the category from a prefixed ID
	 * @param idWithPrefix The prefixed ID to extract category from
	 * @returns The category of the ID
	 * @throws {CategoryExtractionError} If the ID format is invalid or prefix not recognized
	 */
	getCategory(idWithPrefix: string): string {
		// Try each known prefix to see if the ID matches
		for (const [, prefixConfig] of Object.entries(this.config)) {
			const expectedPrefix = `${prefixConfig.prefix}_`
			if (idWithPrefix.startsWith(expectedPrefix)) {
				// Validate the full ID format using zod
				const schema = createPrefixedIdSchema(prefixConfig.prefix, prefixConfig.len)
				if (schema.safeParse(idWithPrefix).success) {
					return prefixConfig.category
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
