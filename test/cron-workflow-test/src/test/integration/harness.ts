import { env, introspectWorkflowInstance } from 'cloudflare:test'

let lastId = 0
export async function setupTest() {
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
