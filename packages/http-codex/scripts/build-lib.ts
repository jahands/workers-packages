import * as esbuild from 'esbuild'

export const entryPoints = [
	// entrypoints
	'./src/index.ts',
	'./src/status.ts',
] as const satisfies string[]

await esbuild.build({
	entryPoints,
	outdir: './dist/',
	logLevel: 'info',
	outExtension: {
		'.js': '.mjs',
	},
	target: 'es2022',
	format: 'esm',
	bundle: true,
	treeShaking: true,
})
