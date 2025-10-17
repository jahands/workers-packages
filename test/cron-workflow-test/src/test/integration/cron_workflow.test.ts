import { describe, it, expect } from 'vitest'
import { steps } from './steps'
import { setupTest } from './harness'

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
		await instance.modify(async (m) => {
			await m.mockStepResult(
				// can't create new instances within a test
				{ name: steps.createNextInstance },
				{ success: true, id: 'mock-id' }
			)
		})

		await expect(
			instance.waitForStepResult({
				name: steps.runOnInit,
			})
		).resolves.toStrictEqual({ success: true })

		await expect(
			instance.waitForStepResult({
				name: steps.runOnInit,
			})
		).resolves.toStrictEqual({ success: true })

		await expect(
			instance.waitForStepResult({
				name: steps.runOnTick,
			})
		).resolves.toStrictEqual({ success: true })

		await expect(
			instance.waitForStepResult({
				name: steps.runOnFinalize,
			})
		).resolves.toStrictEqual({ success: true })

		await expect(
			instance.waitForStepResult({
				name: steps.createNextInstance,
			})
		).resolves.toMatchInlineSnapshot()
	})
})
