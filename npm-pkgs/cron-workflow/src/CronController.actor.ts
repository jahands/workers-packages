import { DurableObject } from 'cloudflare:workers'

import type { CronWorkflow } from './CronWorkflow'

/**
 * Single instance Durable Object for monitoring
 * and managing cron Workflows
 *
 * This class MUST be exported and added to wrangler.jsonc
 * to use the CronWorkflow class.
 */
export class CronController extends DurableObject {
	async stats(): Promise<{
		// TODO: figure out what stats to expose
		num_crons: number
	}> {
		throw new Error('not implemented')
	}

	// TODO: methods to enable/disable a cron
}
