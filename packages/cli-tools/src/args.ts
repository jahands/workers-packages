import { program } from '@commander-js/extra-typings'
import { ZodError } from 'zod'

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
): ReturnType<T['parse']> {
	try {
		return validator.parse(s)
	} catch (err) {
		if (err instanceof ZodError && err.issues.length > 0) {
			const messages = err.issues.map((e) => e.message)
			let messagesFmt = messages[0]
			for (const msg of messages.slice(1)) {
				messagesFmt += `\n       ${msg}`
			}
			throw (cmd ?? program).error(`${chalk.redBright('error')}${chalk.grey(':')} ${messagesFmt}`)
		} else {
			throw err
		}
	}
}