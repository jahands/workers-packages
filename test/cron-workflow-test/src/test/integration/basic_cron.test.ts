import { describe, it, assert, expect, test } from 'vitest'
import { env, introspectWorkflowInstance } from 'cloudflare:test'
import { steps } from './steps'

let lastId = 0
async function setupTest() {
	const id = `instance-${lastId++}`
	const instance = await introspectWorkflowInstance(env.BasicCron, id)
	await instance.modify(async (m) => {
		await m.disableSleeps()
	})
	await env.BasicCron.create({ id })
	return {
		id,
		instance,
		[Symbol.asyncDispose]: () => instance[Symbol.asyncDispose](),
	}
}

describe('BasicCron', async () => {
	it('should get start time', async () => {
		await using ctrl = await setupTest()
		const { instance } = ctrl

		await expect(
			instance.waitForStepResult({
				name: steps.getStartTime,
			})
		).resolves.toBeGreaterThan(0)
	})

	it('should run lifecycle hooks and user steps', async () => {
		await using ctrl = await setupTest()
		const { instance } = ctrl

		await expect(
			instance.waitForStepResult({
				name: steps.runOnFinalize,
			})
		).resolves.toBeGreaterThan(0)
	})
})
