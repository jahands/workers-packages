import { cliError } from './errors.js'

/**
 * Get an env var, throwing an error if it's not set
 */
export function getEnv(name: string): string {
	const v = process.env[name]
	if (!v) {
		throw cliError(`Environment variable ${name} is not set`)
	}
	return v
}
