/**
 * http status codes adapted from https://go.dev/src/net/http/status.go
 * Source: https://github.com/golang/go/blob/master/src/net/http/status.go
 * Commit: 55590f3a2b89f001bcadf0df6eb2dde62618302b
 * This port was last updated on 2024-10-07
 */

/**
 *
 * HTTP status codes as registered with IANA.
 * See: https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml
 */
export const HttpStatusCodes = {
	/** RFC 9110, 15.2.1 */
	StatusContinue: 100,
	/** RFC 9110, 15.2.2 */
	StatusSwitchingProtocols: 101,
	/** RFC 2518, 10.1 */
	StatusProcessing: 102,
	/** RFC 8297 */
	StatusEarlyHints: 103,

	/** RFC 9110, 15.3.1 */
	StatusOK: 200,
	/** RFC 9110, 15.3.2 */
	StatusCreated: 201,
	/** RFC 9110, 15.3.3 */
	StatusAccepted: 202,
	/** RFC 9110, 15.3.4 */
	StatusNonAuthoritativeInfo: 203,
	/** RFC 9110, 15.3.5 */
	StatusNoContent: 204,
	/** RFC 9110, 15.3.6 */
	StatusResetContent: 205,
	/** RFC 9110, 15.3.7 */
	StatusPartialContent: 206,
	/** RFC 4918, 11.1 */
	StatusMultiStatus: 207,
	/** RFC 5842, 7.1 */
	StatusAlreadyReported: 208,
	/** RFC 3229, 10.4.1 */
	StatusIMUsed: 226,
	/** */

	/** RFC 9110, 15.4.1 */
	StatusMultipleChoices: 300,
	/** RFC 9110, 15.4.2 */
	StatusMovedPermanently: 301,
	/** RFC 9110, 15.4.3 */
	StatusFound: 302,
	/** RFC 9110, 15.4.4 */
	StatusSeeOther: 303,
	/** RFC 9110, 15.4.5 */
	StatusNotModified: 304,
	/** RFC 9110, 15.4.6 */
	StatusUseProxy: 305,
	/** RFC 9110, 15.4.7 (Unused) */
	_: 306,
	/** RFC 9110, 15.4.8 */
	StatusTemporaryRedirect: 307,
	/** RFC 9110, 15.4.9 */
	StatusPermanentRedirect: 308,

	/** RFC 9110, 15.5.1 */
	StatusBadRequest: 400,
	/** RFC 9110, 15.5.2 */
	StatusUnauthorized: 401,
	/** RFC 9110, 15.5.3 */
	StatusPaymentRequired: 402,
	/** RFC 9110, 15.5.4 */
	StatusForbidden: 403,
	/** RFC 9110, 15.5.5 */
	StatusNotFound: 404,
	/** RFC 9110, 15.5.6 */
	StatusMethodNotAllowed: 405,
	/** RFC 9110, 15.5.7 */
	StatusNotAcceptable: 406,
	/** RFC 9110, 15.5.8 */
	StatusProxyAuthRequired: 407,
	/** RFC 9110, 15.5.9 */
	StatusRequestTimeout: 408,
	/** RFC 9110, 15.5.10 */
	StatusConflict: 409,
	/** RFC 9110, 15.5.11 */
	StatusGone: 410,
	/** RFC 9110, 15.5.12 */
	StatusLengthRequired: 411,
	/** RFC 9110, 15.5.13 */
	StatusPreconditionFailed: 412,
	/** RFC 9110, 15.5.14 */
	StatusRequestEntityTooLarge: 413,
	/** RFC 9110, 15.5.15 */
	StatusRequestURITooLong: 414,
	/** RFC 9110, 15.5.16 */
	StatusUnsupportedMediaType: 415,
	/** RFC 9110, 15.5.17 */
	StatusRequestedRangeNotSatisfiable: 416,
	/** RFC 9110, 15.5.18 */
	StatusExpectationFailed: 417,
	/** RFC 9110, 15.5.19 (Unused) */
	StatusTeapot: 418,
	/** RFC 9110, 15.5.20 */
	StatusMisdirectedRequest: 421,
	/** RFC 9110, 15.5.21 */
	StatusUnprocessableEntity: 422,
	/** RFC 4918, 11.3 */
	StatusLocked: 423,
	/** RFC 4918, 11.4 */
	StatusFailedDependency: 424,
	/** RFC 8470, 5.2. */
	StatusTooEarly: 425,
	/** RFC 9110, 15.5.22 */
	StatusUpgradeRequired: 426,
	/** RFC 6585, 3 */
	StatusPreconditionRequired: 428,
	/** RFC 6585, 4 */
	StatusTooManyRequests: 429,
	/** RFC 6585, 5 */
	StatusRequestHeaderFieldsTooLarge: 431,
	/** RFC 7725, 3 */
	StatusUnavailableForLegalReasons: 451,

	/** RFC 9110, 15.6.1 */
	StatusInternalServerError: 500,
	/** RFC 9110, 15.6.2 */
	StatusNotImplemented: 501,
	/** RFC 9110, 15.6.3 */
	StatusBadGateway: 502,
	/** RFC 9110, 15.6.4 */
	StatusServiceUnavailable: 503,
	/** RFC 9110, 15.6.5 */
	StatusGatewayTimeout: 504,
	/** RFC 9110, 15.6.6 */
	StatusHTTPVersionNotSupported: 505,
	/** RFC 2295, 8.1 */
	StatusVariantAlsoNegotiates: 506,
	/** RFC 4918, 11.5 */
	StatusInsufficientStorage: 507,
	/** RFC 5842, 7.2 */
	StatusLoopDetected: 508,
	/** RFC 2774, 7 */
	StatusNotExtended: 510,
	/** RFC 6585, 6 */
	StatusNetworkAuthenticationRequired: 511,
} as const satisfies Record<string, number>

