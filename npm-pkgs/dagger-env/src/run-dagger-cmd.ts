import { $, fs } from 'zx'

import { OPItem, OPSection } from './op.js'

import type { DaggerEnv, DaggerEnvConfig } from './dagger-env.js'

/**
 * Configuration for running Dagger commands with 1Password integration
 */
export interface RunDaggerCommandConfig<T extends DaggerEnvConfig = DaggerEnvConfig> {
	/** 1Password vault ID */
	opVault: string
	/** 1Password item ID */
	opItem: string
	/** 1Password sections to include for secrets */
	opSections: Array<{ label: string; id: string }>
	/** Commands that should include Docker socket if available */
	dockerCommands?: string[]
	/** Hook to run before executing the command (e.g., vendor file setup) */
	beforeCommand?: () => Promise<void>
	/** DaggerEnv instance for schema validation and type safety */
	daggerEnv: DaggerEnv<T>
}

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
 * Creates a function to run Dagger commands with 1Password integration
 * @param config Configuration for the command runner
 * @returns Function to execute Dagger commands
 */
export function createDaggerCommandRunner<T extends DaggerEnvConfig>(
	config: RunDaggerCommandConfig<T>
) {
	const opItemUri = `op://${config.opVault}/${config.opItem}`

	return async function runDaggerCommand(
		commandName: string,
		options?: RunDaggerCommandOptions
	): Promise<void> {
		const { args = {}, env = {}, extraArgs = [] } = options ?? {}

		// Run any pre-command setup
		if (config.beforeCommand) {
			await config.beforeCommand()
		}

		// Environment variables to pass to the `op run` command
		const envVars: Record<string, string> = {}

		// Pass dagger cloud token in CI because we don't have user auth
		if (process.env.CI !== undefined) {
			envVars.DAGGER_CLOUD_TOKEN = `${opItemUri}/DAGGER_CLOUD_TOKEN`
		}

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

		// Fetch 1Password item
		const opItem = OPItem.parse(
			await $`op item get ${config.opItem} --vault ${config.opVault} --format json`.json()
		)

		// Parse sections to include
		const sectionsToInclude = OPSection.array().parse(config.opSections)

		// Extract secrets from specified sections
		const secrets = opItem.fields
			.filter((f) => sectionsToInclude.some((s) => s.id === f.section?.id))
			.reduce(
				(acc, f) => {
					acc[f.label] = f.value
					return acc
				},
				{} as Record<string, string>
			)

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

		// Construct the command
		const cmd: string[] = [
			'op',
			'run',
			'--no-masking',
			'--',
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
