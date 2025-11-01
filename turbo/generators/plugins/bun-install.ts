import { $ } from 'zx'

import { catchError, onProcSuccess } from '../helpers/proc'

import type { PlopTypes } from '@turbo/gen'
import type { Answers } from '../answers'

export type BunInstallData = Answers & { destination: string }

export function bunInstall(data: BunInstallData, _config: any, _plop: PlopTypes.NodePlopAPI) {
	return new Promise((resolve, reject) => {
		console.log('🌀 running bun install')

		$({
			cwd: data.destination,
			nothrow: true,
		})`bun install`
			.then(onProcSuccess('bun install', resolve, reject))
			.catch(catchError(reject))
	})
}
