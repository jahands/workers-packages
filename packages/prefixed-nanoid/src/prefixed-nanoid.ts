import { customAlphabet } from 'nanoid'
import { z, ZodError } from 'zod/v4'

import {
	ALPHABET,
	CategoryExtractionError,
	createPrefixedIdSchema,
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
	private readonly prefixSchemas: Map<string, z.ZodString>

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

			// Initialize prefix schemas
			this.prefixSchemas = new Map<string, z.ZodString>()
			for (const [key, prefixConfig] of Object.entries(this.config)) {
				const schema = createPrefixedIdSchema(prefixConfig.prefix, prefixConfig.len)
				this.prefixSchemas.set(key, schema)
			}
		} catch (e) {
			if (e instanceof ZodError) {
				throw new Error(`Configuration validation failed:\n${z.prettifyError(e)}`)
			}
			throw e
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
	 */
	getCategory(idWithPrefix: string): string {
		// Try each known prefix to see if the ID matches
		for (const [key, prefixConfig] of Object.entries(this.config)) {
			const expectedPrefix = `${prefixConfig.prefix}_`
			if (idWithPrefix.startsWith(expectedPrefix)) {
				// Validate the full ID format using prefix schema
				const schema = this.prefixSchemas.get(key)
				if (!schema) {
					throw new Error(`Schema not found for prefix key: ${key}. This should never happen.`)
				}
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
