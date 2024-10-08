import { createHash } from 'node:crypto'
import memoizeOne from 'memoize-one'
import { z } from 'zod'

export const getRepoRoot = memoizeOne(async () =>
	z
		.string()
		.trim()
		.startsWith('/')
		.parse(await $`git rev-parse --show-toplevel`.text())
)

export async function getMD5OfDir(dir: string): Promise<string> {
	const files = await fs
		.readdir(dir, { recursive: true, withFileTypes: true })
		.then((fs) => fs.filter((f) => f.isFile()))

	files.sort((a, b) => `${a.path}${a.name}`.localeCompare(`${b.path}${b.name}`))
	const hash = createHash('md5')
	for (const file of files.map((f) => `${f.path}/${f.name}`)) {
		hash.update((await fs.readFile(file)).toString())
	}
	return hash.digest('hex')
}

export async function getMD5OfFile(path: string): Promise<string> {
	const file = (await fs.readFile(path)).toString()
	return getMD5OfString(file)
}

export async function getMD5OfString(str: string): Promise<string> {
	return createHash('md5').update(str).digest('hex')
}

export async function cmdExists(cmd: string): Promise<boolean> {
	try {
		await $`command -v ${cmd}`
		return true
	} catch {
		return false
	}
}
