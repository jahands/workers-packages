import 'zx/globals'

import { z } from 'zod/v4'

/**
 * Supported package managers
 */
export type PackageManager = z.infer<typeof PackageManager>
export const PackageManager = z.enum(['bun', 'pnpm', 'yarn', 'npm'])

/**
 * Package.json structure for dependency checking
 */
export type PackageJson = z.infer<typeof PackageJson>
export const PackageJson = z.object({
	name: z.string().optional(),
	dependencies: z.record(z.string(), z.string()).optional(),
	devDependencies: z.record(z.string(), z.string()).optional(),
})

/**
 * Detect the package manager based on lock files
 * @returns the detected package manager
 */
export async function detectPackageManager(): Promise<PackageManager> {
	// Check for lock files in order of preference
	if (fs.existsSync('bun.lockb') || fs.existsSync('bun.lock')) {
		return 'bun'
	}
	if (fs.existsSync('pnpm-lock.yaml')) {
		return 'pnpm'
	}
	if (fs.existsSync('yarn.lock')) {
		return 'yarn'
	}
	if (fs.existsSync('package-lock.json')) {
		return 'npm'
	}

	// Default to npm if no lock file found
	return 'npm'
}

/**
 * Check if wrangler is installed as a dependency
 * @returns true if wrangler is found in dependencies or devDependencies
 */
export function hasWranglerDependency(): boolean {
	if (!fs.existsSync('package.json')) {
		return false
	}

	try {
		const content = fs.readFileSync('package.json', 'utf8')
		const pkg = PackageJson.parse(JSON.parse(content))

		const deps = pkg.dependencies || {}
		const devDeps = pkg.devDependencies || {}

		return 'wrangler' in deps || 'wrangler' in devDeps
	} catch {
		return false
	}
}

/**
 * Install wrangler as a dev dependency using the detected package manager
 * @param packageManager - The package manager to use
 */
export async function installWrangler(packageManager: PackageManager): Promise<void> {
	const commands = {
		bun: ['bun', 'add', '--dev', 'wrangler'],
		pnpm: ['pnpm', 'add', '--save-dev', 'wrangler'],
		yarn: ['yarn', 'add', '--dev', 'wrangler'],
		npm: ['npm', 'install', '--save-dev', 'wrangler'],
	}

	const command = commands[packageManager]
	await $`${command}`.quiet()

	echo(chalk.green('✅ Wrangler installed successfully!'))
}
