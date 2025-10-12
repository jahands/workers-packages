import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'

import { createDaggerEnv } from './dagger-env'

import type { DaggerOptionsFromConfig } from './dagger-env'

describe('DaggerEnv', () => {
	const daggerEnv = createDaggerEnv({
		args: z.object({
			push: z.string().optional(),
			environment: z.enum(['dev', 'prod']).optional(),
		}),
		env: z.object({
			CI: z.string().optional(),
			NODE_ENV: z.string().optional(),
		}),
		secrets: z.object({
			API_TOKEN: z.string(),
			DATABASE_URL: z.string(),
			REDIS_URL: z.string(),
		}),
		secretPresets: {
			api: ['API_TOKEN', 'DATABASE_URL'],
			cache: ['REDIS_URL'],
		},
		derivedEnvVars: {
			API_TOKEN: {
				API_BASE_URL: 'https://api.example.com',
				API_VERSION: 'v1',
			},
			DATABASE_URL: {
				DB_POOL_SIZE: '10',
			},
		},
	})

	it('should create a DaggerEnv instance', () => {
		expect(daggerEnv).toBeDefined()
		expect(typeof daggerEnv.parseDaggerOptions).toBe('function')
		expect(typeof daggerEnv.getWithEnv).toBe('function')
	})

	it('should return the options schema', () => {
		const schema = daggerEnv.getOptionsSchema()
		expect(schema).toBeDefined()
		expect(schema.shape.args).toBeDefined()
		expect(schema.shape.env).toBeDefined()
		expect(schema.shape.secrets).toBeDefined()
	})

	it('should return available secret presets', () => {
		const presets = daggerEnv.getSecretPresets()
		expect(presets).toEqual(['api', 'cache'])
	})

	it('should return secrets for a specific preset', () => {
		const apiSecrets = daggerEnv.getPresetSecrets('api')
		expect(apiSecrets).toEqual(['API_TOKEN', 'DATABASE_URL'])

		const cacheSecrets = daggerEnv.getPresetSecrets('cache')
		expect(cacheSecrets).toEqual(['REDIS_URL'])
	})

	it('should throw error for unknown preset', () => {
		expect(() => {
			daggerEnv.getPresetSecrets('unknown' as any)
		}).toThrow('Unknown secret preset: unknown')
	})

	it('should validate options schema', () => {
		const schema = daggerEnv.getOptionsSchema()

		const validOptions = {
			args: {
				push: 'true',
				environment: 'dev',
			},
			env: {
				CI: 'true',
				NODE_ENV: 'development',
			},
			secrets: {
				API_TOKEN: 'test-token',
				DATABASE_URL: 'postgres://localhost/test',
				REDIS_URL: 'redis://localhost:6379',
			},
		}

		const result = schema.parse(validOptions)
		expect(result).toEqual(validOptions)
	})

	it('should reject invalid options', () => {
		const schema = daggerEnv.getOptionsSchema()

		const invalidOptions = {
			args: {
				environment: 'invalid', // not in enum
			},
			env: {
				CI: 'true',
			},
			secrets: {
				// missing required secrets
			},
		}

		expect(() => schema.parse(invalidOptions)).toThrow()
	})

	describe('getWithEnv()', () => {
		describe('type inference', () => {
			describe('secretPresets', () => {
				it('should not have type error for valid preset', async () => {
					await daggerEnv.getWithEnv({} as any, ['api'], ['API_TOKEN'])
				})

				it('should have type error for unknown preset', async () => {
					await daggerEnv.getWithEnv(
						{} as any,
						[
							// @ts-expect-error
							'unknown',
						],
						['API_TOKEN']
					)
				})
			})

			describe('secretNames', () => {
				it('should not have type error for valid secret name', async () => {
					await daggerEnv.getWithEnv({} as any, ['api'], ['API_TOKEN'])
				})

				it('should have type error for unknown secret name', async () => {
					await daggerEnv.getWithEnv(
						{} as any,
						['api'],
						[
							// @ts-expect-error
							'INVALID_SECRET',
						]
					)
				})
			})
		})
	})
})

describe('DaggerEnv integration', () => {
	it('should work with a complex configuration', () => {
		const complexConfig = {
			args: z.object({
				push: z.string().optional(),
				filter: z.string().optional(),
			}),
			env: z.object({
				CI: z.string().optional(),
				GITHUB_ACTIONS: z.string().optional(),
			}),
			secrets: z.object({
				BUILD_TOKEN: z.string(),
				CACHE_KEY: z.string(),
				API_TOKEN: z.string(),
				DEPLOY_TOKEN: z.string(),
			}),
			secretPresets: {
				build: ['BUILD_TOKEN', 'CACHE_KEY'],
				deploy: ['API_TOKEN', 'DEPLOY_TOKEN'],
			},
			derivedEnvVars: {
				BUILD_TOKEN: {
					BUILD_API: 'https://build.example.com',
					BUILD_TEAM: 'team_example',
				},
				API_TOKEN: {
					API_ACCOUNT_ID: 'test-account-id',
				},
			},
		} as const

		const daggerEnv = createDaggerEnv(complexConfig)

		expect(daggerEnv.getSecretPresets()).toEqual(['build', 'deploy'])
		expect(daggerEnv.getPresetSecrets('build')).toEqual(['BUILD_TOKEN', 'CACHE_KEY'])

		const schema = daggerEnv.getOptionsSchema()
		const validOptions = {
			args: { push: 'true', filter: 'api' },
			env: { CI: 'true', GITHUB_ACTIONS: 'true' },
			secrets: {
				BUILD_TOKEN: 'test-build-token',
				CACHE_KEY: 'test-cache-key',
				API_TOKEN: 'test-api-token',
				DEPLOY_TOKEN: 'test-deploy-token',
			},
		} satisfies DaggerOptionsFromConfig<typeof complexConfig>

		const result = schema.parse(validOptions)
		expect(result).toEqual(validOptions)
	})
})
