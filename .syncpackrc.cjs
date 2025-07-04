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
				'@jahands/cli-tools', // use published version
				'@jahands/dagger-helpers',
			],
			dependencyTypes: ['!local'], // Exclude the local package itself
			pinVersion: 'workspace:*',
		},
		{
			label: 'pin typescript to version compatible with eslint',
			dependencies: ['typescript'],
			pinVersion: '5.5.4',
		},
	],
	semverGroups: [
		{
			label: 'use range for dependencies in public packages',
			range: '^',
			dependencies: ['nanoid', 'zod'],
			packages: ['prefixed-nanoid', 'workers-tagged-logger'],
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
