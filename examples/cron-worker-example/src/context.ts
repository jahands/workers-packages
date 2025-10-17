import type { HonoApp } from '@repo/hono-helpers'
import type { SharedHonoEnv, SharedHonoVariables } from '@repo/hono-helpers/src/types'
import type { UuidRocksCheckerCronBase } from './cron-worker-example.app'

export type Env = SharedHonoEnv & {
	UuidRocksCheckerCron: Workflow<UuidRocksCheckerCronBase>
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
