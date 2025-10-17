import { Command } from '@commander-js/extra-typings'
import { catchProcessError } from '@jahands/cli-tools'

class BaseClass {
	constructor() {
		// Check if run() has been overridden
		if (this.run !== BaseClass.prototype.run) {
			throw new Error(
				'Cannot override run() method in BaseClass. ' +
					'Implement your logic in a different method instead.'
			)
		}
	}

	run() {
		console.log('✅ Base run() - not overridden')
	}
}

// Child class that DOES override run() - should throw error
class ChildWithOverride extends BaseClass {
	override run() {
		console.log('❌ This should have thrown an error!')
	}
}

// Child class that does NOT override run() - should work fine
class ChildWithoutOverride extends BaseClass {
	// No run() method defined
}

export const cli = new Command('class-inheritance')
	.description('Test class method override detection with bundlers')
	.option('--test-override', 'Test child class that overrides run()')
	.option('--test-no-override', 'Test child class that does not override run()')
	.action(async (opts) => {
		if (opts.testOverride) {
			console.log('\n--- Testing ChildWithOverride (should throw error) ---')
			try {
				const child = new ChildWithOverride()
				child.run()
				console.log('❌ ERROR: Should have thrown an error!')
			} catch (error) {
				console.log('✅ Correctly threw error:', (error as Error).message)
			}
		} else if (opts.testNoOverride) {
			console.log('\n--- Testing ChildWithoutOverride (should work) ---')
			try {
				const child = new ChildWithoutOverride()
				child.run()
				console.log('✅ Test passed!')
			} catch (error) {
				console.log('❌ ERROR: Should not have thrown:', (error as Error).message)
			}
		} else {
			// Run both tests
			console.log('\n=== Testing Method Override Detection ===\n')

			console.log('--- Test 1: Child class WITH override (should throw) ---')
			try {
				const child1 = new ChildWithOverride()
				child1.run()
				console.log('❌ FAIL: Should have thrown an error!')
			} catch (error) {
				console.log('✅ PASS: Correctly threw error:', (error as Error).message)
			}

			console.log('\n--- Test 2: Child class WITHOUT override (should work) ---')
			try {
				const child2 = new ChildWithoutOverride()
				child2.run()
				console.log('✅ PASS: Test completed!')
			} catch (error) {
				console.log('❌ FAIL: Should not have thrown:', (error as Error).message)
			}
		}
	})

cli
	// don't hang for unresolved promises
	.hook('postAction', () => process.exit(0))
	.parseAsync()
	.catch(catchProcessError())
