/**
 * Helper type to capitalize the first letter of a string literal type.
 * e.g., 'hello' -> 'Hello'
 */
type CapitalizeString<S extends string> = S extends `${infer First}${infer Rest}`
	? `${Uppercase<First>}${Rest}`
	: S

/**
 * Recursively transforms a snake_case string literal type to camelCase.
 * e.g., 'SOME_API_KEY' -> 'someApiKey'
 *       'HELLO_WORLD'  -> 'helloWorld'
 *       'WORD'         -> 'word'
 */
type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}`
	? `${Lowercase<T>}${CapitalizeString<SnakeToCamelCase<U>>}` // Lowercase first part, capitalize and recurse on the rest
	: Lowercase<S> // Base case: No underscore, just lowercase the whole thing

/**
 * Converts a string from snake_case, UPPER_SNAKE_CASE, PascalCase,
 * or ALL_CAPS to camelCase at runtime.
 * If the string is already camelCase or lowercase, it remains unchanged.
 *
 * @param str The input string in snake_case format.
 * @returns The converted string in camelCase format.
 */
export function snakeToCamel(str: string): string {
	if (!str) {
		return ''
	}

	// Case 1: String contains underscores (snake_case)
	if (str.includes('_')) {
		let result = ''
		const parts = str.split('_')
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i]
			if (part) {
				// Skip empty parts from multiple underscores
				if (result.length === 0) {
					// First non-empty part: lowercase the whole part
					result += part.toLowerCase()
				} else {
					// Subsequent non-empty parts: capitalize first letter, rest lowercase
					result += part[0]!.toUpperCase() + part.slice(1).toLowerCase()
				}
			}
		}
		// Handle case like "_SOME_WORD_" -> "someWord"
		// If the first character of the original string was '_' and result is empty,
		// it means the string was only underscores, return ''
		// If the first part was empty ('_WORD'), result starts lowercase correctly.
		return result
	}

	// Case 2: String does NOT contain underscores
	// Check if it's ALL_CAPS (allowing for numbers)
	const isAllCaps = /^[A-Z0-9]+$/.test(str)
	if (isAllCaps) {
		// e.g., "WORD", "TOKEN123" -> "word", "token123"
		return str.toLowerCase()
	}

	// Check if it's PascalCase or already camelCase/lowercase
	// If the first letter is already lowercase, assume it's camelCase or lowercase
	if (str[0] === str[0]!.toLowerCase()) {
		// e.g., "helloWorld", "word" -> stays the same
		return str
	}

	// Otherwise, assume it's PascalCase: Lowercase only the first character
	// e.g., "HelloWorld", "SomeValue" -> "helloWorld", "someValue"
	return str[0]!.toLowerCase() + str.slice(1)
}

/**
 * Converts an object's keys from snake_case or UPPER_SNAKE_CASE to camelCase.
 * The return type precisely maps the input keys to their camelCase versions.
 *
 * @template T The type of the input object, expected to have string keys.
 * @param input The object with snake_case keys.
 * @returns A new object with the same values but camelCase keys, with a specific inferred type.
 */
export function convertToCamel<T extends Record<string, any>>(
	input: T
): { [K in keyof T as SnakeToCamelCase<K & string>]: T[K] } {
	const output: any = {}

	for (const key in input) {
		if (Object.prototype.hasOwnProperty.call(input, key)) {
			const camelCaseKey = snakeToCamel(key)
			output[camelCaseKey] = input[key]
		}
	}

	// We use a type assertion here. While our runtime logic creates the correct
	// shape, TypeScript's analysis within the loop isn't powerful enough to
	// automatically verify that 'output' perfectly matches the complex mapped type.
	// The return type annotation guarantees the type for the caller.
	return output as { [K in keyof T as SnakeToCamelCase<K & string>]: T[K] }
}
