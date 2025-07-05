import { z } from 'zod/v4-mini'

/**
 * Configuration for a single prefix
 */
export type PrefixConfig = {
	/** The prefix string (e.g., "prj", "file") - only lowercase letters, numbers, and underscores */
	prefix: string
	/** Length of the random nanoid portion (defaults to 24 if not specified) */
	len: number
}

const PrefixConfig = z.object({
	/** The prefix string (e.g., "prj", "file") - only lowercase letters, numbers, and underscores */
	prefix: z.string().check(z.minLength(1), z.regex(/^[a-z0-9_]+$/)),
	/**
	 * Length of the random nanoid portion
	 * @default 24
	 */
	len: z.int().check(z.gt(0)),
})

export type IdOf<C extends { prefix: string }> = `${C['prefix'] & string}_${string}`

/** The shape callers are allowed to pass to the constructor */
export type PrefixConfigInput = Omit<PrefixConfig, 'len'> & { len?: number }

/**
 * Configuration object mapping prefix keys to their configurations
 */
export type PrefixesConfig = z.infer<typeof PrefixesConfig>
export const PrefixesConfig = z.transform(
	(config: Record<string, { prefix: string; len?: number }>) => {
		// Pre-process config to add default len values
		const withDefaults = Object.fromEntries(
			Object.entries(config).map(([key, value]) => [
				key,
				{
					...value,
					len: value.len ?? 24,
				},
			])
		)

		const validatedConfig = z.record(z.string(), PrefixConfig).parse(withDefaults)

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
			throw new Error(`Duplicate prefix values found: ${duplicates.join('; ')}`)
		}

		return validatedConfig
	}
)

/**
 * Extract prefix keys from a configuration object
 */
export type PrefixKeys<T extends Record<string, PrefixConfigInput>> = keyof T

// Alphabet excluding confusing characters (no lowercase 'l', '0', 'O', 'I')
export const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/**
 * Create a schema for validating prefixed IDs with a specific prefix and length
 */
export function createPrefixedIdSchema(prefix: string, len: number): z.ZodMiniString<string> {
	// Escape special regex characters in prefix (though our prefix validation should prevent most)
	const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	// Create regex pattern: prefix + underscore + exactly len characters from ALPHABET
	const pattern = new RegExp(`^${escapedPrefix}_[${ALPHABET}]{${len}}$`)
	return z.string().check(z.regex(pattern))
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
