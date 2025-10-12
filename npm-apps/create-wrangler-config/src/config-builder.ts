import { z } from 'zod/v4'

/**
 * Worker name validation schema
 */
export type WorkerName = z.infer<typeof WorkerName>
export const WorkerName = z
	.string()
	.min(1, 'Worker name cannot be empty')
	.max(54, 'Worker name cannot exceed 54 characters')
	.regex(/^[a-z0-9-]+$/, 'Worker name can only contain lowercase letters, numbers, and hyphens')
	.regex(/^[a-z0-9].*[a-z0-9]$|^[a-z0-9]$/, 'Worker name cannot start or end with a hyphen')

/**
 * Features that can be configured for a Worker
 */
export type WorkerFeature = z.infer<typeof WorkerFeature>
export const WorkerFeature = z.enum(['entryPoint', 'staticAssets'])

/**
 * Configuration options for creating a Worker config
 */
export type WorkerConfigOptions = z.infer<typeof WorkerConfigOptions>
export const WorkerConfigOptions = z.object({
	name: WorkerName,
	features: z.array(WorkerFeature).min(1, 'At least one feature must be selected'),
	entryPoint: z.string().optional(),
	assetsDirectory: z.string().optional(),
})

/**
 * Wrangler configuration structure
 */
export type WranglerConfig = z.infer<typeof WranglerConfig>
export const WranglerConfig = z.object({
	name: z.string(),
	main: z.string().optional(),
	compatibility_date: z.string(),
	observability: z
		.object({
			enabled: z.boolean(),
		})
		.optional(),
	assets: z
		.object({
			directory: z.string(),
			binding: z.string().optional(),
		})
		.optional(),
})

/**
 * Generate today's date in YYYY-MM-DD format for compatibility_date
 */
function getTodaysDate(): string {
	return new Date().toISOString().split('T')[0]!
}

/**
 * Build a Wrangler configuration based on the provided options
 * @param options - The configuration options
 * @returns the generated Wrangler configuration
 */
export function buildWranglerConfig(options: WorkerConfigOptions): WranglerConfig {
	const validated = WorkerConfigOptions.parse(options)

	const config: WranglerConfig = {
		name: validated.name,
		compatibility_date: getTodaysDate(),
	}

	const hasEntryPoint = validated.features.includes('entryPoint')
	const hasStaticAssets = validated.features.includes('staticAssets')

	// Add entry point configuration
	if (hasEntryPoint && validated.entryPoint) {
		config.main = validated.entryPoint
		config.observability = { enabled: true }
	}

	// Add static assets configuration
	if (hasStaticAssets && validated.assetsDirectory) {
		config.assets = {
			directory: validated.assetsDirectory,
		}

		// Add binding if both entry point and static assets are configured
		if (hasEntryPoint) {
			config.assets.binding = 'ASSETS'
		}
	}

	return WranglerConfig.parse(config)
}

/**
 * Convert a Wrangler configuration to JSONC format
 * @param config - The Wrangler configuration
 * @returns formatted JSONC string
 */
export function formatWranglerConfig(config: WranglerConfig): string {
	// Convert to JSON with proper indentation
	const json = JSON.stringify(config, null, 2)

	// Add trailing commas to make it valid JSONC
	const jsonc = json
		.replace(/^(\s*)"([^"]+)":\s*([^,\n]+)$/gm, '$1"$2": $3,')
		.replace(/,(\s*[}\]])/, '$1') // Remove trailing comma before closing brackets

	return jsonc
}
