import path from 'node:path'
import { cliError } from '@jahands/cli-tools'
import { Result, TaggedError } from 'better-result'
import { up as findUp } from 'empathic/find'

export function getTurboJsonPath(): string {
	return path.join(path.dirname(getTurboConfigPath()), 'turbo.json')
}

export function getTurboConfigPath(): string {
	const turboConfigPath = findUp('turbo.config.ts')
	if (!turboConfigPath) {
		throw cliError('turbo.config.ts not found')
	}
	return turboConfigPath
}

const lockfiles = [
	'pnpm-lock.yaml',
	'bun.lock',
	'bun.lockb',
	'yarn.lock',
	'package-lock.json',
	'npm-shrinkwrap.json',
] as const satisfies string[]

export function getRepoRoot(cwd: string = process.cwd()): Result<string, RepoRootError> {
	return Result.try({
		try: () => {
			for (const lockfile of lockfiles) {
				const lockfilePath = findUp(lockfile, { cwd })
				if (lockfilePath) {
					return lockfilePath
				}
			}
		},
		catch: (e) => new RepoRootLookupError({ cwd, cause: e }),
	}).andThen((lockfile) => {
		if (!lockfile) {
			return Result.err(new RepoRootNotFoundError({ cwd }))
		}

		return Result.ok(path.dirname(lockfile))
	})
}

export type RepoRootError = RepoRootLookupError | RepoRootNotFoundError

export class RepoRootNotFoundError extends TaggedError('RepoRootNotFoundError')<{
	cwd: string
	message: string
}>() {
	constructor(args: { cwd: string }) {
		super({
			cwd: args.cwd,
			message: `could not determine repo root path: unable to find any lockfile (${lockfiles.join(', ')})`,
		})
	}
}

export class RepoRootLookupError extends TaggedError('RepoRootLookupError')<{
	cwd: string
	message: string
	cause: unknown
}>() {
	constructor(args: { cwd: string; cause: unknown }) {
		super({
			cwd: args.cwd,
			cause: args.cause,
			message: 'could not determine repo root path: lockfile lookup threw an exception',
		})
	}
}
