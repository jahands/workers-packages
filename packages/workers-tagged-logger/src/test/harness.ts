import { vi } from 'vitest'
import { z } from 'zod'

import { WorkersLogger } from '../logger.js'
import { ConsoleLog, LogTags } from './logger/types.js'

import type { WorkersLoggerOptions } from '../logger.js'

export type ParsedConsoleLog = z.infer<typeof ParsedConsoleLog>
export const ParsedConsoleLog = ConsoleLog.merge(
	z
		.object({
			message: z.union([z.string(), z.undefined()]), // Allow undefined message
			// Make tags optional for easier matching when no tags are expected
			tags: LogTags.optional(),
		})
		// Allow any extra fields from withFields
		.passthrough()
).describe('same as ConsoleLog but message is converted to a string when logged')

export class TestHarness<T extends LogTags> {
	private _logs: ParsedConsoleLog[] = []
	readonly log: WorkersLogger<T>

	constructor(opts?: WorkersLoggerOptions) {
		this.log = new WorkersLogger(opts)
		vi.spyOn(console, 'log').mockImplementation((...msgs: ParsedConsoleLog[]) => {
			this._logs.push(...structuredClone(msgs))
		})
	}

	get logs(): ParsedConsoleLog[] {
		return ParsedConsoleLog.array().parse(this._logs)
	}
	/** Get the first log (asserting that there is only one) */
	oneLog(): ParsedConsoleLog {
		const log = ParsedConsoleLog.array().min(1).max(1).parse(this._logs)[0]
		if (log === undefined) throw new Error('no logs')
		return log
	}
	/** Get log at specific index. Supports negative numbers. */
	logAt(n: number): ParsedConsoleLog {
		return ParsedConsoleLog.parse(this.logs.at(n))
	}
}

export function setupTest<T extends LogTags>(opts?: WorkersLoggerOptions): TestHarness<T> {
	return new TestHarness<T>(opts)
}
