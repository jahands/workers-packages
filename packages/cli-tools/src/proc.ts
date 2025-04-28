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

export type PrefixOptions =
	| {
			/**
			 * Prefix to add to all lines of output
			 */
			prefix: string
			/**
			 * Wait for all chunks before writing output
			 */
			groupOutput?: false
			groupPrefix?: never
			groupSuffix?: never
			includeDuration?: never
	  }
	| {
			/**
			 * Prefix to add to all lines of output
			 */
			prefix: string
			/**
			 * Wait for all chunks before writing output.
			 *
			 * @default false
			 */
			groupOutput: true
			/**
			 * Output prefix before group. Automatically adds newlines to start and end.
			 */
			groupPrefix?: string
			/**
			 * Output suffix after group. Automatically adds newlines to start and end.
			 */
			groupSuffix?: string
			/**
			 * Measure how long the group takes to execute and add it as a prefix to groupSuffix
			 */
			includeDuration?: boolean
	  }

/**
 * Get normalized prefix options
 */
function getPrefixOptions(prefixOrOpts: string | PrefixOptions): PrefixOptions {
	if (typeof prefixOrOpts === 'string') {
		return { prefix: prefixOrOpts }
	}

	const opts = structuredClone(prefixOrOpts)
	if (opts.groupOutput) {
		if (opts.groupPrefix !== undefined) {
			if (!opts.groupPrefix.startsWith('\n')) {
				opts.groupPrefix = `\n${opts.groupPrefix}`
			}
			if (!opts.groupPrefix.endsWith('\n')) {
				opts.groupPrefix += '\n'
			}
		}
		if (opts.groupSuffix !== undefined) {
			if (!opts.groupSuffix.endsWith('\n')) {
				opts.groupSuffix += '\n'
			}
		}
	}
	return opts
}

/**
 * Adds prefix to all stdout and stderr from process. Requires using `stdio: pipe` and .quiet()
 *
 * @example
 * ```ts
 * const proc = $`ls -lh`
 * await prefixOutput('OUTPUT:', proc)
 * ```
 */
export async function prefixOutput(
	prefixOrOpts: string | PrefixOptions,
	proc: ProcessPromise
): Promise<void> {
	const opts = getPrefixOptions(prefixOrOpts)
	const start = Date.now()
	if (opts.groupOutput) {
		await Promise.all([
			prefixStdout(
				{
					...opts,
					// don't output either in stdout
					groupPrefix: undefined,
					groupSuffix: undefined,
				},
				proc
			),
			prefixStderr(
				{
					...opts,
					// output groupPrefix in stderr, but wait for
					// all output before writing groupSuffix
					groupSuffix: undefined,
				},
				proc
			),
		])

		// now we can write groupSuffix
		if (opts.groupSuffix !== undefined) {
			if (opts.includeDuration) {
				const duration = Date.now() - start
				const durationStr =
					duration < 1000 ? `${duration.toFixed(2)}ms` : `${(duration / 1000).toFixed(3)}s`

				process.stderr.write(`${chalk.gray(`[${durationStr}]`)} ${opts.groupSuffix}`)
			} else {
				process.stderr.write(opts.groupSuffix)
			}
		}
	} else {
		await Promise.all([
			// prefix both stdout and stderr
			prefixStdout(opts, proc),
			prefixStderr(opts, proc),
		])
	}
}

/**
 * Adds prefix to all stdout from process. Requires using `stdio: pipe`
 *
 * @example
 * ```ts
 * const proc = $`ls -lh`
 * await prefixStdout('OUTPUT:', proc)
 * ```
 */
export async function prefixStdout(
	prefixOrOpts: string | PrefixOptions,
	proc: ProcessPromise
): Promise<void> {
	const opts = getPrefixOptions(prefixOrOpts)
	const start = Date.now()
	proc.stdout.setEncoding('utf-8')
	let buffer = ''
	const outputLines: string[] = []
	let lastChunkEndedWithNewline = false

	for await (const chunk of proc.stdout) {
		const chunkStr = chunk.toString()
		buffer += chunkStr
		lastChunkEndedWithNewline = chunkStr.endsWith('\n')
		let newlineIndex
		while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
			const line = buffer.substring(0, newlineIndex)
			const prefixedLine = opts.prefix + line
			if (opts?.groupOutput) {
				outputLines.push(prefixedLine)
			} else {
				process.stdout.write(prefixedLine + '\n')
			}
			buffer = buffer.substring(newlineIndex + 1)
		}
	}

	// Handle final fragment
	if (buffer.length > 0) {
		const prefixedLine = opts.prefix + buffer
		if (opts?.groupOutput) {
			outputLines.push(prefixedLine)
		} else {
			process.stdout.write(prefixedLine)
		}
		// If buffer had content, the stream didn't end with \n
		lastChunkEndedWithNewline = false
	}

	// Write grouped output
	if (opts?.groupOutput) {
		if (opts.groupPrefix !== undefined) {
			process.stdout.write(opts.groupPrefix)
		}
		process.stdout.write(outputLines.join('\n'))
		// Add trailing newline only if grouping and original stream ended with \n
		if (lastChunkEndedWithNewline && outputLines.length > 0) {
			process.stdout.write('\n')
		}
		if (opts.groupSuffix !== undefined) {
			if (opts.includeDuration) {
				const duration = Date.now() - start
				const durationStr =
					duration < 1000 ? `${duration.toFixed(2)}ms` : `${(duration / 1000).toFixed(3)}s`

				process.stderr.write(`${chalk.gray(`[${durationStr}]`)} ${opts.groupSuffix}`)
			} else {
				process.stderr.write(opts.groupSuffix)
			}
		}
	}
}

