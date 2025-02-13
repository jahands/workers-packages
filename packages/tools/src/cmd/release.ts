import { Command } from '@commander-js/extra-typings'

import { getRepoRoot } from '../path'

export const releaseCmd = new Command('release').description('Scripts for managing releases')

releaseCmd
	.command('clean')
	.description(`Remove files we don't want ending up in npm tarballs`)
	.action(async () => {
		const repoRoot = getRepoRoot()

		const turboDirs = await glob('packages/*/.turbo/', { cwd: repoRoot, onlyDirectories: true })
		await Promise.all(turboDirs.map((d) => fs.remove(d)))
	})
