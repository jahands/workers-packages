/**
 * Example usage of the runDaggerCommand abstraction
 *
 * This example shows a realistic configuration for a project that uses Dagger
 * with 1Password integration for secret management.
 *
 * Import pattern:
 * - Main DaggerEnv functionality: import { createDaggerEnv } from 'dagger-env'
 * - Command runner functionality: import { createDaggerCommandRunner } from 'dagger-env/run'
 */

import { createDaggerEnv } from 'dagger-env'
import { createDaggerCommandRunner } from 'dagger-env/run'
import { z } from 'zod/v4'

// Create a DaggerEnv instance with your project's specific configuration
const daggerEnv = createDaggerEnv({
	args: z.object({
		environment: z.enum(['dev', 'staging', 'prod']).optional(),
		push: z.boolean().optional(),
		verbose: z.boolean().optional(),
	}),
	env: z.object({
		// CI environment variables
		CI: z.string().optional(),
		GITHUB_ACTIONS: z.string().optional(),
		GITHUB_SHA: z.string().optional(),
		// Project-specific environment variables
		NODE_ENV: z.string().optional(),
		LOG_LEVEL: z.string().optional(),
	}),
	secrets: z.object({
		// API credentials
		API_TOKEN: z.string(),
		API_SECRET: z.string(),
		// Database connection
		DATABASE_URL: z.string(),
		// External service keys
		AWS_ACCESS_KEY_ID: z.string(),
		AWS_SECRET_ACCESS_KEY: z.string(),
		SENTRY_DSN: z.string().optional(),
	}),
	secretPresets: {
		api: ['API_TOKEN', 'API_SECRET'],
		database: ['DATABASE_URL'],
		aws: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
		all: [
			'API_TOKEN',
			'API_SECRET',
			'DATABASE_URL',
			'AWS_ACCESS_KEY_ID',
			'AWS_SECRET_ACCESS_KEY',
			'SENTRY_DSN',
		],
	} as const,
	derivedEnvVars: {} as const,
})

// Create the command runner with 1Password configuration
export const runDaggerCommand = createDaggerCommandRunner({
	// 1Password configuration
	opVault: 'your-vault-id', // Replace with your actual vault ID
	opItem: 'your-item-id', // Replace with your actual item ID
	opSections: [
		{
			id: 'shared-section-id',
			label: 'Shared',
		},
		{
			id: 'production-section-id',
			label: 'Production',
		},
	],
	// Commands that need Docker socket access
	dockerCommands: ['build', 'test', 'deploy', 'migrate', 'seed'],
	// Optional: Run setup before executing commands
	beforeCommand: async () => {
		// Example: Set up vendor files, download dependencies, etc.
		console.log('Preparing Dagger environment...')
		// const modules = await getDaggerModules()
		// await setupDaggerVendorFiles(modules)
	},
	// Pass the DaggerEnv instance directly
	daggerEnv,
})
