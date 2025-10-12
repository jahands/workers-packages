import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				isolatedStorage: true,
				singleWorker: true,
				miniflare: {
					compatibilityDate: '2024-09-02',
					compatibilityFlags: ['nodejs_compat'],
				},
			},
		},
	},
})
