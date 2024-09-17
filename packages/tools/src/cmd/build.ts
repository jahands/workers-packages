import { Command } from '@commander-js/extra-typings'

export const buildCmd = new Command('build').description('Build Workers/etc.')

buildCmd
	.command('wrangler')
	.description('Build a Workers project with Wrangler')
	.action(async () => {
		$.verbose = true
		await $`rm -rf ./dist` // Make sure we don't have any previous artifacts
		await $`wrangler deploy --minify --outdir ./dist --dry-run`
	})
