import { afterEach, describe, expect, it, vi } from 'vitest'
import { $ } from 'zx'

import { catchProcessError } from './proc.js'

afterEach(() => {
	vi.restoreAllMocks()
})

function mockExit() {
	return vi.spyOn(process, 'exit').mockImplementation((code) => {
		throw new Error(`process.exit(${code})`)
	})
}

describe('catchProcessError', () => {
	it('exits with 1 when the subprocess fails', async () => {
		mockExit()
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
		const output = await $`exit 3`.nothrow()

		expect(() => catchProcessError()(output)).toThrowErrorMatchingInlineSnapshot(
			`[Error: process.exit(1)]`
		)
		expect(() =>
			catchProcessError({ useProcessExitCode: true })(output)
		).toThrowErrorMatchingInlineSnapshot(`[Error: process.exit(3)]`)
		expect(consoleError).not.toHaveBeenCalled()
	})

	it('reports a subprocess killed by a signal', async () => {
		mockExit()
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
		const output = await $`kill -KILL $$`.nothrow()

		expect(() => catchProcessError()(output)).toThrowErrorMatchingInlineSnapshot(
			`[Error: process.exit(1)]`
		)
		expect(() =>
			catchProcessError({ useProcessExitCode: true })(output)
		).toThrowErrorMatchingInlineSnapshot(`[Error: process.exit(137)]`)
		expect(consoleError).toHaveBeenCalledTimes(2)
		expect(consoleError).toHaveBeenCalledWith(
			expect.stringContaining('subprocess killed by SIGKILL')
		)
	})

	it('rethrows other errors', () => {
		const err = new Error('boom')

		expect(() => catchProcessError()(err)).toThrow(err)
	})
})
