import { dag } from '@dagger.io/dagger'
import { z } from 'zod/v4'

import type { Container, Secret } from '@dagger.io/dagger'

/**
 * Generic configuration for DaggerEnv
 */
export type DaggerEnvConfig = {
	/** Arguments schema */
	args: z.ZodObject<any>
	/** Environment variables schema */
	env: z.ZodObject<any>
	/** Secrets schema */
	secrets: z.ZodObject<any>
	/** Secret presets mapping preset names to arrays of secret names */
	secretPresets: Record<string, readonly string[]>
	/** Derived environment variables based on secret names */
	derivedEnvVars: Record<string, Record<string, string>>
}

/**
 * Inferred options type from config
 */
export type DaggerOptionsFromConfig<T extends DaggerEnvConfig> = {
	args: z.output<T['args']>
	env: z.output<T['env']>
	secrets: z.output<T['secrets']>
}

/**
 * Reusable Dagger environment abstraction
 */
export class DaggerEnv<T extends DaggerEnvConfig> {
	private readonly optionsSchema: z.ZodObject<{
		args: T['args']
		env: T['env']
		secrets: T['secrets']
	}>

	constructor(private readonly config: T) {
		this.optionsSchema = z.object({
			args: config.args,
			env: config.env,
			secrets: config.secrets,
		})
	}

	/**
	 * Parse dagger options from a Secret
	 */
	async parseDaggerOptions(options: Secret): Promise<DaggerOptionsFromConfig<T>> {
		return this.optionsSchema.parse(
			JSON.parse(await options.plaintext())
		) as DaggerOptionsFromConfig<T>
	}

	/**
	 * Create a function that applies environment variables and secrets to a container
	 * based on the provided Dagger options, secret presets, and additional secret names.
	 */
	async getWithEnv(
		daggerOptions: Secret | DaggerOptionsFromConfig<T>,
		secretPresets: Array<Extract<keyof T['secretPresets'], string>>,
		secretNames?: Array<Extract<keyof z.output<T['secrets']>, string>>
	): Promise<{
		/**
		 * Apply environment variables and secrets to a container
		 */
		withEnv: (con: Container) => Container
		/**
		 * Remove environment variables and secrets from a container
		 */
		withoutEnv: (con: Container) => Container
	}> {
		const isSecret = (obj: any): obj is Secret =>
			obj &&
			typeof obj === 'object' &&
			'id' in obj &&
			'plaintext' in obj &&
			typeof obj.id === 'function' &&
			typeof obj.plaintext === 'function'

		const opts = isSecret(daggerOptions)
			? await this.parseDaggerOptions(daggerOptions)
			: daggerOptions

		return {
			withEnv: (con: Container) => {
				let c = con

				// Add individual secret names
				for (const name of secretNames ?? []) {
					if (typeof name === 'string' && name in opts.secrets) {
						const secret = (opts.secrets as Record<string, string>)[name]
						if (!secret) {
							throw new Error(`Secret ${name} is undefined`)
						}
						c = c.withSecretVariable(name, dag.setSecret(name, secret))
					}
				}

				const allSecretNames: string[] = [...(secretNames ?? [])]

				// Add secret presets
				for (const preset of secretPresets) {
					const presetSecrets = this.config.secretPresets[preset]
					if (!presetSecrets) {
						throw new Error(`Unknown secret preset: ${String(preset)}`)
					}

					for (const secretName of presetSecrets) {
						const secret = (opts.secrets as Record<string, string>)[secretName]
						if (!secret) {
							throw new Error(`Secret ${secretName} is undefined`)
						}
						allSecretNames.push(secretName)
						c = c.withSecretVariable(secretName, dag.setSecret(secretName, secret))
					}
				}

				// Add derived env vars based on secretNames
				for (const name of allSecretNames) {
					const derivedEnvVars = this.config.derivedEnvVars[name]
					if (derivedEnvVars) {
						for (const [key, value] of Object.entries(derivedEnvVars)) {
							c = c.withEnvVariable(key, value)
						}
					}
				}

				// Add environment variables from options
				const envVars = opts.env
				for (const [key, value] of Object.entries(envVars)) {
					if (value !== undefined && typeof value === 'string') {
						c = c.withEnvVariable(key, value)
					}
				}

				return c
			},
			withoutEnv: (con: Container) => {
				let c = con

				// Add individual secret names
				for (const name of secretNames ?? []) {
					if (typeof name === 'string' && name in opts.secrets) {
						const secret = (opts.secrets as Record<string, string>)[name]
						if (!secret) {
							throw new Error(`Secret ${name} is undefined`)
						}
						c = c.withoutSecretVariable(name)
					}
				}

				const allSecretNames: string[] = [...(secretNames ?? [])]

				// remove secret presets
				for (const preset of secretPresets) {
					const presetSecrets = this.config.secretPresets[preset]
					if (!presetSecrets) {
						throw new Error(`Unknown secret preset: ${String(preset)}`)
					}

					for (const secretName of presetSecrets) {
						const secret = (opts.secrets as Record<string, string>)[secretName]
						if (!secret) {
							throw new Error(`Secret ${secretName} is undefined`)
						}
						allSecretNames.push(secretName)
						c = c.withoutSecretVariable(secretName)
					}
				}

				// remove derived env vars based on secretNames
				for (const name of allSecretNames) {
					const derivedEnvVars = this.config.derivedEnvVars[name]
					if (derivedEnvVars) {
						for (const key of Object.keys(derivedEnvVars)) {
							c = c.withoutEnvVariable(key)
						}
					}
				}

				// remove environment variables from options
				const envVars = opts.env
				for (const key of Object.keys(envVars)) {
					c = c.withoutEnvVariable(key)
				}

				return c
			},
		}
	}

	/**
	 * Get the options schema for this DaggerEnv instance
	 */
	getOptionsSchema() {
		return this.optionsSchema
	}

	/**
	 * Get available secret presets
	 */
	getSecretPresets(): Array<keyof T['secretPresets']> {
		return Object.keys(this.config.secretPresets)
	}

	/**
	 * Get secrets for a specific preset
	 */
	getPresetSecrets(preset: Extract<keyof T['secretPresets'], string>): readonly string[] {
		const secrets = this.config.secretPresets[preset]
		if (!secrets) {
			throw new Error(`Unknown secret preset: ${String(preset)}`)
		}
		return secrets
	}
}

/**
 * Helper function to create a DaggerEnv instance with proper typing
 */
export function createDaggerEnv<T extends DaggerEnvConfig>(config: T): DaggerEnv<T> {
	return new DaggerEnv(config)
}
