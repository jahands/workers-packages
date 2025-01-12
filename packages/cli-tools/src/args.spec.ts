import { Command, program } from '@commander-js/extra-typings'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'

import { parseArg } from './args'

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

describe('parseArg()', () => {
	it(`returns the output of the zod schema's parse()`, () => {
		const cmd = new Command()
		const schema = z.coerce.number()
		expect(parseArg('5', schema, cmd)).toBe(5)
	})

	it(`throws cmd.error() with nicely formatted message`, () => {
		let exited = false
		const cli = new Command()
			.exitOverride((e) => {
				exited = true
				throw e
			})
			.action(() => {
				const schema = z.coerce.number({ description: 'a number' })
				parseArg('a', schema, cli)
			})
		expect(() => cli.parse([])).toThrowErrorMatchingInlineSnapshot(
			`[CommanderError: [91merror[39m[90m:[39m Expected number, received nan]`
		)
		expect(exited).toBe(true)
	})

	it(`throws program.error() if no command is passed in`, () => {
		expect(exitErrors.length).toBe(0)
		const schema = z.string().regex(/^foo$/, 'should have been foo!')
		expect(() => parseArg('bar', schema)).toThrowErrorMatchingInlineSnapshot(
			`[CommanderError: [91merror[39m[90m:[39m should have been foo!]`
		)
		expect(exitErrors.length).toBe(1)
		expect(exitErrors).toMatchInlineSnapshot(`
			[
			  [CommanderError: [91merror[39m[90m:[39m should have been foo!],
			]
		`)
	})
})
