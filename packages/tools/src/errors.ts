import { program } from '@commander-js/extra-typings'

import type { Command } from '@commander-js/extra-typings'

export interface CLIErrorOptions {
	cmd?: Command
}
/**
 * Throws a Commander command error
 * @param message Error message.
 * @param cmd Optional commander Command to use when throwing an error. Defaults to `program`
 */
export function cliError(message: string, options?: CLIErrorOptions): never {
	const { cmd } = options ?? {}
	throw (cmd ?? program).error(`${chalk.redBright('error')}: ${message}`)
}
