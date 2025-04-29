import { describe, expect, it, test } from 'vitest'

import { camelToSnake, convertToSnake } from './camel-to-snake.js'

// --- Tests for camelToSnake ---
describe('camelToSnake', () => {
	test.each([
		// Basic camelCase
		{ input: 'helloWorld', expected: 'HELLO_WORLD' },
		{ input: 'someValue', expected: 'SOME_VALUE' },
		{ input: 'userId', expected: 'USER_ID' },

		// PascalCase
		{ input: 'HelloWorld', expected: 'HELLO_WORLD' },
		{ input: 'SomeValue', expected: 'SOME_VALUE' },
		{ input: 'UserId', expected: 'USER_ID' },

		// Acronyms
		{ input: 'someAPIKey', expected: 'SOME_API_KEY' },
		{ input: 'someApiKey', expected: 'SOME_API_KEY' },
		{ input: 'getHTTPResponseCode', expected: 'GET_HTTP_RESPONSE_CODE' },
		{ input: 'parseURL', expected: 'PARSE_URL' },
		{ input: 'URLParser', expected: 'URL_PARSER' }, // Acronym at start

		// Numbers
		{ input: 'version10', expected: 'VERSION_10' },
		{ input: 'version10Alpha', expected: 'VERSION_10_ALPHA' },
		{ input: 'apiV2Client', expected: 'API_V2_CLIENT' },
		{ input: 'releaseV10', expected: 'RELEASE_V10' },

		// Single words
		{ input: 'word', expected: 'WORD' },
		{ input: 'token', expected: 'TOKEN' },
		{ input: 'Word', expected: 'WORD' }, // Single PascalCase word
		{ input: 'TOKEN', expected: 'TOKEN' }, // Already uppercase

		// Already snake_case (should just uppercase)
		{ input: 'hello_world', expected: 'HELLO_WORLD' },
		{ input: 'some_api_key', expected: 'SOME_API_KEY' },

		// Edge cases
		{ input: '', expected: '' },
		{ input: 'a', expected: 'A' },
		{ input: 'A', expected: 'A' },
		{ input: '1', expected: '1' }, // Single number
		{ input: 'v1', expected: 'V_1' },
		{ input: 'v', expected: 'V' },
		// Note: Behavior for leading/trailing underscores in input is not explicitly defined,
		// the current regexes might produce slightly unexpected results like '__FOO' -> '__FOO'.
		// Add specific tests if that behavior needs to be strictly defined.
	])('should convert "$input" to "$expected"', ({ input, expected }) => {
		expect(camelToSnake(input)).toBe(expected)
	})
})

