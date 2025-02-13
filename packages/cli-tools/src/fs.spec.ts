import { describe, expect, it } from 'vitest'

import { isNotFoundError } from './fs.js'

describe('isNotFoundError()', () => {
	it('returns false if not a not-found error', () => {
		expect(isNotFoundError(new Error('ENOENT'))).toBe(false)
		expect(isNotFoundError(new Error('NotFound'))).toBe(false)
	})

	it('returns true for not-found error', async () => {
		let errored = false
		try {
			await fs.lstat('./does-not-exist-123')
		} catch (e) {
			errored = true
			expect(isNotFoundError(e)).toBe(true)
		}
		expect(errored).toBe(true)
	})
})
