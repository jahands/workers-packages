/**
 * All user tests (to make testing easier)
 */
export const steps = {
	getStartTime: 'get-start-time',
	runUserSteps: 'run-user-steps',
	runOnTick: 'run-on-tick',
	runOnFinalize: 'run-on-finalize',
	createNextInstance: 'create-next-instance',
} as const satisfies Record<string, string>
