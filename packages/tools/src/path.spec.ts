import { describe, expect, it } from 'vitest'
import { path } from 'zx'

import { getRepoRoot } from './path'

describe('getRepoRoot()', () => {
	it('should return the root of the repo', () => {
		expect(getRepoRoot()).toBe(path.resolve(__dirname, '../../..'))
	})
})
