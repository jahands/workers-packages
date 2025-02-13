import { inspect } from 'util'
import { Command } from '@commander-js/extra-typings'
import ts from 'typescript'
import { z } from 'zod'

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
	.option('-r, --root-dir <string>', 'Root dir for tsc to use (overrides tsconfig.json)', 'src')
	.action(async ({ rootDir }) => {
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

		ts.createProgram(['./src/index.ts', './src/status.ts'], config).emit()
	})

function getCompilerOptionsJSONFollowExtends(filename: string): { [key: string]: unknown } {
	let compopts = {}
	const config = ts.readConfigFile(filename, ts.sys.readFile).config
	if (config.extends !== undefined) {
		const rqrpath = require.resolve(config.extends)
		compopts = getCompilerOptionsJSONFollowExtends(rqrpath)
	}
	return {
		...compopts,
		...config.compilerOptions,
	}
}
