/**
 * Default ignore lists
 */
export const ignore = {
	source: [
		'**/node_modules/',
		'**/.env',
		'**/.secret',
		'**/Earthfile',
		'**/.wrangler',
		'**/.dev.vars',
		'**/.turbo/',
		'**/dist/',
		'**/dist2/',
		'**/.DS_Store',
		'**/.astro/',
		'**/.next/',
		'*.env',
	],
} as const satisfies Record<string, string[]>
