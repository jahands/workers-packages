import { confirm, select } from '@inquirer/prompts'
import Table from 'cli-table3'

export async function checkAndInstallJust(): Promise<void> {
	// Check if just is already installed
	if (await which('just', { nothrow: true })) {
		return
	}

	echo(chalk.yellow('\n⚠️  just is not installed on your system.'))
	echo(chalk.dim('just is required to run tasks in the monorepo.'))
	echo(chalk.dim('You can install just manually from: https://just.systems/man/en/packages.html\n'))

	const shouldInstall = await confirm({
		message: 'Would you like to install just now?',
		default: true,
	})

	if (!shouldInstall) {
		echo(
			chalk.blue(
				'\nYou can install just later by visiting: https://just.systems/man/en/packages.html'
			)
		)
		echo(
			chalk.dim("The monorepo will still be created, but you won't be able to use just commands.\n")
		)
		return
	}

	const platform = process.platform
	const installMethods = await getAvailableInstallMethods(platform)

	if (installMethods.length === 0) {
		echo(chalk.yellow('\n⚠️  No automatic installation method found for your system.'))
		echo(chalk.blue('Please install just manually from: https://just.systems/man/en/packages.html'))
		echo(
			chalk.dim("The monorepo will still be created, but you won't be able to use just commands.\n")
		)
		return
	}

	const selectedMethod = await select({
		message: 'Choose an installation method:',
		choices: installMethods.map((method) => ({
			name: `${method.name} - ${chalk.dim(method.cmd)}`,
			value: method,
		})),
	})

	const table = new Table({
		head: [chalk.blueBright('Selected Install Command')],
	})
	table.push([selectedMethod.cmd])
	echo(table.toString())

	const confirmInstall = await confirm({
		message: `Proceed with installation?`,
		default: true,
	})

	if (!confirmInstall) {
		echo(
			chalk.blue(
				'\nYou can install just later by visiting: https://just.systems/man/en/packages.html'
			)
		)
		echo(
			chalk.dim("The monorepo will still be created, but you won't be able to use just commands.\n")
		)
		return
	}

	try {
		echo(chalk.dim('Installing just...'))

		await $({
			stdio: 'inherit',
		})`sh -c ${selectedMethod.cmd}`.verbose()

		// Verify installation
		if (await which('just', { nothrow: true })) {
			echo(chalk.green('✅ just installed successfully!\n'))
		} else {
			echo(chalk.yellow('⚠️  just was installed but not found in PATH.'))
			echo(chalk.dim('You may need to restart your terminal or add it to your PATH.\n'))
		}
	} catch (e) {
		echo(chalk.red('❌ Failed to install just automatically.'))
		echo(chalk.blue('Please install just manually from: https://just.systems/man/en/packages.html'))
		echo(chalk.dim(`Error: ${e instanceof Error ? e.message : String(e)}\n`))
	}
}

interface InstallMethod {
	name: string
	cmd: string
}

async function getAvailableInstallMethods(platform: NodeJS.Platform): Promise<InstallMethod[]> {
	const methods: InstallMethod[] = []

	// Check for npm (available on all platforms)
	if (await which('npm', { nothrow: true })) {
		methods.push({
			name: 'npm (rust-just)',
			cmd: 'npm install -g rust-just',
		})
	}

	switch (platform) {
		case 'win32':
			// Windows - use winget
			if (await which('winget', { nothrow: true })) {
				methods.push({
					name: 'winget',
					cmd: 'winget install --id Casey.Just --exact',
				})
			}
			break

		case 'darwin':
			// macOS - mise and brew
			if (await which('mise', { nothrow: true })) {
				methods.push({
					name: 'mise',
					cmd: 'mise use -g just',
				})
			}
			if (await which('brew', { nothrow: true })) {
				methods.push({
					name: 'Homebrew',
					cmd: 'brew install just',
				})
			}
			break

		case 'linux':
			// Linux - check for different package managers
			if (await which('apt', { nothrow: true })) {
				// Debian/Ubuntu
				methods.push({
					name: 'apt (Debian/Ubuntu)',
					cmd: 'sudo apt update && sudo apt install -y just',
				})
			}
			if (await which('dnf', { nothrow: true })) {
				// Fedora
				methods.push({
					name: 'dnf (Fedora)',
					cmd: 'sudo dnf install -y just',
				})
			}
			if (await which('pacman', { nothrow: true })) {
				// Arch Linux
				methods.push({
					name: 'pacman (Arch)',
					cmd: 'sudo pacman -S --noconfirm just',
				})
			}
			break
	}

	return methods
}
