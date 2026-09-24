import { Command } from '@commander-js/extra-typings'

import { getRepoRoot } from '../path'
import { updatePnpm } from '../update-pnpm'

export const updateCmd = new Command('update')
	.description('Update things in the repo')
	.hook('preAction', () => {
		cd(getRepoRoot())
		$.verbose = true
		$.stdio = 'inherit'
		$.env.FORCE_COLOR = '1'
	})

updateCmd
	.command('deps')
	.description('Update dependencies via syncpack')
	.action(async () => {
		await $`syncpack update`

		// Run fix if there are any changes
		const status = await $({
			stdio: 'pipe',
		})`git status --porcelain`.text()
		if (status.includes('package.json') || status.includes('pnpm-lock.yaml')) {
			await $`just fix --deps`
		}
	})

updateCmd
	.command('pnpm')
	.description('Update pnpm version')
	.action(async () => {
		await updatePnpm()
	})

updateCmd
	.command('turbo')
	.description('Update turbo version (must have clean working tree)')
	.action(async () => {
		await $`pnpm dlx @turbo/codemod@latest update`
	})

updateCmd
	.command('skills')
	.description('Install skills with dotagents and commit changes')
	.action(async () => {
		await $`pnpm dotagents --project install`

		// dotagents gitignores the skills it installs, but we track them in git
		const gitignorePath = '.agents/.gitignore'
		const gitignore = await fs.readFile(gitignorePath, 'utf8')
		await fs.writeFile(
			gitignorePath,
			gitignore
				.split('\n')
				.filter((line) => !/^\/skills\/[^.]/.test(line))
				.join('\n')
		)

		const $$ = $({ stdio: 'pipe', verbose: false })
		await $$`git add -A .agents/skills agents.lock`
		const changedFiles = (await $$`git diff --cached --name-only -- .agents/skills`.text()).trim()
		if (!changedFiles) {
			echo(chalk.yellow('Skills are up to date'))
			return
		}

		const skills = new Set(changedFiles.split('\n').map((file) => file.split('/')[2]))
		const message = ['chore: update skills', '', ...[...skills].sort().map((s) => `- ${s}`)].join(
			'\n'
		)
		await $`git commit -m ${message} -- .agents/skills agents.lock`
	})
