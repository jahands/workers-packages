import { describe, expect, it } from 'vitest'

import { buildWranglerConfig, formatWranglerConfig, WorkerName } from './config-builder.js'

import type { WorkerConfigOptions } from './config-builder.js'

describe('config-builder', () => {
	describe('WorkerName schema', () => {
		it('should validate valid worker names', () => {
			expect(WorkerName.parse('my-worker')).toBe('my-worker')
			expect(WorkerName.parse('worker123')).toBe('worker123')
			expect(WorkerName.parse('test-worker-app')).toBe('test-worker-app')
			expect(WorkerName.parse('a')).toBe('a') // Single character
		})

		it('should reject names with invalid characters', () => {
			expect(() => WorkerName.parse('my_worker')).toThrow()
			expect(() => WorkerName.parse('my worker')).toThrow()
			expect(() => WorkerName.parse('my@worker')).toThrow()
			expect(() => WorkerName.parse('MyWorker')).toThrow() // Uppercase
		})

		it('should reject names starting or ending with hyphens', () => {
			expect(() => WorkerName.parse('-my-worker')).toThrow(
				'Worker name cannot start or end with a hyphen'
			)
			expect(() => WorkerName.parse('my-worker-')).toThrow(
				'Worker name cannot start or end with a hyphen'
			)
			expect(() => WorkerName.parse('-my-worker-')).toThrow(
				'Worker name cannot start or end with a hyphen'
			)
		})

		it('should reject empty names', () => {
			expect(() => WorkerName.parse('')).toThrow('Worker name cannot be empty')
		})

		it('should reject names that are too long', () => {
			const longName = 'a'.repeat(55)
			expect(() => WorkerName.parse(longName)).toThrow('Worker name cannot exceed 54 characters')
		})
	})

	describe('buildWranglerConfig', () => {
		it('should build config with entry point only', () => {
			const options: WorkerConfigOptions = {
				name: 'test-worker',
				features: ['entryPoint'],
				entryPoint: 'src/index.ts',
			}

			const config = buildWranglerConfig(options)

			expect(config.name).toBe('test-worker')
			expect(config.main).toBe('src/index.ts')
			expect(config.observability).toEqual({ enabled: true })
			expect(config.assets).toBeUndefined()
			expect(config.compatibility_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
		})

		it('should build config with static assets only', () => {
			const options: WorkerConfigOptions = {
				name: 'test-worker',
				features: ['staticAssets'],
				assetsDirectory: './public',
			}

			const config = buildWranglerConfig(options)

			expect(config.name).toBe('test-worker')
			expect(config.main).toBeUndefined()
			expect(config.observability).toBeUndefined()
			expect(config.assets).toEqual({ directory: './public' })
			expect(config.compatibility_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
		})

		it('should build config with both entry point and static assets', () => {
			const options: WorkerConfigOptions = {
				name: 'test-worker',
				features: ['entryPoint', 'staticAssets'],
				entryPoint: 'src/index.ts',
				assetsDirectory: './public',
			}

			const config = buildWranglerConfig(options)

			expect(config.name).toBe('test-worker')
			expect(config.main).toBe('src/index.ts')
			expect(config.observability).toEqual({ enabled: true })
			expect(config.assets).toEqual({
				directory: './public',
				binding: 'ASSETS',
			})
			expect(config.compatibility_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
		})

		it('should validate worker name', () => {
			const options: WorkerConfigOptions = {
				name: 'invalid name with spaces',
				features: ['entryPoint'],
				entryPoint: 'src/index.ts',
			}

			expect(() => buildWranglerConfig(options)).toThrow()
		})

		it('should require at least one feature', () => {
			const options: WorkerConfigOptions = {
				name: 'test-worker',
				features: [],
			}

			expect(() => buildWranglerConfig(options)).toThrow()
		})
	})

	describe('formatWranglerConfig', () => {
		it('should format config as valid JSONC', () => {
			const config = {
				name: 'test-worker',
				main: 'src/index.ts',
				compatibility_date: '2024-01-15',
				observability: { enabled: true },
			}

			const formatted = formatWranglerConfig(config)

			expect(formatted).toContain('"name": "test-worker",')
			expect(formatted).toContain('"main": "src/index.ts",')
			expect(formatted).toContain('"compatibility_date": "2024-01-15",')
			expect(formatted).toContain('"observability": {')
			expect(formatted).toContain('"enabled": true')
			expect(formatted).not.toContain(',}') // No trailing comma before closing brace
		})
	})
})
