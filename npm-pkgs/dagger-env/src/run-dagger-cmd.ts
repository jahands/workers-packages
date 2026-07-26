import { z } from 'zod/v4'
import { $, fs } from 'zx'

import { OPItem, OPSection } from './op.js'

import type { DaggerEnv, DaggerEnvConfig } from './dagger-env.js'

/**
 * A single secret returned by `infisical export --format=json`
 */
export type InfisicalSecret = z.infer<typeof InfisicalSecret>
export const InfisicalSecret = z.object({
	key: z.string(),
	value: z.string(),
})

/**
 * Infisical secrets provider configuration
 */
export interface InfisicalProviderConfig {
	/** Infisical project ID */
	projectId: string
	/** Infisical environment slug (e.g. `prod`) */
	env: string
	/** Infisical folder path to fetch secrets from (e.g. `/ci/my-repo`) */
	path: string
}

/**
 * 1Password secrets provider configuration
 */
export interface OnePasswordProviderConfig {
	/** 1Password vault ID */
	opVault: string
	/** 1Password item ID */
	opItem: string
	/** 1Password sections to include for secrets */
	opSections: Array<{ label: string; id: string }>
}

/**
 * Configuration shared by all secrets providers
 */
export interface RunDaggerCommandBaseConfig<T extends DaggerEnvConfig = DaggerEnvConfig> {
	/** Commands that should include Docker socket if available */
	dockerCommands?: string[]
	/** Hook to run before executing the command (e.g., vendor file setup) */
	beforeCommand?: () => Promise<void>
	/** DaggerEnv instance for schema validation and type safety */
	daggerEnv: DaggerEnv<T>
}

/**
 * Configuration for running Dagger commands with Infisical or 1Password integration
 */
export type RunDaggerCommandConfig<T extends DaggerEnvConfig = DaggerEnvConfig> =
	RunDaggerCommandBaseConfig<T> & (InfisicalProviderConfig | OnePasswordProviderConfig)

/**
 * Options for individual command execution
 */
export interface RunDaggerCommandOptions {
	/** Arguments to pass to the Dagger command */
	args?: Record<string, any>
	/** Additional environment variables */
	env?: Record<string, string>
	/** Additional command-line arguments */
	extraArgs?: string[]
}

/**
 * Fetches secrets from Infisical via `infisical export`
 */
async function fetchInfisicalSecrets(config: InfisicalProviderConfig): Promise<Record<string, string>> {
	const exportedSecrets = InfisicalSecret.array().parse(
		await $`infisical export --silent --format=json --projectId ${config.projectId} --env ${config.env} --path ${config.path}`.json()
	)

	return exportedSecrets.reduce(
		(acc, s) => {
			acc[s.key] = s.value
			return acc
		},
		{} as Record<string, string>
	)
}

/**
 * Fetches secrets from a 1Password item, filtered to the configured sections
 */
async function fetchOnePasswordSecrets(
	config: OnePasswordProviderConfig
): Promise<Record<string, string>> {
	const opItem = OPItem.parse(
		await $`op item get ${config.opItem} --vault ${config.opVault} --format json`.json()
	)

	const sectionsToInclude = OPSection.array().parse(config.opSections)

	return opItem.fields
		.filter((f) => sectionsToInclude.some((s) => s.id === f.section?.id))
		.reduce(
			(acc, f) => {
				acc[f.label] = f.value
				return acc
			},
			{} as Record<string, string>
		)
}

/**
 * Creates a function to run Dagger commands with Infisical or 1Password integration
 * @param config Configuration for the command runner
 * @returns Function to execute Dagger commands
 */
export function createDaggerCommandRunner<T extends DaggerEnvConfig>(
	config: RunDaggerCommandBaseConfig<T> & InfisicalProviderConfig
): (commandName: string, options?: RunDaggerCommandOptions) => Promise<void>
export function createDaggerCommandRunner<T extends DaggerEnvConfig>(
	config: RunDaggerCommandBaseConfig<T> & OnePasswordProviderConfig
): (commandName: string, options?: RunDaggerCommandOptions) => Promise<void>
export function createDaggerCommandRunner<T extends DaggerEnvConfig>(
	config: RunDaggerCommandConfig<T>
) {
	return async function runDaggerCommand(
		commandName: string,
		options?: RunDaggerCommandOptions
	): Promise<void> {
		const { args = {}, env = {}, extraArgs = [] } = options ?? {}

		// Run any pre-command setup
		if (config.beforeCommand) {
			await config.beforeCommand()
		}

		// Environment variables to pass to the spawned command
		const envVars: Record<string, string> = {}

		const commandArgs: string[] = [...extraArgs]

		// Add Docker socket for specific commands if available
		if (config.dockerCommands?.includes(commandName)) {
			try {
				if (await fs.exists('/var/run/docker.sock')) {
					commandArgs.push('--docker-socket=/var/run/docker.sock')
				}
			} catch {
				// Ignore if fs is not available or docker socket doesn't exist
			}
		}

		// Fetch secrets from the configured provider
		let secrets: Record<string, string>
		if ('opVault' in config) {
			secrets = await fetchOnePasswordSecrets(config)

			// Pass dagger cloud token in CI because we don't have user auth.
			// The op:// reference is resolved by the `op run` wrapper below.
			if (process.env.CI !== undefined) {
				envVars.DAGGER_CLOUD_TOKEN = `op://${config.opVault}/${config.opItem}/DAGGER_CLOUD_TOKEN`
			}
		} else {
			secrets = await fetchInfisicalSecrets(config)

			// Pass dagger cloud token in CI because we don't have user auth
			if (process.env.CI !== undefined && secrets.DAGGER_CLOUD_TOKEN !== undefined) {
				envVars.DAGGER_CLOUD_TOKEN = secrets.DAGGER_CLOUD_TOKEN
			}
		}

		// Build environment variables for Dagger
		const daggerEnv: Record<string, string> = { ...env }
		if (process.env.CI !== undefined) {
			daggerEnv.CI = process.env.CI
		}
		if (process.env.GITHUB_ACTIONS !== undefined) {
			daggerEnv.GITHUB_ACTIONS = process.env.GITHUB_ACTIONS
		}

		// Validate and serialize dagger options
		const daggerOptions = config.daggerEnv.getOptionsSchema().parse({
			args,
			env: daggerEnv,
			secrets,
		})
		envVars.DAGGER_OPTIONS = JSON.stringify(daggerOptions)

		// Construct the command. 1Password wraps `dagger call` in `op run`
		// so that op:// references in the environment are resolved.
		const cmd: string[] = [
			...('opVault' in config ? ['op', 'run', '--no-masking', '--'] : []),
			'dagger',
			'call',
			commandName,
			...commandArgs,
			'--options=env://DAGGER_OPTIONS',
		]

		// Execute the command
		await $({
			env: {
				...process.env,
				...envVars,
			},
			stdio: 'inherit',
		})`${cmd}`
	}
}
