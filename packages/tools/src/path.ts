import memoizeOne from 'memoize-one'
import pQueue from 'p-queue'
import { z } from 'zod'

import { cliError } from './errors'

export const getRepoRoot = memoizeOne(async () =>
	z
		.string()
		.trim()
		.startsWith('/')
		.parse(await $`git rev-parse --show-toplevel`.text())
)

export async function getMD5OfDir(dir: string): Promise<string> {
	const files = await fs.readdir(dir, { recursive: true, withFileTypes: true })
	const hashes: string[] = []
	const queue = new pQueue({ concurrency: 100 })
	for (const file of files.filter((f) => f.isFile()).map((f) => `${f.path}/${f.name}`)) {
		queue.add(async () => {
			const filePath = `${file}`
			const md5 = await getMD5OfFile(filePath)
			hashes.push(md5)
		})
	}
	await queue.onIdle()
	return getMD5OfString(hashes.join(''))
}

export async function getMD5OfFile(path: string): Promise<string> {
	const file = (await fs.readFile(path)).toString()
	return getMD5OfString(file)
}

export async function getMD5OfString(str: string): Promise<string> {
	const md5Cmd = (await cmdExists('md5')) ? 'md5' : 'md5sum'
	if (!(await cmdExists(md5Cmd))) {
		throw cliError(`md5 or md5sum is required but neither are available`)
	}

	if (md5Cmd === 'md5') {
		return (await $({ stdio: 'pipe', input: str })`md5 -q`.text()).trim() // MacOS
	} else {
		return (await $({ stdio: 'pipe', input: str })`${md5Cmd} | cut -d' ' -f1`.text()).trim() // Linux
	}
}

export async function cmdExists(cmd: string): Promise<boolean> {
	try {
		await $`command -v ${cmd}`
		return true
	} catch {
		return false
	}
}
