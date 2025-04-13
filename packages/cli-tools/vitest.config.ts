import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		setupFiles: ['./src/test/global-setup.ts'],
		env: {
			FORCE_COLOR: '1',
		},
	},
})
