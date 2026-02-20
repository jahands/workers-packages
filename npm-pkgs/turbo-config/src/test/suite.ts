import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'vitest'

type TreeValue = string | Uint8Array | Record<string, unknown> | null

export function testSuite(): TestSuite {
	return new TestSuite()
}

class TestSuite {
	get test() {
		return test.extend<{ h: TestHarness }>({
			h: async ({ task: _task }, use) => {
				const harness = new TestHarness()
				try {
					await use(harness)
				} finally {
					await harness.cleanup()
				}
			},
		})
	}

	get it() {
		return this.test
	}
}

class TestHarness {
	private readonly tempDirs = new Set<string>()
	private readonly tempDirPrefix = 'turbo-config-test-'

	async tempDir(): Promise<string> {
		const dir = await mkdtemp(path.join(tmpdir(), this.tempDirPrefix))
		this.tempDirs.add(dir)
		return dir
	}

	async tree(entries: Record<string, TreeValue>): Promise<string> {
		const root = await this.tempDir()

		for (const [relPath, value] of Object.entries(entries)) {
			if (path.isAbsolute(relPath)) {
				throw new Error(`tree() paths must be relative, got: ${relPath}`)
			}

			const targetPath = path.join(root, relPath)

			if (relPath.endsWith('/') || value === null) {
				await mkdir(targetPath, { recursive: true })
				continue
			}

			await mkdir(path.dirname(targetPath), { recursive: true })

			if (typeof value === 'string' || value instanceof Uint8Array) {
				await writeFile(targetPath, value)
				continue
			}

			await writeFile(targetPath, JSON.stringify(value), 'utf8')
		}

		return root
	}

	async withCwd<T>(cwd: string, fn: () => Promise<T>): Promise<T> {
		const previousCwd = process.cwd()
		process.chdir(cwd)
		try {
			return await fn()
		} finally {
			process.chdir(previousCwd)
		}
	}

	async cleanup(): Promise<void> {
		const dirs = [...this.tempDirs]
		this.tempDirs.clear()
		await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })))
	}
}
