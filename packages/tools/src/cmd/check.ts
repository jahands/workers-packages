import { Command } from '@commander-js/extra-typings'
import Table from 'cli-table3'

import { getRepoRoot } from '../path'
import { getOutcome } from '../proc'

export const checkCmd = new Command('check')
	.description(
		'Check for issues with deps/lint/types/format. If no options are provided, all default checks are run.'
	)

	.option('-r, --root', 'Run checks from root of repo. Defaults to cwd', false)

	// Default checks
	.option('-d, --deps', 'Check for dependency issues with Syncpack')
	.option('-l, --lint', 'Check for eslint issues')
	.option('-t, --types', 'Check for TypeScript issues')
	.option('-f, --format', 'Check for formatting issues with prettier')

	// Non-default checks
	.option('-e, --exports', 'Checks package exports')

	.action(async ({ root, deps, lint, types, format, exports }) => {
		const repoRoot = getRepoRoot()
		if (root) {
			cd(repoRoot)
		}
		// Run all default checks if none are selected
		if (!deps && !lint && !types && !format && !exports) {
			deps = true
			lint = true
			types = true
			format = true
		}

		const cwd = process.cwd()
		const runFromRoot = cwd === repoRoot
		const cwdName = path.basename(cwd)

		const checks = {
			deps: ['syncpack', 'lint'],
			lint: ['turbo', 'check:lint'],
			format: ['runx', 'prettier', 'check'],
			types: ['turbo', 'check:types'],
			exports: ['attw', '--pack', '.', '--profile=esm-only'],
		} as const satisfies { [key: string]: string[] }

		type TableRow = [string, string, string, string]
		const table = new Table({
			head: [
				chalk.whiteBright('Name'),
				chalk.whiteBright('Command'),
				chalk.whiteBright('Outcome'),
				chalk.whiteBright('Ran From'),
			] satisfies TableRow,
		})

		$.stdio = 'inherit'
		$.verbose = true
		$.nothrow = true

		if (deps) {
			await within(async () => {
				cd(repoRoot) // Must be run from root
				const exitCode = await $`${checks.deps}`.exitCode
				table.push(['deps', `${checks.deps}`, getOutcome(exitCode), 'Root'] satisfies TableRow)
			})
		}

		if (lint) {
			const exitCode = await $`${checks.lint}`.exitCode
			table.push([
				'lint',
				checks.lint.join(' '),
				getOutcome(exitCode),
				runFromRoot ? 'Root' : `cwd (${cwdName})`,
			] satisfies TableRow)
		}

		if (types) {
			const exitCode = await $`${checks.types}`.exitCode
			table.push([
				'types',
				checks.types.join(' '),
				getOutcome(exitCode),
				runFromRoot ? 'Root' : `cwd (${cwdName})`,
			] satisfies TableRow)
		}

		if (format) {
			await within(async () => {
				cd(repoRoot) // Must be run from root
				const exitCode = await $`${checks.format}`.exitCode
				table.push([
					'format',
					checks.format.join(' '),
					getOutcome(exitCode),
					'Root',
				] satisfies TableRow)
			})
		}

		if (exports) {
			await within(async () => {
				const exitCode = await $`${checks.exports}`.exitCode
				table.push([
					'exports',
					checks.exports.join(' '),
					getOutcome(exitCode),
					'Root',
				] satisfies TableRow)
			})
		}

		echo(table.toString())
	})
