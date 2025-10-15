import { NewPackageAnswers, NewPlayTSBunAnswers, NewWorkerAnswers } from './answers'
import {
	pascalText,
	pascalTextPlural,
	pascalTextSingular,
	slugifyText,
	slugifyTextPlural,
	slugifyTextSingular,
} from './helpers/slugify'
import { nameValidator } from './helpers/validate'
import { bunInstall } from './plugins/bun-install'
import { fixAll } from './plugins/fix-all'
import { fixDepsAndFormat } from './plugins/fix-deps-and-format'
import { fixFormat } from './plugins/fix-format'
import { pnpmInstall } from './plugins/pnpm-install'

import type { PlopTypes } from '@turbo/gen'
import type { PnpmInstallData } from './plugins/pnpm-install'

export default function generator(plop: PlopTypes.NodePlopAPI): void {
	plop.setActionType('bunInstall', bunInstall as PlopTypes.CustomActionFunction)
	plop.setActionType('pnpmInstall', pnpmInstall as PlopTypes.CustomActionFunction)
	plop.setActionType('fixAll', fixAll as PlopTypes.CustomActionFunction)
	plop.setActionType('fixDepsAndFormat', fixDepsAndFormat as PlopTypes.CustomActionFunction)
	plop.setActionType('fixFormat', fixFormat as PlopTypes.CustomActionFunction)

	plop.setHelper('slug', slugifyText)
	plop.setHelper('slug-s', slugifyTextSingular)
	plop.setHelper('slug-p', slugifyTextPlural)

	plop.setHelper('pascal', pascalText)
	plop.setHelper('pascal-s', pascalTextSingular)
	plop.setHelper('pascal-p', pascalTextPlural)

	plop.setGenerator('new-worker', {
		description: 'Create a new Cloudflare Worker using Hono',
		// gather information from the user
		prompts: [
			{
				type: 'input',
				name: 'name',
				message: 'name of worker',
				validate: nameValidator,
			},
		],
		// perform actions based on the prompts
		actions: (data: unknown) => {
			const answers = NewWorkerAnswers.parse(data)
			process.chdir(answers.turbo.paths.root)
			const destination = `apps/${slugifyText(answers.name)}`

			const actions: PlopTypes.Actions = [
				{
					type: 'addMany',
					base: 'templates/fetch-worker',
					destination,
					templateFiles: ['templates/fetch-worker/**/**.hbs'],
					data: answers,
				},
				{ type: 'pnpmInstall', data: { ...answers, destination } satisfies PnpmInstallData },
				{ type: 'fixAll' },
				{ type: 'pnpmInstall', data: { ...answers, destination } satisfies PnpmInstallData },
			]

			return actions
		},
	})

	plop.setGenerator('new-worker-vite', {
		description: 'Create a new Cloudflare Worker using Hono and Vite',
		// gather information from the user
		prompts: [
			{
				type: 'input',
				name: 'name',
				message: 'name of worker',
				validate: nameValidator,
			},
		],
		// perform actions based on the prompts
		actions: (data: unknown) => {
			const answers = NewWorkerAnswers.parse(data)
			process.chdir(answers.turbo.paths.root)
			const destination = `apps/${slugifyText(answers.name)}`

			const actions: PlopTypes.Actions = [
				{
					type: 'addMany',
					base: 'templates/fetch-worker-vite',
					destination,
					templateFiles: ['templates/fetch-worker-vite/**/**.hbs'],
					data: answers,
				},
				{ type: 'pnpmInstall', data: { ...answers, destination } satisfies PnpmInstallData },
				{ type: 'fixAll' },
				{ type: 'pnpmInstall', data: { ...answers, destination } satisfies PnpmInstallData },
			]

			return actions
		},
	})

	plop.setGenerator('new-package', {
		description: 'Create a new shared package',
		prompts: [
			{
				type: 'input',
				name: 'name',
				message: 'name of package',
				validate: nameValidator,
			},
			{
				type: 'confirm',
				name: 'usedInWorkers',
				message: 'Will this package be used within Cloudflare Workers?',
				default: true,
			},
		],
		actions: (data: unknown) => {
			const answers = NewPackageAnswers.parse(data)
			process.chdir(answers.turbo.paths.root)
			const destination = `packages/${slugifyText(answers.name)}`

			const actions: PlopTypes.Actions = [
				{
					type: 'addMany',
					base: 'templates/package',
					destination,
					templateFiles: ['templates/package/**/**.hbs'],
					data: {
						...answers,
						tsconfigType: answers.usedInWorkers ? 'workers-lib.json' : 'lib.json',
					},
				},
				{ type: 'fixDepsAndFormat' },
				{ type: 'pnpmInstall', data: { ...answers, destination } satisfies PnpmInstallData },
			]

			return actions
		},
	})

	plop.setGenerator('play-ts-bun', {
		description: 'Create a new TypeScript app with bun in play/ for experimental use',
		prompts: [
			{
				type: 'input',
				name: 'name',
				message: 'name of app',
				validate: nameValidator,
			},
		],
		actions: (data: unknown) => {
			const answers = NewPlayTSBunAnswers.parse(data)
			process.chdir(answers.turbo.paths.root)
			const destination = `play/ts/${slugifyText(answers.name)}`

			const actions: PlopTypes.Actions = [
				{
					type: 'addMany',
					base: 'templates/play-ts-bun',
					destination,
					templateFiles: ['templates/play-ts-bun/**/**.hbs'],
					data: answers,
				},
				{ type: 'fixFormat' },
				{ type: 'bunInstall', data: { ...answers, destination } satisfies PnpmInstallData },
			]

			return actions
		},
	})
}
