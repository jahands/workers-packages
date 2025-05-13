import { inspect } from 'node:util'

import type {
	CompilerOptions,
	convertCompilerOptionsFromJson,
	readConfigFile,
	sys,
} from 'typescript'

interface TSModule {
	readConfigFile: typeof readConfigFile
	convertCompilerOptionsFromJson: typeof convertCompilerOptionsFromJson
	sys: typeof sys
}
export class TSHelpers {
	constructor(private readonly ts: TSModule) {}

	getTSConfig(configPath = 'tsconfig.json'): CompilerOptions {
		const jsonCompopts = this.getCompilerOptionsJSONFollowExtends(configPath)
		const tmp = this.ts.convertCompilerOptionsFromJson(jsonCompopts, '')
		if (tmp.errors.length > 0) {
			throw new Error(`failed parse config: ${inspect(tmp)}`)
		}
		const tsCompopts: CompilerOptions = tmp.options
		return tsCompopts
	}

	getCompilerOptionsJSONFollowExtends(configPath: string): {
		[key: string]: unknown
	} {
		let compopts = {}
		const config = this.ts.readConfigFile(configPath, this.ts.sys.readFile).config
		if (config.extends !== undefined) {
			const rqrpath = require.resolve(config.extends)
			compopts = this.getCompilerOptionsJSONFollowExtends(rqrpath)
		}
		return {
			...compopts,
			...config.compilerOptions,
		}
	}
}
