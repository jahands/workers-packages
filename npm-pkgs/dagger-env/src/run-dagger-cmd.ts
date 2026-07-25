import { z } from 'zod/v4'
import { $, fs } from 'zx'

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
 * Configuration for running Dagger commands with Infisical integration
 */
export interface RunDaggerCommandConfig<T extends DaggerEnvConfig = DaggerEnvConfig> {
	/** Infisical project ID */
	projectId: string
	/** Infisical environment slug (e.g. `prod`) */
	env: string
	/** Infisical folder path to fetch secrets from (e.g. `/ci/my-repo`) */
	path: string
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
 * Creates a function to run Dagger commands with Infisical integration
 * @param config Configuration for the command runner
 * @returns Function to execute Dagger commands
 */
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

		// Environment variables to pass to the `dagger` command
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

		// Fetch secrets from Infisical
		const exportedSecrets = InfisicalSecret.array().parse(
			await $`infisical export --silent --format=json --projectId ${config.projectId} --env ${config.env} --path ${config.path}`.json()
		)

		// Extract secrets into a key/value map
		const secrets = exportedSecrets.reduce(
			(acc, s) => {
				acc[s.key] = s.value
				return acc
			},
			{} as Record<string, string>
		)

		// Pass dagger cloud token in CI because we don't have user auth
		if (process.env.CI !== undefined && secrets.DAGGER_CLOUD_TOKEN !== undefined) {
			envVars.DAGGER_CLOUD_TOKEN = secrets.DAGGER_CLOUD_TOKEN
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

		// Construct the command
		const cmd: string[] = [
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
