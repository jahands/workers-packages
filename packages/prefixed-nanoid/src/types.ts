/**
 * Configuration for a single prefix
 */
export type PrefixConfig = {
	/** The prefix string (e.g., "prj", "file") - only lowercase letters, numbers, and underscores */
	prefix: string
	/** Length of the random nanoid portion (defaults to 24 if not specified) */
	len: number
}

export type IdOf<C extends { prefix: string }> = `${C['prefix'] & string}_${string}`

/** The shape callers are allowed to pass to the constructor */
export type PrefixConfigInput = Omit<PrefixConfig, 'len'> & { len?: number }

/**
 * Configuration object mapping prefix keys to their configurations
 */
export type PrefixesConfig = Record<string, PrefixConfig>

/**
 * Validates and normalizes a prefixes configuration
 */
export function validatePrefixesConfig(
	config: Record<string, PrefixConfigInput>
): PrefixesConfig {
	const validatedConfig: PrefixesConfig = {}
	const errors: string[] = []

	// Validate each prefix configuration
	for (const [key, value] of Object.entries(config)) {
		// Validate prefix format
		if (!value.prefix || typeof value.prefix !== 'string') {
			errors.push(`Key "${key}": prefix must be a non-empty string`)
			continue
		}
		if (!/^[a-z0-9_]+$/.test(value.prefix)) {
			errors.push(
				`Key "${key}": prefix "${value.prefix}" must contain only lowercase letters, numbers, and underscores`
			)
			continue
		}

		// Validate len
		const len = value.len ?? 24
		if (!Number.isInteger(len) || len <= 0) {
			errors.push(`Key "${key}": len must be a positive integer`)
			continue
		}

		validatedConfig[key] = {
			prefix: value.prefix,
			len,
		}
	}

	if (errors.length > 0) {
		throw new ConfigurationError(errors.join('; '))
	}

	// Check for duplicate prefixes
	const prefixToKeys = new Map<string, string[]>()
	for (const [key, value] of Object.entries(validatedConfig)) {
		const existing = prefixToKeys.get(value.prefix) || []
		existing.push(key)
		prefixToKeys.set(value.prefix, existing)
	}

	const duplicates: string[] = []
	for (const [prefix, keys] of prefixToKeys) {
		if (keys.length > 1) {
			duplicates.push(`"${prefix}" (in keys: ${keys.join(', ')})`)
		}
	}

	if (duplicates.length > 0) {
		throw new ConfigurationError(`Duplicate prefix values found: ${duplicates.join('; ')}`)
	}

	return validatedConfig
}

/**
 * Extract prefix keys from a configuration object
 */
export type PrefixKeys<T extends Record<string, PrefixConfigInput>> = keyof T

// Alphabet excluding confusing characters (no lowercase 'l', '0', 'O', 'I')
export const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/**
 * Validates if a string matches the expected format for a prefixed ID
 */
export function validatePrefixedId(value: unknown, prefix: string, len: number): boolean {
	if (typeof value !== 'string') return false
	
	// Escape special regex characters in prefix (though our prefix validation should prevent most)
	const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	// Create regex pattern: prefix + underscore + exactly len characters from ALPHABET
	const pattern = new RegExp(`^${escapedPrefix}_[${ALPHABET}]{${len}}$`)
	return pattern.test(value)
}

/**
 * Error thrown when configuration validation fails
 */
export class ConfigurationError extends Error {
	constructor(message: string) {
		super(`Configuration validation failed: ${message}`)
		this.name = 'ConfigurationError'
	}
}

/**
 * Error thrown when an invalid prefix is used
 */
export class InvalidPrefixError extends Error {
	constructor(prefix: string, availablePrefixes: string[]) {
		super(`Invalid prefix "${prefix}". Available prefixes: ${availablePrefixes.join(', ')}`)
		this.name = 'InvalidPrefixError'
	}
}
