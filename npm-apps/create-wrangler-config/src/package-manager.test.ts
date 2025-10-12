import { describe, expect, it } from 'vitest'

import { PackageManager } from './package-manager.js'

describe('package-manager', () => {
	describe('PackageManager schema', () => {
		it('should validate supported package managers', () => {
			expect(PackageManager.parse('bun')).toBe('bun')
			expect(PackageManager.parse('pnpm')).toBe('pnpm')
			expect(PackageManager.parse('yarn')).toBe('yarn')
			expect(PackageManager.parse('npm')).toBe('npm')
		})

		it('should reject invalid package managers', () => {
			expect(() => PackageManager.parse('invalid')).toThrow()
			expect(() => PackageManager.parse('pip')).toThrow()
			expect(() => PackageManager.parse('')).toThrow()
		})
	})
})
