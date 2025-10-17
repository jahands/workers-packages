import { describe, it, assert, expect, test } from 'vitest'
import { env, introspectWorkflowInstance } from 'cloudflare:test'

it('should disable all sleeps, mock an event and complete', async () => {
	const id = '123456'
	await using instance = await introspectWorkflowInstance(env.UuidRocksCheckerCron, id)
	await instance.modify(async (m) => {
		await m.disableSleeps()
		await m.mockEvent({
			type: 'user-approval',
			payload: { approved: true, approverId: 'user-123' },
		})
	})

	await env.UuidRocksCheckerCron.create({ id })

	await expect(instance.waitForStatus('complete')).resolves.not.toThrow()
})
