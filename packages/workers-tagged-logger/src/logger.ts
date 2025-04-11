/* eslint-disable @typescript-eslint/no-explicit-any */
import { AsyncLocalStorage } from 'node:async_hooks'
import { z } from 'zod'

type LogValue = z.infer<typeof LogValue>
const LogValue = z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])

/** Log tags to attach to logs */
export type LogTags = z.infer<typeof LogTags>
export const LogTags = z.record(LogValue.or(z.record(LogValue).or(LogValue.array())))

/** Top-level fields to add to the log */
export type LogFields = LogTags
export const LogFields = LogTags

export type LogLevel = z.infer<typeof LogLevel>
export const LogLevel = z.enum(['info', 'log', 'warn', 'error', 'debug'])

/**
 * Converts a string based log-level into a number. Useful for filtering out for
 * configured log levels.
 */
function logLevelToNumber(logLevel: LogLevel): number {
	switch (logLevel) {
		case 'debug':
			return 0
		case 'info':
			return 1
		case 'log':
			return 1
		case 'warn':
			return 2
		case 'error':
			return 3
	}
}

type LogFn = (...msgs: any[]) => void
type LogLevelFns = {
	[K in LogLevel]: LogFn
}

export type ConsoleLog = z.infer<typeof ConsoleLog>
export const ConsoleLog = z
	.object({
		message: z.union([z.string(), z.instanceof(Error), z.undefined()]),
		level: LogLevel,
		time: z.string(),
		tags: LogTags.optional(),
	})
	.passthrough()

const als = new AsyncLocalStorage<LogTags>()

export interface WorkersLoggerOptions {
	/**
	 * Tags to add to all logs (overriding existing tags).
	 * Only applies to this instance (and sub-instances) of the logger.
	 */
	tags?: LogTags
	/**
	 * Fields to apply to all logs in the current WorkersLogger.
	 * Does not apply globally - only the logger instance
	 * (or child instance) that logger.withFields() was called.
	 */
	fields?: LogFields
	/**
	 * Minimum log level for logger, inclusive. Logging levels below the minimum set are ignored.
	 *
	 * Defaults to the lowest level: `debug`.
	 */
	minimumLogLevel?: LogLevel
}

/**
 * Similar to WorkersLogger but allows setting
 * metadata for the returned logger instance rather
 * than applying globally.
 *
 * @example
 *
 * Create a typed logger
 *
 * ```ts
 * type MyTags = {
 *   build_id: number
 *   build_uuid: string
 * }
 * const logger = new WorkersLogger<MyTags>()
 * logger.setTags({
 *   build_id: 123 // auto-completes!
 * })
 * ```
 */
export class WorkersLogger<T extends LogTags> implements LogLevelFns {
	private ctx: WorkersLoggerOptions = {}

	constructor(opts: WorkersLoggerOptions = {}) {
		Object.assign(this.ctx, structuredClone(opts))
	}

	/**
	 * Returns a new context logger where all logs will have these
	 * tags added (overwriting conflicting tags.) Only this instance
	 * (or sub-instances) will contain these tags.
	 */
	withTags(tags: Partial<T & LogTags>): WorkersLogger<Partial<T & LogTags>> {
		return new WorkersLogger({
			...this.ctx,
			tags: structuredClone(Object.assign({}, this.ctx.tags, tags)),
		})
	}

	/**
	 * Returns a new context logger where all logs will have these
	 * fields added (overwriting conflicting fields.) Only this instance
	 * (or sub-instances) will contain these fields.
	 *
	 * Fields are similar to tags, but are set at the top-level of the logger.
	 * Most of the time, tags are preferred. But there are cases where
	 * setting top-level fields is preferred (such as setting `timestamp`.)
	 */
	withFields(fields: Partial<LogFields>): WorkersLogger<Partial<T>> {
		return new WorkersLogger({
			...this.ctx,
			fields: structuredClone(Object.assign({}, this.ctx.fields, fields)),
		})
	}

	private getFields(): Partial<LogFields> {
		return this.ctx.fields ?? {}
	}

	/**
	 * Get global tags stored in async context. Excludes
	 * tags set on this instance using withTags())
	 */
	private getParentTags(): Partial<T & LogTags> | undefined {
		const tags = als.getStore()
		if (tags === undefined) {
			return undefined
		}
		return tags as Partial<T & LogTags>
	}

