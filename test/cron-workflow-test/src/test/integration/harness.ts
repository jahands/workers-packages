import { env, introspectWorkflowInstance } from 'cloudflare:test'

import type { WorkflowInstanceIntrospector } from 'cloudflare:test'

let lastId = 0

export type TestHarness = {
	/**
	 * ID of the workflow instance
	 */
	id: string
	instance: WorkflowInstanceIntrospector
	[Symbol.asyncDispose]: () => Promise<void>
}

export async function setupTest(): Promise<TestHarness> {
	const id = `instance-${lastId++}`
	const instance = await introspectWorkflowInstance(env.BasicCron, id)

	await instance.modify(async (m) => {
		await m.disableSleeps()
	})

	await env.BasicCron.create({ id })

	return {
		id,
		instance,
		[Symbol.asyncDispose]: async () => {
			await instance[Symbol.asyncDispose]()
		},
	}
}
