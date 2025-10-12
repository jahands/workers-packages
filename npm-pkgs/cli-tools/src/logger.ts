import { chalk } from 'zx'

export class CLILogger {
	log = (...msgs: any[]) => console.log(chalk.blue('[LOG]'), ...msgs)
	error = (...msgs: any[]) => console.error(chalk.red('[ERROR]'), ...msgs)
	warn = (...msgs: any[]) => console.warn(chalk.yellow('[WARN]'), ...msgs)
	info = (...msgs: any[]) => console.info(chalk.green('[INFO]'), ...msgs)
	debug = (...msgs: any[]) => console.debug(chalk.magenta('[DEBUG]'), ...msgs)
	trace = (...msgs: any[]) => console.trace(chalk.cyan('[TRACE]'), ...msgs)
}
