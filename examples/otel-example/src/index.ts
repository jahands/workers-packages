import { instrument } from '@jahands/otel-cf-workers'
import { Hono } from 'hono'

import type { ResolveConfigFn } from '@jahands/otel-cf-workers'

type Bindings = {
	OTEL_AUTH: string
}

const app = new Hono()
	// routes
	.get('/hello', (c) => c.text('world'))

const handler = {
	fetch: app.fetch,
} satisfies ExportedHandler<Bindings>

const config: ResolveConfigFn = (env: Bindings, _trigger) => {
	return {
		exporter: {
			url: `https://echoback.uuid.rocks/v1/traces`,
			headers: {
				authorization: `Bearer ${env.OTEL_AUTH}`,
			},
		},
		service: {
			name: 'otel-example',
		},
	}
}

export default instrument(handler, config)
