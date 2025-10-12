import { dirExistsSync } from '@jahands/cli-tools/fs'
import pMap from 'p-map'
import { z } from 'zod/v4'

import { getRepoRoot } from './path'

export async function getDaggerModules(): Promise<
	Array<{
		/** module path relative to repo root */
		path: string
		/** fully qualified path to module */
		fullPath: string
		/** entrypoint of the module */
		entrypoint: string
	}>
> {
	const repoRoot = getRepoRoot()
	const moduleJsons = await glob(['**/dagger.json'], {
		dot: true,
		ignore: ['**/node_modules/**', '**/test/**'],
		cwd: repoRoot,
	})

	const modules: string[] = []
	for (const moduleJson of moduleJsons) {
		const source = z.object({ source: z.string() }).parse(await Bun.file(moduleJson).json()).source

		const sourcePath = path.join(path.dirname(moduleJson), source)
		if (!dirExistsSync(sourcePath)) {
			throw new Error(`sourcePath does not exist: ${sourcePath}`)
		}
		modules.push(sourcePath)
	}

	return await pMap(modules, async (modulePath) => {
		const pkgJson = await Bun.file(path.join(modulePath, 'package.json')).json()
		return {
			path: modulePath,
			fullPath: path.resolve(modulePath),
			entrypoint: z.string().endsWith('.dagger.ts').parse(pkgJson.main),
		}
	})
}
