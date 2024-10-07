import * as esbuild from 'esbuild'

import { entryPoints } from './entrypoints'

await esbuild.build({
	entryPoints,
	outdir: './dist/',
	logLevel: 'info',
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
