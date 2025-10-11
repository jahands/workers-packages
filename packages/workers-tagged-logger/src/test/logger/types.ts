import { z } from 'zod'

import type {
	ConsoleLog as XConsoleLog,
	LogFields as XLogFields,
	LogLevel as XLogLevel,
	LogTags as XLogTags,
	LogValue as XLogValue,
} from '../../logger.js'

// Zod version of types for improved testing. Keep in sync with src/logger.ts

export type LogValue =
	| string
	| number
	| boolean
	| Date
	| null
	| undefined
	| { [key: string]: LogValue }
	| LogValue[]

const logValueSchema: z.ZodType<LogValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.date(),
		z.null(),
		z.undefined(),
		z.record(z.string(), logValueSchema), // Recursive object definition
		z.array(logValueSchema), // Recursive array definition
	])
)

/** Log tags to attach to logs */
export type LogTags = z.infer<typeof LogTags>
export const LogTags = z.record(z.string(), logValueSchema)

/** Top-level fields to add to the log */
export type LogFields = LogTags
export const LogFields = LogTags

export type LogLevel = z.infer<typeof LogLevel>
export const LogLevel = z.enum(['info', 'log', 'warn', 'error', 'debug'])

export type ConsoleLog = z.infer<typeof ConsoleLog>
export const ConsoleLog = z
	.object({
		message: z.union([z.string(), z.instanceof(Error), z.undefined()]).optional(),
		level: LogLevel,
		time: z.string(),
		tags: LogTags.optional(),
	})
	.loose()

// assertions to ensure the schemas match the real types

type Satisfies<U, T extends U> = T

type _1 = Satisfies<LogValue, XLogValue>
type _2 = Satisfies<LogTags, XLogTags>
type _3 = Satisfies<LogFields, XLogFields>
type _4 = Satisfies<LogLevel, XLogLevel>
type _5 = Satisfies<ConsoleLog, XConsoleLog>

type _6 = Satisfies<XLogValue, LogValue>
type _7 = Satisfies<XLogTags, LogTags>
type _8 = Satisfies<XLogFields, LogFields>
type _9 = Satisfies<XLogLevel, LogLevel>
type _10 = Satisfies<XConsoleLog, ConsoleLog>
