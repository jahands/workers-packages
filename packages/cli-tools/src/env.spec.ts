import { program } from '@commander-js/extra-typings'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getEnv } from './env'

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
	vi.unstubAllEnvs()
})

describe('getEnv', () => {
	it('throws error when env var is not set', () => {
		expect(() => getEnv('__env_var_that_does_not_exist__')).toThrowErrorMatchingInlineSnapshot(
			`[CommanderError: [91merror[39m: Environment variable __env_var_that_does_not_exist__ is not set]`
		)
		expect(exitErrors, 'program.exitOverride() was called').toMatchInlineSnapshot(`
			[
			  [CommanderError: [91merror[39m: Environment variable __env_var_that_does_not_exist__ is not set],
			]
		`)
	})

	it('gets specified env var', () => {
		vi.stubEnv('__var_that_exists__', 'hello world!')
		const v = getEnv('__var_that_exists__')
		expect(v).toBe('hello world!')
	})
})
