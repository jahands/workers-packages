import { defineConfig } from 'vitest/config'

import { glob } from '@repo/workspace-dependencies/zx'

export default defineConfig(async () => {
	const cfgTS = 'vitest.config{,.node}.ts'

	// all vitest projects
	const projects = (
		await glob([
			`{npm-apps,npm-pkgs,apps,packages,examples,test}/*/${cfgTS}`,
			`turbo/generators/${cfgTS}`,
		])
	).filter((p) => !p.includes('node_modules'))

	const isolated: string[] = [
		// add here and then add test:ci script to the package
		// if it needs to run tests separately. e.g.
		// 'test/cron-workflow-test/vitest.config.ts',
	]

	return {
		test: {
			// Run all non-isolated projects together.
			projects: projects.filter((p) => !isolated.includes(p)),
		},
	}
})
