import path from 'node:path'
import { Result } from 'better-result'
import * as z from 'zod'

import { getRepoRoot } from './path'

export async function getTurboSchemaUrl(packageJsonPath?: string): Promise<string> {
	const pkgJsonPathResult = packageJsonPath
		? Result.ok(packageJsonPath)
		: getRepoRoot().map((repoRoot) => path.join(repoRoot, 'package.json'))

	const schemaUrlResult = (
		await pkgJsonPathResult.andThenAsync((resolvedPackageJsonPath) =>
			Result.tryPromise(() => fs.readFile(resolvedPackageJsonPath, 'utf8'))
		)
	)
		.andThen((contents) => Result.try(() => JSON.parse(contents.toString())))
		.andThen((parsed) => Result.try(() => PackageJson.parse(parsed)))
		.andThen((pkg) =>
			Result.try(() => TurboVersion.parse(pkg.devDependencies?.turbo ?? pkg.dependencies?.turbo))
		)
		.map(
			(turboVersion) => `https://v${turboVersion.replaceAll('.', '-')}.turborepo.dev/schema.json`
		)

	return schemaUrlResult.match({
		ok: (turboSchemaUrl) => turboSchemaUrl,
		err: () => 'https://turborepo.dev/schema.json',
	})
}

const TurboVersion = z
	.string()
	.transform(
		(val) =>
			val
				.trim()
				.replace(/^[~^<>=\sv]*/, '')
				.split(/\s+/)[0]
	)
	.pipe(z.string().regex(/^\d+\.\d+\.\d+$/))

const PackageJson = z.object({
	dependencies: z.record(z.string(), z.string()).optional(),
	devDependencies: z.record(z.string(), z.string()).optional(),
})
