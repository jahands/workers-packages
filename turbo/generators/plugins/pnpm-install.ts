import { spawn } from 'child_process'

import type { PlopTypes } from '@turbo/gen'
import type { Answers } from '../types'

const didSucceed = (code: number) => `${code}` === '0'

export function pnpmInstall(answers: Answers, _config: any, _plop: PlopTypes.NodePlopAPI) {
	return new Promise((resolve, reject) => {
		console.log('🌀 running pnpm install...')
		const pnpmI = spawn('pnpm', ['install'], {
			cwd: answers.turbo.paths.root,
			shell: true,
		})

		pnpmI.on('close', (code: number) => {
			if (didSucceed(code)) {
				resolve(`pnpm install ran correctly`)
			} else {
				reject(`pnpm install exited with ${code}`)
			}
		})
	})
}
