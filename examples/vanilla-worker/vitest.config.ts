import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				main: `${__dirname}/src/index.ts`,
				isolatedStorage: true,
				singleWorker: true,
				miniflare: {
					compatibilityDate: '2025-10-08',
					compatibilityFlags: ['nodejs_compat'],
				},
			},
		},
	},
})
