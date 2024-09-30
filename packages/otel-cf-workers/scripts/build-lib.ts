import * as esbuild from 'esbuild'

await esbuild.build({
	entryPoints: [
		// entrypoints
		'./src/index.ts',
		'./src/otel-cf-workers.ts',
		'./src/opentelemetry-api.ts',
	],
	outdir: './dist/',
	logLevel: 'warning',
	outExtension: {
		'.js': '.mjs',
	},
	target: 'es2022',
	// platform: 'browser', // Doesn't seem to be needed?
	format: 'esm',
	bundle: true,
	treeShaking: true,
	external: ['node:events', 'node:async_hooks', 'node:buffer'],
})
