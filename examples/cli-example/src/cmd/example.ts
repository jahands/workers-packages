import { Command } from '@commander-js/extra-typings'
import { cliError, prefixOutput, validateArg } from '@jahands/cli-tools'
import { z } from 'zod'

export const exampleCmd = new Command('example').description('An example command with subcommands')

exampleCmd
	.command('throw-cli-error')
	.description('throws a cli error')
	.action(async () => {
		throw cliError('an error!')
	})

exampleCmd
	.command('validate-args')
	.requiredOption(
		'-e, --env <staging|production>',
		'environment to use',
		validateArg(z.enum(['staging', 'production']))
	)
	.action(async ({ env }) => {
		echo(`env is: ${env}`)
	})

exampleCmd.command('prefix-output').action(async () => {
	const proc = $`jctl`
	await prefixOutput(proc, 'OUTPUT:')
})
