import path from 'node:path'
import { cliError } from '@jahands/cli-tools'
import * as find from 'empathic/find'

export function getTurboJsonPath(): string {
	return path.join(path.dirname(getTurboConfigPath()), 'turbo.json')
}

export function getTurboConfigPath(): string {
	const turboConfigPath = find.up('turbo.config.ts')
	if (!turboConfigPath) {
		throw cliError('turbo.config.ts not found')
	}
	return turboConfigPath
}
