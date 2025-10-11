import 'zx/globals'

import { program } from '@commander-js/extra-typings'

import { exampleCmd } from '../cmd/example'

program
	.name('factorio-icons')
	.description('A CLI for scripting cropping Factorio icons')

	// Commands
	.addCommand(exampleCmd)

	// Don't hang for unresolved promises
	.hook('postAction', () => process.exit(0))
	.parseAsync()
	.catch((e) => {
		if (e instanceof ProcessOutput) {
			process.exit(1)
		} else {
			throw e
		}
	})
