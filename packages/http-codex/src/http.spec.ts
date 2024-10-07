import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { http, HttpStatusCodes } from './http'

import type { HttpStatusCodeName } from './http'

describe('http', () => {
	const all = Object.keys(HttpStatusCodes)
	const used = Object.keys(HttpStatusCodes).filter((key) => key !== '_')
	const unused = Object.keys(HttpStatusCodes).filter((key) => !used.includes(key))

	it('should contain all status codes', () => {
		for (const key of all) {
			expect(HttpStatusCodes[key as HttpStatusCodeName], key).toBeDefined()
			expect(typeof HttpStatusCodes[key as HttpStatusCodeName]).toBe('number')
		}
	})

	describe('statusText()', () => {
		it('returns description of the status code', () => {
			for (const key of used) {
				const value = HttpStatusCodes[key as HttpStatusCodeName]
				const statusText = http.statusText(value)
				expect(
					() => z.string().min(1).parse(http.statusText(value)),
					`${value}: ${key} - "${statusText}"`
				).not.toThrow()
			}
		})

		it('returns empty string if the code is unused', () => {
			for (const key of unused) {
				const value = HttpStatusCodes[key as HttpStatusCodeName]
				expect(http.statusText(value), `${value}: ${key}`).toBe('')
			}
		})

		it('returns empty string if the code is unknown', () => {
			expect(http.statusText(0)).toBe('')
		})

		it('throws if the code is not a number', () => {
			expect(() => http.statusText('foo' as never)).toThrowError(TypeError)
			expect(() => http.statusText({} as never)).toThrowError(TypeError)
		})
	})
})
