import { fs } from 'zx'

// ============================= //
// === Copied from cli-tools === //
// ============================= //

/**
 * Checks if an error (usually from fs) is a not found error
 */
export function isNotFoundError(err: unknown): boolean {
	return err instanceof Error && 'code' in err && err.code === 'ENOENT'
}

export async function dirExists(path: string): Promise<boolean> {
	try {
		const stat = await fs.lstat(path)
		return stat.isDirectory()
	} catch (e) {
		if (isNotFoundError(e)) {
			return false
		} else {
			throw e
		}
	}
}

export function dirExistsSync(path: string): boolean {
	try {
		const stat = fs.lstatSync(path)
		return stat.isDirectory()
	} catch (e) {
		if (isNotFoundError(e)) {
			return false
		} else {
			throw e
		}
	}
}
