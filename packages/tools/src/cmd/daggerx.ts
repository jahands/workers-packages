import { Command } from '@commander-js/extra-typings'
import pMap from 'p-map'
import z from 'zod'

import { validateArg } from '../args'
import { getDaggerModules } from '../dagger-modules'
import { cliError } from '../errors'
import { deleteIfExists, getRepoRoot } from '../path'
import { prefixOutput } from '../proc'

export const daggerxCmd = new Command('daggerx').description('Tools for managing Dagger')

daggerxCmd
	.command('install')
	.description('Install dagger module in another module. If omitted, it just regenerates code')
	.argument('[module-path]', 'path to the module to install')
	.action(async (modulePath) => {
		$.stdio = 'inherit'
		$.verbose = true

		if (modulePath) {
			await $`dagger install ${modulePath}`
		} else {
			await $`dagger develop`
		}

		// now we need to clean up the junk it adds
		await deleteIfExists(['./.gitattributes', './.gitignore'])

		echo(chalk.blue('fixing formatting...'))
		await $({
			stdio: 'pipe',
			quiet: true,
		})`just fix --format`
		echo(chalk.green('done!'))
	})

daggerxCmd
	.command('develop')
	.description('Install dependencies and run dagger develop on all Dagger modules')
	.action(async () => {
		const repoRoot = getRepoRoot()
		cd(repoRoot)
		$.stdio = 'pipe'

		const modules = await getDaggerModules()
		await pMap(
			modules,
			async (module) =>
				prefixOutput(
					{
						prefix: chalk.grey(`${module.path}: `),
						groupOutput: true,
					},
					$({
						cwd: module.fullPath,
						quiet: true,
					})`bun install --frozen-lockfile --no-progress`
				),
			{ concurrency: 8 }
		)

		await $({
			stdio: 'inherit',
		})`dagger develop --recursive`
		echo(chalk.blue('deleting generated .gitattributes and .gitignore files...'))
		await pMap(modules, async ({ fullPath }) =>
			deleteIfExists([`.gitattributes`, `.gitignore`].map((p) => path.join(fullPath, p)))
		)

		echo(chalk.blue('fixing formatting...'))
		await $`bun fix:format`.quiet()

		echo(chalk.green(`\nSuccessfully initialized ${chalk.white(modules.length)} dagger modules`))
	})

daggerxCmd
	.command('run')
	.description('Run specified command in all Dagger modules')
	.option(
		'-c, --concurrency <number>',
		'How much concurrency to use',
		validateArg(z.coerce.number()),
		1
	)
	.option(
		'-g, --group-output <true|false>',
		'Wait for full command to run and then output all at once. Defaults to true when concurrency > 1',
		validateArg(z.stringbool())
	)
	.argument('<cmd...>', 'command to run - recommend adding -- first')
	.action(async (cmd, { concurrency, groupOutput }) => {
		const repoRoot = getRepoRoot()
		cd(repoRoot)
		$.stdio = 'pipe'
		if (concurrency > 1 && groupOutput === undefined) {
			groupOutput = true
		}

		const modules = await getDaggerModules()
		await pMap(
			modules,
			async (module) => {
				if (groupOutput) {
					await prefixOutput(
						{
							prefix: `${chalk.grey(module.path)} `,
							groupOutput: true,
							groupPrefix: [
								chalk.blue(`Running within: ${module.fullPath}`),
								chalk.yellow(`$ ${cmd.join(' ')}`),
							].join('\n'),
						},
						$({
							cwd: module.fullPath,
							stdio: 'pipe',
							quiet: true,
						})`${cmd}`
					)
					echo('')
				} else {
					echo(chalk.blue(`Running within: ${module.fullPath}`))
					await prefixOutput(
						`${chalk.grey(module.path)} `,
						$({
							cwd: module.path,
							stdio: 'pipe',
							quiet: true,
						})`${cmd}`
					)
				}
			},
			{ concurrency }
		)
		console.timeEnd('total')
	})

daggerxCmd
	.command('list')
	.alias('ls')
	.description('List all Dagger modules')
	.option('--include-entrypoint', 'Include the entrypoint in the output')
	.action(async ({ includeEntrypoint }) => {
		const modules = await getDaggerModules()

		if (includeEntrypoint) {
			const modulesWithEntrypoint = await pMap(modules, async (m) => {
				const entrypointPath = `${m.path}/${m.entrypoint}`
				const exists = await Bun.file(entrypointPath).exists()
				if (!exists) {
					throw cliError(`entrypoint ${entrypointPath} does not exist`)
				}
				return `${m.path}/${m.entrypoint}`
			})
			console.log(modulesWithEntrypoint.join('\n'))
		} else {
			console.log(modules.map((m) => m.path).join('\n'))
		}
	})
