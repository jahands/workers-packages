/* eslint-disable @typescript-eslint/no-unused-vars */
import { argument, Container, dag, Directory, func, object, Secret } from '@dagger.io/dagger'
import { envStorage, ParamsToEnv, shell } from '@jahands/dagger-helpers'

const sh = shell('bash')

const projectIncludes: string[] = [
	// dirs
	'examples/',
	'packages/',
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
	async setupWorkspace(): Promise<Container> {
		return dag
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
			.withExec(sh('curl -fsSL https://sh.uuid.rocks/install/mise | MISE_VERSION=v2025.10.0 bash'))
			.withEnvVariable('PATH', '$HOME/.local/share/mise/shims:$HOME/.local/bin:$PATH', {
				expand: true,
			})
			.withFile('.mise.toml', this.source.file('.mise.toml'))
			.withExec(sh('mise trust --yes && mise install --yes && mise reshim'))
			.sync()
	}

	@func()
	async installDeps(): Promise<Container> {
		const workspace = await this.setupWorkspace()

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
			// TODO: pass in CI as a param instead of hard-coding here
			.withExec(sh('CI=1 FORCE_COLOR=1 pnpm install --frozen-lockfile --child-concurrency=10'))

			// copy over the rest of the project
			.withDirectory('/work', this.source.directory('/'), { include: projectIncludes })

			// git dir is used for turbox summary reporting and sentry during deploys
			.withDirectory('.git', this.source.directory('/.git'))
		return con
	}

	@func()
	@ParamsToEnv()
	async test(
		TURBO_TOKEN?: Secret,
		TURBO_REMOTE_CACHE_SIGNATURE_KEY?: Secret,
		GITHUB_ACTIONS?: string
	): Promise<void> {
		const con = this.withEnv(await this.installDeps())

		await con.withExec(sh('bun runx ci check')).sync()
	}

	// =============================== //
	// =========== Helpers =========== //
	// =============================== //

	/**
	 * Calculate derived environment variables based on variables present in the env object.
	 */
	private getDerivedEnvVars(
		env: Record<string, string | Secret | undefined>
	): Record<string, string> {
		const derivedVars: Record<string, string> = {}

		const setIfExists = (triggerVarName: string, envVars: Record<string, string>) => {
			if (env[triggerVarName] !== undefined) {
				Object.assign(derivedVars, envVars)
			}
		}

		setIfExists('TURBO_TOKEN', {
			TURBO_API: 'https://turbo.uuid.rocks',
			TURBO_TEAM: 'team_workers_packages',
			TURBO_LOG_ORDER: 'grouped',
			DO_NOT_TRACK: '1',
		})
		return derivedVars
	}

	/**
	 * Add env vars / secrets to a container based on AsyncLocalStorage context
	 */
	private withEnv(
		con: Container,
		{
			color = true,
		}: {
			/**
			 * Set FORCE_COLOR=1
			 * @default true
			 */
			color?: boolean
		} = {}
	): Container {
		let c = con
		const context = envStorage.getStore()

		if (color) {
			c = c.withEnvVariable('FORCE_COLOR', '1')
		}

		if (context) {
			const { currentParams, mergedEnv } = context

			/** Set derived env vars based on trigger vars in the current context */
			const derivedEnvVars = this.getDerivedEnvVars(mergedEnv)
			for (const [key, value] of Object.entries(derivedEnvVars)) {
				c = c.withEnvVariable(key, value)
			}

			for (const [key, value] of Object.entries(mergedEnv)) {
				if (currentParams.has(key) && value) {
					if (typeof value === 'string') {
						c = c.withEnvVariable(key, value)
					} else {
						c = c.withSecretVariable(key, value as Secret)
					}
				}
			}
		} else {
			throw new Error('AsyncLocalStorage store not found in withEnv')
		}
		return c
	}
}
