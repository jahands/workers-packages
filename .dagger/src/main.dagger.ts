import { dag, Container, Directory, argument, object, func, Secret } from '@dagger.io/dagger'
import { envStorage, ParamsToEnv, shell } from '@jahands/dagger-helpers'

const sh = shell('bash')

const projectIncludes: string[] = [
	// dirs
	'1projects/',
	'apps/',
	'apps2/',
	'bunapps/',
	'docker/',
	'packages/',
	'patches/',
	'tools/',

	// files
	'.gitignore',
	'.npmrc',
	'.prettierignore',
	'.prettierrc.cjs',
	'.sentryclirc',
	'.syncpackrc.cjs',
	'eslint.config.ts',
	'biome.jsonc',
	'package.json',
	'pnpm-lock.yaml',
	'pnpm-workspace.yaml',
	'Justfile',
	'tsconfig.json',
	'turbo.json',
	'vitest.workspace.ts',
]

@object()
export class DaggerCommon {
	source: Directory

	constructor(
		@argument({
			defaultPath: '/',
			ignore: [
				'**/node_modules/',
				'**/.env',
				'**/.secret',
				'**/Earthfile',
				'**/.wrangler',
				'**/.dev.vars',
				'**/.turbo/',
				'**/dist/',
				'**/dist2/',
				'**/.DS_Store',
				'**/.astro/',
				'**/.next/',
				'*.env',
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
			.withExec(sh('curl -fsSL https://sh.uuid.rocks/install/mise | MISE_VERSION=v2025.4.4 bash'))
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

		let con = workspace
			// copy over minimal files needed for installing tools/deps
			.withDirectory('/work', this.source.directory('/'), {
				include: [
					'patches/',
					'pnpm-lock.yaml',
					'pnpm-workspace.yaml',
					'package.json',
					'**/package.json',
					'.npmrc',
					'packages/tools/bin',
				],
				exclude: ['tools/**'],
			})

			// install pnpm deps
			.withMountedCache('/pnpm-store', dag.cacheVolume(`pnpm-store`))
			.withExec(sh('pnpm config set store-dir /pnpm-store'))
			.withExec(sh('FORCE_COLOR=1 pnpm install --frozen-lockfile --child-concurrency=10'))

			// copy over the rest of the project
			.withDirectory('/work', this.source.directory('/'), { include: projectIncludes })

			// git dir is used for turbox summary reporting and sentry during deploys
			.withDirectory('.git', this.source.directory('/.git'))

		const ghaEnvExists = await this.source
			.directory('/')
			.entries()
			.then((e) => e.includes('.github_actions.tmp'))

		if (ghaEnvExists) {
			con = con
				// mount .github_actions.tmp if it exists (used in turbox)
				.withMountedFile('.github_actions.tmp', this.source.file('.github_actions.tmp'))
		}
		return con
	}

	@func()
	@ParamsToEnv()
	async buildPackages(
		TURBO_TOKEN?: Secret,
		TURBO_REMOTE_CACHE_SIGNATURE_KEY?: Secret,
		GITHUB_ACTIONS?: string
	): Promise<Container> {
		const con = this.withEnv(await this.installDeps())
			.withExec(sh(`bun turbox build -- -F './packages/*' --log-order=grouped`))
			.sync()
		return con
	}

	@func()
	@ParamsToEnv()
	async test(
		TURBO_TOKEN?: Secret,
		TURBO_REMOTE_CACHE_SIGNATURE_KEY?: Secret,
		GITHUB_ACTIONS?: string
	): Promise<Container> {
		const con = this.withEnv(await this.buildPackages())

		const [checks, _lint] = await Promise.all([
			con.withExec(sh('bun turbo check:ci -- --log-order=grouped')).sync(),
			// Run check:lint:all in separate container to hopefully prevent the
			// current race condition we're seeing from causing failures
			con.withExec(sh('bun turbo check:lint:all -- --log-order=grouped')).sync(),
		])
		return checks
	}

	@func()
	async getVersion(pkgPath: string): Promise<string> {
		const dep = await (await this.installDeps()).sync()
		const con = await dep
			.withWorkdir(`/work/${pkgPath}`)
			.withExec(sh('bun get-docker-version'), { noInit: true })
			.sync()
		return (await con.stdout()).trim()
	}

	// =============================== //
	// =========== Helpers =========== //
	// =============================== //

	/**
	 * Get the env vars from the AsyncLocalStorage store
	 */
	private getEnv({ exclude }: { exclude?: string[] } = {}): Record<
		string,
		string | Secret | undefined
	> {
		const store = envStorage.getStore()
		if (!store) return {}
		const { currentParams, mergedEnv } = store
		return Object.fromEntries(
			Object.entries(mergedEnv).filter(
				([key, value]) =>
					currentParams.has(key) &&
					// only include uppercase vars - others may not be vars
					key.toUpperCase() === key &&
					value !== undefined &&
					!exclude?.includes(key)
			)
		)
	}

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
		// TODO: Make this accept a promise or something so that we
		// don't have to await the container when using this. Or
		// something like that. Just want to stop calling sync()
		// wherever we can to improve tracing.
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
