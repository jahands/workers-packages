import type { HonoApp } from '@repo/hono-helpers'
import type { SharedHonoEnv, SharedHonoVariables } from '@repo/hono-helpers/src/types'
import type { UuidRocksCheckerCron } from './crons/UuidRocksCheckerCron.cron'

export type Env = SharedHonoEnv & {
	UuidRocksCheckerCron: Workflow<UuidRocksCheckerCron>
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
