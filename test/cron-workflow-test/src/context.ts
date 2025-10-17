import type { HonoApp } from '@repo/hono-helpers'
import type { SharedHonoEnv, SharedHonoVariables } from '@repo/hono-helpers/src/types'
import type { BasicCron } from './crons/basic.cron'

export type Env = SharedHonoEnv & {
	BasicCron: Workflow<BasicCron>
}

/** Variables can be extended */
export type Variables = SharedHonoVariables

export interface App extends HonoApp {
	Bindings: Env
	Variables: Variables
}

// ====================== //
// ===== tests only ===== //
// ====================== //
declare module 'cloudflare:test' {
	// Controls the type of `import("cloudflare:test").env`
	interface ProvidedEnv extends Env {}
}
