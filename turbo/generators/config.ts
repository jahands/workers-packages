import { isWorkerNameUnique } from './helpers/ensure-unique-worker-name'
import { partials } from './helpers/partials'
import { pnpmFix } from './plugins/pnpm-fix'
import { pnpmInstall } from './plugins/pnpm-install'
import { slugifyText } from './plugins/slugify'
import { updateWorkflows } from './plugins/workflows'
import { wranglerSecretPut } from './plugins/wrangler-secret-put'

import type { PlopTypes } from '@turbo/gen'
import type { Answers } from './types'

export default function generator(plop: PlopTypes.NodePlopAPI): void {
	plop.setActionType('pnpmInstall', pnpmInstall as PlopTypes.CustomActionFunction)
	plop.setActionType('pnpmFix', pnpmFix as PlopTypes.CustomActionFunction)
	plop.setActionType('updateWorkflows', updateWorkflows as PlopTypes.CustomActionFunction)
	plop.setActionType(
		'wranglerSecretPut',
		wranglerSecretPut as unknown as PlopTypes.CustomActionFunction
	)
	plop.setHelper('slug', slugifyText)

	// create a generator
	plop.setGenerator('new-worker', {
		description: 'Create a new Fetch Cloudflare Worker',
		// gather information from the user
		prompts: [
			{
				type: 'list',
				name: 'appsDir',
				message: 'Workspace location?',
				choices: ['examples'],
			},
			{
				type: 'input',
				name: 'name',
				message: 'name of worker',
			},
			{
				type: 'list',
				name: 'uploadSecrets',
				message: 'Upload wrangler secrets?',
				choices: ['yes', 'no'],
			},
			{
				type: 'list',
				name: 'useAuth',
				message: 'Use bearer auth in Worker?',
				choices: ['yes', 'no'],
			},
		],
		// perform actions based on the prompts
		actions: (data: any) => {
			const answers = data as Answers
			process.chdir(answers.turbo.paths.root)

			let useAuthTypePartial = ''
			let useAuthMiddlewarePartial = ''
			let useAuthImportPartial = ''
			if (answers.useAuth === 'yes') {
				useAuthTypePartial = partials.useAuth.type
				useAuthMiddlewarePartial = partials.useAuth.middleware
				useAuthImportPartial = partials.useAuth.import
			}
			plop.setPartial('useAuthTypePartial', useAuthTypePartial)
			plop.setPartial('useAuthMiddlewarePartial', useAuthMiddlewarePartial)
			plop.setPartial('useAuthImportPartial', useAuthImportPartial)

			const actions: PlopTypes.Actions = [
				{
					type: 'addMany',
					base: 'templates/fetch-worker',
					destination: `${answers.appsDir}/{{ slug name }}`,
					templateFiles: [
						'templates/fetch-worker/**/**.hbs',
						'templates/fetch-worker/.eslintrc.cjs.hbs',
					],
				},
				{ type: 'pnpmFix' },
				{ type: 'pnpmInstall' },
			]

			if (answers.uploadSecrets === 'yes') {
				actions.push(
					{
						type: 'wranglerSecretPut',
						data: { name: 'SENTRY_DSN' },
					},
					{
						type: 'wranglerSecretPut',
						data: { name: 'AXIOM_API_KEY' },
					}
				)

				if (answers.useAuth === 'yes') {
					actions.push({
						type: 'wranglerSecretPut',
						data: { name: 'API_TOKEN' },
					})
				}
			}

			// actions.push({ type: 'updateWorkflows' })
			return actions
		},
	})
}
