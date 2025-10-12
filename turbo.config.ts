import { defineConfig, pMap } from 'turbo-config'

import { PackageJson } from '@repo/tools/package'
import { getWorkspacePackages } from '@repo/tools/workspace'

export default defineConfig(async () => {
	const packages = await getWorkspacePackages()

	// we need to build all packages before tasks
	// like linting/tests from the root
	const buildPackages = await pMap(packages, async (pkg) =>
		PackageJson.parse(JSON.parse((await fs.readFile(pkg.pkgJsonPath)).toString()))
	).then((pkgs) =>
		pkgs.filter((pkg) => Boolean(pkg.scripts?.build)).map((pkg) => `${pkg.name}#build`)
	)

	return {
		$schema: 'https://turbo.build/schema.json',
		globalDependencies: ['**/.dev.vars'],
		globalEnv: ['CI', 'GITHUB_ACTIONS', 'VITEST'],
		globalPassThroughEnv: [
			'WRANGLER_LOG',
			'FORCE_COLOR',
			'TURBO_TOKEN',
			'TURBO_REMOTE_CACHE_SIGNATURE_KEY',
			'GITHUB_ACTIONS',
		],
		remoteCache: {
			enabled: true,
			signature: true,
		},
		ui: 'stream',
		tasks: {
			topo: {
				dependsOn: ['^topo'],
			},
			build: {
				dependsOn: ['^build', 'topo'],
				outputs: ['dist/**', '.wrangler/deploy/config.json'],
				outputLogs: 'new-only',
			},
			dev: {
				cache: false,
				dependsOn: ['build', 'topo'],
				interactive: true,
				persistent: true,
				outputLogs: 'new-only',
			},
			// preview is used in Vite applications
			preview: {
				cache: false,
				dependsOn: ['build', 'topo'],
				interactive: true,
				persistent: true,
				outputLogs: 'new-only',
			},
			deploy: {
				cache: false,
				dependsOn: ['build', 'topo'],
				env: ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'],
				outputLogs: 'new-only',
			},
			// build:wrangler isn't used much, but can be useful for debugging
			'build:wrangler': {
				dependsOn: ['build', 'topo'],
				outputLogs: 'new-only',
			},
			check: {
				dependsOn: ['check:types', 'check:lint', 'topo'],
				outputLogs: 'new-only',
			},
			'//#test:ci': {
				dependsOn: buildPackages,
				outputLogs: 'new-only',
			},
			'test:ci': {
				dependsOn: ['build', 'topo'],
				outputLogs: 'new-only',
			},
			'check:ci': {
				dependsOn: [
					'//#check:format',
					'//#check:deps',
					'check:types',
					'check:exports',
					'//#check:lint:all',
					'//#test:ci',
					'test:ci',
					'topo',
				],
				outputLogs: 'new-only',
			},
			'//#check:deps': {
				outputLogs: 'new-only',
			},
			'check:types': {
				dependsOn: ['build', 'topo'],
				outputLogs: 'new-only',
			},
			'check:exports': {
				dependsOn: ['^check:exports', 'check:types', 'topo'],
				outputLogs: 'new-only',
			},
			'check:lint': {
				dependsOn: ['build', 'topo'],
				outputLogs: 'new-only',
				env: ['FIX_ESLINT'],
			},
			'//#check:lint:all': {
				outputLogs: 'new-only',
				outputs: ['node_modules/.cache/.eslintcache'],
				env: ['FIX_ESLINT'],
			},
			'//#check:format': {
				dependsOn: [],
				outputLogs: 'new-only',
			},
			'fix:workers-types': {
				outputs: ['worker-configuration.d.ts', 'topo'],
				outputLogs: 'new-only',
			},
			'//#build': {
				dependsOn: ['^build'],
				outputLogs: 'new-only',
			},
		},
	}
})
