import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { httpStatus } from './combined'

import type { HttpStatusCodeName } from '.'

describe('httpStatus', () => {
	const all = Object.keys(httpStatus).filter((key) => (key as keyof typeof httpStatus) !== 'text')
	const used = all.filter((key) => (key as HttpStatusCodeName) !== '_')
	const unused = all.filter((key) => !used.includes(key))

	it('should contain all status codes', () => {
		for (const key of all) {
			expect(httpStatus[key as HttpStatusCodeName], key).toBeDefined()
			expect(typeof httpStatus[key as HttpStatusCodeName]).toBe('number')
		}
	})

	describe('statusText()', () => {
		it('returns description of the status code', () => {
			for (const key of used) {
				const value = httpStatus[key as HttpStatusCodeName]
				const text = httpStatus.text(value)
				expect(
					() => z.string().min(1).parse(httpStatus.text(value)),
					`${value}: ${key} - "${text}"`
				).not.toThrow()
			}
		})

		it('returns empty string if the code is unused', () => {
			for (const key of unused) {
				const value = httpStatus[key as HttpStatusCodeName]
				expect(httpStatus.text(value), `${value}: ${key}`).toBe('')
			}
		})

		it('returns empty string if the code is unknown', () => {
			expect(httpStatus.text(0)).toBe('')
		})

		it('throws if the code is not a number', () => {
			expect(() => httpStatus.text('foo' as never)).toThrowError(TypeError)
			expect(() => httpStatus.text({} as never)).toThrowError(TypeError)
		})
	})
})
