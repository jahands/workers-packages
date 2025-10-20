import * as Sentry from '@sentry/cloudflare'
import { CronWorkflow } from 'cron-workflow'

import type { CronContext, CronFinalizeContext } from 'cron-workflow'
import type { Env } from '../context'

export class UuidRocksCheckerCron extends CronWorkflow<Env> {
	schedule = '* * * * *'

	override async onInit({ step }: CronContext) {
		await step.do('send sentry checkin', async () => {
			console.log('cron_on_init')
			Sentry.captureCheckIn({ monitorSlug: 'uuid-rocks-checker', status: 'in_progress' })
		})
	}

	override async onTick({ step }: CronContext) {
		await step.do('check uuid.rocks', async () => {
			console.log('cron_on_tick')
			const res = await fetch('https://uuid.rocks/plain')
			if (!res.ok) {
				throw new Error('failed to fetch uuid.rocks/plain')
			}
			return await res.text()
		})
	}

	override async onFinalize({ step, error }: CronFinalizeContext) {
		await step.do('send outcome to sentry', async () => {
			console.log('cron_on_finalize')
			if (error) {
				Sentry.captureCheckIn({ monitorSlug: 'uuid-rocks-checker', status: 'error' })
			} else {
				Sentry.captureCheckIn({ monitorSlug: 'uuid-rocks-checker', status: 'ok' })
			}
		})
	}
}
