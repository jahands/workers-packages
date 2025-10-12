import { createDaggerEnv } from 'dagger-env'
import { createDaggerCommandRunner } from 'dagger-env/run'
import { z } from 'zod/v4'

export const dagEnv = createDaggerEnv({
	args: z.object({}),
	env: z.object({
		CI: z.string().optional(),
		GITHUB_ACTIONS: z.string().optional(),
	}),
	secrets: z.object({
		TURBO_TOKEN: z.string(),
		TURBO_REMOTE_CACHE_SIGNATURE_KEY: z.string(),
		MISE_GITHUB_TOKEN: z.string(),
	}),
	secretPresets: {
		turbo: ['TURBO_TOKEN', 'TURBO_REMOTE_CACHE_SIGNATURE_KEY'],
	},
	derivedEnvVars: {
		TURBO_TOKEN: {
			TURBO_API: 'https://turbo.uuid.rocks',
			TURBO_TEAM: 'team_workers_packages',
			TURBO_LOG_ORDER: 'grouped',
			DO_NOT_TRACK: '1',
		},
	},
})

export const runDaggerCommand = createDaggerCommandRunner({
	opVault: 'xxcrgwtyu2wmeh2jdcnee2eqda',
	opItem: 'dzxntwosd46ykwyz7qjdijfr2m',
	opSections: [
		{
			id: 'cpbkdydzyexdubry5g4rofcpny',
			label: 'Shared',
		},
	],
	daggerEnv: dagEnv,
})
