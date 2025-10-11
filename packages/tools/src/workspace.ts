import { dirExists } from '@jahands/cli-tools'
import pMap from 'p-map'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod/v4'

import { getDeployTypeFromPackageJson, PackageJson } from './package-json'
import { getRepoRoot } from './path'

import type { DeployType } from './package-json'

export type PnpmWorkspace = z.infer<typeof PnpmWorkspace>
const PnpmWorkspace = z.object({
	packages: z.array(z.string()),
})

async function getPnpmWorkspace(): Promise<PnpmWorkspace> {
	const repoRoot = getRepoRoot()
	const workspaceYamlPath = path.join(repoRoot, 'pnpm-workspace.yaml')
	const workspaceYamlContent = (await fs.readFile(workspaceYamlPath)).toString()
	return PnpmWorkspace.parse(parseYaml(workspaceYamlContent))
}

export type WorkspacePackage = {
	/** name of the package from package.json */
	name: string
	/** package path relative to repo root */
	path: string
	/** absolute path to package */
	fullPath: string
	/** absolute path to package.json */
	pkgJsonPath: string
}

/**
 * Get all workspace packages sorted by path.
 * This is the standard way to get all packages in the workspace.
 *
 * @returns Promise of sorted WorkspacePackage array
 *
 * @example
 * ```typescript
 * const packages = await getWorkspacePackages()
 * for (const pkg of packages) {
 *   console.log(`Package: ${pkg.name} at ${pkg.path}`)
 * }
 * ```
 */
export async function getWorkspacePackages(): Promise<WorkspacePackage[]> {
	const repoRoot = getRepoRoot()
	const pnpmWorkspace = await getPnpmWorkspace()

	const packagePatterns = pnpmWorkspace.packages.map((pattern) => `${pattern}/package.json`)

	const packageJsons = await globProjectFiles(packagePatterns, {
		dot: true,
		ignore: [
			'**/dagger/**',
			'./package.json', // root package.json
		],
	})

	const pkgs = await pMap(packageJsons, async (pkgJsonPath) => {
		const pkgJsonAbsPath = path.resolve(repoRoot, pkgJsonPath)
		const pkgJson = PackageJson.parse(JSON.parse((await fs.readFile(pkgJsonAbsPath)).toString()))

		const dir = path.dirname(pkgJsonPath)

		return {
			name: pkgJson.name,
			path: dir,
			fullPath: path.resolve(repoRoot, dir),
			pkgJsonPath: pkgJsonAbsPath,
		}
	})

	return pkgs.sort((a, b) => a.path.localeCompare(b.path))
}

export async function getWorkspacePackage(name: string): Promise<WorkspacePackage> {
	const pkgs = await getWorkspacePackages()
	const pkg = pkgs.find((p) => p.name === name)

	if (!pkg) {
		throw new Error(`package ${name} not found`)
	}
	return pkg
}

export type WorkersProject = {
	/** package path relative to repo root */
	path: string
	/** absolute path to package */
	fullPath: string
	/** absolute path to wrangler.jsonc */
	wranglerJsoncPath: string
	/** absolute path to package.json */
	pkgJsonPath: string
	deployType: DeployType
}

export async function getWorkersProjects(): Promise<WorkersProject[]> {
	const repoRoot = getRepoRoot()
	const wranglerJsons = await globProjectFiles(['**/wrangler.jsonc', '**/wrangler.json'], {
		dot: true,
		ignore: ['**/dagger/**', 'tools/daggerx/**', 'turbo/**', 'play/**', 'infra/cf-snippets/**'],
	})

	// dedupe by fullPath because alchemy projects may
	// have both wrangler.jsonc and wrangler.json
	const uniqueWranglerJsons = new Map<string, WorkersProject>()

	await pMap(wranglerJsons, async (wranglerJson) => {
		const dir = path.dirname(wranglerJson)
		const pkgJsonPath = path.resolve(repoRoot, dir, 'package.json')

		const pkgJson = PackageJson.parse(JSON.parse((await fs.readFile(pkgJsonPath)).toString()))
		const deployType = getDeployTypeFromPackageJson(pkgJson)

		uniqueWranglerJsons.set(path.resolve(repoRoot, dir), {
			path: dir,
			fullPath: path.resolve(repoRoot, dir),
			wranglerJsoncPath: path.resolve(repoRoot, dir, 'wrangler.jsonc'),
			pkgJsonPath,
			deployType,
		})
	})

	return Array.from(uniqueWranglerJsons.values())
}

export async function getDaggerModules(): Promise<
	Array<{
		/** module path relative to repo root */
		path: string
		/** absolute path to module */
		fullPath: string
	}>
> {
	const moduleJsons = await globProjectFiles(['**/dagger.json'], {
		dot: true,
		ignore: ['play/**'],
	})

	const modules: string[] = []
	for (const moduleJson of moduleJsons) {
		const source = z.object({ source: z.string() }).parse(await Bun.file(moduleJson).json()).source

		const sourcePath = path.join(path.dirname(moduleJson), source)
		if (!(await dirExists(sourcePath))) {
			throw new Error(`sourcePath does not exist: ${sourcePath}`)
		}
		modules.push(sourcePath)
	}

	return modules.map((m) => ({
		path: m,
		fullPath: path.resolve(m),
	}))
}

