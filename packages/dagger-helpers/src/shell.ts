/**
 * Run command with bash
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
			.split('\n')
			.map((l) => l.trim())
			.join('\n')
	)
	return ['bash', '-c', trimmedInput].flat()
}
