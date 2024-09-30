import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				main: `${__dirname}/src/index.ts`,
				isolatedStorage: true,
				singleWorker: true,
				miniflare: {
					compatibilityDate: '2024-09-02',
					compatibilityFlags: ['nodejs_compat'],
					bindings: {
						OTEL_AUTH: 'password',
					},
				},
			},
		},
	},
})
