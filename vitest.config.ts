import { defineConfig } from 'vitest/config'

import { glob } from '@repo/workspace-dependencies/zx'

export default defineConfig(async () => {
	// All vitest projects
	const projectConfigPaths = await glob(['{apps,packages,test}/*/vitest.config{,.node}.ts'])

	return {
		test: {
			projects: projectConfigPaths,
		},
	}
})
