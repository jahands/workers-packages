import { describe, it, assert, expect, test } from 'vitest'
import { env, introspectWorkflowInstance } from 'cloudflare:test'
import { steps } from './steps'

describe('UuidRocksCheckerCron', async () => {
	it('should get start time', async () => {
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

	it('should run lifecycle hooks and user steps', async () => {
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
})
