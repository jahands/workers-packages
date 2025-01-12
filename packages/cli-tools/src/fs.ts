import { z } from 'zod'

/**
 * Checks if an error (usually from fs) is a not found error
 */
export function isNotFoundError(err: unknown): boolean {
	return z.object({ code: z.literal('ENOENT') }).safeParse(err).success
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