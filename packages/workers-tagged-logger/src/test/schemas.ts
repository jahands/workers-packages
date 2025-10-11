import { z } from 'zod'

/**
 * Schema for $logger object with level property
 * Used in tests to validate logger metadata with type safety
 */
export type LoggerAutoTags = z.infer<typeof LoggerAutoTags>
export const LoggerAutoTags = z.object({
	method: z.string().optional(),
	rootMethod: z.string().optional(),
	level: z.string(),
})
