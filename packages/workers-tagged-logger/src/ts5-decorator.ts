/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/naming-convention */
import { als } from './logger.js'

import type { LogTags } from './logger.js'

/** Type alias for the actual decorator function returned */
type MethodDecoratorFn = (
	target: any,
	propertyKey: string | symbol,
	descriptor: PropertyDescriptor
) => PropertyDescriptor | void

/** Tags for the WithLogTags decorator */
type WithLogTagsDecoratorTags<T extends LogTags> = {
	/**
	 * Explicit source for logs. If omitted, the class name containing the
	 * decorated method will automatically be used as the source.
	 * @default Class name
	 */
	source?: string
} & Partial<T & LogTags>

/**
 * Decorator: Wraps a class method with logging context.
 * Automatically uses the Class Name as the log source.
 *
 * **IMPORTANT**: Requires `"experimentalDecorators": true` to be added to tsconfig.json
 *
 * Automatically adds:
 *   - `$logger.method`: The name of the currently executing decorated method.
 *   - `$logger.rootMethod`: The name of the first decorated method entered in the async context.
 * Nested calls will inherit metadata.
 *
 * @example
 *
 * Create class to handle requests with log tags added
 *
 * ```ts
 * // ... imports and logger setup ...
 * class MyService {
 *   // remove the \ before the @ (this is a workaround for VS Code docstring issues)
 *   \@WithLogTags() // $logger.method: 'handleRequest' will be added
 *   async handleRequest(requestId: string, request: Request) {
 *     logger.setTags({ requestId })
 *     logger.info('Handling request') // -> tags: { source: 'MyService', $logger: { method: 'handleRequest', rootMethod: 'handleRequest' }, requestId: '...' }
 *     await this.processRequest(request)
 *     logger.info('Request handled')
 *   }
 *
 *   // $logger.method: 'processRequest' will be added
 *   // and $logger.rootMethod will remain 'handleRequest'
 *   \@WithLogTags()
 *   async processRequest(request: Request) {
 *     // Inherits requestId from handleRequest's context
 *     // Tags here: { source: 'MyService', $logger: { method: 'processRequest', rootMethod: 'handleRequest' }, requestId: '...' }
 *     logger.debug('Processing request...')
 *     // ...
 *     logger.debug('Request processed')
 *   }
 * }
 * ```
 */
export function WithLogTags(): MethodDecoratorFn
/**
 * Decorator: Wraps a class method with logging context.
 * Uses the provided string as the log source.
 *
 * **IMPORTANT**: Requires `"experimentalDecorators": true` to be added to tsconfig.json
 *
 * Automatically adds:
 *   - `$logger.method`: The name of the currently executing decorated method.
 *   - `$logger.rootMethod`: The name of the first decorated method entered in the async context.
 * Nested calls will inherit metadata.
 *
 * @param source Explicit source for logs.
 *
 * @example
 *
 * Create class to handle requests with log tags added
 *
 * ```ts
 * // ... imports and logger setup ...
 * class MyService {
 *   // remove the \ before the @ (this is a workaround for VS Code docstring issues)
 *   \@WithLogTags<MyTags>('MyService') // $logger.method: 'handleRequest' will be added
 *   async handleRequest(requestId: string, request: Request) {
 *     logger.setTags({ requestId })
 *     logger.info('Handling request') // -> tags: { source: 'MyService', $logger: { method: 'handleRequest', rootMethod: 'handleRequest' }, requestId: '...' }
 *     await this.processRequest(request)
 *     logger.info('Request handled')
 *   }
 *
 *   // $logger.method: 'processRequest' will be added
 *   // and $logger.rootMethod will remain 'handleRequest'
 *   \@WithLogTags<MyTags>('MyServiceHelper')
 *   async processRequest(request: Request) {
 *      // Inherits requestId from handleRequest's context
 *       Tags here: { source: 'MyServiceHelper', $logger: { method: 'processRequest', rootMethod: 'handleRequest' }, requestId: '...' }
 *     logger.debug('Processing request...')
 *     // ...
 *     logger.debug('Request processed')
 *   }
 * }
 * ```
 */
