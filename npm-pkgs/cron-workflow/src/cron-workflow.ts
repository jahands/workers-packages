import { WorkflowEntrypoint } from 'cloudflare:workers'

import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers'

export class CronWorkflow extends WorkflowEntrypoint {
	async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
		const nextRunTime = await step.do('start time', async () => {
			return Date.now()
		})

		const userSteps = async () => {
			// This has to be defined somewhere
			// return
		}

		const createNext = async () => {
			try {
				const sleepSize = await step.waitForEvent<{ newSleepSize: number }>('timing-decreased', {
					type: 'timing-decreased',
					timeout: nextRunTime,
				}) // Something will have to emit this event (this might also prove to be  challenging)

				await step.sleepUntil('sleep some more', nextRunTime + sleepSize.payload.newSleepSize)
			} finally {
				await step.do('create-next-instance', async () => {
					await this.env.CRON_WORKFLOW.create({
						params: { timeToNextRun: event.payload.timeToNextRun },
					})
					return
				})
			}

			await Promise.all([userSteps(), createNext()])

			return
		}
	}
}
