import { SELF } from 'cloudflare:test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConsoleLog, WorkersLogger } from 'workers-tagged-logger'

import type { LogTags } from 'workers-tagged-logger'

class TestHarness<T extends LogTags> {
	private _logs: ConsoleLog[] = []
	readonly log = new WorkersLogger<T>()
	constructor() {
		vi.spyOn(console, 'log').mockImplementation((...msgs: ConsoleLog[]) => {
			this._logs.push(...structuredClone(msgs))
		})
	}
	get logs(): ConsoleLog[] {
		return ConsoleLog.array().parse(this._logs)
	}
	/** Get log at specific index. Supports negative numbers. */
	logAt(n: number): ConsoleLog {
		return ConsoleLog.parse(this.logs.at(n))
	}
}
function setupTest<T extends LogTags>(): TestHarness<T> {
	return new TestHarness<T>()
}

beforeEach(() => {
	vi.useFakeTimers()
	const date = Date.UTC(2024, 9, 26, 12, 30)
	vi.setSystemTime(date)
})

afterEach(() => {
	vi.useRealTimers()
	vi.clearAllMocks()
})

describe('Hono App', () => {
	it('logs to console.log()', async () => {
		const h = setupTest()
		const res = await SELF.fetch('https://example.com/hello')
		expect(res.ok).toBe(true)
		expect(h.logs).toMatchInlineSnapshot(`
			[
			  {
			    "level": "info",
			    "message": "hello, world!",
			    "tags": {
			      "foo": "bar",
			      "handler": "fetch",
			      "source": "hono-app",
			      "url_path": "/hello",
			    },
			    "time": "2024-10-26T12:30:00.000Z",
			  },
			]
		`)
	})
})
