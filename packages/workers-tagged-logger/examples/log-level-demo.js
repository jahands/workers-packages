import { withLogTags, WorkersLogger } from '../dist/logger.js'

console.log('=== Dynamic Log Level Management Demo ===\n')

// Create a logger with warn level by default
const logger = new WorkersLogger({ minimumLogLevel: 'warn' })

console.log('1. Constructor-level filtering (warn):')
await withLogTags({ source: 'demo' }, async () => {
	logger.debug('This debug message will NOT be shown')
	logger.info('This info message will NOT be shown')
	logger.warn('This warn message WILL be shown')
})

console.log('\n2. Context-level override (debug):')
await withLogTags({ source: 'demo' }, async () => {
	logger.setLogLevel('debug') // Override constructor level
	logger.debug('This debug message WILL be shown (context override)')
	logger.info('This info message WILL be shown (context override)')
	logger.warn('This warn message WILL be shown')
})

console.log('\n3. Instance-level override (error):')
const errorLogger = logger.withLogLevel('error') // Create instance with error level
await withLogTags({ source: 'demo' }, async () => {
	logger.setLogLevel('debug') // Set context to debug

	// Regular logger uses context level (debug)
	logger.debug('Regular logger: debug WILL be shown (context level)')

	// Instance logger uses instance level (error) - highest priority
	errorLogger.debug('Instance logger: debug will NOT be shown (instance level is error)')
	errorLogger.error('Instance logger: error WILL be shown')
})

console.log('\n4. Method chaining with log levels:')
const chainedLogger = logger
	.withLogLevel('debug')
	.withTags({ component: 'auth' })
	.withFields({ service: 'api' })

await withLogTags({ source: 'demo' }, async () => {
	chainedLogger.debug('Chained logger with debug level, tags, and fields')
})

console.log('\n5. Log level in output (when using decorators or explicit $logger tags):')
await withLogTags({ source: 'demo' }, async () => {
	// Set $logger tags to see level in output
	logger.setTags({ $logger: { method: 'demoMethod' } })
	logger.setLogLevel('info')
	logger.info('This log will show the effective log level in $logger.level')
})

console.log('\n=== Demo Complete ===')
