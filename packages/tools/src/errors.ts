// ============================= //
// === Copied from cli-tools === //
// ============================= //
import { program } from '@commander-js/extra-typings'
import { chalk } from 'zx'

import type { Command } from '@commander-js/extra-typings'

export interface CLIErrorOptions {
	cmd?: Command
}
/**
 * Throws a Commander command error
 * @param message Error message.
 * @param cmd Optional commander Command to use when throwing an error. Defaults to `program`
 *
 * @example
 * ```ts
 * import { cliError } from '@jahands/cli-tools'
 *
 * throw cliError('an error!')
 * ```
 */
export function cliError(message: string, options?: CLIErrorOptions): never {
	const { cmd } = options ?? {}
	throw (cmd ?? program).error(`${chalk.redBright('error')}: ${message}`)
}
