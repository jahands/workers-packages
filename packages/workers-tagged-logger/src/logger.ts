import { AsyncLocalStorage } from 'node:async_hooks'

export type LogValue =
	| string
	| number
	| boolean
	| Date // Workers Logs allow logging Date objects
	| null
	| undefined
	| { [key: string]: LogValue }
	| LogValue[]

/** Log tags to attach to logs */
export type LogTags = {
	[key: string]: LogValue
}

/** Top-level fields to add to the log */
export type LogFields = LogTags

export type LogLevel = 'info' | 'log' | 'warn' | 'error' | 'debug'

export type ConsoleLog = {
	message?: string | Error | undefined
	level: LogLevel
	time: string
	tags?: LogTags
}

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

/** Context stored in AsyncLocalStorage containing both tags and log level */
export type LogContext = {
	tags: LogTags
	logLevel?: LogLevel
}

export const als = new AsyncLocalStorage<LogContext>()

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
		const context = als.getStore()
		if (context === undefined) {
			console.log({
				message: `Warning: unable to get log tags from async local storage. did you forget to wrap the function using withLogTags() ?`,
				level: 'warn',
				time: new Date().toISOString(),
			} satisfies ConsoleLog)
			return
		}
		return context.tags as Partial<T & LogTags>
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
		const context = als.getStore()
		if (context !== undefined) {
			// Update tags in the context
			Object.assign(context.tags, structuredClone(tags))
		} else {
			// Log warning if no context exists (same as getParentTags)
			console.log({
				message: `Warning: unable to get log tags from async local storage. did you forget to wrap the function using withLogTags() ?`,
				level: 'warn',
				time: new Date().toISOString(),
			} satisfies ConsoleLog)
		}
	}

	/** Set minimum log level for all loggers in the current AsyncLocalStorage context */
	setLogLevel(level: LogLevel): void {
		const context = als.getStore()
		if (context !== undefined) {
			// Update log level in the context
			context.logLevel = level
		} else {
			// Log warning if no context exists (same as setTags)
			console.log({
				message: `Warning: unable to get log tags from async local storage. did you forget to wrap the function using withLogTags() ?`,
				level: 'warn',
				time: new Date().toISOString(),
			} satisfies ConsoleLog)
		}
	}

	/** Create a new logger instance with the specified minimum log level */
	withLogLevel(level: LogLevel): WorkersLogger<T> {
		const newCtx = structuredClone(this.ctx)
		newCtx.minimumLogLevel = level
		return new WorkersLogger<T>(newCtx)
	}

	info = (...msgs: any[]): void => this.write(msgs, 'info')
	log = (...msgs: any[]): void => this.write(msgs, 'log')
	warn = (...msgs: any[]): void => this.write(msgs, 'warn')
	error = (...msgs: any[]): void => this.write(msgs, 'error')
	debug = (...msgs: any[]): void => this.write(msgs, 'debug')

	private write(msgs: any[], level: LogLevel): void {
		// Resolve minimum log level using priority order:
		// 1. Instance-specific level (this.ctx.minimumLogLevel)
		// 2. Context level (from ALS)
		// 3. Default level ('debug')
		const context = als.getStore()
		const contextLogLevel = context?.logLevel
		const minimumLogLevel = this.ctx.minimumLogLevel ?? contextLogLevel ?? 'debug'

		// don't do anything if log is below minimum level
		if (logLevelToNumber(level) < logLevelToNumber(minimumLogLevel)) {
			return
		}

		const tags = this.getTags()

		// Add current effective log level to $logger object only if $logger already exists
		const enhancedTags: any = { ...tags }
		if (enhancedTags.$logger && typeof enhancedTags.$logger === 'object') {
			enhancedTags.$logger = { ...enhancedTags.$logger, level: minimumLogLevel }
		}

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
		if (Object.keys(enhancedTags).length > 0) {
			log.tags = enhancedTags
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
		return `${msg.name}: ${msg.message}${msg.stack !== undefined ? `\n${msg.stack}` : ''}`
	}
	try {
		return JSON.stringify(msg)
	} catch {
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
	const existingContext = als.getStore()
	let sourceTag: { source: string } | undefined
	const sourceOpt = opts.source
	if (sourceOpt !== undefined) {
		sourceTag = { source: sourceOpt }
	}
	// Note: existingContext won't exist when withLogTags() is first called
	// Create a new context, inheriting from existing
	const newContext: LogContext = {
		tags: structuredClone(Object.assign({}, existingContext?.tags, sourceTag, opts.tags)),
		logLevel: existingContext?.logLevel, // Preserve existing log level
	}
	return als.run(newContext, fn)
}

/** Type alias for the actual decorator function returned */
type MethodDecoratorFn = (
	target: any,
	propertyKey: string | symbol,
	descriptor: PropertyDescriptor
) => PropertyDescriptor | void

/** Tags for the WithLogTags decorator */
type WithLogTagsDecoratorTags<T extends LogTags> = {
	/**
	 * Explicit source for logs. If omitted, the class name containing the
	 * decorated method will automatically be used as the source.
	 * @default Class name
	 */
	source?: string
} & Partial<T & LogTags>

/**
 * Decorator: Wraps a class method with logging context.
 * Automatically uses the Class Name as the log source.
 *
 * **IMPORTANT**: Requires `"experimentalDecorators": true` to be added to tsconfig.json
 *
 * Automatically adds:
 *   - `$logger.method`: The name of the currently executing decorated method.
 *   - `$logger.rootMethod`: The name of the first decorated method entered in the async context.
 * Nested calls will inherit metadata.
 *
 * @example
 *
 * Create class to handle requests with log tags added
 *
 * ```ts
 * // ... imports and logger setup ...
 * class MyService {
 *   // remove the \ before the @ (this is a workaround for VS Code docstring issues)
 *   \@WithLogTags() // $logger.method: 'handleRequest' will be added
 *   async handleRequest(requestId: string, request: Request) {
 *     logger.setTags({ requestId })
 *     logger.info('Handling request') // -> tags: { source: 'MyService', $logger: { method: 'handleRequest', rootMethod: 'handleRequest' }, requestId: '...' }
 *     await this.processRequest(request)
 *     logger.info('Request handled')
 *   }
 *
 *   // $logger.method: 'processRequest' will be added
 *   // and $logger.rootMethod will remain 'handleRequest'
 *   \@WithLogTags()
 *   async processRequest(request: Request) {
 *     // Inherits requestId from handleRequest's context
 *     // Tags here: { source: 'MyService', $logger: { method: 'processRequest', rootMethod: 'handleRequest' }, requestId: '...' }
 *     logger.debug('Processing request...')
 *     // ...
 *     logger.debug('Request processed')
 *   }
 * }
 * ```
 */
export function WithLogTags(): MethodDecoratorFn
/**
 * Decorator: Wraps a class method with logging context.
 * Uses the provided string as the log source.
 *
 * **IMPORTANT**: Requires `"experimentalDecorators": true` to be added to tsconfig.json
 *
 * Automatically adds:
 *   - `$logger.method`: The name of the currently executing decorated method.
 *   - `$logger.rootMethod`: The name of the first decorated method entered in the async context.
 * Nested calls will inherit metadata.
 *
 * @param source Explicit source for logs.
 *
 * @example
 *
 * Create class to handle requests with log tags added
 *
 * ```ts
 * // ... imports and logger setup ...
 * class MyService {
 *   // remove the \ before the @ (this is a workaround for VS Code docstring issues)
 *   \@WithLogTags<MyTags>('MyService') // $logger.method: 'handleRequest' will be added
 *   async handleRequest(requestId: string, request: Request) {
 *     logger.setTags({ requestId })
 *     logger.info('Handling request') // -> tags: { source: 'MyService', $logger: { method: 'handleRequest', rootMethod: 'handleRequest' }, requestId: '...' }
 *     await this.processRequest(request)
 *     logger.info('Request handled')
 *   }
 *
 *   // $logger.method: 'processRequest' will be added
 *   // and $logger.rootMethod will remain 'handleRequest'
 *   \@WithLogTags<MyTags>('MyServiceHelper')
 *   async processRequest(request: Request) {
 *      // Inherits requestId from handleRequest's context
 *       Tags here: { source: 'MyServiceHelper', $logger: { method: 'processRequest', rootMethod: 'handleRequest' }, requestId: '...' }
 *     logger.debug('Processing request...')
 *     // ...
 *     logger.debug('Request processed')
 *   }
 * }
 * ```
 */
export function WithLogTags(source: string): MethodDecoratorFn
/**
 * Decorator: Wraps a class method with logging context.
 * Uses options to configure source (falls back to Class Name) and initial tags.
 *
 * **IMPORTANT**: Requires `"experimentalDecorators": true` to be added to tsconfig.json
 *
 * Automatically adds:
 *   - `$logger.method`: The name of the currently executing decorated method.
 *   - `$logger.rootMethod`: The name of the first decorated method entered in the async context.
 * Nested calls will inherit metadata.
 *
 * @param tags Additional tags to set for this context. User-provided tags
 *             will override existing tags but NOT the automatically added logger tags.
 * @param tags.source Tag for the source of these logs (e.g., the Worker name or class name). Falls back to Class Name
 *
 * @example
 *
 * Create class to handle requests with log tags added
 *
 * ```ts
 * // ... imports and logger setup ...
 * class MyService {
 *   // remove the \ before the @ (this is a workaround for VS Code docstring issues)
 *   \@WithLogTags<MyTags>({ source: 'MyService' }) // $logger.method: 'handleRequest' will be added
 *   async handleRequest(requestId: string, request: Request) {
 *     logger.setTags({ requestId })
 *     logger.info('Handling request') // -> tags: { source: 'MyService', $logger.method: 'handleRequest', requestId: '...' }
 *     await this.processRequest(request)
 *     logger.info('Request handled')
 *   }
 *
 *   // $logger.method: 'processRequest' will be added
 *   // and $logger.rootMethod will remain 'handleRequest'
 *   \@WithLogTags<MyTags>({ foo: 'bar' })
 *   async processRequest(request: Request) {
 *      // Inherits requestId from handleRequest's context
 *      // Tags here: { source: 'MyService', foo: 'bar', $logger.method: 'processRequest', $logger.rootMethod: 'handleRequest', requestId: '...' }
 *     logger.debug('Processing request...')
 *     // ...
 *     logger.debug('Request processed')
 *   }
 * }
 * ```
 */
export function WithLogTags<T extends LogTags>(
	tags: WithLogTagsDecoratorTags<Partial<T & LogTags>>
): MethodDecoratorFn
export function WithLogTags<T extends LogTags>(
	/** Optional configuration: string is explicit source, object allows source/tags, undefined uses class name */
	sourceOrTags?: string | WithLogTagsDecoratorTags<Partial<T & LogTags>>
): MethodDecoratorFn {
	// This is the function returned that acts as the decorator
	return function (
		target: any, // Class prototype (instance) or constructor (static)
		propertyKey: string | symbol,
		descriptor: PropertyDescriptor
	): PropertyDescriptor {
		const method = String(propertyKey)

		// Validate descriptor (ensure it's a method)
		if (descriptor === undefined || typeof descriptor.value !== 'function') {
			throw new Error(
				`@WithLogTags decorator can only be applied to methods, not properties like ${method}.`
			)
		}

		let explicitSource: string | undefined
		let userTags: LogTags | undefined

		if (typeof sourceOrTags === 'string') {
			explicitSource = sourceOrTags
		} else if (sourceOrTags) {
			explicitSource = sourceOrTags.source
			userTags = sourceOrTags
		}

		let inferredClassName: string | undefined = 'UnknownClass'
		if (typeof target === 'function') {
			inferredClassName = target.name || inferredClassName
		} else if (target !== undefined && typeof target.constructor === 'function') {
			inferredClassName = target.constructor.name || inferredClassName
		}

		// Get original method and wrap it
		const originalMethod = descriptor.value

		descriptor.value = function (...args: any[]): MethodDecoratorFn {
			const existingContext = als.getStore()
			let rootMethod = method
			if (
				existingContext &&
				existingContext.tags.$logger &&
				typeof existingContext.tags.$logger === 'object' &&
				!Array.isArray(existingContext.tags.$logger) &&
				!(existingContext.tags.$logger instanceof Date) &&
				typeof existingContext.tags.$logger.rootMethod === 'string'
			) {
				rootMethod = existingContext.tags.$logger.rootMethod
			}

			const finalSource = explicitSource ?? existingContext?.tags.source ?? inferredClassName
			const sourceTag = { source: finalSource }

			// Define the logger-specific tags for this context level
			const loggerTags = {
				$logger: {
					method: method, // Always the current method
					rootMethod: rootMethod, // Inherited or current
				},
			}

			// Create the new context for the ALS
			// Merge order: existing tags -> final source -> user tags -> logger tags
			const newContext: LogContext = {
				tags: structuredClone(
					Object.assign(
						{},
						existingContext?.tags,
						sourceTag, // Use the determined source tag
						userTags, // Add user tags if provided
						loggerTags // Logger tags take precedence
					)
				),
				logLevel: existingContext?.logLevel, // Preserve existing log level
			}

			// Run the original method within the AsyncLocalStorage context
			return als.run(newContext, () => {
				return originalMethod.apply(this, args)
			})
		}

		return descriptor
	}
}
