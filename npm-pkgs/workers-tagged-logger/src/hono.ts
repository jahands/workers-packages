import { withLogTags, WorkersLogger } from './logger.js'

import type { Context as HonoContext, Handler as HonoHandler, Next as HonoNext } from 'hono'
import type { LogTags } from './logger.js'

export type LoggerHonoBindings = { ENVIRONMENT?: string | undefined }

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

			const environment = getEnvironment(c.env)
			if (environment !== null) {
				log.setTags({ environment })
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

function getEnvironment(env: unknown): string | null {
	if (typeof env !== 'object' || env === null || !('ENVIRONMENT' in env)) {
		return null
	}
	const { ENVIRONMENT } = env
	if (typeof ENVIRONMENT !== 'string' || ENVIRONMENT.length === 0) {
		return null
	}
	return ENVIRONMENT
}

// These come from CfProperties
type CfProps = { colo: string }

function getCfFromRequest(request: Request): CfProps | null {
	const cf: unknown = request.cf
	if (typeof cf !== 'object' || cf === null || !('colo' in cf) || typeof cf.colo !== 'string') {
		return null
	}
	return { colo: cf.colo }
}
