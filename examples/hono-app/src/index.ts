import { Hono } from 'hono'
import { httpStatus } from 'http-codex'
import { useWorkersLogger, WorkersLogger } from 'workers-tagged-logger'

// Optional type hints for tags
type Tags = {
	url_path: string
}

// Create a logger in the global scope (this is safe
// because tags are tracked via AsyncLocalStorage.)
const logger = new WorkersLogger<Tags>()

const app = new Hono()
	// Register the logger (must do this before calling logger.setTags())
	.use('*', useWorkersLogger('hono-app'))

	// Set a tag on the logger
	.use('*', async (c, next) => {
		logger.setTags({ url_path: c.req.path })
		await next()
	})

	.get('/hello', async (c) => {
		logger.withTags({ foo: 'bar' }).info('hello, world!')
		return c.text('hello, world!', {
			status: httpStatus.OK,
			statusText: httpStatus.text(httpStatus.OK),
		})
	})

export default app
