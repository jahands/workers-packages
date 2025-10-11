/**
 * HTTP methods as defined in RFC 9110 and other RFCs.
 * See: https://www.iana.org/assignments/http-methods/http-methods.xhtml
 *
 * @example
 * ```ts
 * import { httpMethod } from 'http-codex/method'
 *
 * const method = httpMethod.GET // 'GET'
 * ```
 */
export const httpMethod = {
	/** RFC 9110, 9.3.1 */
	GET: 'GET',
	/** RFC 9110, 9.3.2 */
	HEAD: 'HEAD',
	/** RFC 9110, 9.3.3 */
	POST: 'POST',
	/** RFC 9110, 9.3.4 */
	PUT: 'PUT',
	/** RFC 5789 */
	PATCH: 'PATCH',
	/** RFC 9110, 9.3.5 */
	DELETE: 'DELETE',
	/** RFC 9110, 9.3.6 */
	CONNECT: 'CONNECT',
	/** RFC 9110, 9.3.7 */
	OPTIONS: 'OPTIONS',
	/** RFC 9110, 9.3.8 */
	TRACE: 'TRACE',
} as const satisfies Record<string, string>

export type HttpMethod = keyof typeof httpMethod
