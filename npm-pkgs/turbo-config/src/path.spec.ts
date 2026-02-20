import path from 'node:path'
import { afterEach, assert, describe, expect, vi } from 'vitest'

import { getRepoRoot, RepoRootNotFoundError } from './path.js'
import { testSuite } from './test/suite.js'

const { it } = testSuite()

afterEach(() => {
	vi.restoreAllMocks()
	vi.doUnmock('empathic/find')
	vi.resetModules()
})

describe('getRepoRoot()', () => {
	it('returns the directory containing a found lockfile', async ({ h }) => {
		const tmp = await h.tree({
			'repo/pnpm-lock.yaml': '',
			'repo/apps/web/src/': null,
		})
		const repoRoot = path.join(tmp, 'repo')
		const cwd = path.join(repoRoot, 'apps/web/src')

		const repoRootResult = getRepoRoot(cwd)
		assert(repoRootResult.isOk())
		expect(repoRootResult.value).toBe(repoRoot)
	})

	it('uses lockfile type priority over nearest lockfile', async ({ h }) => {
		const tmp = await h.tree({
			'repo/pnpm-lock.yaml': '',
			'repo/workspace/package-lock.json': '',
			'repo/workspace/apps/web/': null,
		})
		const repoRoot = path.join(tmp, 'repo')
		const workspace = path.join(repoRoot, 'workspace')
		const cwd = path.join(workspace, 'apps/web')

		const repoRootResult = getRepoRoot(cwd)
		assert(repoRootResult.isOk())
		expect(repoRootResult.value).toBe(repoRoot)
	})

	it('returns RepoRootNotFoundError when no supported lockfile exists', async ({ h }) => {
		const tmp = await h.tree({
			'project/src/': null,
		})
		const cwd = path.join(tmp, 'project/src')

		const repoRootResult = getRepoRoot(cwd)
		assert(repoRootResult.isErr())
		expect(repoRootResult.error).toBeInstanceOf(RepoRootNotFoundError)
		expect(repoRootResult.error.message).toMatchInlineSnapshot(
			`"could not determine repo root path: unable to find any lockfile (pnpm-lock.yaml, bun.lock, bun.lockb, yarn.lock, package-lock.json, npm-shrinkwrap.json)"`
		)
	})

	it('returns RepoRootLookupError when lockfile lookup throws', async () => {
		vi.doMock('empathic/find', () => ({
			up: () => {
				throw new Error('lookup exploded')
			},
		}))

		const pathModule = await import('./path.js')
		const repoRootResult = pathModule.getRepoRoot('/irrelevant')
		assert(repoRootResult.isErr())
		expect(repoRootResult.error).toBeInstanceOf(pathModule.RepoRootLookupError)
		expect(repoRootResult.error.message).toMatchInlineSnapshot(
			`"could not determine repo root path: lockfile lookup threw an exception"`
		)
	})
})
