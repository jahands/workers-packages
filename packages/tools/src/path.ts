import { createHash } from 'node:crypto'
import * as find from 'empathic/find'
import memoizeOne from 'memoize-one'
import { z } from 'zod'

import { isNotFoundError } from './fs'

export const getRepoRoot = memoizeOne(() => {
	const pnpmLock = z
		.string()
		.trim()
		.startsWith('/')
		.endsWith('/pnpm-lock.yaml')
		.parse(find.up('pnpm-lock.yaml'))
	return path.dirname(pnpmLock)
})

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

export function ignoreNotFound(e: unknown): void {
	if (!isNotFoundError(e)) {
		throw e
	}
}

export async function deleteIfExists(filePath: string | string[]): Promise<void> {
	const filePaths = Array.isArray(filePath) ? filePath : [filePath]
	await Promise.all(filePaths.map((p) => Bun.file(p).delete().catch(ignoreNotFound)))
}
