import * as Sentry from '@sentry/cloudflare'
import { CronController, CronWorkflow } from 'cron-workflow'
import { Hono } from 'hono'
import { useWorkersLogger } from 'workers-tagged-logger'

import { withNotFound, withOnError } from '@repo/hono-helpers'

import type { CronContext, CronFinalizeContext } from 'cron-workflow'
import type { App, Env } from './context'

export { CronController }

export class BasicCron extends CronWorkflow<Env> {
	schedule = '* * * * *'

	override async onInit({ step }: CronContext) {
		await step.do('send sentry checkin', async () => {
			Sentry.captureCheckIn({ monitorSlug: 'uuid-rocks-checker', status: 'in_progress' })
		})
	}

	override async onTick({ step }: CronContext) {
		await step.do('check uuid.rocks', async () => {
			const res = await fetch('https://uuid.rocks/plain')
			if (!res.ok) {
				throw new Error('failed to fetch uuid.rocks/plain')
			}
			return await res.text()
		})
	}

	override async onFinalize({ step, error }: CronFinalizeContext) {
		await step.do('send outcome to sentry', async () => {
			if (error) {
				Sentry.captureCheckIn({ monitorSlug: 'uuid-rocks-checker', status: 'error' })
			} else {
				Sentry.captureCheckIn({ monitorSlug: 'uuid-rocks-checker', status: 'ok' })
			}
		})
	}
}

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
