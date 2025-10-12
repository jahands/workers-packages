import { cliError } from '@jahands/cli-tools/errors'
import { z } from 'zod'

import { getTurboConfig } from './config'
import { fileExists, readJsonFile } from './fs'
import { getTurboJsonPath } from './path'

export async function generateTurboJson(): Promise<void> {
	const config = await getTurboConfig()
	const turboJsonPath = getTurboJsonPath()

	let currentConfig: string | null = null
	if (await fileExists(turboJsonPath)) {
		currentConfig = JSON.stringify(
			z.looseObject({}).parse(await readJsonFile(turboJsonPath)),
			null,
			'\t'
		)
	}

	const newConfig = JSON.stringify(config, null, '\t')

	// only update if the config has changed to avoid unnecessary formatting
	if (newConfig !== currentConfig) {
		await fs.writeFile(turboJsonPath, newConfig, 'utf8')
		echo(chalk.green('turbo.json updated'))
	} else {
		echo(chalk.green('turbo.json is up to date'))
	}
}

export async function checkTurboJson(): Promise<void> {
	const config = await getTurboConfig()
	const turboJsonPath = getTurboJsonPath()

	// note: looseObject is used to ensure keys are sorted consistently
	const jsoncConfig = z.looseObject({}).parse(await readJsonFile(turboJsonPath))
	const matches = JSON.stringify(config) === JSON.stringify(jsoncConfig)
	if (!matches) {
		throw cliError(
			'turbo.config.ts does not match turbo.json - run `just generate-turbo-config` to update turbo.json'
		)
	}
	echo(chalk.green('turbo.json is up to date'))
}
