import { defineConfig } from 'vitest/config'

import { glob } from '@repo/workspace-dependencies/zx'

export default defineConfig(async () => {
	// All vitest projects
	const projects = (
		await glob(['{npm-apps,npm-pkgs,apps,packages,examples,test}/*/vitest.config{,.node}.ts'])
	).filter((p) => !p.includes('node_modules'))

	const isolated: string[] = [
		// workflows has issues for some reason
		// TODO: fix this
		'test/cron-workflow-test/vitest.config.ts',
		'examples/cron-worker-example/vitest.config.ts',
	]

	return {
		test: {
			// Run all non-isolated projects together.
			projects: projects.filter((p) => !isolated.includes(p)),
		},
	}
})
