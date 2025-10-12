import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { getModulePath, getRepoRoot } from './path.js'

const testDir = `${__dirname}/test`
const fixtures = `${testDir}/fixtures`
const repoDir = `${fixtures}/repo`
const moduleDir = `${repoDir}/path/to/module`
const moduleSrcDir = `${moduleDir}/.dagger/src`

afterEach(() => {
	process.chdir(path.resolve(__dirname, '..'))
})

/** convert from absolute path to relative of dagger-helpers package */
function trimPath(p: string): string {
	return p.replace(testDir, '')
}

describe('getRepoRoot()', () => {
	it('returns the directory of the first pnpm-lock.yaml it finds', () => {
		process.chdir(moduleSrcDir)
		expect(trimPath(getRepoRoot())).toBe(`/fixtures/repo`)
	})
})

describe('getModulePath()', () => {
	it('should return path to the dagger module relative to repo root', () => {
		process.chdir(moduleSrcDir)
		const p = getModulePath()
		expect(p).toBe('path/to/module')
	})
})
