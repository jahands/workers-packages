import { describe, expect, it } from 'vitest'

import { httpMethod } from './method.js'

import type { HttpMethod } from './method.js'

describe('httpMethod', () => {
	const allMethods = Object.keys(httpMethod) as HttpMethod[]

	it('should contain all HTTP methods', () => {
		for (const method of allMethods) {
			expect(httpMethod[method], method).toBeDefined()
			expect(typeof httpMethod[method]).toBe('string')
		}
	})

	it('should have correct method values', () => {
		expect(httpMethod.GET).toBe('GET')
		expect(httpMethod.HEAD).toBe('HEAD')
		expect(httpMethod.POST).toBe('POST')
		expect(httpMethod.PUT).toBe('PUT')
		expect(httpMethod.PATCH).toBe('PATCH')
		expect(httpMethod.DELETE).toBe('DELETE')
		expect(httpMethod.CONNECT).toBe('CONNECT')
		expect(httpMethod.OPTIONS).toBe('OPTIONS')
		expect(httpMethod.TRACE).toBe('TRACE')
	})

	it('should have all expected methods', () => {
		const expectedMethods = [
			'GET',
			'HEAD',
			'POST',
			'PUT',
			'PATCH',
			'DELETE',
			'CONNECT',
			'OPTIONS',
			'TRACE',
		]

		expect(allMethods.sort()).toEqual(expectedMethods.sort())
	})
})
