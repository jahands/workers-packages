import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useWorkersLogger } from './hono.js'
import { setupTest } from './logger.spec.js'

beforeEach(() => {
	vi.useFakeTimers()
	const date = Date.UTC(2024, 9, 26, 12, 30)
	vi.setSystemTime(date)
})

afterEach(() => {
	vi.useRealTimers()
	vi.clearAllMocks()
})

describe('useWorkersLogger()', () => {
	type App = {
		Bindings: {
			ENVIRONMENT: string
		}
	}

	it('runs next middleware with logger available', async () => {
		const h = setupTest()
		const app = new Hono<App>()
			.use(async (c, next) => {
				c.env = { ENVIRONMENT: 'staging' }
				await next()
			})
			.use(useWorkersLogger('worker-a'))
			.get(async (c) => {
				h.log.info('hi')
				return c.text('hello')
			})
		const res = await app.fetch(new Request('https://example.com'))
		expect(await res.text()).toBe('hello')
		expect(res.status).toBe(200)

		expect(h.logs, 'contains environment tag').toMatchInlineSnapshot(`
			[
			  {
			    "level": "info",
			    "message": "hi",
			    "tags": {
			      "environment": "staging",
			      "handler": "fetch",
			      "source": "worker-a",
			    },
			    "time": "2024-10-26T12:30:00.000Z",
			  },
			]
		`)
	})

	it('does not add environment when not present in bindings', async () => {
		const h = setupTest()
		const app = new Hono<App>().use(useWorkersLogger('worker-a')).get(async (c) => {
			h.log.info('hi')
			return c.text('hello')
		})
		const res = await app.fetch(new Request('https://example.com'))
		expect(await res.text()).toBe('hello')
		expect(res.status).toBe(200)

		expect(h.oneLog().tags, 'no environment tag').toMatchInlineSnapshot(`
			{
			  "handler": "fetch",
			  "source": "worker-a",
			}
		`)
	})
})
