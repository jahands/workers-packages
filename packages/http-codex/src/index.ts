import { http as statusCodes } from './status'
import { statusText } from './statusText'

export type { HttpStatusCodeName, HttpStatusCode } from './status'

/**
 * HTTP status codes as registered with IANA.
 * See: https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml
 *
 * Based on Go's http library
 *
 * @example
 * ```ts
 * import { http } from 'http-codex'
 *
 * const text = http.statusText(http.StatusOK) // 'OK'
 * ```
 *
 * @example Status codes only (tree-shakable)
 * ```ts
 * import { http } from 'http-codex/status'
 *
 * const status = http.StatusOK // 200
 * ```
 */
export const http = {
	...statusCodes,
	statusText,
}
