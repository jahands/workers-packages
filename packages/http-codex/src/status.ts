/**
 * http status text adapted from https://go.dev/src/net/http/status.go
 * Source: https://github.com/golang/go/blob/master/src/net/http/status.go
 * Commit: 55590f3a2b89f001bcadf0df6eb2dde62618302b
 */

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
	/** RFC 9110, 15.2.1 */
	Continue: 100,
	/** RFC 9110, 15.2.2 */
	SwitchingProtocols: 101,
	/** RFC 2518, 10.1 */
	Processing: 102,
	/** RFC 8297 */
	EarlyHints: 103,

	/** RFC 9110, 15.3.1 */
	OK: 200,
	/** RFC 9110, 15.3.2 */
	Created: 201,
	/** RFC 9110, 15.3.3 */
	Accepted: 202,
	/** RFC 9110, 15.3.4 */
	NonAuthoritativeInfo: 203,
	/** RFC 9110, 15.3.5 */
	NoContent: 204,
	/** RFC 9110, 15.3.6 */
	ResetContent: 205,
	/** RFC 9110, 15.3.7 */
	PartialContent: 206,
	/** RFC 4918, 11.1 */
	MultiStatus: 207,
	/** RFC 5842, 7.1 */
	AlreadyReported: 208,
	/** RFC 3229, 10.4.1 */
	IMUsed: 226,
	/** */

	/** RFC 9110, 15.4.1 */
	MultipleChoices: 300,
	/** RFC 9110, 15.4.2 */
	MovedPermanently: 301,
	/** RFC 9110, 15.4.3 */
	Found: 302,
	/** RFC 9110, 15.4.4 */
	SeeOther: 303,
	/** RFC 9110, 15.4.5 */
	NotModified: 304,
	/** RFC 9110, 15.4.6 */
	UseProxy: 305,
	/** RFC 9110, 15.4.7 (Unused) */
	_: 306,
	/** RFC 9110, 15.4.8 */
	TemporaryRedirect: 307,
	/** RFC 9110, 15.4.9 */
	PermanentRedirect: 308,

	/** RFC 9110, 15.5.1 */
	BadRequest: 400,
	/** RFC 9110, 15.5.2 */
	Unauthorized: 401,
	/** RFC 9110, 15.5.3 */
	PaymentRequired: 402,
	/** RFC 9110, 15.5.4 */
	Forbidden: 403,
	/** RFC 9110, 15.5.5 */
	NotFound: 404,
	/** RFC 9110, 15.5.6 */
	MethodNotAllowed: 405,
	/** RFC 9110, 15.5.7 */
	NotAcceptable: 406,
	/** RFC 9110, 15.5.8 */
	ProxyAuthRequired: 407,
	/** RFC 9110, 15.5.9 */
	RequestTimeout: 408,
	/** RFC 9110, 15.5.10 */
	Conflict: 409,
	/** RFC 9110, 15.5.11 */
	Gone: 410,
	/** RFC 9110, 15.5.12 */
	LengthRequired: 411,
	/** RFC 9110, 15.5.13 */
	PreconditionFailed: 412,
	/** RFC 9110, 15.5.14 */
	RequestEntityTooLarge: 413,
	/** RFC 9110, 15.5.15 */
	RequestURITooLong: 414,
	/** RFC 9110, 15.5.16 */
	UnsupportedMediaType: 415,
	/** RFC 9110, 15.5.17 */
	RequestedRangeNotSatisfiable: 416,
	/** RFC 9110, 15.5.18 */
	ExpectationFailed: 417,
	/** RFC 9110, 15.5.19 (Unused) */
	Teapot: 418,
	/** RFC 9110, 15.5.20 */
	MisdirectedRequest: 421,
	/** RFC 9110, 15.5.21 */
	UnprocessableEntity: 422,
	/** RFC 4918, 11.3 */
	Locked: 423,
	/** RFC 4918, 11.4 */
	FailedDependency: 424,
	/** RFC 8470, 5.2. */
	TooEarly: 425,
	/** RFC 9110, 15.5.22 */
	UpgradeRequired: 426,
	/** RFC 6585, 3 */
	PreconditionRequired: 428,
	/** RFC 6585, 4 */
	TooManyRequests: 429,
	/** RFC 6585, 5 */
	RequestHeaderFieldsTooLarge: 431,
	/** RFC 7725, 3 */
	UnavailableForLegalReasons: 451,

	/** RFC 9110, 15.6.1 */
	InternalServerError: 500,
	/** RFC 9110, 15.6.2 */
	NotImplemented: 501,
	/** RFC 9110, 15.6.3 */
	BadGateway: 502,
	/** RFC 9110, 15.6.4 */
	ServiceUnavailable: 503,
	/** RFC 9110, 15.6.5 */
	GatewayTimeout: 504,
	/** RFC 9110, 15.6.6 */
	HTTPVersionNotSupported: 505,
	/** RFC 2295, 8.1 */
	VariantAlsoNegotiates: 506,
	/** RFC 4918, 11.5 */
	InsufficientStorage: 507,
	/** RFC 5842, 7.2 */
	LoopDetected: 508,
	/** RFC 2774, 7 */
	NotExtended: 510,
	/** RFC 6585, 6 */
	NetworkAuthenticationRequired: 511,
} as const satisfies Record<string, number>

export type HttpStatusCodeName = keyof typeof httpStatus
export type HttpStatusCode = (typeof httpStatus)[HttpStatusCodeName]

/**
 * Returns whether the status code should have a null http body.
 * Currently includes:
 *
 * ```ts
 * httpStatus.SwitchingProtocols // 101
 * httpStatus.NoContent // 204
 * httpStatus.ResetContent // 205
 * httpStatus.NotModified // 304
 * ```
 *
 * @example Return null body when needed
 *
 * ```ts
 * import { httpStatus, isNullBodyStatus } from 'http-codex'
 *
 * const res = await fetch(url) // Might be 204, 304, etc.
 * return new Response(isNullBodyStatus(res.status) ? null : res.body, {
 * 	// Useful for when we need to customize response headers/init/etc.
 * })
 * ```
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function isNullBodyStatus(status: HttpStatusCode | (number & {})): boolean {
	return (nullBodyStatuses as number[]).includes(status)
}

/**
 * List of null body statuses:
 *
 * ```ts
 * 101 // httpStatus.SwitchingProtocols
 * 204 // httpStatus.NoContent
 * 205 // httpStatus.ResetContent
 * 304 // httpStatus.NotModified
 * ```
 */
export const nullBodyStatuses = [
	101 satisfies HttpStatusCode, // httpStatus.SwitchingProtocols
	204 satisfies HttpStatusCode, // httpStatus.NoContent
	205 satisfies HttpStatusCode, // httpStatus.ResetContent
	304 satisfies HttpStatusCode, // httpStatus.NotModified
] as const satisfies number[]
