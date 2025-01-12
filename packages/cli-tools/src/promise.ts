/**
 * Sleeps for the given duration
 * @param ms Duration in milliseconds to sleep
 */
export async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}