// --- Tests for convertToSnake ---
describe('convertToSnake', () => {
	it('should convert keys of a basic camelCase object', () => {
		const input = {
			firstName: 'Jane',
			lastName: 'Doe',
			userId: 456,
		}
		const expected = {
			FIRST_NAME: 'Jane',
			LAST_NAME: 'Doe',
			USER_ID: 456,
		}
		expect(convertToSnake(input)).toEqual(expected)
	})

	it('should convert keys of a basic PascalCase object', () => {
		const input = {
			FirstName: 'Jane',
			LastName: 'Doe',
			UserId: 456,
		}
		const expected = {
			FIRST_NAME: 'Jane',
			LAST_NAME: 'Doe',
			USER_ID: 456,
		}
		expect(convertToSnake(input)).toEqual(expected)
	})

	it('should handle various value types correctly', () => {
		const input = {
			stringValue: 'test',
			numberValue: 123,
			booleanTrue: true,
			nullValue: null,
			undefinedValue: undefined,
			arrayValue: [1, 'two', { nestedKey: true }], // nested keys are NOT converted
			nestedObject: {
				innerKey1: 'val1', // nested keys are NOT converted
				innerKey2: false,
			},
		}
		const expected = {
			STRING_VALUE: 'test',
			NUMBER_VALUE: 123,
			BOOLEAN_TRUE: true,
			NULL_VALUE: null,
			UNDEFINED_VALUE: undefined,
			ARRAY_VALUE: [1, 'two', { nestedKey: true }],
			NESTED_OBJECT: {
				innerKey1: 'val1',
				innerKey2: false,
			},
		}
		expect(convertToSnake(input)).toEqual(expected)
	})

	it('should return an empty object for an empty input object', () => {
		const input = {}
		const expected = {}
		expect(convertToSnake(input)).toEqual(expected)
	})

	it('should handle keys with acronyms and numbers', () => {
		const input = {
			apiKey: 'abc',
			httpStatusCode: 200,
			version2Data: { id: 1 },
			releaseV10: true,
		}
		const expected = {
			API_KEY: 'abc',
			HTTP_STATUS_CODE: 200,
			VERSION_2_DATA: { id: 1 },
			RELEASE_V10: true,
		}
		expect(convertToSnake(input)).toEqual(expected)
	})

	it('should handle keys that are already snake_case (lowercase or uppercase)', () => {
		const input = {
			already_snake: 'value1',
			ALREADY_SNAKE: 'value2',
			mixed_CASE_key: 'value3',
		}
		// const expected = {
		// 	ALREADY_SNAKE: 'value1', // Becomes uppercase
		// 	ALREADY_SNAKE: 'value2', // Stays uppercase
		// 	MIXED_CASE_KEY: 'value3', // Becomes uppercase
		// }
		// Note: If input has keys that map to the same output key (like above), the last one wins.
		// Test the final state:
		const result = convertToSnake(input)
		expect(result['ALREADY_SNAKE']).toBe('value2') // The second one overwrites the first
		expect(result['MIXED_CASE_KEY']).toBe('value3')
		expect(Object.keys(result).length).toBe(2) // Only two distinct keys remain
	})

	it('should not include properties from the prototype chain', () => {
		const proto = { protoKey: 'protoValue' }
		const input = Object.create(proto)
		input.ownKey = 'ownValue'
		input.anotherOwn = 'another'

		const expected = {
			OWN_KEY: 'ownValue',
			ANOTHER_OWN: 'another',
		}
		const result = convertToSnake(input)
		expect(result).toEqual(expected)
		expect(result.PROTO_KEY).toBeUndefined() // Ensure proto property isn't present
	})

	it('should return a correctly typed object with specific SNAKE_CASE keys (compile-time check)', () => {
		// Input object with various casing and types
		const input = {
			simpleKey: 'value1',
			userID: 101,
			dataPointValue: 99.9,
			isActiveFlag: true,
			addressDetails: { streetName: 'Maple Ave', zipCode: '90210' },
			version2API: 'https://example.com/v2',
			httpStatusCode: 200,
		} as const // Use 'as const' for precise literal type inference

		// Call the function - TypeScript infers the specific return type
		const result = convertToSnake(input)

		// --- Compile-Time Type Verification ---

		// 1. Accessing correctly inferred keys works and has the correct type
		const simple: 'value1' = result.SIMPLE_KEY
		const user: 101 = result.USER_ID
		const data: 99.9 = result.DATA_POINT_VALUE
		const active: true = result.IS_ACTIVE_FLAG
		const addr: { readonly streetName: 'Maple Ave'; readonly zipCode: '90210' } =
			result.ADDRESS_DETAILS
		const v2: 'https://example.com/v2' = result.VERSION_2_API
		const status: 200 = result.HTTP_STATUS_CODE

		// 2. Attempting to access original camelCase keys now causes a TS error
		// @ts-expect-error Property 'simpleKey' does not exist on type '{...}'
		const invalidAccess1 = result.simpleKey
		// @ts-expect-error Property 'userID' does not exist on type '{...}'
		const invalidAccess2 = result.userID
		// @ts-expect-error Property 'addressDetails' does not exist on type '{...}'
		const invalidAccess3 = result.addressDetails

		// 3. Attempting to access a non-existent key also causes a TS error
		// @ts-expect-error Property 'NON_EXISTENT_KEY' does not exist on type '{...}'
		const invalidAccess4 = result.NON_EXISTENT_KEY

		// 4. Assigning to an incorrect type causes a TS error
		// @ts-expect-error Type '101' is not assignable to type 'string'.
		const _wrongType: string = result.USER_ID

		// --- Runtime Value Verification (Complementary) ---
		// Ensure the actual values match the compile-time expectations
		expect(simple).toBe('value1')
		expect(user).toBe(101)
		expect(data).toBe(99.9)
		expect(active).toBe(true)
		expect(addr.streetName).toBe('Maple Ave')
		expect(v2).toBe('https://example.com/v2')
		expect(status).toBe(200)

		// Check the exact set of keys produced at runtime
		expect(Object.keys(result).sort()).toStrictEqual(
			[
				'ADDRESS_DETAILS',
				'DATA_POINT_VALUE',
				'HTTP_STATUS_CODE',
				'IS_ACTIVE_FLAG',
				'SIMPLE_KEY',
				'USER_ID',
				'VERSION_2_API',
			].sort()
		)

		// Runtime check that the invalid accesses actually yield undefined
		expect(invalidAccess1).toBeUndefined()
		expect(invalidAccess2).toBeUndefined()
		expect(invalidAccess3).toBeUndefined()
		expect(invalidAccess4).toBeUndefined()
		// `wrongType` assignment doesn't affect runtime value of result.USER_ID
		expect(result.USER_ID).toBe(101)
	})
})
