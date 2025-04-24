import { describe, expect, test } from 'vitest'

import { ignore } from './constants.js'

describe('ignore', () => {
	describe('contains no duplicates', () => {
		for (const [key, list] of Object.entries(ignore)) {
			test(key, () => {
				list.sort()
				const unique = Array.from(new Set(list))
				expect(unique).toStrictEqual(list)
			})
		}
	})
})
