import { describe, expect, it } from 'vitest'

import { sanitizeWorkerName } from './fs.js'

describe('fs utilities', () => {
	describe('sanitizeWorkerName', () => {
		it('should handle valid names', () => {
			expect(sanitizeWorkerName('my-worker')).toBe('my-worker')
			expect(sanitizeWorkerName('worker123')).toBe('worker123')
			expect(sanitizeWorkerName('test-worker-app')).toBe('test-worker-app')
		})

		it('should convert to lowercase', () => {
			expect(sanitizeWorkerName('MyWorker')).toBe('myworker')
			expect(sanitizeWorkerName('TEST-WORKER')).toBe('test-worker')
		})

		it('should replace invalid characters with hyphens', () => {
			expect(sanitizeWorkerName('my_worker')).toBe('my-worker')
			expect(sanitizeWorkerName('my worker')).toBe('my-worker')
			expect(sanitizeWorkerName('my@worker')).toBe('my-worker')
			expect(sanitizeWorkerName('my.worker')).toBe('my-worker')
		})

		it('should remove multiple consecutive hyphens', () => {
			expect(sanitizeWorkerName('my--worker')).toBe('my-worker')
			expect(sanitizeWorkerName('my___worker')).toBe('my-worker')
			expect(sanitizeWorkerName('my  worker')).toBe('my-worker')
		})

		it('should remove leading and trailing hyphens', () => {
			expect(sanitizeWorkerName('-my-worker-')).toBe('my-worker')
			expect(sanitizeWorkerName('_my_worker_')).toBe('my-worker')
		})

		it('should limit to 54 characters', () => {
			const longName = 'a'.repeat(60)
			expect(sanitizeWorkerName(longName)).toHaveLength(54)
		})

		it('should throw error for empty names', () => {
			expect(() => sanitizeWorkerName('')).toThrow(
				'Cannot sanitize worker name "" - results in empty string'
			)
			expect(() => sanitizeWorkerName('___')).toThrow(
				'Cannot sanitize worker name "___" - results in empty string'
			)
			expect(() => sanitizeWorkerName('---')).toThrow(
				'Cannot sanitize worker name "---" - results in empty string'
			)
		})
	})
})
