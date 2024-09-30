import * as esbuild from 'esbuild'

async function build(entrypoint: string): Promise<void> {
	await esbuild.build({
		entryPoints: [`./src/${entrypoint}`],
		outdir: './dist/',
		logLevel: 'warning',
		outExtension: {
			'.js': '.mjs',
		},
		target: 'es2022',
		platform: 'browser',
		format: 'esm',
		bundle: true,
		treeShaking: true,
		external: ['node:events', 'node:async_hooks', 'node:buffer'],
	})
}

await Promise.all([
	// entrypoints
	build('index.ts'),
	build('otel-cf-workers.ts'),
	build('opentelemetry-api.ts'),
])
