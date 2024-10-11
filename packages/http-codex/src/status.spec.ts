import { describe, expect, it } from 'vitest'

import { httpStatus, isNullBodyStatus, nullBodyStatuses } from './status'

describe('isNullBodyStatus()', () => {
	const nonNullBodyStatuses = Object.values(httpStatus).filter(
		(status) => !(nullBodyStatuses as number[]).includes(status)
	)

	it('returns false for invalid http status', () => {
		expect(isNullBodyStatus(12345)).toBe(false)
	})

	it('returns false for invalid value type', () => {
		// @ts-expect-error Testing invalid input
		expect(isNullBodyStatus('foo')).toBe(false)
	})

	it('returns true for null body statuses', () => {
		for (const status of nullBodyStatuses) {
			expect(isNullBodyStatus(status), `status: ${status}`).toBe(true)
		}
	})

	it('returns false for all other valid http status codes', () => {
		for (const status of nonNullBodyStatuses) {
			expect(isNullBodyStatus(status), `status: ${status}`).toBe(false)
		}
	})
})
