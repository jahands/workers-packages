/** various constants for dagger modules in my repos */
export const constants = {
	/** constants for workers-monorepo */
	workersMonorepo: {
		/** default source ignore list */
		ignore: [
			'**/node_modules/',
			'**/.env',
			'**/.secret',
			'**/.wrangler',
			'**/.dev.vars',
			'**/.turbo/',
			'**/dist/',
			'**/dist2/',
			'**/.DS_Store',
			'**/.astro/',
			'**/.next/',
			'*.env',
		] satisfies string[],
	},
} as const
