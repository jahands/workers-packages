import 'zx/globals'

import { program } from '@commander-js/extra-typings'
import { validateArg } from '@jahands/cli-tools/args'
import { catchProcessError } from '@jahands/cli-tools/proc'

import { version } from '../package.json'
import { createMonorepo, RepoName } from './create-monorepo'

export const runCLI = () =>
	program
		.name('create-workers-monorepo')
		.description('A CLI for creating a Workers monorepo')
		.version(version)
		.option('-n, --name <name>', 'The name of the monorepo', validateArg(RepoName))
		.action(async (opts) => {
			echo(chalk.bold.cyan(`👋 Welcome to create-workers-monorepo v${version}!`))
			echo(chalk.dim("Let's get your Cloudflare Workers monorepo set up...\n"))
			try {
				await createMonorepo(opts)
			} catch (e) {
				if (e instanceof Error && e.name === 'ExitPromptError') {
					echo(chalk.red('Operation cancelled.'))
					process.exit(0)
				} else {
					throw e
				}
			}
		})

		// Don't hang for unresolved promises
		.hook('postAction', () => process.exit(0))
		.parseAsync()
		.catch(catchProcessError())
