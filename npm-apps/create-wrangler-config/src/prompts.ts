import { checkbox, confirm, input } from '@inquirer/prompts'

import { WorkerName } from './config-builder.js'
import { detectAssetDirectories, detectEntryPoint, getDefaultWorkerName } from './fs.js'

import type { WorkerFeature } from './config-builder.js'

/**
 * Prompt for the Worker name
 * @returns the validated Worker name
 */
export async function promptWorkerName(): Promise<string> {
	const defaultName = getDefaultWorkerName()

	return input({
		message: 'What is your Worker name?',
		default: defaultName,
		validate: (value) => {
			const result = WorkerName.safeParse(value.trim())
			if (result.success) {
				return true
			}
			return result.error.issues[0]?.message || 'Invalid worker name'
		},
	}).then((answer) => answer.trim())
}

/**
 * Prompt for feature selection using checkboxes
 * @param assetsDirectory - Optional assets directory from CLI argument
 * @returns array of selected features
 */
export async function promptFeatureSelection(assetsDirectory?: string): Promise<WorkerFeature[]> {
	// Auto-detect features
	const hasEntryPoint = detectEntryPoint() !== null
	const detectedAssetDirs = detectAssetDirectories()
	const hasAssets = assetsDirectory !== undefined || detectedAssetDirs.length > 0

	// If neither detected, default to entry point
	const defaultEntryPoint = hasEntryPoint || !hasAssets

	const features = await checkbox({
		message: 'Which features do you want to configure for your Worker? (Select at least one)',
		choices: [
			{
				name: 'Entry Point (Worker code execution)',
				value: 'entryPoint' as const,
				checked: defaultEntryPoint,
			},
			{
				name: 'Static Assets (Serve static files)',
				value: 'staticAssets' as const,
				checked: hasAssets,
			},
		],
		validate: (choices) => {
			if (choices.length === 0) {
				return 'You must select at least one feature (Entry Point or Static Assets)'
			}
			return true
		},
	})

	return features
}

/**
 * Prompt for entry point file path
 * @returns the entry point file path
 */
export async function promptEntryPoint(): Promise<string> {
	const detected = detectEntryPoint()
	const defaultValue = detected || 'src/index.ts'

	return input({
		message: 'What is your main entry file?',
		default: defaultValue,
		validate: (value) => {
			const trimmed = value.trim()
			if (trimmed === '') {
				return 'Entry point cannot be empty'
			}
			return true
		},
	}).then((answer) => answer.trim())
}

/**
 * Prompt for static assets directory
 * @param assetsDirectory - Optional assets directory from CLI argument
 * @returns the assets directory path
 */
export async function promptAssetsDirectory(assetsDirectory?: string): Promise<string> {
	// If provided via CLI argument, use it
	if (assetsDirectory) {
		return assetsDirectory
	}

	// Check for auto-detected directories
	const detectedDirs = detectAssetDirectories()

	if (detectedDirs.length === 1) {
		// If only one detected, confirm with user
		const useDetected = await confirm({
			message: `Serve static assets from ${detectedDirs[0]}?`,
			default: true,
		})

		if (useDetected) {
			return `./${detectedDirs[0]}`
		}
	}

	// Prompt for directory path
	return input({
		message: 'Static assets directory path:',
		default: detectedDirs.length > 0 ? `./${detectedDirs[0]}` : './public',
		validate: (value) => {
			const trimmed = value.trim()
			if (trimmed === '') {
				return 'Assets directory cannot be empty'
			}
			return true
		},
	}).then((answer) => answer.trim())
}
