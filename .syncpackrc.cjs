// @ts-check
/** @type {import("syncpack").RcFile} */
const config = {
	indent: '\t',
	lintFormatting: false, // handled by prettier
	// dependencyTypes: ['prod'], // disabled filter to enable all types
	dependencyTypes: ['!peer'],
	versionGroups: [
		{
			label: 'local packages',
			packages: ['**'],
			dependencies: [
				'@repo/*',
				// TODO: maybe find a way to automate getting these package names?
				'workers-tagged-logger',
				'@jahands/otel-cf-workers',
				'http-codex',
				'@jahands/cli-tools',
			],
			dependencyTypes: ['!local'], // Exclude the local package itself
			pinVersion: 'workspace:*',
		},
		{
			label: 'pin vitest compatible with workers-pool-vitest',
			dependencies: ['vitest', '@vitest/ui'],
			pinVersion: '2.1.1',
		},
		{
			label: 'pin typescript to version compatible with eslint',
			dependencies: ['typescript'],
			pinVersion: '5.5.4',
		},
		{
			label: 'pin node types to prevent conflicts with Workers types',
			dependencies: ['@types/node'],
			pinVersion: '20.8.3',
		},
		{
			label: 'use zod 4 for testing',
			packages: ['@repo/tests__workers-tagged-logger__hono-app-zod-3'],
			dependencies: ['zod'],
			pinVersion: '3.24.2',
		},
		{
			label: 'use zod 3 for testing',
			packages: ['@repo/tests__workers-tagged-logger__hono-app-zod-4'],
			dependencies: ['zod'],
			pinVersion: '4.0.0-beta.20250412T085909',
		},
	],
	semverGroups: [
		{
			label: 'pin all deps',
			range: '',
			dependencies: ['**'],
			packages: ['**'],
		},
	],
}

module.exports = config