	/**
	 * Get all tags (including global + context tags)
	 */
	getTags(): Partial<T & LogTags> {
		const parentTags = this.getParentTags()
		if (parentTags === undefined) {
			// Log error specifically when trying to get tags for logging but context is missing
			console.log({
				message: `Error: unable to get log tags from async local storage. Did you forget to wrap the entry point with @WithLogTags() or withLogTags()?`,
				level: 'error',
				time: new Date().toISOString(),
			} satisfies ConsoleLog)
			// Return instance tags only if context is missing
			return (this.ctx.tags ?? {}) as Partial<T & LogTags>
		}
		return Object.assign({}, parentTags, this.ctx.tags) as Partial<T & LogTags>
	}

	/** Set tags used for all logs in this async context
	 * and any child context (unless overridden using withTags) */
	setTags(tags: Partial<T & LogTags>): void {
		const globalTags = als.getStore()
		if (globalTags === undefined) {
			console.log({
				message: `Error: unable to set log tags in async local storage. Did you forget to wrap the entry point with @WithLogTags() or withLogTags()?`,
				level: 'error',
				time: new Date().toISOString(),
			} satisfies ConsoleLog)
			return
		}
		Object.assign(globalTags, structuredClone(tags))
	}

	info = (...msgs: any[]): void => this.write(msgs, 'info')
	log = (...msgs: any[]): void => this.write(msgs, 'log')
	warn = (...msgs: any[]): void => this.write(msgs, 'warn')
	error = (...msgs: any[]): void => this.write(msgs, 'error')
	debug = (...msgs: any[]): void => this.write(msgs, 'debug')

	private write(msgs: any[], level: LogLevel): void {
		const minimumLogLevel = this.ctx.minimumLogLevel ?? 'debug'
		// don't do anything if log is below minimum level
		if (logLevelToNumber(level) < logLevelToNumber(minimumLogLevel)) {
			return
		}

		const tags = this.getTags() // This now handles the error logging if context is missing
		let message: string | Error | undefined // Allow Error type for better handling
		let extraData: Record<string, any> | undefined

		if (Array.isArray(msgs)) {
			if (msgs.length === 0) {
				message = undefined
			} else {
				const firstArg = msgs[0]
				if (firstArg instanceof Error) {
					message = firstArg // Keep the Error object
					if (msgs.length > 1) {
						// Treat remaining args as extra data if the first is an Error
						extraData = { details: msgs.slice(1) }
					}
				} else if (typeof firstArg === 'string') {
					message = stringifyMessages(...msgs) // Original behavior for strings/multiple args
				} else if (msgs.length === 1) {
					// Handle single non-string, non-error arg
					message = stringifyMessage(firstArg)
				} else {
					// Handle multiple non-string args (treat first as message, rest as extra)
					message = stringifyMessage(firstArg)
					extraData = { details: msgs.slice(1) }
				}
			}
		}

		const logEntry: ConsoleLog & Record<string, any> = {
			// Use Record<string, any> for passthrough fields
			message: message instanceof Error ? message.message : message, // Log error message string
			level,
			time: new Date().toISOString(),
			...(message instanceof Error && {
				error: {
					name: message.name,
					message: message.message,
					stack: message.stack,
				},
			}), // Add structured error info
			...(Object.keys(tags).length > 0 && { tags }),
			...this.getFields(), // Add top-level fields from withFields
			...(extraData && { data: extraData }), // Add extra data if present
		}

		// Use console[level] for better integration with some log collectors
		const consoleFn = console[level] ?? console.log
		consoleFn(logEntry)
	}
}

export function stringifyMessages(...msgs: any[]): string {
	return msgs.map(stringifyMessage).join(' ')
}

export function stringifyMessage(msg: any): string {
	if (msg === undefined || msg === null) {
		return `${msg}`
	}
	if (typeof msg === 'string') {
		return msg
	}
	if (typeof msg === 'number' || typeof msg === 'boolean') {
		return msg.toString()
	}
	if (typeof msg === 'function') {
		return `[function${msg.name ? `: ${msg.name}` : ''}()]`
	}
	if (msg instanceof Error) {
		return `${msg.name}: ${msg.message}`
	}
	try {
		return JSON.stringify(msg)
	} catch (e) {
		// may throw error if there are circular references
		return '[unserializable object]'
	}
}

