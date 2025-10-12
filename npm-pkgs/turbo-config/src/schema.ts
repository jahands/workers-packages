import { z } from 'zod'

// this schema is generated from https://turbo.build/schema.json

/**
 * Turborepo's Environment Modes allow you to control which environment variables are
 * available to a task at runtime:
 *
 * - `"strict"`: Filter environment variables to only those that are specified in the `env`
 * and `globalEnv` keys in `turbo.json`.
 * - `"loose"`: Allow all environment variables for the process to be available.
 *
 * Documentation: https://turborepo.com/docs/reference/configuration#envmode
 */
export type EnvMode = z.infer<typeof EnvMode>
export const EnvMode = z.enum(['loose', 'strict'])

/**
 * "full": Displays all output
 *
 * "hash-only": Show only the hashes of the tasks
 *
 * "new-only": Only show output from cache misses
 *
 * "errors-only": Only show output from task failures
 *
 * "none": Hides all task output
 *
 * Documentation: https://turborepo.com/docs/reference/run#--output-logs-option
 */
export type OutputLogs = z.infer<typeof OutputLogs>
export const OutputLogs = z.enum(['errors-only', 'full', 'hash-only', 'new-only', 'none'])

/**
 * Enable use of the UI for `turbo`.
 *
 * Documentation: https://turborepo.com/docs/reference/configuration#ui
 */
export type TurboUI = z.infer<typeof TurboUI>
export const TurboUI = z.enum(['stream', 'tui'])

export type Permissions = z.infer<typeof Permissions>
export const Permissions = z.object({
	allow: z.array(z.string()).optional(),
	deny: z.array(z.string()).optional(),
})

export type RemoteCache = z.infer<typeof RemoteCache>
export const RemoteCache = z.object({
	apiUrl: z.string().optional(),
	enabled: z.boolean().optional(),
	loginUrl: z.string().optional(),
	preflight: z.boolean().optional(),
	signature: z.boolean().optional(),
	teamId: z.string().optional(),
	teamSlug: z.string().optional(),
	timeout: z.number().optional(),
	uploadTimeout: z.number().optional(),
})

export type Pipeline = z.infer<typeof Pipeline>
export const Pipeline = z.object({
	cache: z.boolean().optional(),
	dependsOn: z.array(z.string()).optional(),
	env: z.array(z.string()).optional(),
	inputs: z.array(z.string()).optional(),
	interactive: z.boolean().optional(),
	interruptible: z.boolean().optional(),
	outputLogs: OutputLogs.optional(),
	outputs: z.array(z.string()).optional(),
	passThroughEnv: z.union([z.array(z.string()), z.null()]).optional(),
	persistent: z.boolean().optional(),
	with: z.array(z.string()).optional(),
})

export type BoundariesRulesMap = z.infer<typeof BoundariesRulesMap>
export const BoundariesRulesMap = z.object({
	dependencies: Permissions.optional(),
	dependents: Permissions.optional(),
})

export type BoundariesConfig = z.infer<typeof BoundariesConfig>
export const BoundariesConfig = z.object({
	implicitDependencies: z.array(z.string()).optional(),
	tags: z.record(z.string(), BoundariesRulesMap).optional(),
})

export type TurboConfig = z.infer<typeof TurboConfig>
export const TurboConfig = z.object({
	$schema: z.string().optional(),
	boundaries: BoundariesConfig.optional(),
	cacheDir: z.string().optional(),
	concurrency: z.string().optional(),
	daemon: z.boolean().optional(),
	dangerouslyDisablePackageManagerCheck: z.boolean().optional(),
	envMode: EnvMode.optional(),
	futureFlags: z.record(z.string(), z.any()).optional(),
	globalDependencies: z.array(z.string()).optional(),
	globalEnv: z.array(z.string()).optional(),
	globalPassThroughEnv: z.union([z.array(z.string()), z.null()]).optional(),
	noUpdateNotifier: z.boolean().optional(),
	remoteCache: RemoteCache.optional(),
	tasks: z.record(z.string(), Pipeline),
	ui: TurboUI.optional(),
	extends: z.array(z.string()).optional(),
	tags: z.array(z.string()).optional(),
})
