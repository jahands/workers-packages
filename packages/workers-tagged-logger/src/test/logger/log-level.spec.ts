import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { withLogTags, WorkersLogger } from '../../logger.js'
import { setupTest } from '../harness.js'
import { LoggerAutoTags } from '../schemas.js'

beforeEach(() => {
	vi.useFakeTimers()
	const date = Date.UTC(2024, 9, 26, 12, 30)
	vi.setSystemTime(date)
})
afterEach(() => {
	vi.useRealTimers()
	vi.clearAllMocks()
})

describe('Dynamic Log Level Management', () => {
	describe('withLogLevel()', () => {
		it('creates new logger instance with specified log level', async () => {
			const h = setupTest({ minimumLogLevel: 'warn' })
			const debugLogger = h.log.withLogLevel('debug')

			await withLogTags({ source: 'test' }, async () => {
				// Original logger should not log debug
				h.log.debug('original debug')
				expect(h.logs).toHaveLength(0)

				// New logger should log debug
				debugLogger.debug('debug logger debug')
				expect(h.logs).toHaveLength(1)
				expect(h.oneLog().message).toBe('debug logger debug')
				expect(h.oneLog().level).toBe('debug')
			})
		})

		it('preserves existing tags and fields from parent logger', async () => {
			const h = setupTest()
			const parentLogger = h.log.withTags({ component: 'auth' }).withFields({ service: 'api' })
			const debugLogger = parentLogger.withLogLevel('debug')

			await withLogTags({ source: 'test' }, async () => {
				debugLogger.debug('test message')
				const log = h.oneLog()
				expect(log.tags?.component).toBe('auth')
				expect(log.service).toBe('api')
			})
		})

		it('does not affect parent logger', async () => {
			const h = setupTest({ minimumLogLevel: 'warn' })
			const debugLogger = h.log.withLogLevel('debug')

			await withLogTags({ source: 'test' }, async () => {
				// Parent logger should still filter debug
				h.log.debug('parent debug')
				expect(h.logs).toHaveLength(0)

				// Child logger should log debug
				debugLogger.debug('child debug')
				expect(h.logs).toHaveLength(1)

				// Parent logger should still filter debug after child usage
				h.log.debug('parent debug again')
				expect(h.logs).toHaveLength(1) // Still only one log
			})
		})

		it('can be chained with other methods', async () => {
			const h = setupTest({ minimumLogLevel: 'warn' })
			const chainedLogger = h.log
				.withLogLevel('debug')
				.withTags({ component: 'database' })
				.withFields({ operation: 'query' })

			await withLogTags({ source: 'test' }, async () => {
				chainedLogger.debug('chained debug')
				const log = h.oneLog()
				expect(log.message).toBe('chained debug')
				expect(log.level).toBe('debug')
				expect(log.tags?.component).toBe('database')
				expect(log.operation).toBe('query')
			})
		})

		it('respects log level hierarchy in filtering', async () => {
			const h = setupTest()
			const errorLogger = h.log.withLogLevel('error')

			await withLogTags({ source: 'test' }, async () => {
				errorLogger.debug('should not log')
				errorLogger.info('should not log')
				errorLogger.warn('should not log')
				errorLogger.error('should log')

				expect(h.logs).toHaveLength(1)
				expect(h.oneLog().message).toBe('should log')
				expect(h.oneLog().level).toBe('error')
			})
		})
	})

	describe('setLogLevel()', () => {
		it('sets log level in ALS context affecting all loggers', async () => {
			const h = setupTest({ minimumLogLevel: 'warn' })
			const logger2 = new WorkersLogger({ minimumLogLevel: 'warn' })

			await withLogTags({ source: 'test' }, async () => {
				// Both loggers should initially filter debug
				h.log.debug('debug 1')
				logger2.debug('debug 2')
				expect(h.logs).toHaveLength(0)

				// Set context log level to debug
				h.log.setLogLevel('debug')

				// Both loggers should now log debug
				h.log.debug('debug 3')
				logger2.debug('debug 4')
				expect(h.logs).toHaveLength(2)
				expect(h.logAt(0).message).toBe('debug 3')
				expect(h.logAt(1).message).toBe('debug 4')
			})
		})

		it('logs warning when called outside ALS context', () => {
			const h = setupTest()
			h.log.setLogLevel('debug')

			expect(h.logs).toHaveLength(1)
			expect(h.oneLog().level).toBe('warn')
			expect(h.oneLog().message).toContain('unable to get log tags from async local storage')
		})

		it('child contexts inherit log level', async () => {
			const h = setupTest({ minimumLogLevel: 'warn' })

			await withLogTags({ source: 'parent' }, async () => {
				h.log.setLogLevel('debug')

				await withLogTags({ source: 'child' }, async () => {
					// Child should inherit debug level
					h.log.debug('child debug')
					expect(h.logs).toHaveLength(1)
					expect(h.oneLog().message).toBe('child debug')
				})
			})
		})

		it('can be overridden in child contexts', async () => {
			const h = setupTest()

			await withLogTags({ source: 'parent' }, async () => {
				h.log.setLogLevel('debug')

				await withLogTags({ source: 'child' }, async () => {
					h.log.setLogLevel('error')

					// Child should use error level
					h.log.debug('should not log')
					h.log.warn('should not log')
					h.log.error('should log')

					expect(h.logs).toHaveLength(1)
					expect(h.oneLog().message).toBe('should log')
				})

				// Parent should still use debug level
				h.log.debug('parent debug')
				expect(h.logs).toHaveLength(2)
				expect(h.logAt(1).message).toBe('parent debug')
			})
		})
	})

	describe('Log level resolution priority', () => {
		it('instance level overrides context level', async () => {
			const h = setupTest()
			const errorLogger = h.log.withLogLevel('error')

			await withLogTags({ source: 'test' }, async () => {
				h.log.setLogLevel('debug')

				// Regular logger should use context level (debug)
				h.log.debug('context debug')
				expect(h.logs).toHaveLength(1)

				// Instance logger should use instance level (error)
				errorLogger.debug('instance debug - should not log')
				errorLogger.error('instance error - should log')
				expect(h.logs).toHaveLength(2)
				expect(h.logAt(1).message).toBe('instance error - should log')
			})
		})

		it('context level overrides constructor level', async () => {
			const h = setupTest({ minimumLogLevel: 'warn' })

			await withLogTags({ source: 'test' }, async () => {
				// Constructor level should filter debug
				h.log.debug('constructor debug')
				expect(h.logs).toHaveLength(0)

				// Context level should override constructor
				h.log.setLogLevel('debug')
				h.log.debug('context debug')
				expect(h.logs).toHaveLength(1)
			})
		})

		it('constructor level overrides default level', async () => {
			const h = setupTest({ minimumLogLevel: 'warn' })

			await withLogTags({ source: 'test' }, async () => {
				// Constructor level should filter debug (default would allow it)
				h.log.debug('constructor debug')
				expect(h.logs).toHaveLength(0)

				h.log.warn('constructor warn')
				expect(h.logs).toHaveLength(1)
			})
		})

		it('uses default level when no other levels set', async () => {
			const h = setupTest() // No minimumLogLevel set

			await withLogTags({ source: 'test' }, async () => {
				// Default level is 'debug', so debug should log
				h.log.debug('default debug')
				expect(h.logs).toHaveLength(1)
			})
		})
	})

	describe('Log level in output', () => {
		it('includes current effective log level in $logger object when $logger exists', async () => {
			const h = setupTest({ minimumLogLevel: 'warn' })

			await withLogTags({ source: 'test' }, async () => {
				// Set $logger tags to ensure $logger object exists
				h.log.setTags({ $logger: { method: 'testMethod' } })
				h.log.warn('test message')
				const log = h.oneLog()
				const loggerObj = LoggerAutoTags.parse(log.tags?.$logger)
				expect(loggerObj).toEqual({ method: 'testMethod', level: 'warn' })
			})
		})

		it('preserves existing $logger properties when adding level', async () => {
			const h = setupTest()

			await withLogTags({ source: 'test' }, async () => {
				h.log.setTags({ $logger: { method: 'testMethod', rootMethod: 'rootMethod' } })
				h.log.setLogLevel('info')
				h.log.info('test message')

				const log = h.oneLog()
				const loggerObj = LoggerAutoTags.parse(log.tags?.$logger)
				expect(loggerObj).toEqual({
					method: 'testMethod',
					rootMethod: 'rootMethod',
					level: 'info',
				})
			})
		})

		it('shows context log level when set', async () => {
			const h = setupTest({ minimumLogLevel: 'warn' })

			await withLogTags({ source: 'test' }, async () => {
				h.log.setTags({ $logger: { method: 'testMethod' } })
				h.log.setLogLevel('debug')
				h.log.debug('test message')

				const log = h.oneLog()
				const loggerObj = LoggerAutoTags.parse(log.tags?.$logger)
				expect(loggerObj).toEqual({ method: 'testMethod', level: 'debug' })
			})
		})

		it('shows instance log level when set', async () => {
			const h = setupTest()
			const debugLogger = h.log.withLogLevel('debug')

			await withLogTags({ source: 'test' }, async () => {
				h.log.setTags({ $logger: { method: 'testMethod' } })
				h.log.setLogLevel('warn')
				debugLogger.debug('test message')

				const log = h.oneLog()
				const loggerObj = LoggerAutoTags.parse(log.tags?.$logger)
				expect(loggerObj).toEqual({ method: 'testMethod', level: 'debug' })
			})
		})
	})

	describe('Integration with existing features', () => {
		it('works with withTags() method', async () => {
			const h = setupTest({ minimumLogLevel: 'warn' })
			const debugLogger = h.log.withLogLevel('debug').withTags({ component: 'auth' })

			await withLogTags({ source: 'test' }, async () => {
				debugLogger.setTags({ $logger: { method: 'testMethod' } })
				debugLogger.debug('debug with tags')
				const log = h.oneLog()
				expect(log.message).toBe('debug with tags')
				expect(log.tags?.component).toBe('auth')
				const loggerObj = LoggerAutoTags.parse(log.tags?.$logger)
				expect(loggerObj.level).toBe('debug')
			})
		})

		it('works with withFields() method', async () => {
			const h = setupTest({ minimumLogLevel: 'warn' })
			const debugLogger = h.log.withLogLevel('debug').withFields({ service: 'api' })

			await withLogTags({ source: 'test' }, async () => {
				debugLogger.setTags({ $logger: { method: 'testMethod' } })
				debugLogger.debug('debug with fields')
				const log = h.oneLog()
				expect(log.message).toBe('debug with fields')
				expect(log.service).toBe('api')
				const loggerObj = LoggerAutoTags.parse(log.tags?.$logger)
				expect(loggerObj.level).toBe('debug')
			})
		})

		it('works with nested withLogTags() calls', async () => {
			const h = setupTest({ minimumLogLevel: 'warn' })

			await withLogTags({ source: 'parent' }, async () => {
				h.log.setTags({ $logger: { method: 'testMethod' } })
				h.log.setLogLevel('debug')

				await withLogTags({ source: 'child' }, async () => {
					h.log.debug('nested debug')
					const log = h.oneLog()
					expect(log.message).toBe('nested debug')
					expect(log.tags?.source).toBe('child')
					const loggerObj = LoggerAutoTags.parse(log.tags?.$logger)
					expect(loggerObj.level).toBe('debug')
				})
			})
		})

		it('preserves log level across async boundaries', async () => {
			const h = setupTest({ minimumLogLevel: 'warn' })

			await withLogTags({ source: 'test' }, async () => {
				h.log.setLogLevel('debug')

				// Simulate async operation
				await Promise.resolve()

				h.log.debug('async debug')
				expect(h.logs).toHaveLength(1)
				expect(h.oneLog().message).toBe('async debug')
			})
		})

		it('maintains backward compatibility with existing minimumLogLevel', async () => {
			const h = setupTest({ minimumLogLevel: 'warn' })

			await withLogTags({ source: 'test' }, async () => {
				h.log.setTags({ $logger: { method: 'testMethod' } })
				// Should still respect constructor minimumLogLevel
				h.log.debug('should not log')
				h.log.warn('should log')

				expect(h.logs).toHaveLength(1)
				expect(h.oneLog().message).toBe('should log')
				const loggerObj = LoggerAutoTags.parse(h.oneLog().tags?.$logger)
				expect(loggerObj.level).toBe('warn')
			})
		})
	})
})
