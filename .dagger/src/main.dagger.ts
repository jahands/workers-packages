/* eslint-disable @typescript-eslint/no-unused-vars */
import { argument, Container, dag, Directory, func, object, Secret } from '@dagger.io/dagger'
import { envStorage, ParamsToEnv, shell } from '@jahands/dagger-helpers'

import { dagEnv } from './dagger-env'

const sh = shell('bash')

const projectIncludes: string[] = [
	// dirs
	'npm-apps/',
	'npm-pkgs/',
	'apps/',
	'packages/',
	'examples/',
	'test/',

	// files
	'.editorconfig',
	'.gitignore',
	'.npmrc',
	'.prettierignore',
	'.prettierrc.cjs',
	'.syncpackrc.cjs',
	'eslint.config.ts',
	'package.json',
	'pnpm-lock.yaml',
	'pnpm-workspace.yaml',
	'tsconfig.json',
	'turbo.config.ts',
	'turbo.json',
	'vitest.config.ts',
]

@object()
export class WorkersPackages {
	source: Directory

	constructor(
		@argument({
			defaultPath: '/',
			ignore: [
				'**/node_modules/',
				'**/.env',
				'**/*.env',
				'**/.secret',
				'**/.wrangler',
				'**/.dev.vars',
				'**/.turbo/',
				'**/dist/',
				'**/.DS_Store',
				'**/dagger/sdk/',
				'**/.dagger/sdk/',
			],
		})
		source: Directory
	) {
		this.source = source
	}

	@func()
	getSource(): Directory {
		return this.source
	}

	@func()
	async setupWorkspace(options: Secret): Promise<Container> {
		const { withEnv } = await dagEnv.getWithEnv(options, [], ['MISE_GITHUB_TOKEN'])

		const con = dag
			.container()
			.from(`public.ecr.aws/debian/debian:12-slim`)
			.withWorkdir('/work')
			.withEnvVariable('HOME', '/root')
			.withExec(
				// note: libatomic1 is required by workerd
				sh(
					[
						'apt-get update',
						'apt-get install -y curl jq git unzip libatomic1 gpg',
						'rm -rf /var/lib/apt/lists/*',
					].join(' && ')
				)
			)

		return withEnv(con)
			.withExec(sh('curl -fsSL https://sh.uuid.rocks/install/mise | MISE_VERSION=v2025.10.0 bash'))
			.withEnvVariable('PATH', '$HOME/.local/share/mise/shims:$HOME/.local/bin:$PATH', {
				expand: true,
			})
			.withFile('.mise.toml', this.source.file('.mise.toml'))
			.withExec(sh('mise trust --yes && mise install --yes && mise reshim'))
			.sync()
	}

	@func()
	async installDeps(options: Secret): Promise<Container> {
		const workspace = await this.setupWorkspace(options)

		const con = workspace
			// copy over minimal files needed for installing tools/deps
			.withDirectory('/work', this.source.directory('/'), {
				include: [
					'pnpm-lock.yaml',
					'pnpm-workspace.yaml',
					'package.json',
					'**/package.json',
					'.npmrc',
					'packages/tools/bin',
				],
			})

			// install pnpm deps
			.withMountedCache('/pnpm-store', dag.cacheVolume(`pnpm-store`))
			.withExec(sh('pnpm config set store-dir /pnpm-store'))
			.withExec(sh('FORCE_COLOR=1 pnpm install --frozen-lockfile --child-concurrency=10'))

			// copy over the rest of the project
			.withDirectory('/work', this.source.directory('/'), { include: projectIncludes })

			// git dir is used for turbox summary reporting and sentry during deploys
			.withDirectory('.git', this.source.directory('/.git'))
		return con
	}

	@func()
	@ParamsToEnv()
	async test(options: Secret): Promise<void> {
		const { withEnv } = await dagEnv.getWithEnv(options, ['turbo'])

		const con = withEnv(await this.installDeps(options))

		await con.withExec(sh('bun runx ci check')).sync()
	}
}
