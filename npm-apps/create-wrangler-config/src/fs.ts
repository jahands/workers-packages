import 'zx/globals'

/**
 * Check if any Wrangler configuration files exist in the current directory
 * @returns true if any configuration file exists
 */
export function hasExistingWranglerConfig(): boolean {
	const configFiles = ['wrangler.jsonc', 'wrangler.json', 'wrangler.toml']
	return configFiles.some((file) => fs.existsSync(file))
}

/**
 * Detect common entry point files
 * @returns the detected entry point file or null if none found
 */
export function detectEntryPoint(): string | null {
	const entryPoints = ['src/index.ts', 'index.ts']
	return entryPoints.find((file) => fs.existsSync(file)) || null
}

/**
 * Detect common asset directories
 * @returns array of detected asset directories
 */
export function detectAssetDirectories(): string[] {
	const commonDirs = ['public', 'static', 'assets', 'dist']
	return commonDirs.filter((dir) => fs.existsSync(dir) && fs.statSync(dir).isDirectory())
}

/**
 * Get the default worker name from package.json or directory name
 * @returns sanitized worker name
 */
export function getDefaultWorkerName(): string {
	// Try to get name from package.json
	if (fs.existsSync('package.json')) {
		try {
			const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
			if (pkg.name && typeof pkg.name === 'string') {
				try {
					return sanitizeWorkerName(pkg.name)
				} catch {
					// If package.json name can't be sanitized, fall through to directory name
				}
			}
		} catch {
			// Ignore JSON parse errors
		}
	}

	// Fall back to directory name
	const dirName = path.basename(process.cwd())
	try {
		return sanitizeWorkerName(dirName)
	} catch {
		// If directory name can't be sanitized, use a safe fallback
		return 'my-worker'
	}
}

/**
 * Sanitize a string to be a valid Worker name
 * @param name - The name to sanitize
 * @returns sanitized name (alphanumeric and hyphens only, max 54 characters)
 * @throws Error if sanitization results in an empty name
 */
export function sanitizeWorkerName(name: string): string {
	const sanitized = name
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-') // Replace invalid chars with hyphens
		.replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
		.replace(/^-|-$/g, '') // Remove leading/trailing hyphens
		.slice(0, 54) // Limit to 54 characters

	if (!sanitized) {
		throw new Error(`Cannot sanitize worker name "${name}" - results in empty string`)
	}

	return sanitized
}

/**
 * Write the wrangler.jsonc configuration file
 * @param content - The configuration content as a string
 */
export async function writeWranglerConfig(content: string): Promise<void> {
	await fs.writeFile('wrangler.jsonc', content, 'utf8')
}
