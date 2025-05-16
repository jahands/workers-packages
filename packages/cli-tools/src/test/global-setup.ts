export function setup(): void {
	// Ensure chalk colors are disabled
	delete process.env.FORCE_COLOR
}
