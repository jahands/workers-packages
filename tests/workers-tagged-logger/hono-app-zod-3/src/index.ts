import { Hono } from 'hono'
import { useWorkersLogger, WithLogTags, WorkersLogger } from 'workers-tagged-logger'

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
		return c.text('hello, world!')
	})

	.get('/decorator', async (c) => {
		class MyHandler {
			@WithLogTags()
			handle(): string {
				logger.info('MyHandler.handle()')
				return 'hello from handle()'
			}
		}

		return c.text(new MyHandler().handle())
	})

export default app
