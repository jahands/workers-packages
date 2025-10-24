/* eslint-disable @typescript-eslint/no-unused-vars */
import { WorkflowEntrypoint } from 'cloudflare:workers'
import { NonRetryableError } from 'cloudflare:workflows'
import { CronExpressionParser } from 'cron-parser'

import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers'

export type CronContext = {
	step: WorkflowStep
	// TODO: maybe add schedule info?
}

export type CronFinalizeContext = CronContext & { error?: unknown }

type StepResult = {
	success: boolean
	output?: Rpc.Serializable<unknown>
	error?: Error
}

type CronWorkflowParams = {
	/**
	 * The absolute timestamp (in milliseconds) of when this workflow instance should run.
	 * If not provided, the next run time will be calculated from the cron schedule.
	 */
	nextRunTime?: number
}

export abstract class CronWorkflow<Env = unknown> extends WorkflowEntrypoint<Env> {
	// TODO: add type to validate schedule pattern

	/**
	 * The name of the Workflow (derived from the class name)
	 */
	readonly name: string
	/**
	 * The cron pattern to use for scheduling the cron job
	 *
	 * @default every 5 minutes
	 */
	readonly schedule: string = '*/5 * * * *'

	constructor(ctx: ExecutionContext, env: Env) {
		super(ctx, env)
		this.name = this.constructor.name

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
	protected async onInit({ step }: CronContext): Promise<Rpc.Serializable<unknown>> {
		// do nothing if user doesn't override - this is not mandatory
	}

	/**
	 * Main Cron handler that runs once per cron run.
	 *
	 * Override this to implement your cron Workflow (required)
	 * @param step The Workflows step
	 */
	protected abstract onTick({ step }: CronContext): Promise<Rpc.Serializable<unknown>>

	/**
	 * Lifecycle hook that is run after the Workflow completes and the
	 * {@link onTick()} method has completed (or threw an unhandled error).
	 *
	 * Useful for cleanup, sending final status to Sentry, etc.
	 * @param step The Workflows step
	 * @param error Optional error that was thrown if the Workflow failed
	 */
	protected async onFinalize({
		step,
		error,
	}: CronFinalizeContext): Promise<Rpc.Serializable<unknown>> {
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
	override async run(event: WorkflowEvent<CronWorkflowParams>, step: WorkflowStep): Promise<void> {
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
			if (!(className in env) || typeof (this.env as any)[className] === 'undefined') {
				throw new Error(
					`could not find Workflows binding for ${className} - did you add it to your Workflows configuration in wrangler.jsonc?`
				)
			}

			return env[className] as Workflow
		}

		// get the next run time from params or calculate it from the cron schedule
		const nextRunTime = await step.do('get-next-run-time', async () => {
			if (event.payload.nextRunTime) {
				return event.payload.nextRunTime
			}

			// first instance - calculate the next run time from the cron schedule
			const interval = CronExpressionParser.parse(this.schedule)
			return interval.next().toDate().getTime()
		})

		const userSteps = async () => {
			await step.do('run-user-steps', async () => {
				// catch errors in onInit() and onTick() so that we can still run onFinalize()
				let error: Error | undefined

				// run onInit first
				if (this.onInit !== CronWorkflow.prototype.onInit) {
					const res = await step.do<StepResult>('run-on-init', async () => {
						let output: Rpc.Serializable<unknown> | undefined

						try {
							output = await this.onInit({ step })
						} catch (e) {
							if (e instanceof Error) {
								return { success: false, error: e }
							} else {
								return {
									success: false,
									error: new Error(`Unknown error thrown in onInit(): ${String(e)}`),
								}
							}
						}

						return { success: true, output }
					})

					if (res.error) {
						error = res.error
					}
				}

				// only run onTick if onInit succeeded
				if (!error) {
					const res = await step.do<StepResult>('run-on-tick', async () => {
						let output: Rpc.Serializable<unknown> | undefined

						try {
							output = await this.onTick({ step })
						} catch (e) {
							if (e instanceof Error) {
								return { success: false, error: e }
							} else {
								return {
									success: false,
									error: new Error(`Unknown error thrown in onTick(): ${String(e)}`),
								}
							}
						}

						return { success: true, output }
					})

					if (res.error) {
						error = res.error
					}
				}

				if (this.onFinalize !== CronWorkflow.prototype.onFinalize) {
					const err = await step.do<StepResult>('run-on-finalize', async () => {
						let output: Rpc.Serializable<unknown> | undefined

						// bubble up errors thrown in onFinalize()
						try {
							output = await this.onFinalize({ step, error })
						} catch (e) {
							if (e instanceof Error) {
								return { success: false, error: e }
							} else {
								return {
									success: false,
									error: new Error(`Unknown error thrown in onFinalize(): ${String(e)}`),
								}
							}
						}

						return { success: true, output }
					})

					if (err.error) {
						error = err.error
					}
				}

				// re-throw error from onInit/onTick if it exists so that
				// the Workflow shows as failed
				if (error) {
					throw new NonRetryableError(error.message, error.name)
				}
			})
		}

		let shouldSleep = Date.now() < nextRunTime
		while (shouldSleep) {
			try {
				await step.sleepUntil('sleep-until-next-run-time', nextRunTime)
				shouldSleep = false
			} catch (e) {
				const isTimeTravelErr =
					e instanceof Error &&
					e.message.includes(`You can't sleep until a time in the past, time-traveler`)

				shouldSleep = !isTimeTravelErr && Date.now() < nextRunTime
			}
		}

		try {
			await userSteps()
		} finally {
			// TODO: handle the case where userSteps() exhausts subrequest limit

			const timeToNextRun = await step.do('calculate-next-run-time', async () => {
				const interval = CronExpressionParser.parse(this.schedule)
				return interval.next().toDate().getTime()
			})

			await step.do<StepResult & { id: string }>('create-next-instance', async () => {
				const workflow = getWorkflowBinding()
				const instance = await workflow.create({
					params: { nextRunTime: timeToNextRun },
				})

				return {
					success: true,
					id: instance.id,
				}
			})
		}
	}
}
