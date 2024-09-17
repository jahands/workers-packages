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
			dependencies: ['@repo/*', 'workers-tagged-logger'],
			dependencyTypes: ['!local'], // Exclude the local package itself
			pinVersion: 'workspace:*',
		},
		{
			label: 'pin vitest compatible with workers-pool-vitest',
			dependencies: ['vitest', '@vitest/ui'],
			pinVersion: '2.0.5',
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
