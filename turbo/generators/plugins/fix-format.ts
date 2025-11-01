import { $ } from 'zx'

import { catchError, onProcSuccess } from '../helpers/proc'

import type { PlopTypes } from '@turbo/gen'
import type { NewPlayTSBunAnswers } from '../answers'

export function fixFormat(
	answers: NewPlayTSBunAnswers,
	_config: any,
	_plop: PlopTypes.NodePlopAPI
) {
	return new Promise((resolve, reject) => {
		console.log('🌀 running bun runx fix --format')

		$({
			cwd: answers.turbo.paths.root,
			nothrow: true,
			quiet: true,
		})`bun runx fix --format`
			.then(onProcSuccess('bun runx fix', resolve, reject))
			.catch(catchError(reject))
	})
}