export type HttpStatusCodeName = keyof typeof HttpStatusCodes
export type HttpStatusCode = (typeof HttpStatusCodes)[HttpStatusCodeName]

/**
 * StatusText returns a text for the HTTP status code. It returns the empty
 * string if the code is unknown.
 * @param code
 * @returns description of the status code
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function statusText(code: HttpStatusCode | (number & {})): string {
	if (typeof code !== 'number') {
		throw new TypeError('code must be a number')
	}

	switch (code) {
		case HttpStatusCodes.StatusContinue:
			return 'Continue'
		case HttpStatusCodes.StatusSwitchingProtocols:
			return 'Switching Protocols'
		case HttpStatusCodes.StatusProcessing:
			return 'Processing'
		case HttpStatusCodes.StatusEarlyHints:
			return 'Early Hints'
		case HttpStatusCodes.StatusOK:
			return 'OK'
		case HttpStatusCodes.StatusCreated:
			return 'Created'
		case HttpStatusCodes.StatusAccepted:
			return 'Accepted'
		case HttpStatusCodes.StatusNonAuthoritativeInfo:
			return 'Non-Authoritative Information'
		case HttpStatusCodes.StatusNoContent:
			return 'No Content'
		case HttpStatusCodes.StatusResetContent:
			return 'Reset Content'
		case HttpStatusCodes.StatusPartialContent:
			return 'Partial Content'
		case HttpStatusCodes.StatusMultiStatus:
			return 'Multi-Status'
		case HttpStatusCodes.StatusAlreadyReported:
			return 'Already Reported'
		case HttpStatusCodes.StatusIMUsed:
			return 'IM Used'
		case HttpStatusCodes.StatusMultipleChoices:
			return 'Multiple Choices'
		case HttpStatusCodes.StatusMovedPermanently:
			return 'Moved Permanently'
		case HttpStatusCodes.StatusFound:
			return 'Found'
		case HttpStatusCodes.StatusSeeOther:
			return 'See Other'
		case HttpStatusCodes.StatusNotModified:
			return 'Not Modified'
		case HttpStatusCodes.StatusUseProxy:
			return 'Use Proxy'
		case HttpStatusCodes.StatusTemporaryRedirect:
			return 'Temporary Redirect'
		case HttpStatusCodes.StatusPermanentRedirect:
			return 'Permanent Redirect'
		case HttpStatusCodes.StatusBadRequest:
			return 'Bad Request'
		case HttpStatusCodes.StatusUnauthorized:
			return 'Unauthorized'
		case HttpStatusCodes.StatusPaymentRequired:
			return 'Payment Required'
		case HttpStatusCodes.StatusForbidden:
			return 'Forbidden'
		case HttpStatusCodes.StatusNotFound:
			return 'Not Found'
		case HttpStatusCodes.StatusMethodNotAllowed:
			return 'Method Not Allowed'
		case HttpStatusCodes.StatusNotAcceptable:
			return 'Not Acceptable'
		case HttpStatusCodes.StatusProxyAuthRequired:
			return 'Proxy Authentication Required'
		case HttpStatusCodes.StatusRequestTimeout:
			return 'Request Timeout'
		case HttpStatusCodes.StatusConflict:
			return 'Conflict'
		case HttpStatusCodes.StatusGone:
			return 'Gone'
		case HttpStatusCodes.StatusLengthRequired:
			return 'Length Required'
		case HttpStatusCodes.StatusPreconditionFailed:
			return 'Precondition Failed'
		case HttpStatusCodes.StatusRequestEntityTooLarge:
			return 'Request Entity Too Large'
		case HttpStatusCodes.StatusRequestURITooLong:
			return 'Request URI Too Long'
		case HttpStatusCodes.StatusUnsupportedMediaType:
			return 'Unsupported Media Type'
		case HttpStatusCodes.StatusRequestedRangeNotSatisfiable:
			return 'Requested Range Not Satisfiable'
		case HttpStatusCodes.StatusExpectationFailed:
			return 'Expectation Failed'
		case HttpStatusCodes.StatusTeapot:
			return "I'm a teapot"
		case HttpStatusCodes.StatusMisdirectedRequest:
			return 'Misdirected Request'
		case HttpStatusCodes.StatusUnprocessableEntity:
			return 'Unprocessable Entity'
		case HttpStatusCodes.StatusLocked:
			return 'Locked'
		case HttpStatusCodes.StatusFailedDependency:
			return 'Failed Dependency'
		case HttpStatusCodes.StatusTooEarly:
			return 'Too Early'
		case HttpStatusCodes.StatusUpgradeRequired:
			return 'Upgrade Required'
		case HttpStatusCodes.StatusPreconditionRequired:
			return 'Precondition Required'
		case HttpStatusCodes.StatusTooManyRequests:
			return 'Too Many Requests'
		case HttpStatusCodes.StatusRequestHeaderFieldsTooLarge:
			return 'Request Header Fields Too Large'
		case HttpStatusCodes.StatusUnavailableForLegalReasons:
			return 'Unavailable For Legal Reasons'
		case HttpStatusCodes.StatusInternalServerError:
			return 'Internal Server Error'
		case HttpStatusCodes.StatusNotImplemented:
			return 'Not Implemented'
		case HttpStatusCodes.StatusBadGateway:
			return 'Bad Gateway'
		case HttpStatusCodes.StatusServiceUnavailable:
			return 'Service Unavailable'
		case HttpStatusCodes.StatusGatewayTimeout:
			return 'Gateway Timeout'
		case HttpStatusCodes.StatusHTTPVersionNotSupported:
			return 'HTTP Version Not Supported'
		case HttpStatusCodes.StatusVariantAlsoNegotiates:
			return 'Variant Also Negotiates'
		case HttpStatusCodes.StatusInsufficientStorage:
			return 'Insufficient Storage'
		case HttpStatusCodes.StatusLoopDetected:
			return 'Loop Detected'
		case HttpStatusCodes.StatusNotExtended:
			return 'Not Extended'
		case HttpStatusCodes.StatusNetworkAuthenticationRequired:
			return 'Network Authentication Required'
		default:
			return ''
	}
}

/**
 * http status codes package based on Go's http library
 *
 * @example
 * ```ts
 * import { http } from 'http-codex'
 *
 * const res = new Response('hello world!', {
 * 	status: http.StatusOK
 * 	statusText: http.statusText(http.StatusOK)
 * })
 * ```
 */
export const http = {
	...HttpStatusCodes,
	statusText,
} as const
