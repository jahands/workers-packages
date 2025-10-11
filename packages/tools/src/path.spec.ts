import { describe, expect, it } from 'vitest'

import { getRepoRoot } from './path'

describe('getRepoRoot()', () => {
	it('should return the root of the repo', () => {
		expect(getRepoRoot()).toBe(path.resolve(__dirname, '../../..'))
	})
})
