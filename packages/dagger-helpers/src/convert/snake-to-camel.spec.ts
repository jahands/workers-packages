 
import { describe, expect, it, test } from 'vitest'

import { convertToCamel, snakeToCamel } from './snake-to-camel.js'

// --- Tests for snakeToCamel ---
describe('snakeToCamel', () => {
	// Test cases using test.each for various formats
	test.each([
		// Basic cases
		{ input: 'HELLO_WORLD', expected: 'helloWorld' },
		{ input: 'SOME_API_KEY', expected: 'someApiKey' },
		{ input: 'USER_ID', expected: 'userId' },
		{ input: 'REQUEST_URL_PATH', expected: 'requestUrlPath' },

		// All caps single word
		{ input: 'WORD', expected: 'word' },
		{ input: 'TOKEN', expected: 'token' },

		// Lowercase single word (should ideally remain lowercase, current logic lowercases first char)
		{ input: 'word', expected: 'word' },
		{ input: 'token', expected: 'token' },

		// Already camelCase (should ideally remain camelCase, current logic lowercases first char)
		{ input: 'helloWorld', expected: 'helloWorld' },
		{ input: 'someApiKey', expected: 'someApiKey' },

		// PascalCase (should convert to camelCase)
		{ input: 'HelloWorld', expected: 'helloWorld' },
		{ input: 'SomeApiKey', expected: 'someApiKey' },

		// Leading underscores
		{ input: '_LEADING_UNDERSCORE', expected: 'leadingUnderscore' },
		{ input: '__DOUBLE_LEADING', expected: 'doubleLeading' },
		{ input: '_word', expected: 'word' }, // Single word with leading underscore

		// Trailing underscores
		{ input: 'TRAILING_UNDERSCORE_', expected: 'trailingUnderscore' },
		{ input: 'DOUBLE_TRAILING__', expected: 'doubleTrailing' },
		{ input: 'word_', expected: 'word' }, // Single word with trailing underscore

		// Consecutive underscores
		{ input: 'DOUBLE__UNDERSCORE', expected: 'doubleUnderscore' },
		{ input: 'TRIPLE___UNDERSCORE', expected: 'tripleUnderscore' },
		{ input: 'LEADING___MIDDLE__TRAILING_', expected: 'leadingMiddleTrailing' },

		// Mixed case input parts
		{ input: 'Mixed_Case_Input', expected: 'mixedCaseInput' },
		{ input: 'another_Mixed_CASE', expected: 'anotherMixedCase' },

		// Keys with numbers
		{ input: 'KEY_123', expected: 'key123' },
		{ input: 'VERSION_1_0', expected: 'version10' },
		{ input: 'API_V2_KEY', expected: 'apiV2Key' },
		{ input: '123_STARTING_NUMBER', expected: '123StartingNumber' }, // Starts with number

		// Edge cases
		{ input: '', expected: '' }, // Empty string
		{ input: '_', expected: '' }, // Single underscore
		{ input: '__', expected: '' }, // Double underscore
		{ input: '___', expected: '' }, // Triple underscore
		{ input: '_A_', expected: 'a' }, // Underscores around single letter
		{ input: 'A', expected: 'a' }, // Single uppercase letter
		{ input: 'a', expected: 'a' }, // Single lowercase letter
		{ input: '1', expected: '1' }, // Single number as string
		{ input: '123', expected: '123' }, // Multiple numbers as string
	])('should convert "$input" to "$expected"', ({ input, expected }) => {
		expect(snakeToCamel(input)).toBe(expected)
	})
})

