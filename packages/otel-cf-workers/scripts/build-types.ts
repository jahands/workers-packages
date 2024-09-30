import 'zx/globals'

import { inspect } from 'util'
import ts from 'typescript'

function buildDeclarationFiles(fileNames: string[], options: ts.CompilerOptions): void {
	options = {
		...options,
		declaration: true,
		emitDeclarationOnly: true,
		outDir: './dist/',
	}
	const program = ts.createProgram(fileNames, options)
	program.emit()
}

const tsconfig = ts.readConfigFile('./tsconfig.json', ts.sys.readFile)
if (tsconfig.error) throw new Error(`failed to read tsconfig: ${inspect(tsconfig)}`)

buildDeclarationFiles(
	[
		// entrypoints
		'./src/index.ts',
		'./src/otel-cf-workers.ts',
		'./src/opentelemetry-api.ts',
	],
	tsconfig.config
)

const dtsFiles = await glob('./dist/*.d.ts')
await Promise.all(
	dtsFiles.map(async (f) => {
		await fs.move(f, f.replace('.d.ts', '.d.mts'))
	})
)
