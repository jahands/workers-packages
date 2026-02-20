import path from 'node:path'
import { describe, expect } from 'vitest'

import { testSuite } from './test/suite.js'
import { getTurboSchemaUrl } from './turbo.js'

const { it } = testSuite()

describe('getTurboSchemaUrl()', () => {
	const defaultSchemaUrl = 'https://turborepo.dev/schema.json'

	it('returns a versioned schema URL from devDependencies.turbo', async ({ h }) => {
		const tmp = await h.tree({
			'package.json': { devDependencies: { turbo: '1.2.3' } },
		})
		const packageJsonPath = path.join(tmp, 'package.json')

		await expect(getTurboSchemaUrl(packageJsonPath)).resolves.toBe(
			'https://v1-2-3.turborepo.dev/schema.json'
		)
	})

	it('uses dependencies.turbo when devDependencies.turbo is missing', async ({ h }) => {
		const tmp = await h.tree({
			'package.json': { dependencies: { turbo: '2.3.4' } },
		})
		const packageJsonPath = path.join(tmp, 'package.json')

		await expect(getTurboSchemaUrl(packageJsonPath)).resolves.toBe(
			'https://v2-3-4.turborepo.dev/schema.json'
		)
	})

	it('prefers devDependencies.turbo over dependencies.turbo', async ({ h }) => {
		const tmp = await h.tree({
			'package.json': {
				dependencies: { turbo: '9.9.9' },
				devDependencies: { turbo: '1.2.3' },
			},
		})
		const packageJsonPath = path.join(tmp, 'package.json')

		await expect(getTurboSchemaUrl(packageJsonPath)).resolves.toBe(
			'https://v1-2-3.turborepo.dev/schema.json'
		)
	})

	it('normalizes version prefixes and whitespace', async ({ h }) => {
		const tmp = await h.tree({
			'package.json': {
				devDependencies: { turbo: ' ^v1.2.3   || 2.0.0' },
			},
		})
		const packageJsonPath = path.join(tmp, 'package.json')

		await expect(getTurboSchemaUrl(packageJsonPath)).resolves.toBe(
			'https://v1-2-3.turborepo.dev/schema.json'
		)
	})

	it('returns the default schema URL for invalid turbo versions', async ({ h }) => {
		const tmp = await h.tree({
			'package.json': { devDependencies: { turbo: 'workspace:*' } },
		})
		const packageJsonPath = path.join(tmp, 'package.json')

		await expect(getTurboSchemaUrl(packageJsonPath)).resolves.toBe(defaultSchemaUrl)
	})

	it('returns the default schema URL when package.json cannot be read or parsed', async ({ h }) => {
		const tmp = await h.tree({
			'invalid-package.json': '{ invalid json',
		})
		const missingPackageJsonPath = path.join(tmp, 'does-not-exist', 'package.json')
		const invalidPackageJsonPath = path.join(tmp, 'invalid-package.json')

		await expect(getTurboSchemaUrl(missingPackageJsonPath)).resolves.toBe(defaultSchemaUrl)
		await expect(getTurboSchemaUrl(invalidPackageJsonPath)).resolves.toBe(defaultSchemaUrl)
	})

	it('resolves package.json from getRepoRoot when packageJsonPath is omitted', async ({ h }) => {
		const tmp = await h.tree({
			'repo/pnpm-lock.yaml': '',
			'repo/package.json': { devDependencies: { turbo: '3.4.5' } },
			'repo/apps/web/': null,
		})
		const repoRoot = path.join(tmp, 'repo')
		const cwd = path.join(repoRoot, 'apps/web')

		await h.withCwd(cwd, async () => {
			await expect(getTurboSchemaUrl()).resolves.toBe('https://v3-4-5.turborepo.dev/schema.json')
		})
	})
})