// --- Tests for convertToCamel ---
describe('convertToCamel', () => {
	it('should convert keys of a basic object', () => {
		const input = {
			FIRST_NAME: 'John',
			LAST_NAME: 'Doe',
			USER_ID: 123,
		}
		const expected = {
			firstName: 'John',
			lastName: 'Doe',
			userId: 123,
		}
		const result = convertToCamel(input)
		expect(result).toStrictEqual(expected)
		// Type check (compile time): result should have the correct inferred type
		expect(result.firstName).toBe('John')
		expect(result.userId).toBe(123)
		// expect(result.FIRST_NAME).toBeUndefined(); // This would be a TS error
	})

	it('should handle various value types correctly', () => {
		const input = {
			STRING_VALUE: 'hello',
			NUMBER_VALUE: 42,
			BOOLEAN_TRUE: true,
			BOOLEAN_FALSE: false,
			NULL_VALUE: null,
			UNDEFINED_VALUE: undefined,
			ARRAY_VALUE: [1, 'two', { NESTED_KEY: true }],
			NESTED_OBJECT: {
				INNER_KEY_1: 'value1',
				INNER_KEY_2: 99,
			},
		}
		const expected = {
			stringValue: 'hello',
			numberValue: 42,
			booleanTrue: true,
			booleanFalse: false,
			nullValue: null,
			undefinedValue: undefined,
			arrayValue: [1, 'two', { NESTED_KEY: true }], // Note: nested object keys are NOT converted
			nestedObject: {
				INNER_KEY_1: 'value1', // Note: nested object keys are NOT converted
				INNER_KEY_2: 99,
			},
		}
		const result = convertToCamel(input)
		expect(result).toStrictEqual(expected)
		// Check specific inferred types/values
		expect(result.arrayValue).toEqual([1, 'two', { NESTED_KEY: true }])
		expect(result.nestedObject.INNER_KEY_1).toBe('value1')
		expect(result.nullValue).toBeNull()
		expect(result.undefinedValue).toBeUndefined()
	})

	it('should return an empty object for an empty input object', () => {
		const input = {}
		const expected = {}
		expect(convertToCamel(input)).toStrictEqual(expected)
	})

	it('should handle keys with leading/trailing/multiple underscores', () => {
		const input = {
			_LEADING_KEY: 'val1',
			TRAILING_KEY_: 'val2',
			DOUBLE__KEY: 'val3',
			__BOTH__: 'val4',
		}
		const expected = {
			leadingKey: 'val1',
			trailingKey: 'val2',
			doubleKey: 'val3',
			both: 'val4',
		}
		const result = convertToCamel(input)
		expect(result).toStrictEqual(expected)
	})

	it('should handle keys that are already camelCase or mixed', () => {
		const input = {
			alreadyCamel: 'value1',
			PascalCaseKey: 'value2', // Will become pascalCaseKey
			MIXED_key_STYLE: 'value3',
		}
		const expected = {
			alreadyCamel: 'value1', // Stays camelCase as no underscores
			pascalCaseKey: 'value2', // First letter lowercased
			mixedKeyStyle: 'value3',
		}
		const result = convertToCamel(input)
		expect(result).toStrictEqual(expected)
	})

	it('should handle keys with numbers', () => {
		const input = {
			KEY_1: 1,
			KEY_2_PART: 2,
			VERSION_10X: 'v10',
			_1_START: 'start',
		}
		const expected = {
			key1: 1,
			key2Part: 2,
			version10x: 'v10',
			'1Start': 'start', // Note: snakeToCamel logic produces this
		}
		const result = convertToCamel(input)
		expect(result).toStrictEqual(expected)
	})

	it('should not include properties from the prototype chain', () => {
		const proto = { PROTO_KEY: 'protoValue' }
		const input = Object.create(proto)
		input.OWN_KEY = 'ownValue'
		input.ANOTHER_OWN = 'another'

		const expected = {
			ownKey: 'ownValue',
			anotherOwn: 'another',
		}
		const result = convertToCamel(input)
		expect(result).toStrictEqual(expected)
		// Ensure proto property isn't present (even in camelCase)
		expect((result as any).protoKey).toBeUndefined()
	})

	it('should produce a correctly typed object (compile-time check)', () => {
		const input = {
			API_TOKEN: 'xyz',
			USER_COUNT: 100,
		} as const // Use 'as const' for more precise type inference if needed

		const result = convertToCamel(input)

		// These lines check the type inference at compile time.
		// If you hover over `result` or try to access invalid properties,
		// TypeScript/your IDE should show the correct inferred type/errors.
		const token: string = result.apiToken
		const count: number = result.userCount

		expect(token).toBe('xyz')
		expect(count).toBe(100)

		// @ts-expect-error
		const _invalid: string = result.API_TOKEN
		// @ts-expect-error
		const _nonExistent: number = result.someOtherKey
	})
})