/**
 * Adds prefix to all stderr from process. Requires using `stdio: pipe` and .quiet()
 *
 * @example
 * ```ts
 * const proc = $`ls -lh`
 * await prefixStderr('OUTPUT:', proc)
 * ```
 */
export async function prefixStderr(
	prefixOrOpts: string | PrefixOptions,
	proc: ProcessPromise
): Promise<void> {
	const opts = getPrefixOptions(prefixOrOpts)
	const start = Date.now()
	proc.stderr.setEncoding('utf-8')
	let buffer = ''
	const outputLines: string[] = []
	let lastChunkEndedWithNewline = false

	for await (const chunk of proc.stderr) {
		const chunkStr = chunk.toString()
		buffer += chunkStr
		lastChunkEndedWithNewline = chunkStr.endsWith('\n')
		let newlineIndex
		while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
			const line = buffer.substring(0, newlineIndex)
			const prefixedLine = opts.prefix + line
			if (opts?.groupOutput) {
				outputLines.push(prefixedLine)
			} else {
				process.stderr.write(prefixedLine + '\n')
			}
			buffer = buffer.substring(newlineIndex + 1)
		}
	}

	// Handle final fragment
	if (buffer.length > 0) {
		const prefixedLine = opts.prefix + buffer
		if (opts?.groupOutput) {
			outputLines.push(prefixedLine)
		} else {
			process.stderr.write(prefixedLine)
		}
		// If buffer had content, the stream didn't end with \n
		lastChunkEndedWithNewline = false
	}

	// Write grouped output
	if (opts?.groupOutput) {
		if (opts.groupPrefix !== undefined) {
			process.stderr.write(opts.groupPrefix)
		}
		process.stderr.write(outputLines.join('\n'))
		// Add trailing newline only if grouping and original stream ended with \n
		if (lastChunkEndedWithNewline && outputLines.length > 0) {
			process.stderr.write('\n')
		}
		if (opts.groupSuffix !== undefined) {
			if (opts.includeDuration) {
				const duration = Date.now() - start
				const durationStr =
					duration < 1000 ? `${duration.toFixed(2)}ms` : `${(duration / 1000).toFixed(3)}s`

				process.stderr.write(`${chalk.gray(`[${durationStr}]`)} ${opts.groupSuffix}`)
			} else {
				process.stderr.write(opts.groupSuffix)
			}
		}
	}
}

export interface CatchProcessErrorOptions {
	/**
	 * Exit with the same exit code as the `ProcessOutput` error
	 * (if available) instead of `1`
	 *
	 * @default false
	 */
	useProcessExitCode?: boolean
}

/**
 * Catch zx ProcessOutput errors and exit to prevent showing the stack trace.
 *
 * Useful when using zx + commander
 *
 * @example Run command and catch process errors
 * ```ts
 * import { program } from '@commander-js/extra-typings'
 *
 * program
 *   .name('mycli')
 *
 *   // Don't hang for unresolved promises
 *   .hook('postAction', () => process.exit(0))
 *   .parseAsync()
 *   .catch((e) => {
 *     // Don't show giant stacktrace for process errors
 *     if (e instanceof ProcessOutput) {
 *       process.exit(1)
 *     } else {
 *       throw e
 *     }
 *  })
 * ```
 */
export function catchProcessError({ useProcessExitCode }: CatchProcessErrorOptions = {}) {
	return (err: unknown): never => {
		// Don't show giant stacktrace for process errors
		if (err instanceof ProcessOutput) {
			if (useProcessExitCode) {
				process.exit(err.exitCode ?? 1)
			} else {
				process.exit(1)
			}
		} else {
			throw err
		}
	}
}
