import { describe, expect, it } from 'vitest'

import { constants } from './constants.js'

describe('constants', () => {
	describe('workersMonorepo', () => {
		describe('ignore', () => {
			it('contains no duplicates', () => {
				const list = constants.workersMonorepo.ignore
				list.sort()
				const unique = Array.from(new Set(list))
				expect(unique).toStrictEqual(list)
			})
		})
	})
})
