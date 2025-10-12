import path from 'node:path'
import { checkbox, confirm, input, select } from '@inquirer/prompts'
import { cliError } from '@jahands/cli-tools/errors'
import pMap from 'p-map'
import { z } from 'zod/v4'

import { ampExists, claudeExists, getAvailableEditors } from './editor'
import { isDirEmpty } from './fs'
import { checkAndInstallJust } from './just-installer'

import type { AIAssistant } from './editor'

export async function ensurePrerequisites() {
	if (!(await which('git', { nothrow: true }))) {
		throw cliError('git is required to create a monorepo. Please install it and try again.')
	}

	// Check and offer to install just
	await checkAndInstallJust()
}

export const RepoName = z.string().regex(/^(?!\.+$)(?!_+$)[a-z0-9-_.]+$/i)

async function cleanupTemplateFiles(targetDir: string) {
	// clean up template files
	await fs.rm(path.join(targetDir, '.docs'), { recursive: true, force: true })

	// remove all CHANGELOG.md files
	const changelogFiles = await glob('**/CHANGELOG.md', { cwd: targetDir })
	for (const file of changelogFiles) {
		await fs.rm(path.join(targetDir, file), { force: true })
	}

	// remove LICENSE (users may want to add their own)
	await fs.rm(path.join(targetDir, 'LICENSE'), { force: true })

	// remove all .changeset/*.md files except README.md
	const changesetFiles = await glob(['.changeset/*.md', '!README.md'], {
		cwd: targetDir,
		gitignore: true,
	})
	await pMap(changesetFiles, async (file) => {
		await fs.rm(path.join(targetDir, file), { force: true })
	})
}

export interface CreateMonorepoOptions {
	name?: string
}

async function promptRepoName(): Promise<string> {
	return input({
		message: 'What do you want to name your monorepo?',
		validate: async (value) => {
			const trimmedValue = value.trim()
			if (trimmedValue === '') {
				return 'Repository name cannot be empty.'
			}

			const targetDir = path.resolve(process.cwd(), trimmedValue)
			if (fs.existsSync(targetDir)) {
				try {
					if (!isDirEmpty(targetDir)) {
						return `Directory "${trimmedValue}" already exists and is not empty. Please choose a different name or remove the existing directory.`
					}
				} catch (e) {
					// handle potential errors reading the directory (e.g., permissions)
					return `Could not check directory "${trimmedValue}": ${e instanceof Error ? e.message : String(e)}`
				}
			}

			if (RepoName.safeParse(trimmedValue).success) {
				return true
			} else {
				return 'The repository name can only contain ASCII letters, digits, and the characters ., -, and _.'
			}
		},
	}).then((answer) => answer.trim())
}

async function promptUseGitHubActions(): Promise<boolean> {
	return confirm({
		message: 'Do you want to use GitHub Actions?',
		default: true,
	})
}

async function promptInstallDependencies(): Promise<boolean> {
	return confirm({
		message: 'Install dependencies?',
		default: true,
	})
}

async function promptAIAssistantRules(): Promise<AIAssistant[]> {
	const [availableEditors, hasClaude, hasAmp] = await Promise.all([
		getAvailableEditors(),
		claudeExists(),
		ampExists(),
	])
	const editorCommands = availableEditors.map((e) => e.command)

	return checkbox({
		message: 'Add AI coding assistant rules?',
		choices: [
			{ name: 'Claude', value: 'claude', checked: hasClaude },
			{ name: 'Cursor', value: 'cursor', checked: editorCommands.includes('cursor') },
			{ name: 'WindSurf', value: 'windsurf', checked: editorCommands.includes('windsurf') },
			{ name: 'AmpCode', value: 'amp', checked: hasAmp },
		] satisfies Array<{ name: string; value: AIAssistant; checked: boolean }>,
	})
}

