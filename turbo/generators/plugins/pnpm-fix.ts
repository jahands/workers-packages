import { spawn } from 'child_process'

import type { PlopTypes } from '@turbo/gen'
import type { Answers } from '../types'

const didSucceed = (code: number) => `${code}` === '0'

export function pnpmFix(answers: Answers, _config: any, _plop: PlopTypes.NodePlopAPI) {
	return new Promise((resolve, reject) => {
		console.log('🌀 running pnpm fix...')
		const pnpmI = spawn('pnpm', ['fix'], {
			cwd: answers.turbo.paths.root,
			shell: true,
		})

		pnpmI.on('close', (code: number) => {
			if (didSucceed(code)) {
				resolve(`pnpm fix ran correctly`)
			} else {
				reject(`pnpm fix exited with ${code}`)
			}
		})
	})
}
