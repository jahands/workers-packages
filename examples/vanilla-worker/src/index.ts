import { withLogTags, WorkersLogger } from 'workers-tagged-logger'

// Optional type hints for tags
type Tags = {
	url_path: string
}

// Create a logger in the global scope (this is safe
// because tags are tracked via AsyncLocalStorage.)
const logger = new WorkersLogger<Tags>()

export default {
	async fetch(req: Request): Promise<Response> {
		return withLogTags({ source: 'vanilla-worker' }, async () => {
			logger.setTags({ url_path: new URL(req.url).pathname })

			logger.withTags({ foo: 'bar' }).info('hello, world!')
			return new Response('hello, world!')
		})
	},
}
