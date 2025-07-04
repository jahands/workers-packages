import { customAlphabet } from 'nanoid'

import { CategoryExtractionError, InvalidPrefixError } from './types.js'

import type { PrefixConfig, PrefixesConfig, PrefixKeys } from './types.js'

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
		this.config = config
		this.nanoid = customAlphabet(ALPHABET)
		this.prefixKeys = new Set(Object.keys(config))

		// Validate configuration
		this.validateConfig()
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
			const regex = this.createRegexForPrefix(prefixConfig)
			return regex.test(candidateId)
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
				// Validate the full ID format
				const regex = this.createRegexForPrefix(prefixConfig)
				if (regex.test(idWithPrefix)) {
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

	/**
	 * Create a regex pattern for validating IDs with a specific prefix
	 * @param prefixConfig The prefix configuration
	 * @returns A RegExp for validating IDs
	 */
	private createRegexForPrefix(prefixConfig: PrefixConfig): RegExp {
		const pattern = `^${this.escapeRegex(prefixConfig.prefix)}_[${this.escapeRegex(ALPHABET)}]{${prefixConfig.len}}$`
		return new RegExp(pattern)
	}

	/**
	 * Escape special regex characters
	 * @param str String to escape
	 * @returns Escaped string
	 */
	private escapeRegex(str: string): string {
		return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	}

	/**
	 * Validate the configuration object
	 * @throws {Error} If configuration is invalid
	 */
	private validateConfig(): void {
		for (const [key, config] of Object.entries(this.config)) {
			if (!config.prefix || typeof config.prefix !== 'string') {
				throw new Error(`Invalid prefix for key "${key}": must be a non-empty string`)
			}
			if (!config.category || typeof config.category !== 'string') {
				throw new Error(`Invalid category for key "${key}": must be a non-empty string`)
			}
			if (!Number.isInteger(config.len) || config.len <= 0) {
				throw new Error(`Invalid length for key "${key}": must be a positive integer`)
			}
		}
	}
}
