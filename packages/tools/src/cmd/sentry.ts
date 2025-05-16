import { Command } from '@commander-js/extra-typings'
import { z } from 'zod/v4'

import { getConfig } from '../config'

export const sentryCmd = new Command('sentry')
	.description('Manage Sentry for releases')
	.option('-o, --org <org>', 'Sentry org to use', 'sentry')

export type ProjectName = z.infer<typeof ProjectName>
export const ProjectName = z.string().regex(/^[a-z\d_-]+$/i)

sentryCmd
	.command('commits')
	.description('Set commits for the release')
	.argument('<project>', 'Sentry project to set commits for', (p) => ProjectName.parse(p))
	.action(async (project) => {
		const { org } = sentryCmd.opts()
		echo(chalk.blue(`Sentry project: ${project}`))
		const cfg = await getConfig()
		echo(chalk.blue(`Sentry version: ${cfg.version}`))
		$.verbose = true
		await retry(
			3,
			'1s',
			() =>
				$`sentry-cli releases set-commits ${cfg.version} --auto --ignore-missing --org ${org} --project ${project}`
		)
	})

sentryCmd
	.command('sourcemaps')
	.description('Upload sourcemaps for the release')
	.argument('<project>', 'Sentry project to upload sourcemaps for', (p) => ProjectName.parse(p))
	.action(async (project) => {
		const { org } = sentryCmd.opts()
		echo(chalk.blue(`Sentry project: ${project}`))
		const cfg = await getConfig()
		echo(chalk.blue(`Sentry version: ${cfg.version}`))
		$.verbose = true
		await retry(
			3,
			'1s',
			() =>
				$`sentry-cli sourcemaps upload ./dist/ --strip-prefix './dist/../' --release ${cfg.version} --org ${org} --project ${project}`
		)
	})

sentryCmd
	.command('finalize')
	.description('Finalize the release')
	.argument('<project>', 'Sentry project to finalize release for', (p) => ProjectName.parse(p))
	.action(async (project) => {
		const { org } = sentryCmd.opts()
		echo(chalk.blue(`Sentry project: ${project}`))
		const cfg = await getConfig()
		echo(chalk.blue(`Sentry version: ${cfg.version}`))
		$.verbose = true
		await retry(
			3,
			'1s',
			() => $`sentry-cli releases finalize ${cfg.version} --org ${org} --project ${project}`
		)
	})
