import { withLogTags, WorkersLogger } from '../dist/logger.js'

console.log('=== Debug Mode Demo ===\n')

console.log('1. Production Mode (default - debug: false):')
console.log('   No internal warnings are shown to reduce noise\n')

const prodLogger = new WorkersLogger({ minimumLogLevel: 'info' })

// This won't show any warning in production mode
prodLogger.setTags({ user_id: 'user123' })
prodLogger.info('User action logged')

console.log('\n2. Development Mode (debug: true):')
console.log('   Internal warnings are shown to help catch issues\n')

const devLogger = new WorkersLogger({ debug: true, minimumLogLevel: 'debug' })

// This will show a debug warning because we're not in a withLogTags context
devLogger.setTags({ user_id: 'user456' })
devLogger.info('User action logged with debug warnings')

console.log('\n3. Proper Usage (debug: true, but within context):')
console.log('   No warnings when used correctly\n')

await withLogTags({ source: 'demo-app' }, async () => {
  // This won't show warnings because we're in proper context
  devLogger.setTags({ session_id: 'session789' })
  devLogger.info('Properly contextualized log')
  
  // Child loggers inherit debug mode
  const childLogger = devLogger.withTags({ component: 'auth' })
  childLogger.debug('Debug message from child logger')
})

console.log('\n4. Mixed Usage Example:')
console.log('   Showing both correct and incorrect usage\n')

await withLogTags({ source: 'mixed-demo' }, async () => {
  devLogger.setTags({ request_id: 'req123' })
  devLogger.info('Inside context - no warnings')
})

// Outside context - will show warning
devLogger.setTags({ outside_context: true })
devLogger.warn('Outside context - shows warning')

console.log('\n=== Demo Complete ===')
console.log('\nKey Takeaways:')
console.log('• Use debug: false (default) in production to reduce log noise')
console.log('• Use debug: true in development to catch missing withLogTags() calls')
console.log('• Debug mode is inherited by child loggers (withTags, withFields, withLogLevel)')
console.log('• Warnings only appear when AsyncLocalStorage context is missing')