export async function getAlchemyProjects(): Promise<
	Array<{
		/** module path relative to repo root */
		path: string
		/** absolute path to package */
		fullPath: string
	}>
> {
	const alchemyFiles = await pMap(
		await globProjectFiles(['**/alchemy.run.ts'], {
			ignore: ['**/dagger/**', 'tools/daggerx/**', 'turbo/**', 'play/**'],
		}),
		async (m) => {
			const dir = path.dirname(m)
			const pkgJson = PackageJson.parse(await Bun.file(path.join(dir, 'package.json')).json())
			const deployType = getDeployTypeFromPackageJson(pkgJson)
			return {
				path: m,
				fullPath: path.resolve(dir),
				isAlchemyProject: deployType === 'alchemy',
			}
		}
	)

	return alchemyFiles
		.filter((m) => m.isAlchemyProject)
		.map((m) => ({
			path: m.path,
			fullPath: m.fullPath,
		}))
}

export async function getDaggerModulesWithDockerImage(): Promise<
	Array<{
		path: string
		fullPath: string
	}>
> {
	const daggerModules = await pMap(await getDaggerModules(), async (m) => {
		const daggerPackageJson = PackageJson.parse(
			await Bun.file(path.join(m.fullPath, 'package.json')).json()
		)

		const daggerEntrypoint = daggerPackageJson.main
		if (!daggerEntrypoint) {
			throw new Error(`main is not set in ${m.fullPath}`)
		}

		const daggerTs = await Bun.file(path.join(m.fullPath, daggerEntrypoint)).text()
		const hasDockerImage =
			daggerTs.includes('gitea.uuid.rocks/geobox/') && daggerTs.includes('publish(')

		return {
			path: m.path,
			fullPath: m.fullPath,
			hasDockerImage,
		}
	})

	return daggerModules
		.filter((m) => m.hasDockerImage)
		.map((m) => ({
			path: m.path,
			fullPath: m.fullPath,
		}))
}

export async function getNpmPackages(): Promise<
	Array<{
		path: string
		fullPath: string
	}>
> {
	const workspacePackages = await pMap(await getWorkspacePackages(), async (m) => {
		const pkgJson = PackageJson.parse(await Bun.file(m.pkgJsonPath).json())
		return {
			path: m.path,
			fullPath: m.fullPath,
			isPublished: pkgJson.private !== true,
		}
	})

	return workspacePackages.filter((m) => {
		return m.isPublished
	})
}

/**
 * Glob files in the project, ignoring files that are ignored by git.
 *
 * Note: `cwd` is always set to the repo root.
 *
 * @param patterns - glob patterns to match
 * @param options - glob options
 * @returns non-ignored files
 */
export async function globProjectFiles(
	patterns: string | string[],
	options?: Parameters<typeof glob>[1]
): Promise<string[]> {
	const repoRoot = getRepoRoot()

	const files = await glob(patterns, {
		...options,
		cwd: repoRoot,
		// this doesn't have to be perfect, but the more we ignore, the faster it is.
		// TODO: read this from .gitignore instead of hardcoding it here
		ignore: [
			// wrangler
			'**/.wrangler/**',

			// astro generated types
			'**/.astro/**',

			// dependencies
			'**/node_modules/**',
			'**/.pnpm-store/**',
			'**/.pnp/**',
			'**/.pnp.js/**',

			// testing
			'**/coverage/**',

			// turbo
			'**/.turbo/**',
			'/.turbo/**',

			// vercel
			'**/.vercel/**',

			// build outputs
			'**/.next/**',
			'**/out/**',
			'**/dist/**',
			'**/dist2/**',

			// debug
			'**/tmp/**',

			// git
			'**/.git/**',
			'/.git/**',

			// dagger
			'**/dagger/sdk/**',
			'**/dagger/src/vendor/**',
			'/tools/daggerx/src/vendor/**',

			// python
			'**/.venv/**',
			'**/__pycache__/**',
			'**/.ruff_cache/**',
			'/play/py/*/build/**',
			'/play/py/**/*.egg-info/**',

			// tauri
			'**/src-tauri/gen/schemas/**',
			'**/src-tauri/target/**',

			// tanstack start
			'**/.nitro/**',
			'**/.output/**',
			'**/.tanstack/**',
			...(options?.ignore ?? []),
		],
	})

	// calling git is faster than using gitignore option in glob()
	// because glob() reads all files before applying ignore patterns
	// when gitignore is used.

	const nul = '\x00'
	const res = await $({
		stdio: 'pipe',
		input: files.join(nul),
		nothrow: true,
		cwd: repoRoot,
	})`git check-ignore -z --stdin`.text()

	const ignoredFiles = new Set(res.trim().split(nul).filter(Boolean))

	return files.filter((file) => !ignoredFiles.has(file))
}
