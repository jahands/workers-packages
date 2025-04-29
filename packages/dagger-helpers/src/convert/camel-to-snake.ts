/* eslint-disable @typescript-eslint/no-explicit-any */

// Helper to check if a character is lowercase A-Z
type IsLower<C extends string> =
	Lowercase<C> extends Uppercase<C> ? false : C extends Lowercase<C> ? true : false
// Helper to check if a character is uppercase A-Z
type IsUpper<C extends string> =
	Lowercase<C> extends Uppercase<C> ? false : C extends Uppercase<C> ? true : false
// Helper to check if a character is a digit 0-9
type IsDigit<C extends string> = C extends `${number}` ? true : false

// Recursive inner helper for CamelToSnakeCase
// PrevChar tracks the *previous* character from the original string
type CamelToSnakeInner<S extends string, PrevChar extends string = ''> =
	// Base case: If the input string S is empty, return an empty string.
	S extends ''
		? ''
		: // Recursive step: If S has content...
			S extends `${infer First}${infer Rest}`
			? // --- Logic based on the 'First' character ---

				// 1. Is 'First' an uppercase letter?
				IsUpper<First> extends true
				? // 1a. Was 'PrevChar' lowercase or a digit? (Requires underscore)
					IsLower<PrevChar> extends true
					? `_${Uppercase<First>}${CamelToSnakeInner<Rest, First>}`
					: IsDigit<PrevChar> extends true
						? `_${Uppercase<First>}${CamelToSnakeInner<Rest, First>}`
						: // 1b. 'PrevChar' was uppercase, symbol, or start. Check for acronym ending.
							Rest extends `${infer NextChar}${string}` // Look ahead
							? IsLower<NextChar> extends true // Is the *next* char lowercase?
								? `_${Uppercase<First>}${CamelToSnakeInner<Rest, First>}` // Yes (e.g., API_Key)
								: `${Uppercase<First>}${CamelToSnakeInner<Rest, First>}` // No (e.g., HTTP)
							: // 'First' is the last character or followed by non-lowercase.
								`${Uppercase<First>}${CamelToSnakeInner<Rest, First>}`
				: // 2. Is 'First' a digit? (Only checked if not uppercase)
					IsDigit<First> extends true
					? // 2a. Was 'PrevChar' a lowercase letter? (Requires underscore)
						IsLower<PrevChar> extends true
						? `_${First}${CamelToSnakeInner<Rest, First>}`
						: // 'PrevChar' was not lowercase (digit, uppercase, symbol, start)
							`${First}${CamelToSnakeInner<Rest, First>}`
					: // 3. 'First' must be a lowercase letter or a symbol.
						//    (Symbols are handled like lowercase here - no underscore needed before them)
						`${Uppercase<First>}${CamelToSnakeInner<Rest, First>}` // Uppercase letter, append symbol directly
			: // This case should technically not be reachable if S is not '', but included for completeness.
				''

/**
 * Type helper to convert a camelCase/PascalCase string literal type
 * to an UPPER_SNAKE_CASE string literal type. Handles common cases
 * including transitions from lower to upper, letters to digits, and basic acronyms.
 *
 * Examples:
 *   'userId' -> 'USER_ID'
 *   'userName' -> 'USER_NAME'
 *   'isActive' -> 'IS_ACTIVE'
 *   'APIKey' -> 'API_KEY'
 *   'version10' -> 'VERSION_10'
 *   'apiV2Client' -> 'API_V2_CLIENT'
 */
type CamelToSnakeCase<S extends string> = S extends `${infer First}${infer Rest}`
	? // Uppercase the very first character, then process the rest using the inner helper
		`${Uppercase<First>}${CamelToSnakeInner<Rest, First>}`
	: // Handle single character or empty string
		Uppercase<S>

/**
 * Converts a camelCase or PascalCase string to UPPER_SNAKE_CASE.
 * Handles acronyms and numbers within the string.
 *
 * **Examples:**
 * ```
 *   'helloWorld' -> 'HELLO_WORLD'
 *   'HelloWorld' -> 'HELLO_WORLD'
 *   'someAPIKey' -> 'SOME_API_KEY'
 *   'getHttpResponseCode' -> 'GET_HTTP_RESPONSE_CODE'
 *   'version10' -> 'VERSION_10' // Fixed
 *   'version10Alpha' -> 'VERSION_10_ALPHA' // Fixed
 *   'apiV2Client' -> 'API_V2_CLIENT'
 *   'releaseV10' -> 'RELEASE_V10'
 *   'version2Data' -> 'VERSION_2_DATA' // Fixed
 *   'word' -> 'WORD'
 *```
 * @param str The input string in camelCase or PascalCase format.
 * @returns The converted string in UPPER_SNAKE_CASE format.
 */
export function camelToSnake(str: string): string {
	if (!str) {
		return ''
	}

	// The sequence matters:
	const result = str
		// 1. Add _ before an uppercase letter that is followed by a lowercase letter,
		//    but only if the uppercase letter is not the start of the string and
		//    is preceded by another uppercase letter (handles acronyms like APIKey -> API_Key).
		.replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
		// 2. Add _ before an uppercase letter that is preceded by a lowercase letter or a digit.
		//    (handles helloWorld -> hello_World, version10Update -> version10_Update, apiV2Client -> api_V2Client)
		.replace(/([a-z\d])([A-Z])/g, '$1_$2')
		// 3. Add _ between a lowercase letter and a number.
		//    (handles version10 -> version_10, but NOT V10 -> V_10 because V is uppercase)
		.replace(/([a-z])(\d)/g, '$1_$2')

	// Convert the entire result to uppercase
	return result.toUpperCase()
}

/**
 * Converts an object's keys from camelCase/PascalCase to UPPER_SNAKE_CASE.
 * Provides compile-time type safety for the converted keys based on common patterns.
 *
 * @template T The type of the input object.
 * @param input The object with camelCase/PascalCase keys.
 * @returns A new object with the same values but UPPER_SNAKE_CASE keys,
 *          with an inferred type reflecting the key transformation.
 */
export function convertToSnake<T extends Record<string, any>>(
	input: T
	// Apply the mapped type with key remapping using the type helper
): { [K in keyof T as CamelToSnakeCase<K & string>]: T[K] } {
	const output: any = {} // Initialize as 'any' or '{}'

	for (const key in input) {
		if (Object.prototype.hasOwnProperty.call(input, key)) {
			const snakeCaseKey = camelToSnake(key) // Runtime conversion
			output[snakeCaseKey] = input[key]
		}
	}

	// Type assertion: We trust the runtime `camelToSnake` logic produces keys
	// matching the structure defined by the `CamelToSnakeCase` type helper.
	// This is needed because TS can't perfectly verify the runtime logic
	// against the complex type-level logic for all possible inputs.
	return output as { [K in keyof T as CamelToSnakeCase<K & string>]: T[K] }
}
