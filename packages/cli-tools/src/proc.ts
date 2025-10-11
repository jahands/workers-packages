import type { Writable } from 'node:stream'

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
		}
	}
	return opts
}

/**
 * Helper to process a chunk and write/buffer lines
 */
function processChunk(
	chunk: Buffer | string,
	bufferObj: { buffer: string }, // Pass buffer by reference
	outputLines: string[],
	opts: PrefixOptions,
	streamToWrite: Writable,
	lastChunkEndedWithNewlineObj: { value: boolean } // Pass by reference
): void {
	const chunkStr = chunk.toString()
	bufferObj.buffer += chunkStr
	lastChunkEndedWithNewlineObj.value = chunkStr.endsWith('\n')
	let newlineIndex
	while ((newlineIndex = bufferObj.buffer.indexOf('\n')) !== -1) {
		const line = bufferObj.buffer.substring(0, newlineIndex)
		const prefixedLine = opts.prefix + line
		if (opts.groupOutput) {
			outputLines.push(prefixedLine)
		} else {
			streamToWrite.write(prefixedLine + '\n')
		}
		bufferObj.buffer = bufferObj.buffer.substring(newlineIndex + 1)
	}
}

// Helper to handle the final fragment of a buffer
function handleFinalFragment(
	bufferObj: { buffer: string },
	outputLines: string[],
	opts: PrefixOptions,
	streamToWrite: Writable
): void {
	// Returns true if fragment existed and was processed
	if (bufferObj.buffer.length > 0) {
		const prefixedLine = opts.prefix + bufferObj.buffer
		if (opts.groupOutput) {
			outputLines.push(prefixedLine)
		} else {
			streamToWrite.write(prefixedLine)
		}
		bufferObj.buffer = '' // Clear buffer after handling fragment
	}
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
	proc.stdout.setEncoding('utf-8')
	proc.stderr.setEncoding('utf-8')

	// Use objects to pass buffer/boolean by reference
	const stdoutBuffer = { buffer: '' }
	const stderrBuffer = { buffer: '' }
	const lastStdoutEndedNewline = { value: true }
	const lastStderrEndedNewline = { value: true }
	const outputLines: string[] = []

	const stdoutPromise = new Promise<void>((resolve, reject) => {
		proc.stdout.on('data', (chunk) => {
			try {
				processChunk(chunk, stdoutBuffer, outputLines, opts, process.stdout, lastStdoutEndedNewline)
			} catch (error) {
				reject(error) // Propagate errors
			}
		})
		proc.stdout.on('end', resolve)
		proc.stdout.on('error', reject) // Handle stream errors
	})

	const stderrPromise = new Promise<void>((resolve, reject) => {
		proc.stderr.on('data', (chunk) => {
			try {
				// Write stderr chunks to process.stderr when not grouping
				processChunk(chunk, stderrBuffer, outputLines, opts, process.stderr, lastStderrEndedNewline)
			} catch (error) {
				reject(error) // Propagate errors
			}
		})
		proc.stderr.on('end', resolve)
		proc.stderr.on('error', reject) // Handle stream errors
	})

	// Wait for the process to exit *and* both streams to end
	// Catch potential process errors during the wait
	try {
		await Promise.all([stdoutPromise, stderrPromise, proc])
	} catch (error) {
		// If the error is a ProcessOutput from zx, logAndThrow will handle it if called later.
		// If it's a stream error or other error, rethrow it.
		if (!(error instanceof ProcessOutput)) {
			throw error
		}
		// Allow ProcessOutput errors to be potentially handled later (e.g., by .catch(logAndThrow))
		// We still need to potentially process remaining buffer contents below.
	}

	// Handle final fragments only after both streams ended
	handleFinalFragment(stdoutBuffer, outputLines, opts, process.stdout)
	// Write final stderr fragment to process.stderr when not grouping
	handleFinalFragment(stderrBuffer, outputLines, opts, process.stderr)

	// Write grouped output
	if (opts.groupOutput) {
		if (opts.groupPrefix !== undefined) {
			outputLines.unshift(opts.groupPrefix)
		}

		if (opts.groupSuffix !== undefined || opts.includeDuration) {
			let suffix = opts.groupSuffix ?? ''
			if (opts.includeDuration) {
				const duration = Date.now() - start
				const durationStr = duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(3)}s`

				const space = suffix.length > 0 ? ' ' : ''
				suffix = `${chalk.gray(`[${durationStr}]`)}${space}${suffix}`
			}
			outputLines.push(suffix)
		}

		if (outputLines.length > 0) {
			process.stdout.write(outputLines.join('\n'))
		}
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

	for await (const chunk of proc.stdout) {
		const chunkStr = chunk.toString()
		buffer += chunkStr
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
	}

	// Write grouped output
	if (opts?.groupOutput) {
		if (opts.groupPrefix !== undefined) {
			outputLines.unshift(opts.groupPrefix)
		}

		if (opts.groupSuffix !== undefined || opts.includeDuration) {
			let suffix = opts.groupSuffix ?? ''
			if (opts.includeDuration) {
				const duration = Date.now() - start
				const durationStr = duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(3)}s`

				const space = suffix.length > 0 ? ' ' : ''
				suffix = `${chalk.gray(`[${durationStr}]`)}${space}${suffix}`
			}
			outputLines.push(suffix)
		}

		process.stdout.write(outputLines.join('\n'))
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

	for await (const chunk of proc.stderr) {
		const chunkStr = chunk.toString()
		buffer += chunkStr
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
	}

	// Write grouped output
	if (opts?.groupOutput) {
		if (opts.groupPrefix !== undefined) {
			outputLines.unshift(opts.groupPrefix)
		}

		if (opts.groupSuffix !== undefined || opts.includeDuration) {
			let suffix = opts.groupSuffix ?? ''
			if (opts.includeDuration) {
				const duration = Date.now() - start
				const durationStr = duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(3)}s`

				const space = suffix.length > 0 ? ' ' : ''
				suffix = `${chalk.gray(`[${durationStr}]`)}${space}${suffix}`
			}
			outputLines.push(suffix)
		}

		process.stderr.write(outputLines.join('\n'))
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
