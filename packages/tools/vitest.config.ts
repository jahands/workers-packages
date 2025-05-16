import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globalSetup: [`${__dirname}/src/test/global-setup.ts`],
		setupFiles: [`${__dirname}/src/test/setup.ts`],
		environment: 'node',
	},
})
