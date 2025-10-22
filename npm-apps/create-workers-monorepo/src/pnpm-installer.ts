import { cliError } from '@jahands/cli-tools/errors'

export async function ensurePnpmInstalled(targetDir: string, pnpmVersion: string): Promise<void> {
	if (await which('pnpm', { nothrow: true })) {
		return
	}

	if (await which('mise', { nothrow: true })) {
		echo(chalk.dim('pnpm not found. Running "mise up" to install tools...'))
		try {
			await $({
				cwd: targetDir,
				stdio: 'inherit',
			})`mise up`
		} catch (e) {
			echo(chalk.yellow(`mise failed to install pnpm${e instanceof Error ? `: ${e.message}` : ''}`))
		}

		if (await which('pnpm', { nothrow: true })) {
			return
		}
		echo(chalk.yellow('pnpm still not available after running mise up. Falling back to npm...'))
	}

	if (!(await which('npm', { nothrow: true }))) {
		throw cliError(
			'pnpm is required but neither pnpm nor npm is available to install it. Please install pnpm manually.'
		)
	}

	echo(chalk.dim(`Installing pnpm@${pnpmVersion} globally via npm...`))
	try {
		await $({
			stdio: 'inherit',
		})`npm install -g pnpm@${pnpmVersion}`
	} catch {
		throw cliError('Failed to install pnpm using npm')
	}

	if (!(await which('pnpm', { nothrow: true }))) {
		throw cliError(
			'pnpm installation completed but the command is still unavailable. Please install pnpm manually and try again.'
		)
	}
}
