import { AsyncLocalStorage } from 'node:async_hooks'
import { Secret } from '@dagger.io/dagger'

/**
 * Structure stored in AsyncLocalStorage, containing both the fully merged
 * environment variables and the set of variables explicitly passed to the
 * current decorated function call.
 */
export interface EnvContext {
	currentParams: Set<string>
	mergedEnv: Record<string, Secret | string | undefined>
}

/**
 * Store for environment variables accessible via AsyncLocalStorage
 */
export const envStorage = new AsyncLocalStorage<EnvContext>()

/**
 * Helper to extract parameter names from a function's source code.
 * Note: This approach using Function.toString() can be fragile and might
 * break with code minification or complex function definitions.
 */
export function extractParamNames(func: Function): string[] {
	const funcStr = func.toString().replace(/(\r\n|\n|\r)/gm, '')
	// Regex to find parameter list within parentheses, handles various function definition styles
	const paramsMatch =
		funcStr.match(/(?:async\s*)?(?:function\s*[\w\s]*)?\(([^)]*)\)/) ??
		funcStr.match(/^\s*(?:async\s*)?\(([^)]*)\)/) // Arrow function support

	if (!paramsMatch || typeof paramsMatch[1] === 'undefined') {
		console.warn('Could not extract parameter names from function string:', funcStr)
		return []
	}
	const paramsStr = paramsMatch[1]

	// Remove comments, default values, and type annotations to isolate names
	const cleanedParamsStr = paramsStr
		.replace(/\/\*.*?\*\//g, '') // Remove block comments
		.replace(/\/\/.*?$/gm, '') // Remove line comments

	if (!cleanedParamsStr.trim()) {
		return [] // No parameters
	}

	return cleanedParamsStr
		.split(',')
		.map((param) => {
			// Remove type annotations (e.g., ": Secret") and default initializers (e.g., "= 'default'")
			const namePart = param.split(/[:=]/)[0]
			return namePart.trim()
		})
		.filter((name) => name.length > 0) // Filter out empty strings from trailing commas etc.
}

/**
 * Decorator factory that wraps a method to capture its arguments based on
 * extracted parameter names and store them in AsyncLocalStorage.
 */
export function ParamsToEnv(): MethodDecorator {
	return function (_target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
		if (!descriptor || typeof descriptor.value !== 'function') {
			throw new Error(
				`@ParamsToEnv decorator can only be applied to methods, not: ${String(propertyKey)}`
			)
		}
		const originalMethod = descriptor.value

		let paramNames: string[] | null = null // Cache parameter names lazily

		descriptor.value = function (...args: any[]) {
			const parentContext = envStorage.getStore()

			if (paramNames === null) {
				paramNames = extractParamNames(originalMethod)
				// Basic validation: Check if the number of extracted names matches the number of arguments received.
				// This might be inaccurate if optional parameters aren't passed.
				if (paramNames.length !== args.length && typeof propertyKey === 'string') {
					// Log a warning but attempt to proceed. The context might be incomplete.
					console.warn(
						`Parameter name extraction/argument count mismatch for ${propertyKey}: ` +
							`Extracted ${paramNames.length} names (${paramNames.join(', ')}), received ${args.length} args. ` +
							`Context in AsyncLocalStorage may be incomplete or incorrect.`
					)
					// Optionally, you could try to pad paramNames or truncate args, but it's risky.
				}
			}

			const newEnv: Record<string, Secret | string | undefined> = {}
			const currentParams = new Set<string>() // Track params for current method
			paramNames?.forEach((name, index) => {
				// Check if the param name matches the ENV_VAR pattern
				if (/^[A-Z0-9_]+$/.test(name)) {
					// Add all matching defined parameter names to currentParams
					currentParams.add(name)
					// Only add to newEnv if argument was actually passed
					if (index < args.length) {
						newEnv[name] = args[index]
					}
				}
				// If paramNames.length > args.length, some names won't get a value, which is expected for optional params.
			})

			// merge parent context with new context (new takes precedence)
			const parentMergedEnv = parentContext?.mergedEnv ?? {}
			const mergedEnv = { ...parentMergedEnv, ...newEnv }

			// Prepare context object for storage
			const contextToStore: EnvContext = {
				currentParams,
				mergedEnv,
			}

			// run the original method within the AsyncLocalStorage context using the merged env
			return envStorage.run(contextToStore, () => {
				// The original method is called with its original arguments
				return originalMethod.apply(this, args)
			})
		}
	}
}
