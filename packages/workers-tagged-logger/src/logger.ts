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
			console.log({
				message: `Error: unable to get log tags from async local storage. did you forget to wrap the function using withLogTags() ?`,
				level: 'error',
				time: new Date().toISOString(),
			} satisfies ConsoleLog)
			return
		}
		return tags as Partial<T & LogTags>
	}

	/**
	 * Get all tags (including global + context tags)
	 */
	getTags(): Partial<T & LogTags> {
		return Object.assign({}, this.getParentTags(), this.ctx.tags) as Partial<T & LogTags>
	}

	/** Set tags used for all logs in this async context
	 * and any child context (unless overridden using withTags) */
	setTags(tags: Partial<T & LogTags>): void {
		const globalTags = this.getParentTags()
		if (globalTags !== undefined) {
			// no need to log when we don't have global tags because
			// getParentTags already logs it.
			Object.assign(globalTags, structuredClone(tags))
		}
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

		const tags = this.getTags()
		let message: string | undefined
		if (Array.isArray(msgs)) {
			if (msgs.length === 0) {
				message = undefined
			} else if (msgs.length === 1) {
				message = stringifyMessage(msgs[0])
			} else {
				message = stringifyMessages(msgs)
			}
		}

		const log: ConsoleLog = {
			message,
			level,
			time: new Date().toISOString(),
		}
		if (Object.keys(tags).length > 0) {
			log.tags = tags
		}
		console.log(Object.assign({}, log, this.getFields()))
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

type WrappedFn = (
	target: any,
	propertyKey: string | symbol,
	descriptor: PropertyDescriptor
) => PropertyDescriptor

/**
 * Decorator to wrap a class method with logging metadata attached to all logs
 * within its execution context using AsyncLocalStorage.
 *
 * **IMPORTANT**: Requires `"experimentalDecorators": true` to be added to tsconfig.json
 *
 * Automatically adds:
 *   - `$logger.methodName`: The name of the currently executing decorated method.
 *   - `$logger.rootMethodName`: The name of the first decorated method entered in the async context.
 * Nested calls will inherit metadata.
 *
 * @param source Tag for the source of these logs (e.g., the Worker name or class name).
 *
 * @example
 *
 * Create class to handle requests with log tags added
 *
 * ```ts
 * // ... imports and logger setup ...
 * class MyService {
 *   // remove the \ before the @ (this is a workaround for VS Code docstring issues)
 *   \@WithLogTags<MyTags>({ source: 'MyService' }) // $logger.methodName: 'handleRequest' will be added
 *   async handleRequest(requestId: string, request: Request) {
 *     logger.setTags({ requestId })
 *     logger.info('Handling request') // -> tags: { source: 'MyService', '$logger.methodName': 'handleRequest', requestId: '...' }
 *     await this.processRequest(request)
 *     logger.info('Request handled')
 *   }
 *
 *   // $logger.methodName: 'processRequest' will be added
 *   // and $logger.rootMethodName will remain 'handleRequest'
 *   \@WithLogTags<MyTags>({ source: 'MyServiceHelper' })
 *   async processRequest(request: Request) {
 *      // Inherits requestId from handleRequest's context
 *      // Tags here: { source: 'MyServiceHelper', '$logger.methodName': 'processRequest', '$logger.rootMethodName': 'handleRequest', requestId: '...' }
 *     logger.debug('Processing request...')
 *     // ...
 *     logger.debug('Request processed')
 *   }
 * }
 * ```
 */
export function WithLogTags<T extends LogTags>(source: string): WrappedFn
/**
 * Decorator to wrap a class method with logging metadata attached to all logs
 * within its execution context using AsyncLocalStorage.
 *
 * **IMPORTANT**: Requires `"experimentalDecorators": true` to be added to tsconfig.json
 *
 * Automatically adds:
 *   - `$logger.methodName`: The name of the currently executing decorated method.
 *   - `$logger.rootMethodName`: The name of the first decorated method entered in the async context.
 * Nested calls will inherit metadata.
 *
 * @param opts Options including source and initial tags.
 * @param opts.source Tag for the source of these logs (e.g., the Worker name or class name).
 * @param opts.tags Additional tags to set for this context. User-provided tags
 *                  will override existing tags but NOT the automatically added logger tags.
 *
 * @example
 *
 * Create class to handle requests with log tags added
 *
 * ```ts
 * // ... imports and logger setup ...
 * class MyService {
 *   // remove the \ before the @ (this is a workaround for VS Code docstring issues)
 *   \@WithLogTags<MyTags>({ source: 'MyService' }) // $logger.methodName: 'handleRequest' will be added
 *   async handleRequest(requestId: string, request: Request) {
 *     logger.setTags({ requestId })
 *     logger.info('Handling request') // -> tags: { source: 'MyService', '$logger.methodName': 'handleRequest', requestId: '...' }
 *     await this.processRequest(request)
 *     logger.info('Request handled')
 *   }
 *
 *   // $logger.methodName: 'processRequest' will be added
 *   // and $logger.rootMethodName will remain 'handleRequest'
 *   \@WithLogTags<MyTags>({ source: 'MyServiceHelper' })
 *   async processRequest(request: Request) {
 *      // Inherits requestId from handleRequest's context
 *      // Tags here: { source: 'MyServiceHelper', '$logger.methodName': 'processRequest', '$logger.rootMethodName': 'handleRequest', requestId: '...' }
 *     logger.debug('Processing request...')
 *     // ...
 *     logger.debug('Request processed')
 *   }
 * }
 * ```
 */
export function WithLogTags<T extends LogTags>(
	opts: WithLogTagsOptions<Partial<T & LogTags>>
): WrappedFn
export function WithLogTags<T extends LogTags>(
	optsOrSource: WithLogTagsOptions<Partial<T & LogTags>> | string
): WrappedFn {
	return function (
		_target: any,
		propertyKey: string | symbol, // The name of the method
		descriptor: PropertyDescriptor
	): PropertyDescriptor {
		const methodName = String(propertyKey) // Get the current method name

		if (descriptor === undefined || typeof descriptor.value !== 'function') {
			// Throw the custom error if descriptor is missing (like for a property)
			// or if descriptor.value isn't a function (e.g., getter/setter)
			throw new Error(
				`@WithLogTags decorator can only be applied to methods, not properties like ${methodName}.`
			)
		}

		const originalMethod = descriptor.value

		descriptor.value = function (...args: any[]) {
			const existing = als.getStore()

			// Determine the root method name
			// If rootMethodName already exists in the context, use it.
			// Otherwise, this is the root call, so use the current method name.
			const rootMethodName = existing?.['$logger.rootMethodName'] ?? methodName

			// Prepare source tag if provided
			let sourceTag: { source: string } | undefined
			let userTags: LogTags | undefined
			if (typeof optsOrSource === 'string') {
				sourceTag = { source: optsOrSource }
			} else {
				if (optsOrSource.source !== undefined) {
					sourceTag = { source: optsOrSource.source }
				}
				if (optsOrSource.tags !== undefined) {
					userTags = optsOrSource.tags
				}
			}

			// Define the logger-specific tags for this context level
			const loggerTags = {
				'$logger.methodName': methodName, // Always the current method
				'$logger.rootMethodName': rootMethodName, // Inherited or current
			}

			// Create the new tags object for the ALS context
			// Merge order: existing -> source -> user opts -> logger tags (logger tags take precedence)
			const newTags = structuredClone(Object.assign({}, existing, sourceTag, userTags, loggerTags))

			// Run the original method within the AsyncLocalStorage context
			return als.run(newTags, () => {
				return originalMethod.apply(this, args)
			})
		}

		return descriptor
	}
}
