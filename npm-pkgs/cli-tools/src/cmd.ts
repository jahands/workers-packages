import { which } from 'zx'

/**
 * Returns boolean indicating if a command exists (via `which` command).
 */
export async function cmdExists(cmd: string): Promise<boolean> {
	const cmdPath = await which(cmd, { nothrow: true })
	return cmdPath !== null
}
