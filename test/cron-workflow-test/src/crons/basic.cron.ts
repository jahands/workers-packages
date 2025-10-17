import { CronWorkflow } from 'cron-workflow'

import type { CronContext, CronFinalizeContext } from 'cron-workflow'
import type { Env } from '../context'

export class BasicCron extends CronWorkflow<Env> {
	schedule = '* * * * *'

	override async onInit({ step }: CronContext) {
		await step.do('send sentry checkin', async () => {
			console.log('capture sentry checkin (in-progress)')
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
				console.log('capture sentry checkin (error)')
			} else {
				console.log('capture sentry checkin (ok)')
			}
		})
	}
}
