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

type LogFn = (...msgs: any[]) => void
type LogLevelFns = {
	[K in LogLevel]: LogFn
}

export type ConsoleLog = z.infer<typeof ConsoleLog>
export const ConsoleLog = z
	.object({
		message: z.any().or(z.any().array()),
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
	 * (or child instance) that log.withFields() was called.
	 */
	fields?: LogFields
}

/**
 * Similar to WorkersLogger but allows setting
 * metadata for the returned logger instance rather
 * than applying globally.
 *
 * @example Create a typed logger:
 * ```ts
 * type CustomTagHints = {
 *   build_id: number
 *   build_uuid: string
 * }
 * const log = new WorkersLogger<CustomTagHints>()
 * log.setTags({
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
	 * Fields are similar to tags, but are set at the top-level of the log.
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
	private getGlobalTags(): Partial<T & LogTags> | undefined {
		const tags = als.getStore()
		if (tags === undefined) {
			console.log({
				message: new Error(
					`unable to get log tags from async local storage. did you forget to wrap the function using withLogTags() ?`
				),
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
	private getTags(): Partial<T & LogTags> {
		return Object.assign({}, this.getGlobalTags(), this.ctx.tags) as Partial<T & LogTags>
	}

	/** Set tags used for all logs in this async context
	 * and any child context (unless overridden using withTags) */
	setTags(tags: Partial<T & LogTags>): void {
		const globalTags = this.getGlobalTags()
		if (globalTags !== undefined) {
			// no need to log when we don't have global tags because
			// getGlobalTags already logs it.
			Object.assign(globalTags, structuredClone(tags))
		}
	}

	info = (...msgs: any[]): void => this.write(msgs, 'info')
	log = (...msgs: any[]): void => this.write(msgs, 'log')
	warn = (...msgs: any[]): void => this.write(msgs, 'warn')
	error = (...msgs: any[]): void => this.write(msgs, 'error')
	debug = (...msgs: any[]): void => this.write(msgs, 'debug')

	private write(msgs: any[], level: LogLevel): void {
		const tags = this.getTags()
		let message: any | any[]
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
	if (typeof msg === 'string') {
		return msg
	}
	if (typeof msg === 'number') {
		return msg.toString()
	}
	if (typeof msg === 'boolean') {
		return `${msg}`
	}
	if (typeof msg === 'function') {
		return `[function: ${msg.name}()]`
	}
	if (typeof msg === 'object') {
		if (msg instanceof Error) {
			return `${msg.name}: ${msg.message}${msg.stack !== undefined ? `\n${msg.stack}` : ''}`
		}
	}
	return JSON.stringify(msg)
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
 * @param opts.source Tag for source of these logs (e.g. the Worker name.)
 * @param opts.tags Additional tags to set
 * @param fn Function to run within the async context that
 * will allow using the WorkersLogger
 *
 * @example
 * ```
 * import { withLogTags, WorkersLogger } from './workers-logger'
 * const log = new WorkersLogger<TagHints>() // put this anywhere!
 * const res = await withLogTags({ source: 'wci-internal-api' }, async () => {
 *   log.setTags({ cf_account_id: 123 })
 *   log.info('hello world!') // ->
 *   // {
 *   //   message: 'hello world!',
 *   //   { tags: { source: 'wci-internal-api', cf_account_id: 123 } }
 *   // }
 * 	 return new Response('hello world!')
 * })
 * ```
 */
export async function withLogTags<T extends LogTags, R>(
	opts: WithLogTagsOptions<Partial<T & LogTags>>,
	fn: () => Promise<R>
): Promise<R> {
	const existing = als.getStore()
	let source: { source: string } | undefined
	const sourceOpt = opts.source
	if (sourceOpt !== undefined) {
		source = { source: sourceOpt }
	}
	// Note: existing won't exist when withLogTags() is first called
	return als.run(structuredClone(Object.assign({}, existing, source, opts.tags)), fn)
}
