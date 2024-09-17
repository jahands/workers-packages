import { Hono } from 'hono'

const app = new Hono().get('/', async (c) => {
	return c.text('hello, world!')
})

export default app
