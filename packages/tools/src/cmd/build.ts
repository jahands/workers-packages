import { inspect } from 'util'
import { Command } from '@commander-js/extra-typings'
import * as esbuild from 'esbuild'
import { match } from 'ts-pattern'
import ts from 'typescript'
import { z } from 'zod'

import { getRepoRoot } from '../path'
import { getCompilerOptionsJSONFollowExtends, getTSConfig } from '../tsconfig'

export const buildCmd = new Command('build').description('Build Workers/etc.')

buildCmd
	.command('wrangler')
	.description('Build a Workers project with Wrangler')
	.action(async () => {
		$.verbose = true
		await $`rm -rf ./dist` // Make sure we don't have any previous artifacts
		await $`wrangler deploy --minify --outdir ./dist --dry-run`
	})

buildCmd
	.command('tsc')
	.description('Build a library with tsc')
	.argument('<entrypoint...>', 'Entrypoint(s) for the program')
	.option('-r, --root-dir <string>', 'Root dir for tsc to use (overrides tsconfig.json)', 'src')
	.action(async (entrypoints, { rootDir }) => {
		await $`rm -rf ./dist` // Make sure we don't have any previous artifacts

		// Read the parent config so that we don't get
		// weird path issues from being in a monorepo
		const parentTsConfig = z
			.object({ extends: z.string() })
			.parse(JSON.parse(fs.readFileSync('./tsconfig.json').toString())).extends

		const tsconfig = ts.readConfigFile(`./node_modules/${parentTsConfig}`, ts.sys.readFile)
		if (tsconfig.error) {
			throw new Error(`failed to read tsconfig: ${inspect(tsconfig)}`)
		}

		const jsonCompopts = getCompilerOptionsJSONFollowExtends('tsconfig.json')
		const tmp = ts.convertCompilerOptionsFromJson(jsonCompopts, '')
		if (tmp.errors.length > 0) {
			throw new Error(`failed parse config: ${inspect(tmp)}`)
		}
		const tsCompopts: ts.CompilerOptions = tmp.options

		const config = {
			...tsCompopts,
			rootDir: rootDir,
		} satisfies ts.CompilerOptions

		ts.createProgram(entrypoints, config).emit()
	})

buildCmd
	.command('bundle-lib')
	.description('Bundle library with esbuild (usually to resolve vitest issues)')

	.argument('<entrypoints...>', 'Entrypoint(s) of the app. e.g. src/index.ts')
	.option('-d, --root-dir <string>', 'Root directory to look for entrypoints')
	.option('-f, --format <format...>', 'Formats to use (options: esm, cjs)', ['esm'])
	.option(
		'--platform <string>',
		'Optional platform to target (options: browser, node, neutral)',
		(s) => z.enum(['browser', 'node', 'neutral']).parse(s)
	)

	.action(async (entryPoints, { format: moduleFormats, platform, rootDir }) => {
		entryPoints = z
			.string()
			.array()
			.min(1)
			.parse(entryPoints)
			.map((d) => path.join(rootDir ?? '.', d))

		type Format = z.infer<typeof Format>
		const Format = z.enum(['esm', 'cjs'])

		const formats = Format.array().parse(moduleFormats)

		await fs.rm('./dist/', { force: true, recursive: true })

		await Promise.all([
			$`runx build bundle-lib-build-types ${entryPoints}`,

			...formats.map(async (outFormat) => {
				type Config = {
					format: Format
					outExt: string
				}

				const { format, outExt } = match<'esm' | 'cjs', Config>(outFormat)
					.with('esm', () => ({
						format: 'esm',
						outExt: '.mjs',
					}))
					.with('cjs', () => ({
						format: 'cjs',
						outExt: '.cjs',
					}))
					.exhaustive()

				const opts: esbuild.BuildOptions = {
					entryPoints,
					outdir: './dist/',
					logLevel: 'warning',
					outExtension: {
						'.js': outExt,
					},
					target: 'es2022',
					bundle: true,
					format,
					sourcemap: 'both',
					treeShaking: true,
					external: ['node:events', 'node:async_hooks', 'node:buffer', 'cloudflare:test'],
				}

				if (platform) {
					opts.platform = platform
				}

				await esbuild.build(opts)
			}),
		])
	})

buildCmd
	.command('bundle-lib-build-types')
	.description('Separate command to build types (so that we can run them concurrently)')
	.argument('<entrypoints...>', 'Entrypoint(s) of the app. e.g. src/index.ts')
	.action(async (entryPoints) => {
		z.string().array().min(1).parse(entryPoints)

		const tsconfig = ts.readConfigFile('./tsconfig.json', ts.sys.readFile)
		if (tsconfig.error) {
			throw new Error(`failed to read tsconfig: ${Bun.inspect(tsconfig)}`)
		}

		const tsCompOpts = {
			...getTSConfig(),
			declaration: true,
			declarationMap: true,
			emitDeclarationOnly: true,
			noEmit: false,
			outDir: './dist/',
		} satisfies ts.CompilerOptions

		const program = ts.createProgram(entryPoints, tsCompOpts)
		program.emit()
	})

buildCmd
	.command('tests')
	.description('Builds tests packages into dist directory for improved isolation of tests')
	.action(async () => {
		const repoRoot = getRepoRoot()
		await fs.rm(`${repoRoot}/dist/tests`, { recursive: true, force: true })
		echo(chalk.blue('deploying tests to dist/tests'))
		await Promise.all([
			$`pnpm deploy -F @repo/tests__workers-tagged-logger__hono-app-zod-3 dist/tests/workers-tagged-logger/hono-app-zod-3`,
			$`pnpm deploy -F @repo/tests__workers-tagged-logger__hono-app-zod-4 dist/tests/workers-tagged-logger/hono-app-zod-4`,
		])
	})