export function WithLogTags(source: string): MethodDecoratorFn
/**
 * Decorator: Wraps a class method with logging context.
 * Uses options to configure source (falls back to Class Name) and initial tags.
 *
 * **IMPORTANT**: Requires `"experimentalDecorators": true` to be added to tsconfig.json
 *
 * Automatically adds:
 *   - `$logger.method`: The name of the currently executing decorated method.
 *   - `$logger.rootMethod`: The name of the first decorated method entered in the async context.
 * Nested calls will inherit metadata.
 *
 * @param tags Additional tags to set for this context. User-provided tags
 *             will override existing tags but NOT the automatically added logger tags.
 * @param tags.source Tag for the source of these logs (e.g., the Worker name or class name). Falls back to Class Name
 *
 * @example
 *
 * Create class to handle requests with log tags added
 *
 * ```ts
 * // ... imports and logger setup ...
 * class MyService {
 *   // remove the \ before the @ (this is a workaround for VS Code docstring issues)
 *   \@WithLogTags<MyTags>({ source: 'MyService' }) // $logger.method: 'handleRequest' will be added
 *   async handleRequest(requestId: string, request: Request) {
 *     logger.setTags({ requestId })
 *     logger.info('Handling request') // -> tags: { source: 'MyService', $logger.method: 'handleRequest', requestId: '...' }
 *     await this.processRequest(request)
 *     logger.info('Request handled')
 *   }
 *
 *   // $logger.method: 'processRequest' will be added
 *   // and $logger.rootMethod will remain 'handleRequest'
 *   \@WithLogTags<MyTags>({ foo: 'bar' })
 *   async processRequest(request: Request) {
 *      // Inherits requestId from handleRequest's context
 *      // Tags here: { source: 'MyService', foo: 'bar', $logger.method: 'processRequest', $logger.rootMethod: 'handleRequest', requestId: '...' }
 *     logger.debug('Processing request...')
 *     // ...
 *     logger.debug('Request processed')
 *   }
 * }
 * ```
 */
export function WithLogTags<T extends LogTags>(
	tags: WithLogTagsDecoratorTags<Partial<T & LogTags>>
): MethodDecoratorFn
export function WithLogTags<T extends LogTags>(
	/** Optional configuration: string is explicit source, object allows source/tags, undefined uses class name */
	sourceOrTags?: string | WithLogTagsDecoratorTags<Partial<T & LogTags>>
): MethodDecoratorFn {
	// This is the function returned that acts as the decorator
	return function (
		target: any, // Class prototype (instance) or constructor (static)
		propertyKey: string | symbol,
		descriptor: PropertyDescriptor
	): PropertyDescriptor {
		const method = String(propertyKey)

		// Validate descriptor (ensure it's a method)
		if (descriptor === undefined || typeof descriptor.value !== 'function') {
			throw new Error(
				`@WithLogTags decorator can only be applied to methods, not properties like ${method}.`
			)
		}

		let explicitSource: string | undefined
		let userTags: LogTags | undefined

		if (typeof sourceOrTags === 'string') {
			explicitSource = sourceOrTags
		} else if (sourceOrTags) {
			explicitSource = sourceOrTags.source
			userTags = sourceOrTags
		}

		let inferredClassName: string | undefined = 'UnknownClass'
		if (typeof target === 'function') {
			// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
			inferredClassName = target.name || inferredClassName
		} else if (target !== undefined && typeof target.constructor === 'function') {
			// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
			inferredClassName = target.constructor.name || inferredClassName
		}

		// Get original method and wrap it
		const originalMethod = descriptor.value

		descriptor.value = function (...args: any[]): MethodDecoratorFn {
			const existing = als.getStore()
			let rootMethod = method
			if (
				// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
				existing &&
				// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
				existing.$logger &&
				typeof existing.$logger === 'object' &&
				!Array.isArray(existing.$logger) &&
				!(existing.$logger instanceof Date) &&
				typeof existing.$logger.rootMethod === 'string'
			) {
				rootMethod = existing.$logger.rootMethod
			}

			const finalSource = explicitSource ?? existing?.source ?? inferredClassName
			const sourceTag = { source: finalSource }

			// Define the logger-specific tags for this context level
			const loggerTags = {
				$logger: {
					method: method, // Always the current method
					rootMethod: rootMethod, // Inherited or current
				},
			}

			// Create the new tags object for the ALS context
			// Merge order: existing -> final source -> user tags -> logger tags
			const newTags = structuredClone(
				Object.assign(
					{},
					existing,
					sourceTag, // Use the determined source tag
					userTags, // Add user tags if provided
					loggerTags // Logger tags take precedence
				)
			)

			// Run the original method within the AsyncLocalStorage context
			return als.run(newTags, () => {
				return originalMethod.apply(this, args)
			})
		}

		return descriptor
	}
}
