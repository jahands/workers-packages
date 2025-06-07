import { program } from '@commander-js/extra-typings'
import z, { ZodError } from 'zod/v4'
import { chalk } from 'zx'

import type { Command } from '@commander-js/extra-typings'
import type { ZodType } from 'zod/v4'

/**
 * Parses an argument using a zod validator. If it fails,
 * it throws a well-formatted commander error using the Zod messages
 * @param validator Zod schema to validate with
 * @param cmd Optional commander Command to use when throwing an error. Defaults to `program`
 * @returns The zod type specified
 */
export function validateArg<T extends ZodType>(validator: T, cmd?: Command) {
	 
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
export function parseArg<T extends ZodType>(s: string, validator: T, cmd?: Command): T['_output'] {
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
