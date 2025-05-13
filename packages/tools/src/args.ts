// ============================= //
// === Copied from cli-tools === //
// ============================= //

import { program } from '@commander-js/extra-typings'
import z, { ZodError } from 'zod'
import { chalk } from 'zx'

import type { Command } from '@commander-js/extra-typings'
import type { ZodTypeAny } from 'zod'

/**
 * Parses an argument using a zod validator. If it fails,
 * it throws a well-formatted commander error using the Zod messages
 * @param validator Zod schema to validate with
 * @param cmd Optional commander Command to use when throwing an error. Defaults to `program`
 * @returns The zod type specified
 */
export function validateArg<T extends ZodTypeAny>(validator: T, cmd?: Command) {
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	return (s: string) => parseArg(s, validator, cmd)
}

/**
 * Parses an argument using a zod validator. If it fails,
 * it throws a well-formatted commander error using the Zod messages
 * @param s Arg/option passed into CLI
 * @param validator Zod schema to validate with
 * @param cmd Optional commander Command to use when throwing an error. Defaults to `program`
 * @returns The zod type specified
 */
export function parseArg<T extends ZodTypeAny>(
	s: string,
	validator: T,
	cmd?: Command
): T['_output'] {
	try {
		return validator.parse(s)
	} catch (err) {
		if (err instanceof ZodError && err.issues.length > 0) {
			throw (cmd ?? program).error(
				`${chalk.redBright('error')}${chalk.grey(':')} ${z.prettifyError(err)}`
			)
		} else {
			throw err
		}
	}
}
