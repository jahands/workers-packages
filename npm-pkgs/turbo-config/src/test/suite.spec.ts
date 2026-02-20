import { access, readFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect } from 'vitest'

import { testSuite } from './suite.js'

const { it, test } = testSuite()

describe('testSuite()', () => {
	it('provides the harness fixture', ({ h }) => {
		expect(h).toBeDefined()
	})

	test('also works via test()', ({ h }) => {
		expect(h).toBeDefined()
	})

	it('does not require consuming the harness fixture', () => {
		expect(1).toBe(1)
	})
})

describe('TestHarness', () => {
	it('creates a temp directory', async ({ h }) => {
		const dir = await h.tempDir()
		await expect(access(dir)).resolves.toBeUndefined()
	})

	it('creates tree fixtures for files, json, and directories', async ({ h }) => {
		const root = await h.tree({
			'repo/pnpm-lock.yaml': '',
			'repo/package.json': { name: 'fixture' },
			'repo/apps/web/': null,
		})

		await expect(access(path.join(root, 'repo/pnpm-lock.yaml'))).resolves.toBeUndefined()
		await expect(access(path.join(root, 'repo/apps/web'))).resolves.toBeUndefined()

		const packageJson = await readFile(path.join(root, 'repo/package.json'), 'utf8')
		expect(JSON.parse(packageJson)).toStrictEqual({ name: 'fixture' })
	})

	it('switches cwd for callback and restores afterward', async ({ h }) => {
		const root = await h.tree({
			'repo/apps/web/': null,
		})
		const targetCwd = path.join(root, 'repo/apps/web')
		const resolvedTargetCwd = await realpath(targetCwd)
		const originalCwd = process.cwd()
		const resolvedOriginalCwd = await realpath(originalCwd)

		await h.withCwd(targetCwd, async () => {
			expect(await realpath(process.cwd())).toBe(resolvedTargetCwd)
		})

		expect(await realpath(process.cwd())).toBe(resolvedOriginalCwd)
	})

	it('rejects absolute tree paths', async ({ h }) => {
		const absolutePath = path.join(process.cwd(), 'absolute-path-not-allowed')
		await expect(h.tree({ [absolutePath]: '' })).rejects.toThrow(
			`tree() paths must be relative, got: ${absolutePath}`
		)
	})
})
