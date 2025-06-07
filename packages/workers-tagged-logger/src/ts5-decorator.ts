 
 
import { als } from './logger.js'

import type { LogTags } from './logger.js'

/** Type alias for the actual decorator function returned */
type MethodDecoratorFn = (
	originalMethod: (...args: any[]) => any, // The original method being decorated
	context: ClassMethodDecoratorContext // Context object with metadata about the method
) => ((...args: any[]) => any) | void // Returns the new method, or void if not replaced

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
 * **IMPORTANT**: This decorator uses the standard ECMAScript decorator syntax (TypeScript 5+).
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
 * **IMPORTANT**: This decorator uses the standard ECMAScript decorator syntax (TypeScript 5+).
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
 * **IMPORTANT**: This decorator uses the standard ECMAScript decorator syntax (TypeScript 5+).
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
		originalMethod: (...args: any[]) => any, // Class prototype (instance) or constructor (static)
		context: ClassMethodDecoratorContext // Decorator context
	): ((...args: any[]) => any) | void {
		const method = String(context.name)

		// Validate that this decorator is applied to a method
		if (context.kind !== 'method') {
			throw new Error(
				`@WithLogTags decorator can only be applied to methods, not ${context.kind} contexts like '${method}'.`
			)
		}

		let explicitSource: string | undefined
		let userTags: LogTags | undefined

		if (typeof sourceOrTags === 'string') {
			explicitSource = sourceOrTags
		} else if (sourceOrTags) {
			explicitSource = sourceOrTags.source
			userTags = sourceOrTags // Keep other tags from sourceOrTags
		}

		// The wrapper function that replaces the original method
		const replacementMethod = function (this: any, ...args: any[]): any {
			const existing = als.getStore()
			let rootMethod = method
			if (
				 
				existing &&
				 
				existing.$logger &&
				typeof existing.$logger === 'object' &&
				!Array.isArray(existing.$logger) &&
				!(existing.$logger instanceof Date) &&
				typeof existing.$logger.rootMethod === 'string'
			) {
				rootMethod = existing.$logger.rootMethod
			}

			// Infer class name dynamically using 'this' and context.static
			// This logic runs when the decorated method is called.
			let inferredClassName: string = 'UnknownClass'
			if (context.static) {
				// For static methods, 'this' is the class constructor
				if (typeof this === 'function') {
					const staticClassName = this.name
					if (typeof staticClassName === 'string' && staticClassName !== '') {
						inferredClassName = staticClassName
					}
				}
			} else {
				// For instance methods, 'this' is the class instance
				if (this !== null && this !== undefined && typeof this.constructor === 'function') {
					const instanceClassName = this.constructor.name
					if (typeof instanceClassName === 'string' && instanceClassName !== '') {
						inferredClassName = instanceClassName
					}
				}
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

		return replacementMethod
	}
}
