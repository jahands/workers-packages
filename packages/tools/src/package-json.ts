import { z } from 'zod/v4'

/**
 * Read package.json in the current directory
 */
export async function getPackageJson(): Promise<PackageJson> {
	return PackageJson.parse(await Bun.file('./package.json').json())
}

/**
 * Some packages include sourcemaps in their assets that
 * should be removed before deploy (e.g. orange-js)
 */
export async function shouldRemoveSourcemapsBeforeDeploy(): Promise<boolean> {
	return (await Promise.all([isOrangeJsProject()])).some((v) => v === true)
}

/**
 * Check if package.json includes orange-js framework
 */
export async function isOrangeJsProject(): Promise<boolean> {
	const pkgJson = await getPackageJson()
	return (
		pkgJson.dependencies?.['@orange-js/orange'] !== undefined ||
		pkgJson.devDependencies?.['@orange-js/orange'] !== undefined
	)
}

export type DeployType = z.infer<typeof DeployType>
export const DeployType = z.enum(['wrangler', 'alchemy'])

export function getDeployTypeFromPackageJson(pkgJson: PackageJson): DeployType {
	const deployScript = pkgJson.scripts?.['deploy:wrangler']
	const usesAlchemy = deployScript?.includes('runx alchemy deploy')
	return usesAlchemy ? 'alchemy' : 'wrangler'
}

export async function getDeployType(): Promise<DeployType> {
	const pkgJson = await getPackageJson()
	return getDeployTypeFromPackageJson(pkgJson)
}

export type PackageJson = z.infer<typeof PackageJson>
export const PackageJson = z
	.object({
		name: z.string(),
		version: z.string().optional(),
		main: z.string().optional(),
		private: z.boolean().optional(),
		sideEffects: z.boolean().optional(),
		type: z.enum(['module', 'commonjs']).optional(),
		scripts: z.record(z.string(), z.string()).optional(),
		dependencies: z.record(z.string(), z.string()).optional(),
		devDependencies: z.record(z.string(), z.string()).optional(),
		packageManager: z.string().optional(),
		publishConfig: z
			.object({
				registry: z.string().optional(),
			})
			.optional(),
	})
	.loose()
