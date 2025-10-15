import { DurableObject } from 'cloudflare:workers'

/**
 * Single instance Durable Object for monitoring
 * and managing cron Workflows
 *
 * This class MUST be exported and added to wrangler.jsonc
 * to use the CronWorkflow class.
 */
export class CronController extends DurableObject {
	// TODO
}
