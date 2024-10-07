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
	format: 'esm',
	bundle: true,
	treeShaking: true,
})
