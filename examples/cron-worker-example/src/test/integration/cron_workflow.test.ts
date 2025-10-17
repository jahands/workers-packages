import { describe, it, assert, expect, test } from 'vitest'
import { env, introspectWorkflowInstance } from 'cloudflare:test'

it('should disable all sleeps, mock an event and complete', async () => {
	await using instance = await introspectWorkflowInstance(env.UuidRocksCheckerCron, '123456')
	await instance.modify(async (m) => {
		await m.disableSleeps()
		await m.mockEvent({
			type: 'user-approval',
			payload: { approved: true, approverId: 'user-123' },
		})
	})

	await env.UuidRocksCheckerCron.create({ id: '123456' })

	await expect(instance.waitForStatus('complete')).resolves.not.toThrow()
})
