import { Command, program } from '@commander-js/extra-typings'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { cliError } from './errors'

const exitErrors: Error[] = []
beforeAll(() => {
	// Don't call process.exit(1) - instead, track the errors here
	// for tests that throw program.error()
	program.exitOverride((e) => {
		exitErrors.push(e)
		throw e
	})
})

beforeEach(() => {
	exitErrors.splice(0, exitErrors.length)
})

describe('cliError', () => {
	it('throws program.error with given message', () => {
		expect(() => cliError('boom!')).toThrowErrorMatchingInlineSnapshot(
			`[CommanderError: [91merror[39m: boom!]`
		)
		expect(exitErrors, 'program.exitOverride() was called').toMatchInlineSnapshot(`
			[
			  [CommanderError: [91merror[39m: boom!],
			]
		`)
	})

	it('throws cmd.error error when provided', () => {
		const cmdExitErrors: Error[] = []
		const cmd = new Command('mycli')
			.exitOverride((e) => {
				cmdExitErrors.push(e)
				throw e
			})
			.action(() => {
				throw cliError('cli boom!', { cmd })
			})

		expect(() => cmd.parse(undefined)).toThrowErrorMatchingInlineSnapshot(
			`[CommanderError: [91merror[39m: cli boom!]`
		)

		expect(exitErrors, 'does not call program.exitOverride()').toMatchInlineSnapshot(`[]`)
		expect(cmdExitErrors, 'calls cmd.exitOverride').toMatchInlineSnapshot(`
			[
			  [CommanderError: [91merror[39m: cli boom!],
			]
		`)
	})
})
