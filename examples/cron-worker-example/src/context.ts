import type { HonoApp } from '@repo/hono-helpers'
import type { SharedHonoEnv, SharedHonoVariables } from '@repo/hono-helpers/src/types'
import type { UuidRocksCheckerCron } from './cron-worker-example.app'

export type Env = SharedHonoEnv & {
	UuidRocksCheckerCron: UuidRocksCheckerCron
}

/** Variables can be extended */
export type Variables = SharedHonoVariables

export interface App extends HonoApp {
	Bindings: Env
	Variables: Variables
}
