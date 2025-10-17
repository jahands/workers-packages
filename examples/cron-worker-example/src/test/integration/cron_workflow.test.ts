import { describe, it, assert, expect, test } from 'vitest'
import { env, introspectWorkflowInstance } from 'cloudflare:test'
import { steps } from './steps'

it('should disable all sleeps, mock an event and complete', async () => {
	const id = '123456'
	await using instance = await introspectWorkflowInstance(env.UuidRocksCheckerCron, id)
	await instance.modify(async (m) => {
		await m.disableSleeps()
	})

	await env.UuidRocksCheckerCron.create({ id })

	await expect(
		instance.waitForStepResult({
			name: steps.getStartTime,
		})
	).resolves.toBeGreaterThan(0)
})
