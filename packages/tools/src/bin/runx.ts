import 'zx/globals'

import { program } from '@commander-js/extra-typings'

import { buildCmd } from '../cmd/build'
import { checkCmd } from '../cmd/check'
import { daggerxCmd } from '../cmd/daggerx'
import { deployCmd } from '../cmd/deploy'
import { parseChangesetCmd } from '../cmd/parse-changeset'
import { pkgCmd } from '../cmd/pkg/pkg'
import { releaseCmd } from '../cmd/release'
import { sentryCmd } from '../cmd/sentry'
import { updatePnpmCmd } from '../cmd/update-pnpm'

program
	.name('runx')
	.description('A CLI for scripts that automate this repo')

	.addCommand(updatePnpmCmd)
	.addCommand(parseChangesetCmd)
	.addCommand(checkCmd)
	.addCommand(buildCmd)
	.addCommand(deployCmd)
	.addCommand(sentryCmd)
	.addCommand(pkgCmd)
	.addCommand(releaseCmd)
	.addCommand(daggerxCmd)

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
