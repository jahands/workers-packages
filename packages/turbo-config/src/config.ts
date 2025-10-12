import { pathToFileURL } from 'node:url'
import { cliError } from '@jahands/cli-tools'
import { z } from 'zod'

import { getTurboConfigPath } from './path'
import { TurboConfig } from './schema'

export type DefineConfigFn = () => Promise<TurboConfig>

export async function defineConfig(fn: DefineConfigFn): Promise<TurboConfig> {
	try {
		const cfg = TurboConfig.decode(await fn())

		if (!cfg.$schema) {
			cfg.$schema = 'https://turbo.build/schema.json'
		}

		return cfg
	} catch (e) {
		if (e instanceof z.ZodError) {
			throw new Error(`Invalid turbo.config.ts: ${z.prettifyError(e)}`)
		}
		throw e
	}
}

export async function getTurboConfig(): Promise<TurboConfig> {
	const turboConfigPath = getTurboConfigPath()

	const mod = await import(pathToFileURL(turboConfigPath).href)
	if (!('default' in mod)) {
		throw cliError('turbo.config.ts must export a default export, but no default export found')
	}
	if (typeof mod.default !== 'object') {
		throw cliError(
			`turbo.config.ts must export a default export that is an object, but got ${typeof mod.default}`
		)
	}

	return await TurboConfig.decodeAsync(await mod.default).catch((e) => {
		if (e instanceof z.ZodError) {
			throw cliError(`Invalid turbo.config.ts: ${z.prettifyError(e)}`)
		}
		throw e
	})
}
