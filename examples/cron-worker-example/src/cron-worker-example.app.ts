import * as Sentry from '@sentry/cloudflare'
import { Hono } from 'hono'
import { useWorkersLogger } from 'workers-tagged-logger'

import { withNotFound, withOnError } from '@repo/hono-helpers'

import { UuidRocksCheckerCron as UuidRocksCheckerCronBase } from './crons/UuidRocksCheckerCron.cron'

import type { App, Env } from './context'

export { CronController } from 'cron-workflow'

export const UuidRocksCheckerCron = Sentry.instrumentWorkflowWithSentry(
	(_env: Env) => ({
		dsn: 'https://08271f0670b5f8c254d4da7125db4c1c@sentry.uuid.rocks/93',
		tracesSampleRate: 1.0,
	}),
	UuidRocksCheckerCronBase
)

const app = new Hono<App>()
	.use(
		'*',
		// middleware
		(c, next) =>
			useWorkersLogger(c.env.NAME, {
				environment: c.env.ENVIRONMENT,
				release: c.env.SENTRY_RELEASE,
			})(c, next)
	)

	.onError(withOnError())
	.notFound(withNotFound())

	.get('/', async (c) => {
		return c.text('hello, world!')
	})

export default app
