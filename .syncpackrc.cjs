// @ts-check
/** @type {import("syncpack").RcFile} */
const config = {
	indent: '\t',
	lintFormatting: false, // handled by prettier
	// dependencyTypes: ['prod'], // disabled filter to enable all types
	versionGroups: [
		{
			label: 'local packages',
			packages: ['**'],
			dependencies: ['@repo/*'],
			dependencyTypes: ['!local'], // Exclude the local package itself
			pinVersion: 'workspace:*',
		},
		{
			label: 'pin vitest compatible with workers-pool-vitest',
			dependencies: ['vitest', '@vitest/ui'],
			pinVersion: '2.0.5',
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
