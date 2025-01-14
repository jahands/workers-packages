import { describe, expect, it } from 'vitest'

import { cmdExists } from './cmd'

describe('cmdExists()', async () => {
	it('returns true when command exists', async () => {
		expect(await cmdExists('env')).toBe(true)
	})

	it('returns false when command does not exists', async () => {
		expect(await cmdExists('__cmd_that_does_not_exist__')).toBe(false)
	})
})
