/* eslint-disable @typescript-eslint/no-unused-vars */
import { WorkflowEntrypoint } from 'cloudflare:workers'

import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers'

interface Env {}

export class CronWorkflow extends WorkflowEntrypoint {
	constructor(env: Env, ctx: ExecutionContext) {
		super(ctx, env)

		// prevent child classes from overriding run()
		if (this.run !== CronWorkflow.prototype.run) {
			throw new Error(
				'Cannot override run() method in CronWorkflow. ' +
					'Implement your cron logic in a different method instead.'
			)
		}

		// onTick must be overridden
		if (this.onTick === CronWorkflow.prototype.onTick) {
			throw new Error(`CronWorkflow ${this.constructor.name} must override the onTick() method.`)
		}
	}

	// ================================ //
	// ======= public interface ======= //
	// ================================ //

	/**
	 * Lifecycle hook that is run when the Workflow first starts,
	 * before {@link onTick()} is run.
	 *
	 * Useful for setting up initial state,
	 * sending heartbeats to Sentry, etc.
	 *
	 * @param step The Workflows step
	 */
	async onInit(step: WorkflowStep) {
		// do nothing if user doesn't override - this is not mandatory
	}

	/**
	 * Main Cron handler that runs once per cron run.
	 *
	 * Override this to implement your cron Workflow (required)
	 * @param step The Workflows step
	 */
	async onTick(step: WorkflowStep) {
		// stub - child class must override
	}

	/**
	 * Lifecycle hook that is run after the Workflow completes and the
	 * {@link onTick()} method has completed (or threw an unhandled error).
	 *
	 * Useful for cleanup, sending final status to Sentry, etc.
	 * @param step The Workflows step
	 * @param error Optional error that was thrown if the Workflow failed
	 */
	async onFinalize(step: WorkflowStep, { error }: { error?: Error }) {
		// do nothing if user doesn't override - this is not mandatory
	}

	// ================================ //
	// ======== implementation ======== //
	// ================================ //

	/**
	 * DO NOT override this method!
	 *
	 * Use {@link onTick()} instead
	 */
	override async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
		const getWorkflowBinding = (): Workflow => {
			const env = this.env as Record<string, unknown>

			if (!(typeof env === 'object')) {
				throw new Error('this.env is not an object') // should never happen
			}
			if (env === null) {
				throw new Error('this.env is null') // should never happen
			}

			// name of the derived class
			const className = this.constructor.name
			if (!(className in env || typeof (this.env as any)[className] === 'undefined')) {
				throw new Error(
					`could not find Workflows binding for ${className} - did you add it to your Workflows configuration in wrangler.jsonc?`
				)
			}

			return env[className] as Workflow
		}

		const nextRunTime = await step.do('start time', async () => {
			return Date.now()
		})

		const userSteps = async () => {
			// catch errors in onInit() and onTick() so that we can still run onFinalize()
			let error: Error | undefined

			// run onInit first
			try {
				await this.onInit(step)
			} catch (e) {
				if (e instanceof Error) {
					error = e
				} else {
					error = new Error(`Unknown error thrown in onInit(): ${String(e)}`)
				}
			}

			// only run onTick if onInit succeeded
			if (!error) {
				try {
					await this.onTick(step)
				} catch (e) {
					if (e instanceof Error) {
						error = e
					} else {
						error = new Error(`Unknown error thrown in onTick(): ${String(e)}`)
					}
				}
			}

			// bubble up errors thrown in onFinalize()
			await this.onFinalize(step, { error })

			// re-throw error from onInit/onTick if it exists so that
			// the Workflow shows as failed
			if (error) {
				throw error
			}
		}

		const createNext = async () => {
			try {
				const sleepSize = await step.waitForEvent<{ newSleepSize: number }>('timing-decreased', {
					type: 'timing-decreased',
					timeout: nextRunTime,
				}) // Something will have to emit this event (this might also prove to be challenging)

				await step.sleepUntil('sleep some more', nextRunTime + sleepSize.payload.newSleepSize)
			} finally {
				await step.do('create-next-instance', async () => {
					const workflow = getWorkflowBinding()
					await workflow.create({
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
