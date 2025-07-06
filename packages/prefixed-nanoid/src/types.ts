/**
 * Configuration for a single prefix
 */
export type PrefixConfig = {
	/** The prefix string (e.g., "prj", "file") - only letters, numbers, underscores, and dashes */
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
export function validatePrefixesConfig(config: Record<string, PrefixConfigInput>): PrefixesConfig {
	// Check if config is a valid object
	if (!config || typeof config !== 'object' || Array.isArray(config)) {
		throw new ConfigurationError('Configuration must be a non-null object')
	}

	const validatedConfig: PrefixesConfig = {}
	const errors: string[] = []

	// Validate each prefix configuration
	for (const [key, value] of Object.entries(config)) {
		// Check if value is an object
		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			errors.push(`Key "${key}": value must be an object`)
			continue
		}

		// Validate prefix format
		if (!value.prefix || typeof value.prefix !== 'string') {
			errors.push(`Key "${key}": prefix must be a non-empty string`)
			continue
		}

		// Trim prefix to handle accidental whitespace
		const trimmedPrefix = value.prefix.trim()
		if (trimmedPrefix.length === 0) {
			errors.push(`Key "${key}": prefix cannot be only whitespace`)
			continue
		}

		if (!PREFIX_VALIDATION_REGEX.test(trimmedPrefix)) {
			errors.push(
				`Key "${key}": prefix "${trimmedPrefix}" must contain only letters, numbers, underscores, and dashes`
			)
			continue
		}

		// Validate len
		const len = value.len ?? 24
		if (!Number.isInteger(len) || len <= 0) {
			errors.push(
				`Key "${key}": len must be a positive integer (got ${typeof len === 'number' ? len : typeof len})`
			)
			continue
		}

		// Add reasonable upper bound for len
		if (len > 255) {
			errors.push(`Key "${key}": len must not exceed 255 (got ${len})`)
			continue
		}

		validatedConfig[key] = {
			prefix: trimmedPrefix,
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

// Regex patterns used for validation (compiled once for performance)
const PREFIX_VALIDATION_REGEX = /^[a-zA-Z0-9_-]+$/

// Cache for compiled ID validation regexes to avoid recompilation
const idValidationRegexCache = new Map<string, RegExp>()

/**
 * Validates if a string matches the expected format for a prefixed ID
 */
export function validatePrefixedId(value: unknown, prefix: string, len: number): boolean {
	if (typeof value !== 'string') return false

	// Create a cache key for this prefix and length combination
	const cacheKey = `${prefix}:${len}`

	// Check if we already have a compiled regex for this pattern
	let pattern = idValidationRegexCache.get(cacheKey)

	if (!pattern) {
		// Create regex pattern: prefix + underscore + exactly len characters from ALPHABET
		pattern = new RegExp(`^${prefix}_[${ALPHABET}]{${len}}$`)
		idValidationRegexCache.set(cacheKey, pattern)
	}

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
