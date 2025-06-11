import { z } from 'zod/v4'

/**
 * Schema for $logger object with level property
 * Used in tests to validate logger metadata with type safety
 */
export type LoggerWithLevel = z.infer<typeof LoggerWithLevel>
export const LoggerWithLevel = z.object({
	method: z.string().optional(),
	rootMethod: z.string().optional(),
	level: z.string(),
})
