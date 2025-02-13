import { z } from 'zod'

import { withLogTags, WorkersLogger } from './logger.js'

import type { Context as HonoContext, Handler as HonoHandler, Next as HonoNext } from 'hono'
import type { LogTags } from './logger.js'

export type LoggerHonoBindings = z.infer<typeof LoggerHonoBindings>
export const LoggerHonoBindings = z.object({ ENVIRONMENT: z.string().min(1).optional() })

/**
 * Hono middleware to activate the WorkersLogger AsyncLocalStorage context
 * @param source Source of the logs (e.g. the name of the Worker)
 * @param tags Additional tags to add to all logs
 */
export function useWorkersLogger<T extends LogTags>(
	source: string,
	tags?: Partial<T & LogTags>
): HonoHandler {
	return (c: HonoContext, next: HonoNext): Promise<void> => {
		return withLogTags({ source }, () => {
			// We can create a new logger here because each logger
			// instance will access the same AsyncLocalStorage instance
			// defined in logger.ts. Calls to setTags()
			// will set tags in ALS, rather than in a property of the
			// logger instance instantiated here.
			const log = new WorkersLogger<{ environment: string; handler: string }>()
			log.setTags({ handler: 'fetch' })

			if (c.env !== undefined) {
				const env = LoggerHonoBindings.safeParse(c.env)
				if (env.success && env.data.ENVIRONMENT !== undefined) {
					log.setTags({ environment: env.data.ENVIRONMENT })
				}
			}

			const colo = getCfFromRequest(c.req.raw)
			if (colo !== null) {
				log.setTags({ colo })
			}

			if (tags !== undefined) {
				log.setTags(tags)
			}

			return next()
		})
	}
}

// These come from CfProperties
type CfProps = z.infer<typeof CfProps>
const CfProps = z.object({
	colo: z.string(),
})

type RequestWithCF = z.infer<typeof RequestWithCF>
const RequestWithCF = z.object({
	cf: CfProps.optional(),
})

function getCfFromRequest(request: Request): CfProps | null {
	const cfProps = RequestWithCF.safeParse(request)
	if (cfProps.success) {
		return cfProps.data.cf ?? null
	}
	return null
}
