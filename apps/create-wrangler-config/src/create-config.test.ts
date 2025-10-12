import fs from 'node:fs'
import * as pkg from 'empathic/package'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import z from 'zod/v4'

import { buildWranglerConfig, formatWranglerConfig } from './config-builder.js'
import { hasExistingWranglerConfig, writeWranglerConfig } from './fs.js'

describe('create-config integration', () => {
	let tempDir: string
	let originalCwd: string

	beforeEach(async () => {
		originalCwd = process.cwd()
		tempDir = z
			.string()
			.min(1, { error: 'Failed to create temp directory' })
			.parse(pkg.cache(`create-config-test/run-${Date.now()}`, { create: true }))
		process.chdir(tempDir)
	})

	afterEach(async () => {
		process.chdir(originalCwd)
		await fs.promises.rm(tempDir, { recursive: true, force: true })
	})

	describe('hasExistingWranglerConfig', () => {
		it('should return false when no config files exist', () => {
			expect(hasExistingWranglerConfig()).toBe(false)
		})

		it('should return true when wrangler.jsonc exists', () => {
			fs.writeFileSync('wrangler.jsonc', '{}')
			expect(hasExistingWranglerConfig()).toBe(true)
		})

		it('should return true when wrangler.json exists', () => {
			fs.writeFileSync('wrangler.json', '{}')
			expect(hasExistingWranglerConfig()).toBe(true)
		})

		it('should return true when wrangler.toml exists', () => {
			fs.writeFileSync('wrangler.toml', '')
			expect(hasExistingWranglerConfig()).toBe(true)
		})
	})

	describe('writeWranglerConfig', () => {
		it('should write wrangler.jsonc file', async () => {
			const config = {
				name: 'test-worker',
				compatibility_date: '2024-01-15',
				main: 'src/index.ts',
				observability: { enabled: true },
			}

			const content = formatWranglerConfig(config)
			await writeWranglerConfig(content)

			expect(fs.existsSync('wrangler.jsonc')).toBe(true)
			const written = fs.readFileSync('wrangler.jsonc', 'utf8')
			expect(written).toContain('"name": "test-worker"')
			expect(written).toContain('"main": "src/index.ts"')
		})
	})

	describe('end-to-end config generation', () => {
		it('should generate config with entry point only', () => {
			const options = {
				name: 'my-worker',
				features: ['entryPoint' as const],
				entryPoint: 'src/index.ts',
			}

			const config = buildWranglerConfig(options)
			const formatted = formatWranglerConfig(config)

			expect(formatted).toContain('"name": "my-worker"')
			expect(formatted).toContain('"main": "src/index.ts"')
			expect(formatted).toContain('"observability"')
			expect(formatted).toContain('"enabled": true')
			expect(formatted).not.toContain('"assets"')
		})

		it('should generate config with static assets only', () => {
			const options = {
				name: 'my-worker',
				features: ['staticAssets' as const],
				assetsDirectory: './public',
			}

			const config = buildWranglerConfig(options)
			const formatted = formatWranglerConfig(config)

			expect(formatted).toContain('"name": "my-worker"')
			expect(formatted).toContain('"assets"')
			expect(formatted).toContain('"directory": "./public"')
			expect(formatted).not.toContain('"main"')
			expect(formatted).not.toContain('"binding"')
		})

		it('should generate config with both features', () => {
			const options = {
				name: 'my-worker',
				features: ['entryPoint' as const, 'staticAssets' as const],
				entryPoint: 'src/index.ts',
				assetsDirectory: './public',
			}

			const config = buildWranglerConfig(options)
			const formatted = formatWranglerConfig(config)

			expect(formatted).toContain('"name": "my-worker"')
			expect(formatted).toContain('"main": "src/index.ts"')
			expect(formatted).toContain('"observability"')
			expect(formatted).toContain('"assets"')
			expect(formatted).toContain('"directory": "./public"')
			expect(formatted).toContain('"binding": "ASSETS"')
		})
	})
})
