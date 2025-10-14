// @ts-check
/** @type {import("syncpack").RcFile} */
const config = {
	indent: '\t',
	lintFormatting: false, // handled by prettier
	// dependencyTypes: ['prod'], // disabled filter to enable all types
	dependencyTypes: ['!peer'],
	versionGroups: [
		{
			label: 'use zod v4 for some packages',
			dependencies: ['zod'],
			packages: ['notion-schemas'],
			pinVersion: '^4.1.11',
		},
		{
			label: 'use remote @jahands/cli-tools to avoid circular dependency',
			dependencies: ['@jahands/cli-tools'],
			packages: ['@repo/tools'],
		},
		{
			label: 'use remote turbo-config to avoid local dep issues',
			dependencies: ['turbo-config'],
			packages: ['@repo/workers-packages'],
		},
		{
			label: 'local packages',
			packages: ['**'],
			dependencies: ['$LOCAL'],
			dependencyTypes: ['!local'], // Exclude the local package itself
			pinVersion: 'workspace:*',
		},
	],
	semverGroups: [
		{
			label: 'use range for dependencies in public packages',
			range: '^',
			dependencies: ['nanoid', 'zod'],
			packages: ['prefixed-nanoid', 'workers-tagged-logger', 'notion-schemas', 'cron-workflow'],
		},
		{
			label: 'pin all deps',
			range: '',
			dependencies: ['**'],
			packages: ['**'],
		},
	],
}

module.exports = config