interface WithLogTagsOptions<T extends LogTags> {
	/** The source of the logs (e.g. the application name)  */
	source?: string
	/** Tags to add to all logs in this async context */
	tags?: Partial<T & LogTags>
}

/**
 * Run a function with logging metadata attached to all logs.
 * Nested calls will inherit all metadata on the parent at the
 * time it was created. Future updates to the parent will not be
 * propagated to the child.
 *
 * @param opts.source Tag for source of these logs (e.g. the Worker name.)
 * @param opts.tags Additional tags to set
 * @param fn Function to run within the async context that
 * will allow using the WorkersLogger
 *
 * @see WithLogTags decorator for simpler use in classes
 */
export function withLogTags<T extends LogTags, R>(
	opts: WithLogTagsOptions<Partial<T & LogTags>>,
	fn: () => R
): R {
	const existing = als.getStore()
	let sourceTag: { source: string } | undefined
	const sourceOpt = opts.source
	if (sourceOpt !== undefined) {
		sourceTag = { source: sourceOpt }
	}
	// Note: existing won't exist when withLogTags() is first called
	// Create a new object for the store, inheriting from existing
	const newTags = structuredClone(Object.assign({}, existing, sourceTag, opts.tags))
	return als.run(newTags, fn)
}

/**
 * Decorator to wrap a class method with logging metadata attached to all logs
 * within its execution context using AsyncLocalStorage.
 * Automatically adds the decorated method's name as the `_methodName` tag.
 * Nested calls will inherit metadata.
 *
 * @param opts Options including source and initial tags.
 * @param opts.source Tag for the source of these logs (e.g., the Worker name or class name).
 * @param opts.tags Additional tags to set for this context. User-provided tags
 *                  will override existing tags but NOT the automatically added `_methodName`.
 *
 * @example
 *
 * Create class to handle requests with log tags added
 *
 * ```ts
 * // ... imports and logger setup ...
 * class MyService {
 *   // remove the \ before the @ (this is a workaround for VS Code docstring issues)
 *   \@WithLogTags<MyTags>({ source: 'MyService' }) // _methodName: 'handleRequest' will be added
 *   async handleRequest(requestId: string, request: Request) {
 *     logger.setTags({ requestId })
 *     logger.info('Handling request') // -> tags: { source: 'MyService', _methodName: 'handleRequest', requestId: '...' }
 *     await this.processRequest(request)
 *     logger.info('Request handled')
 *   }
 *
 *   @WithLogTags<MyTags>({ source: 'MyServiceHelper' }) // _methodName: 'processRequest' will be added
 *   async processRequest(request: Request) {
 *      // Inherits requestId from handleRequest's context
 *      // Tags here: { source: 'MyServiceHelper', _methodName: 'processRequest', requestId: '...' }
 *     logger.debug('Processing request...')
 *     // ...
 *     logger.debug('Request processed')
 *   }
 * }
 * ```
 */
export function WithLogTags<T extends LogTags>(opts: WithLogTagsOptions<Partial<T & LogTags>>) {
	return function (
		_target: any,
		propertyKey: string | symbol, // The name of the method
		descriptor: PropertyDescriptor
	): PropertyDescriptor {
		const originalMethod = descriptor.value
		const methodName = String(propertyKey) // Get the method name as a string

		if (typeof originalMethod !== 'function') {
			throw new Error(
				`@WithLogTags decorator can only be applied to methods, not properties like ${methodName}.`
			)
		}

		descriptor.value = function (...args: any[]) {
			const existing = als.getStore()
			let sourceTag: { source: string } | undefined
			const sourceOpt = opts.source
			if (sourceOpt !== undefined) {
				sourceTag = { source: sourceOpt }
			}

			// Define the method name tag
			const methodTag = { _methodName: methodName } satisfies Record<string, string>

			// Create the new tags object for the ALS context
			// Merge order: existing -> source -> user opts -> method name (method name takes precedence)
			const newTags = structuredClone(Object.assign({}, existing, sourceTag, opts.tags, methodTag))

			// Run the original method within the AsyncLocalStorage context
			return als.run(newTags, () => {
				return originalMethod.apply(this, args)
			})
		}

		return descriptor
	}
}
