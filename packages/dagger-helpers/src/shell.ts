import { match } from 'ts-pattern'

/**
 * Shell options for a given command
 */
export type ShellOptions = {
	/**
	 * Prefix to add to all commands.
	 *
	 * @default
	 * ```sh
	 * # bash, zsh
	 * set -euo pipefail;
	 * # sh
	 * set -eu;
	 * ```
	 */
	prefix?: string
}

/**
 * Create a new shell helper with the given shell type
 *
 * @param shellName - The name of the shell to use
 *
 * @example
 *
 * ```ts
 * const sh = shell('bash')
 *
 * const con = dag.container()
 *   .withExec(sh('echo hello world!'))
 * ```
 */
export function shell(shellName: 'sh' | 'bash' | 'zsh') {
	return (input: string | string[], options?: ShellOptions): string[] => {
		const inputAr = Array.isArray(input) ? input : [input]
		const trimmedInput = inputAr.map((i) =>
			i
				.trim()
				.split('\n')
				.map((l) => l.trim())
				.join('\n')
		)

		let prefix = match(shellName)
			.with('bash', 'zsh', () => options?.prefix || 'set -euo pipefail')
			.with('sh', () => options?.prefix || 'set -eu')
			.exhaustive()
			.trim()

		if (!prefix.endsWith(';')) {
			prefix += ';'
		}

		return match(shellName)
			.with('sh', () => ['sh', '-c', `${prefix} ${trimmedInput}`])
			.with('bash', 'zsh', () => ['zsh', '-c', `${prefix} ${trimmedInput}`])
			.exhaustive()
	}
}