export async function createMonorepo(opts: CreateMonorepoOptions) {
	await ensurePrerequisites()

	const name = opts.name ?? (await promptRepoName())
	const useGitHubActions = await promptUseGitHubActions()
	const selectedRules = await promptAIAssistantRules()

	echo(chalk.blue(`Creating monorepo with name: ${chalk.white(name)}`))

	const targetDir = path.resolve(process.cwd(), name)
	let dirExisted = false
	if (fs.existsSync(targetDir)) {
		dirExisted = true
		const files = fs.readdirSync(targetDir)
		if (files.length > 0) {
			throw cliError(
				`Directory "${name}" already exists and is not empty. Please choose a different name or remove the existing directory.`
			)
		}
		echo(chalk.yellow(`Directory "${name}" already exists but is empty. Proceeding...`))
	}

	const templateUrl = 'https://github.com/jahands/workers-monorepo-template.git'

	try {
		await $`git clone --depth 1 ${templateUrl} ${targetDir}`.quiet()
		await fs.rm(path.join(targetDir, '.git'), { recursive: true, force: true })
		await cleanupTemplateFiles(targetDir)
	} catch (e) {
		// clean up the target directory if it was created by this script
		if (!fs.existsSync(path.resolve(process.cwd(), name))) {
			// only remove the directory if it was created by this script
			if (!dirExisted) {
				await fs.rm(targetDir, { recursive: true, force: true })
			}
		}
		throw cliError(`Failed to create monorepo: ${e instanceof Error ? e.message : String(e)}`)
	}

	if (!useGitHubActions) {
		await fs.rm(path.join(targetDir, '.github/workflows'), { recursive: true, force: true })
		// delete the .github directory if it's empty
		if (isDirEmpty(path.join(targetDir, '.github'))) {
			await fs.rm(path.join(targetDir, '.github'), { recursive: true, force: true })
		}
	}

	// add AI assistant rules
	if (selectedRules.length > 0) {
		echo(chalk.dim(`Adding AI assistant rules: ${selectedRules.join(', ')}`))
	}

	// remove unwanted AI assistant rules
	const allRules = ['claude', 'cursor', 'windsurf', 'amp'] as const satisfies AIAssistant[]
	const rulesToRemove = allRules.filter((rule) => !selectedRules.includes(rule))
	const ruleFiles = {
		claude: [path.join(targetDir, 'CLAUDE.md'), path.join(targetDir, '.claude')],
		cursor: [path.join(targetDir, '.cursor')],
		windsurf: [path.join(targetDir, '.windsurf')],
		amp: [path.join(targetDir, 'AGENTS.md')],
	} as const satisfies Partial<Record<AIAssistant, string[]>>

	await pMap(rulesToRemove, async (rule) => {
		const files = ruleFiles[rule]
		if (files) {
			await pMap(files, async (filePath) => {
				await fs.rm(filePath, { recursive: true, force: true })
			})
		}
	})

	echo(chalk.dim(`Initializing git repository...`))
	cd(targetDir)
	await $`git init`.quiet()
	await $`git add .`.quiet()
	await $`git commit -m "Initial commit"`.quiet()

	echo(`${chalk.green('Monorepo created successfully!')} ${chalk.dim(targetDir)}`)

	if (await promptInstallDependencies()) {
		echo(chalk.dim(`Installing dependencies...`))

		// get pnpm version from package.json
		const pkgJson = z
			.object({
				packageManager: z.string().regex(/^pnpm@\d+\.\d+\.\d+$/),
			})
			.parse(JSON.parse(fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8')))

		const pnpmVersion = pkgJson.packageManager.split('@')[1]
		if (!pnpmVersion) {
			throw cliError('Failed to parse package.json: No pnpm version found')
		}
		const cmd = `npm exec --yes pnpm@${pnpmVersion} -- install --child-concurrency=10 --loglevel=error`
		echo(chalk.dim(`Running command: ${cmd}`))
		await $`${cmd.split(' ')}`.verbose()
	}

	// check if vscode or cursor are installed and offer to open the monorepo with one of them
	const availableEditors = await getAvailableEditors()
	if (availableEditors.length > 0) {
		const openEditor = await confirm({
			message: 'Want to open your new monorepo in an editor?',
			default: true,
		})

		if (openEditor) {
			const editor = await select({
				message: 'Which editor do you want to use?',
				choices: availableEditors.map((editor) => ({ name: editor.name, value: editor })),
			})

			echo(chalk.dim(`Opening monorepo in ${editor.name}...`))
			await $`${editor.command} .`.quiet()
		}
	}
}
