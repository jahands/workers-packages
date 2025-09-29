import { vi } from 'vitest'
import { WorkersLogger } from 'workers-tagged-logger'

import type { ConsoleLog, LogTags, WorkersLoggerOptions } from 'workers-tagged-logger'

type ConsoleLogWithUnknown = ConsoleLog & Record<string, unknown>
export class TestHarness<T extends LogTags> {
	private _logs: ConsoleLogWithUnknown[] = []
	readonly log: WorkersLogger<T>

	constructor(opts?: WorkersLoggerOptions) {
		this.log = new WorkersLogger(opts)
		vi.spyOn(console, 'log').mockImplementation((...msgs: ConsoleLogWithUnknown[]) => {
			this._logs.push(...structuredClone(msgs))
		})
	}

	get logs(): ConsoleLogWithUnknown[] {
		return this._logs
	}
	/** Get the first log (asserting that there is only one) */
	oneLog(): ConsoleLogWithUnknown {
		if (this._logs.length === 0) throw new Error('no logs')
		if (this._logs.length > 1) throw new Error('multiple logs when only 1 is expected')
		const log = this._logs[0]
		if (log === undefined) throw new Error('no logs')
		return log
	}
	/** Get log at specific index. Supports negative numbers. */
	logAt(n: number): ConsoleLogWithUnknown {
		const log = this.logs.at(n)
		if (log === undefined) throw new Error('no log at index')
		return log
	}
}

export function setupTest<T extends LogTags>(opts?: WorkersLoggerOptions): TestHarness<T> {
	return new TestHarness<T>(opts)
}
