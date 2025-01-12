/**
 * Logs ProcessOutput error and then throws it. Useful
 * when you want to only log stderr when a program is
 * unsuccessful.
 *
 * @example await $`git push`.quiet().catch(logAndThrow)
 */
export function logAndThrow(e: ProcessOutput): never {
	console.error(e.stderr.trim())
	throw e
}

/**
 * Causes SIGINT to be a no-op so that the child process can handle it.
 * Use with care!
 */
export function ignoreSIGINT(): void {
	process.on('SIGINT', () => {})
}

export interface PrefixOptions {
	/**
	 * Wait for all chunks before writing output
	 */
	groupOutput?: boolean
}

/**
 * Adds prefix to all stdout and stderr from process. Requires using `stdio: pipe` and .quiet()
 *
 * @example
 * ```ts
 * const proc = $`ls -lh`
 * await prefixOutput(proc, 'OUTPUT:')
 * ```
 */
export async function prefixOutput(
	proc: ProcessPromise,
	prefix: string,
	opts?: PrefixOptions
): Promise<void> {
	await Promise.all([
		// Prefix both stdout and stderr
		prefixStdout(proc, prefix, opts),
		prefixStderr(proc, prefix, opts),
	])
}

/**
 * Adds prefix to all stdout from process. Requires using `stdio: pipe`
 *
 * @example
 * ```ts
 * const proc = $`ls -lh`
 * await prefixStdout(proc, 'OUTPUT:')
 * ```
 */
export async function prefixStdout(
	proc: ProcessPromise,
	prefix: string,
	opts?: PrefixOptions
): Promise<void> {
	proc.stdout.setEncoding('utf-8')
	let isNewline = true
	let nextLine = ''
	const lines: string[] = []
	for await (const chunk of proc.stdout) {
		if (typeof chunk === 'string') {
			if (isNewline) {
				if (opts?.groupOutput) {
					lines.push(nextLine)
				} else {
					process.stdout.write(nextLine)
				}
				nextLine = prefix
				isNewline = false
			}
			const c = chunk
				.split('\n')
				.map((l) => {
					if (l.trim() === '') {
						return ''
					} else {
						return `${prefix}${l}`
					}
				})
				.join('\n')
			if (c.endsWith('\n')) {
				isNewline = true
			}
			nextLine += c.slice(prefix.length)
		} else {
			nextLine += chunk
		}
	}
	if (opts?.groupOutput) {
		if (nextLine !== '' && nextLine !== prefix) {
			lines.push(nextLine)
		}
		process.stdout.write(lines.join(''))
	} else if (nextLine !== '' && nextLine !== prefix) {
		process.stdout.write(nextLine)
	}
}

/**
 * Adds prefix to all stderr from process. Requires using `stdio: pipe` and .quiet()
 *
 * @example
 * ```ts
 * const proc = $`ls -lh`
 * await prefixStderr(proc, 'OUTPUT:')
 * ```
 */
export async function prefixStderr(
	proc: ProcessPromise,
	prefix: string,
	opts?: PrefixOptions
): Promise<void> {
	proc.stderr.setEncoding('utf-8')
	let isNewline = true
	let nextLine = ''
	const lines: string[] = []
	for await (const chunk of proc.stderr) {
		if (typeof chunk === 'string') {
			if (isNewline) {
				if (opts?.groupOutput) {
					lines.push(nextLine)
				} else {
					process.stderr.write(nextLine)
				}
				nextLine = prefix
				isNewline = false
			}
			const c = chunk
				.split('\n')
				.map((l) => {
					if (l.trim() === '') {
						return ''
					} else {
						return `${prefix}${l}`
					}
				})
				.join('\n')
			if (c.endsWith('\n')) {
				isNewline = true
			}
			nextLine += c.slice(prefix.length)
		} else {
			nextLine += chunk
		}
	}
	if (opts?.groupOutput) {
		if (nextLine !== '' && nextLine !== prefix) {
			lines.push(nextLine)
		}
		process.stderr.write(lines.join(''))
	} else if (nextLine !== '' && nextLine !== prefix) {
		process.stderr.write(nextLine)
	}
}
