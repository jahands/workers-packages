/**
 * Run command with bash
 *
 * @deprecated use shell() instead
 *
 * @example
 *
 * ```ts
 * .withExec(sh('echo hello world!'))
 * ```
 */
export function sh(input: string | string[]): string[] {
	const inputAr = Array.isArray(input) ? input : [input]
	const trimmedInput = inputAr.map((i) =>
		i
			.trim()
			.split('\n')
			.map((l) => l.trim())
			.join('\n')
	)
	return ['bash', '-c', trimmedInput].flat()
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
 * .withExec(sh('echo hello world!'))
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
		return [shellName, '-c', trimmedInput].flat()
	}
}
