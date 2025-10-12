import 'zx/globals'

import { program } from '@commander-js/extra-typings'
import { catchProcessError } from '@jahands/cli-tools/proc'

import { version } from '../package.json'
import { createWranglerConfig } from './create-config.js'

export const runCLI = () =>
	program
		.name('create-wrangler-config')
		.description(
			'CLI tool for quickly setting up a wrangler.jsonc configuration file for Cloudflare Workers projects'
		)
		.version(version)
		.argument(
			'[assets-directory]',
			'Path to directory containing static assets to be served by the Worker'
		)
		.action(async (assetsDirectory) => {
			echo(chalk.bold.cyan(`👋 Welcome to create-wrangler-config v${version}!`))
			echo(chalk.dim("Let's set up your Cloudflare Workers configuration...\n"))

			try {
				await createWranglerConfig({ assetsDirectory })
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
