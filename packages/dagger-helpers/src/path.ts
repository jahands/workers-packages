import path from 'node:path'
import { up } from 'empathic/find'

export function getRepoRoot(cwd?: string): string {
	cwd = cwd ?? process.cwd()

	const lockfile = up('pnpm-lock.yaml', { cwd })
	if (!lockfile) {
		throw new Error('could not determine repo root path: unable to find pnpm-lock.yaml')
	}

	return path.dirname(lockfile)
}

/**
 * Get the path to the dagger module.
 *
 * Requires `pnpm-lock.yaml` to exist in the repo root.
 *
 * @param cwd - The current working directory. **Default:** `process.cwd()`
 *
 * @returns The path to the dagger module relative to the repo root
 */
export function getModulePath(cwd?: string): string {
	cwd = cwd ?? process.cwd()

	const lockfile = up('pnpm-lock.yaml', { cwd })
	if (!lockfile) {
		throw new Error('could not determine repo root path: unable to find pnpm-lock.yaml')
	}
	const repoRoot = path.dirname(lockfile)

	const daggerJson = up('dagger.json', { cwd, last: repoRoot })
	if (!daggerJson) {
		throw new Error('could not determine dagger.json path: unable to find dagger.json')
	}

	return path.relative(repoRoot, path.dirname(daggerJson))
}
