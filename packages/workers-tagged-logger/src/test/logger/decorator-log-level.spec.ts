import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WithLogTags, withLogTags } from '../../logger.js'
import { setupTest } from '../harness.js'

beforeEach(() => {
	vi.useFakeTimers()
	const date = Date.UTC(2024, 9, 26, 12, 30)
	vi.setSystemTime(date)
})
afterEach(() => {
	vi.useRealTimers()
	vi.clearAllMocks()
})

describe('WithLogTags decorator with log levels', () => {
	it('preserves log level in decorator context', async () => {
		const h = setupTest({ minimumLogLevel: 'warn' })

		class TestService {
			@WithLogTags({ source: 'TestService' })
			async testMethod() {
				h.log.setLogLevel('debug')
				h.log.debug('debug from decorator')
				return 'result'
			}
		}

		const service = new TestService()
		const result = await service.testMethod()

		expect(result).toBe('result')
		expect(h.logs).toHaveLength(1)
		expect(h.oneLog().message).toBe('debug from decorator')
		expect(h.oneLog().tags?.source).toBe('TestService')
		expect((h.oneLog().tags?.$logger as any)?.method).toBe('testMethod')
		expect((h.oneLog().tags?.$logger as any)?.level).toBe('debug')
	})

	it('inherits log level from parent context', async () => {
		const h = setupTest({ minimumLogLevel: 'warn' })

		class TestService {
			@WithLogTags({ source: 'TestService' })
			async testMethod() {
				h.log.debug('debug from decorator')
				return 'result'
			}
		}

		const service = new TestService()

		// Set log level in parent context within withLogTags
		await withLogTags({ source: 'parent' }, async () => {
			h.log.setLogLevel('debug')
			const result = await service.testMethod()

			expect(result).toBe('result')
			expect(h.logs).toHaveLength(1)
			expect(h.oneLog().message).toBe('debug from decorator')
			expect((h.oneLog().tags?.$logger as any)?.level).toBe('debug')
		})
	})

	it('works with nested decorated methods', async () => {
		const h = setupTest({ minimumLogLevel: 'warn' })

		class TestService {
			@WithLogTags({ source: 'TestService' })
			async parentMethod() {
				h.log.setLogLevel('debug')
				h.log.debug('debug from parent')
				return await this.childMethod()
			}

			@WithLogTags({ component: 'child' })
			async childMethod() {
				h.log.debug('debug from child')
				return 'child result'
			}
		}

		const service = new TestService()
		const result = await service.parentMethod()

		expect(result).toBe('child result')
		expect(h.logs).toHaveLength(2)

		// Parent method log
		expect(h.logAt(0).message).toBe('debug from parent')
		expect(h.logAt(0).tags?.source).toBe('TestService')
		expect((h.logAt(0).tags?.$logger as any)?.method).toBe('parentMethod')
		expect((h.logAt(0).tags?.$logger as any)?.rootMethod).toBe('parentMethod')
		expect((h.logAt(0).tags?.$logger as any)?.level).toBe('debug')

		// Child method log (inherits log level)
		expect(h.logAt(1).message).toBe('debug from child')
		expect(h.logAt(1).tags?.source).toBe('TestService')
		expect(h.logAt(1).tags?.component).toBe('child')
		expect((h.logAt(1).tags?.$logger as any)?.method).toBe('childMethod')
		expect((h.logAt(1).tags?.$logger as any)?.rootMethod).toBe('parentMethod')
		expect((h.logAt(1).tags?.$logger as any)?.level).toBe('debug')
	})

	it('allows overriding log level in child decorated method', async () => {
		const h = setupTest({ minimumLogLevel: 'warn' })

		class TestService {
			@WithLogTags({ source: 'TestService' })
			async parentMethod() {
				h.log.setLogLevel('debug')
				h.log.debug('debug from parent')
				return await this.childMethod()
			}

			@WithLogTags({ component: 'child' })
			async childMethod() {
				h.log.setLogLevel('error')
				h.log.debug('debug from child - should not log')
				h.log.error('error from child - should log')
				return 'child result'
			}
		}

		const service = new TestService()
		const result = await service.parentMethod()

		expect(result).toBe('child result')
		expect(h.logs).toHaveLength(2)

		// Parent method log
		expect(h.logAt(0).message).toBe('debug from parent')
		expect((h.logAt(0).tags?.$logger as any)?.level).toBe('debug')

		// Child method log (only error should log)
		expect(h.logAt(1).message).toBe('error from child - should log')
		expect((h.logAt(1).tags?.$logger as any)?.level).toBe('error')
	})

	it('works with instance-specific log levels', async () => {
		const h = setupTest({ minimumLogLevel: 'warn' })
		const debugLogger = h.log.withLogLevel('debug')

		class TestService {
			@WithLogTags({ source: 'TestService' })
			async testMethod() {
				debugLogger.debug('debug from instance logger')
				h.log.debug('debug from regular logger - should not log')
				return 'result'
			}
		}

		const service = new TestService()
		const result = await service.testMethod()

		expect(result).toBe('result')
		expect(h.logs).toHaveLength(1)
		expect(h.oneLog().message).toBe('debug from instance logger')
		expect((h.oneLog().tags?.$logger as any)?.level).toBe('debug')
	})

	it('maintains log level isolation between decorator contexts', async () => {
		const h = setupTest({ minimumLogLevel: 'warn' })

		class TestService {
			@WithLogTags({ source: 'ServiceA' })
			async methodA() {
				h.log.setLogLevel('debug')
				h.log.debug('debug from A')
				return 'A'
			}

			@WithLogTags({ source: 'ServiceB' })
			async methodB() {
				h.log.debug('debug from B - should not log')
				h.log.warn('warn from B')
				return 'B'
			}
		}

		const service = new TestService()

		// Call methodA which sets debug level
		const resultA = await service.methodA()
		expect(resultA).toBe('A')

		// Call methodB which should not inherit the debug level
		const resultB = await service.methodB()
		expect(resultB).toBe('B')

		expect(h.logs).toHaveLength(2)
		expect(h.logAt(0).message).toBe('debug from A')
		expect(h.logAt(0).tags?.source).toBe('ServiceA')
		expect(h.logAt(1).message).toBe('warn from B')
		expect(h.logAt(1).tags?.source).toBe('ServiceB')
	})
})
