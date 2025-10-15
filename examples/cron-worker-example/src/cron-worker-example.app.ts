import { WorkflowStep } from 'cloudflare:workers'
import { CronController, CronWorkflow } from 'cron-workflow'
import { Hono } from 'hono'
import { useWorkersLogger } from 'workers-tagged-logger'

import { withNotFound, withOnError } from '@repo/hono-helpers'

import type { App, Env } from './context'

export { CronController }

export class MyCron extends CronWorkflow<Env> {
	override async onInit(step: WorkflowStep) {
		await step.do('send sentry heartbeat', async () => {
			console.log('todo: send heartbeat to sentry cron monitor')
		})
	}

	override async onTick(step: WorkflowStep) {
		await step.do('check uuid.rocks', async () => {
			const res = await fetch('https://uuid.rocks/plain')
			if (!res.ok) {
				throw new Error('failed to fetch uuid.rocks/plain')
			}
			return await res.text()
		})
	}

	override async onFinalize(step: WorkflowStep, { error }) {
		await step.do('send outcome to sentry', async () => {
			console.log('todo: send outcome to sentry cron monitor')
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
