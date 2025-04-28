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
	const proc = $`ls -lh`
	await prefixOutput('OUTPUT:', proc)
})

exampleCmd.command('prefix-output-opts').action(async () => {
	const proc = $`ls -lh`
	await prefixOutput({ prefix: 'OUTPUT:' }, proc)
})

exampleCmd.command('prefix-output-opts-group').action(async () => {
	const proc = $`ls -lh`
	await prefixOutput({ prefix: 'OUTPUT:', groupOutput: true }, proc)
})

exampleCmd.command('prefix-output-opts-group-prefix').action(async () => {
	const proc = $`ls -lh`
	await prefixOutput({ prefix: 'OUTPUT:', groupOutput: true, groupPrefix: 'GROUP: ' }, proc)
})

exampleCmd.command('prefix-output-opts-group-suffix').action(async () => {
	const proc = $`ls -lh`
	await prefixOutput({ prefix: 'OUTPUT:', groupOutput: true, groupSuffix: 'GROUP: ' }, proc)
})

exampleCmd.command('prefix-output-opts-group-prefix-suffix').action(async () => {
	const proc = $`ls -lh`
	await prefixOutput(
		{ prefix: 'OUTPUT:', groupOutput: true, groupPrefix: 'GROUP: ', groupSuffix: 'GROUP: ' },
		proc
	)
})

exampleCmd.command('prefix-output-opts-group-prefix-suffix-duration').action(async () => {
	const proc = $`ls -lh`
	await prefixOutput(
		{
			prefix: 'OUTPUT:',
			groupOutput: true,
			groupPrefix: 'GROUP: ',
			groupSuffix: chalk.green('GROUP: '),
			includeDuration: true,
		},
		proc
	)
})
