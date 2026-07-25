import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'

import { createDaggerEnv } from './dagger-env'
import { createDaggerCommandRunner } from './run-dagger-cmd'

import type { RunDaggerCommandConfig } from './run-dagger-cmd'

const mocks = vi.hoisted(() => ({
	/** Resolves the JSON payload returned by `infisical export` */
	exportJson: vi.fn(),
	/** Records the rendered `infisical export` command string */
	exportCmd: vi.fn(),
	/** Records the final command execution: (options, argv) */
	spawn: vi.fn(
		async (_opts: { env: Record<string, string | undefined> }, _argv: string[]) => undefined
	),
	/** Mock for fs.exists() (docker socket probe) */
	exists: vi.fn(async () => false),
}))

vi.mock('zx', () => {
	const $ = (firstArg: unknown, ...vals: unknown[]) => {
		if (Array.isArray(firstArg)) {
			// Direct template call: $`infisical export ...`
			const pieces = firstArg as readonly string[]
			const cmd = pieces.reduce(
				(acc, piece, i) => acc + piece + (i < vals.length ? String(vals[i]) : ''),
				''
			)
			mocks.exportCmd(cmd)
			return { json: mocks.exportJson }
		}
		// Options call: $({ env, stdio }) returns a template executor
		return (_pieces: TemplateStringsArray, ...templateVals: unknown[]) =>
			mocks.spawn(
				firstArg as { env: Record<string, string | undefined> },
				templateVals[0] as string[]
			)
	}
	return { $, fs: { exists: mocks.exists } }
})

/**
 * Environment variables passed to the spawned process
 */
type SpawnEnv = Record<string, string | undefined>

function getSpawnCall(): { env: SpawnEnv; argv: string[] } {
	expect(mocks.spawn).toHaveBeenCalledTimes(1)
	const call = mocks.spawn.mock.calls.at(0)
	if (!call) {
		throw new Error('spawn was not called')
	}
	const [opts, argv] = call
	return { env: opts.env, argv }
}

function createRunner(overrides?: Partial<Pick<RunDaggerCommandConfig, 'dockerCommands'>>) {
	const daggerEnv = createDaggerEnv({
		args: z.object({
			push: z.string().optional(),
		}),
		env: z.object({
			CI: z.string().optional(),
			GITHUB_ACTIONS: z.string().optional(),
			NODE_ENV: z.string().optional(),
		}),
		secrets: z.object({
			API_TOKEN: z.string(),
		}),
		secretPresets: {
			api: ['API_TOKEN'],
		},
		derivedEnvVars: {},
	})

	return createDaggerCommandRunner({
		projectId: 'test-project-id',
		env: 'prod',
		path: '/ci/test',
		daggerEnv,
		...overrides,
	})
}

describe('createDaggerCommandRunner()', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.stubEnv('CI', undefined)
		vi.stubEnv('GITHUB_ACTIONS', undefined)
		vi.stubEnv('DAGGER_CLOUD_TOKEN', undefined)
		mocks.exportJson.mockResolvedValue([
			{ key: 'API_TOKEN', value: 'test-api-token', comment: '' },
			{ key: 'DAGGER_CLOUD_TOKEN', value: 'test-dagger-cloud-token', comment: '' },
		])
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('builds the expected DAGGER_OPTIONS payload from the infisical export', async () => {
		const runDaggerCommand = createRunner()
		await runDaggerCommand('test-cmd', {
			args: { push: 'true' },
			env: { NODE_ENV: 'production' },
		})

		expect(mocks.exportCmd).toHaveBeenCalledWith(
			'infisical export --silent --format=json --projectId test-project-id --env prod --path /ci/test'
		)

		const { env } = getSpawnCall()
		expect(JSON.parse(env.DAGGER_OPTIONS as string)).toStrictEqual({
			args: { push: 'true' },
			env: { NODE_ENV: 'production' },
			secrets: { API_TOKEN: 'test-api-token' },
		})
		expect(env.DAGGER_CLOUD_TOKEN).toBeUndefined()
	})

	it('passes DAGGER_CLOUD_TOKEN to the runner env (but not DAGGER_OPTIONS) in CI', async () => {
		vi.stubEnv('CI', 'true')
		vi.stubEnv('GITHUB_ACTIONS', 'true')

		const runDaggerCommand = createRunner()
		await runDaggerCommand('test-cmd')

		const { env } = getSpawnCall()
		const daggerOptions = JSON.parse(env.DAGGER_OPTIONS as string)
		expect(daggerOptions.secrets).not.toHaveProperty('DAGGER_CLOUD_TOKEN')
		expect(daggerOptions.env).toStrictEqual({ CI: 'true', GITHUB_ACTIONS: 'true' })
		expect(env.DAGGER_CLOUD_TOKEN).toBe('test-dagger-cloud-token')
	})

	it('spawns dagger directly without an op wrapper', async () => {
		const runDaggerCommand = createRunner()
		await runDaggerCommand('test-cmd', { extraArgs: ['--verbose'] })

		const { argv } = getSpawnCall()
		expect(argv[0]).toBe('dagger')
		expect(argv).not.toContain('op')
		expect(argv).toStrictEqual([
			'dagger',
			'call',
			'test-cmd',
			'--verbose',
			'--options=env://DAGGER_OPTIONS',
		])
	})

	describe('docker socket', () => {
		it('appends --docker-socket for dockerCommands when the socket exists', async () => {
			mocks.exists.mockResolvedValue(true)

			const runDaggerCommand = createRunner({ dockerCommands: ['build'] })
			await runDaggerCommand('build')

			const { argv } = getSpawnCall()
			expect(argv).toStrictEqual([
				'dagger',
				'call',
				'build',
				'--docker-socket=/var/run/docker.sock',
				'--options=env://DAGGER_OPTIONS',
			])
		})

		it('does not append --docker-socket for non-docker commands', async () => {
			mocks.exists.mockResolvedValue(true)

			const runDaggerCommand = createRunner({ dockerCommands: ['build'] })
			await runDaggerCommand('test-cmd')

			const { argv } = getSpawnCall()
			expect(argv).not.toContain('--docker-socket=/var/run/docker.sock')
			expect(mocks.exists).not.toHaveBeenCalled()
		})

		it('does not append --docker-socket when the socket does not exist', async () => {
			mocks.exists.mockResolvedValue(false)

			const runDaggerCommand = createRunner({ dockerCommands: ['build'] })
			await runDaggerCommand('build')

			const { argv } = getSpawnCall()
			expect(argv).not.toContain('--docker-socket=/var/run/docker.sock')
		})
	})
})
