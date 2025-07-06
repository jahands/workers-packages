import { customAlphabet } from 'nanoid'

import {
	ALPHABET,
	InvalidPrefixError,
	validatePrefixedId,
	validatePrefixesConfig,
} from './types.js'

import type { IdOf, PrefixConfig, PrefixConfigInput, PrefixKeys } from './types.js'

/**
 * Class-based API for managing prefixed nanoid generation with type safety
 */
export class PrefixedNanoIds<T extends Record<string, PrefixConfigInput>> {
	private readonly config: Record<string, PrefixConfig>
	private readonly generators = new Map<number, () => string>()
	private readonly prefixKeys: Set<string>

	/**
	 * Create a new PrefixedNanoIds instance
	 * @param config Configuration object mapping prefix keys to their configurations
	 * @example
	 * const ids = new PrefixedNanoIds({
	 *   user: { prefix: 'usr', len: 12 },
	 *   post: { prefix: 'pst', len: 16 },
	 *   project: { prefix: 'prj' } // len defaults to 24
	 * })
	 *
	 * @throws {ConfigurationError} If the configuration is invalid
	 */
	constructor(config: T) {
		this.config = validatePrefixesConfig(config)
		this.prefixKeys = new Set(Object.keys(config))
	}

	/**
	 * Generate a new prefixed nanoid for the given prefix
	 * @param prefix The prefix key to generate an ID for
	 * @returns A new prefixed ID in the format `{prefix}_{nanoid}`
	 * @example
	 * const userId = idGenerator.generate('user') // 'usr_A1b2C3d4E5f6'
	 * const postId = idGenerator.generate('post') // 'pst_X7y8Z9a0B1c2D3e4'
	 */
	generate<K extends keyof T>(prefix: K): IdOf<T[K]> {
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
	is<K extends PrefixKeys<T>>(prefix: K, maybeId: unknown): maybeId is IdOf<T[K]> {
		// Cast to string is safe: K extends keyof T, where T's keys are validated as strings
		// TypeScript's keyof returns string | number | symbol for compatibility, but we know all keys are strings.
		const prefixStr = prefix as string
		const prefixConfig = this.config[prefixStr]
		if (!prefixConfig) {
			throw new InvalidPrefixError(prefixStr, Array.from(this.prefixKeys))
		}
		return validatePrefixedId(maybeId, prefixConfig.prefix, prefixConfig.len)
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

/**
 * Creates a type-safe {@link PrefixedNanoIds} generator from a configuration map.
 *
 * @template T extends Record<string, PrefixConfigInput>
 * @param {T} config – Map whose keys become generator methods (`ids.user()`) and
 *   whose values configure each prefix:
 *   - `prefix` **(required)** – lowercase letters, digits or `_`
 *   - `len` *(optional, default = 24)* – positive integer length of the random part (1-255)
 *
 * @throws {ConfigurationError}  If any `prefix` is empty or contains disallowed characters
 * @returns {PrefixedNanoIds<T>} A ready-to-use generator instance
 *
 * @example
 * const ids = createPrefixedNanoIds({
 *   user:   { prefix: 'usr', len: 12 },
 *   post:   { prefix: 'pst', len: 16 },
 *   project:{ prefix: 'prj' }           // len defaults to 24
 * })
 *
 * console.log(ids.generate('user')) // → usr_6b4f90dd67a1
 */
export function createPrefixedNanoIds<T extends Record<string, PrefixConfigInput>>(
	config: T
): PrefixedNanoIds<T> {
	return new PrefixedNanoIds(config)
}
