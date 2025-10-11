import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

describe('Hono App', () => {
	it('returns response', async () => {
		const res = await SELF.fetch('https://example.com/hello')
		expect(res.ok).toBe(true)
		expect(await res.text()).toBe('world')
	})
})
