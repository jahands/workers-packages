import { WorkflowEntrypoint } from 'cloudflare:workers'

import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers'

export class CronWorkflow extends WorkflowEntrypoint {
	override async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
		const getWorkflowBinding = () => {
			if (!(typeof this.env === 'object')) {
				throw new Error('this.env is not an object') // should never happen
			}
			if (this.env === null) {
				throw new Error('this.env is null') // should never happen
			}

			// name of the derived class
			const name = this.constructor.name
			if (!(name in this.env)) {
				throw new Error(
					`could not find Workflows binding for ${name} - did you add it to your Workflows configuration in wrangler.jsonc?`
				)
			}
			if(!(typeof this.env[name] === 'object'))
		}

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
