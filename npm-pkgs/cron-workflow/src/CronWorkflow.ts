/* eslint-disable @typescript-eslint/no-unused-vars */
import { WorkflowEntrypoint } from 'cloudflare:workers'

import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers'

export type CronContext = {
	/**
	 * Name of the Cron job
	 */
	name: string
	step: WorkflowStep
	// TODO: maybe add schedule info?
}

export type CronFinalizeContext = CronContext & { error?: unknown }

export abstract class CronWorkflow<Env = unknown> extends WorkflowEntrypoint {
	// TODO: add type to validate schedule pattern

	/**
	 * The cron pattern to use for scheduling the cron job
	 *
	 * @default every 5 minutes
	 */
	schedule: string = '*/5 * * * *'

	constructor(env: Env, ctx: ExecutionContext) {
		super(ctx, env)

		// overriding run() in a child class would break everything
		if (this.run !== CronWorkflow.prototype.run) {
			throw new Error('Cannot override run() method in CronWorkflow. Override onTick() instead.')
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
	protected async onInit({ step }: CronContext): Promise<void> {
		// do nothing if user doesn't override - this is not mandatory
	}

	/**
	 * Main Cron handler that runs once per cron run.
	 *
	 * Override this to implement your cron Workflow (required)
	 * @param step The Workflows step
	 */
	protected abstract onTick({ step }: CronContext): Promise<void>

	/**
	 * Lifecycle hook that is run after the Workflow completes and the
	 * {@link onTick()} method has completed (or threw an unhandled error).
	 *
	 * Useful for cleanup, sending final status to Sentry, etc.
	 * @param step The Workflows step
	 * @param error Optional error that was thrown if the Workflow failed
	 */
	protected async onFinalize({ step, error }: CronFinalizeContext): Promise<void> {
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
	override async run(event: WorkflowEvent<Params>, step: WorkflowStep): Promise<void> {
		const name = this.constructor.name

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
				await this.onInit({ name, step })
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
					await this.onTick({ name, step })
				} catch (e) {
					if (e instanceof Error) {
						error = e
					} else {
						error = new Error(`Unknown error thrown in onTick(): ${String(e)}`)
					}
				}
			}

			// bubble up errors thrown in onFinalize()
			await this.onFinalize({ name, step, error })

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
