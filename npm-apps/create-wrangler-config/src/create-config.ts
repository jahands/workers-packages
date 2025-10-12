import 'zx/globals'

import { cliError } from '@jahands/cli-tools/errors'

import { buildWranglerConfig, formatWranglerConfig } from './config-builder.js'
import { hasExistingWranglerConfig, writeWranglerConfig } from './fs.js'
import { detectPackageManager, hasWranglerDependency, installWrangler } from './package-manager.js'
import {
	promptAssetsDirectory,
	promptEntryPoint,
	promptFeatureSelection,
	promptWorkerName,
} from './prompts.js'

import type { WorkerConfigOptions } from './config-builder.js'

export interface CreateWranglerConfigOptions {
	assetsDirectory?: string
}

/**
 * Main function to create a Wrangler configuration
 */
export async function createWranglerConfig(options: CreateWranglerConfigOptions): Promise<void> {
	// Step 1: Check for existing configuration files
	if (hasExistingWranglerConfig()) {
		throw cliError(
			'Wrangler configuration already exists. This tool only creates new configuration files.'
		)
	}

	// Step 2: Interactive configuration prompts
	echo('') // Empty line for spacing

	const workerName = await promptWorkerName()
	const selectedFeatures = await promptFeatureSelection(options.assetsDirectory)

	// Step 3: Feature-specific configuration
	const configOptions: WorkerConfigOptions = {
		name: workerName,
		features: selectedFeatures,
	}

	if (selectedFeatures.includes('entryPoint')) {
		configOptions.entryPoint = await promptEntryPoint()
	}

	if (selectedFeatures.includes('staticAssets')) {
		configOptions.assetsDirectory = await promptAssetsDirectory(options.assetsDirectory)
	}

	// Step 4: Generate and write configuration
	echo('') // Empty line for spacing
	echo(chalk.blue('Generating wrangler.jsonc configuration...'))

	const config = buildWranglerConfig(configOptions)
	const configContent = formatWranglerConfig(config)

	await writeWranglerConfig(configContent)

	// Step 5: Package manager detection and wrangler installation
	const packageManager = await detectPackageManager()
	echo(chalk.dim(`Detected package manager: ${packageManager}`))

	if (fs.existsSync('package.json') && !hasWranglerDependency()) {
		echo(chalk.dim('Installing wrangler as a dev dependency...'))
		await installWrangler(packageManager)
	}

	// Step 6: Success output
	echo(chalk.green('✅ Created wrangler.jsonc successfully!'))
	echo('')
	echo(chalk.bold('Next steps:'))
	echo('1. Implement your Worker code')
	echo('2. Develop locally: npx wrangler dev')
	echo('3. Deploy: npx wrangler deploy')
	echo('')
	echo(chalk.dim('Documentation: https://developers.cloudflare.com/workers/'))
}
