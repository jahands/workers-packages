import 'zx/globals'

import * as esbuild from 'esbuild'

import { entryPoints } from './entrypoints'

await fs.rm('./dist/', { force: true, recursive: true })

await Promise.all([
	$`bun ./scripts/build-types.ts`,
	esbuild.build({
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
		external: [
			// peerDependencies
			'@commander-js/extra-typings',
			'commander',
			'typescript',
			'zod',
			'zx',
		],
	}),
])
