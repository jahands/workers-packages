/**
 * Configuration for a single prefix
 */
export interface PrefixConfig {
	/** The prefix string (e.g., "prj", "file") */
	prefix: string
	/** Logical grouping/category (e.g., "projects") */
	category: string
	/** Length of the random nanoid portion */
	len: number
	/** Example ID for documentation purposes */
	example: string
}

/**
 * Configuration object mapping prefix keys to their configurations
 */
export type PrefixesConfig = Record<string, PrefixConfig>

/**
 * Extract prefix keys from a configuration object
 */
export type PrefixKeys<T extends PrefixesConfig> = keyof T

/**
 * Error thrown when an invalid prefix is used
 */
export class InvalidPrefixError extends Error {
	constructor(prefix: string, availablePrefixes: string[]) {
		super(`Invalid prefix "${prefix}". Available prefixes: ${availablePrefixes.join(', ')}`)
		this.name = 'InvalidPrefixError'
	}
}

/**
 * Error thrown when an ID doesn't match the expected format
 */
export class InvalidIdFormatError extends Error {
	constructor(id: string, prefix: string, expectedPattern: string) {
		super(`ID "${id}" does not match expected format for prefix "${prefix}". Expected pattern: ${expectedPattern}`)
		this.name = 'InvalidIdFormatError'
	}
}

/**
 * Error thrown when trying to extract category from an invalid ID
 */
export class CategoryExtractionError extends Error {
	constructor(id: string) {
		super(`Cannot extract category from ID "${id}". ID format is invalid or prefix not recognized.`)
		this.name = 'CategoryExtractionError'
	}
}
