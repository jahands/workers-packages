import { spawn } from 'child_process'

import { slugifyText } from './slugify'

import type { PlopTypes } from '@turbo/gen'
import type { Answers } from '../types'

const didSucceed = (code: number) => `${code}` === '0'

export function wranglerSecretPut(
	answers: Answers,
	config: { data: { name: string } },
	_plop: PlopTypes.NodePlopAPI
) {
	return new Promise((resolve, reject) => {
		console.log(`Enter secret for ${config.data.name}`)
		const proc = spawn(
			'pnpm',
			['exec', 'wrangler', 'secret', 'put', config.data.name, '--name', slugifyText(answers.name)],
			{
				cwd: answers.turbo.paths.root,
				stdio: 'inherit',
				shell: true,
			}
		)

		proc.on('close', (code: number) => {
			if (didSucceed(code)) {
				resolve(`wrangler ran correctly`)
			} else {
				reject(`wrangler exited with ${code}`)
			}
		})
	})
}
