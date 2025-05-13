import { match } from 'ts-pattern'

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
	return (input: string | string[]): string[] => {
		const inputAr = Array.isArray(input) ? input : [input]
		const trimmedInput = inputAr.map((i) =>
			i
				.trim()
				.split('\n')
				.map((l) => l.trim())
				.join('\n')
		)

		return match(shellName)
			.with('sh', () => ['sh', '-c', `set -eu; ${trimmedInput}`])
			.with('bash', () => ['bash', '-c', `set -euo pipefail; ${trimmedInput}`])
			.with('zsh', () => ['zsh', '-c', `set -euo pipefail; ${trimmedInput}`])
			.exhaustive()
	}
}
