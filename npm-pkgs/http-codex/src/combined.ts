import { httpStatus as statusCodes } from './status.js'
import { text } from './statusText.js'

/**
 * HTTP status codes as registered with IANA.
 * See: https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml
 *
 * Based on Go's http library
 *
 * @example
 * ```ts
 * import { httpStatus } from 'http-codex'
 *
 * const text = httpStatus.text(httpStatus.OK) // 'OK'
 * ```
 *
 * @example Status codes only (smaller bundle size)
 * ```ts
 * import { httpStatus } from 'http-codex/status'
 *
 * const status = httpStatus.OK // 200
 * ```
 */
export const httpStatus = {
	...statusCodes,
	text,
} as const
