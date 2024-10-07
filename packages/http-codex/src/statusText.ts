/**
 * http status text adapted from https://go.dev/src/net/http/status.go
 * Source: https://github.com/golang/go/blob/master/src/net/http/status.go
 * Commit: 55590f3a2b89f001bcadf0df6eb2dde62618302b
 */

import { httpStatus } from './status'

import type { HttpStatusCode } from './status'

/**
 * statusText returns a text for the HTTP status code. It returns the empty
 * string if the code is unknown.
 * @param code A number that may be an http status code.
 * @returns description of the status code or empty string if it's unknown.
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
// eslint-disable-next-line @typescript-eslint/ban-types
export function text(code: HttpStatusCode | (number & {})): string {
	if (typeof code !== 'number') {
		throw new TypeError('code must be a number')
	}

	switch (code) {
		case httpStatus.Continue:
			return 'Continue'
		case httpStatus.SwitchingProtocols:
			return 'Switching Protocols'
		case httpStatus.Processing:
			return 'Processing'
		case httpStatus.EarlyHints:
			return 'Early Hints'
		case httpStatus.OK:
			return 'OK'
		case httpStatus.Created:
			return 'Created'
		case httpStatus.Accepted:
			return 'Accepted'
		case httpStatus.NonAuthoritativeInfo:
			return 'Non-Authoritative Information'
		case httpStatus.NoContent:
			return 'No Content'
		case httpStatus.ResetContent:
			return 'Reset Content'
		case httpStatus.PartialContent:
			return 'Partial Content'
		case httpStatus.MultiStatus:
			return 'Multi-Status'
		case httpStatus.AlreadyReported:
			return 'Already Reported'
		case httpStatus.IMUsed:
			return 'IM Used'
		case httpStatus.MultipleChoices:
			return 'Multiple Choices'
		case httpStatus.MovedPermanently:
			return 'Moved Permanently'
		case httpStatus.Found:
			return 'Found'
		case httpStatus.SeeOther:
			return 'See Other'
		case httpStatus.NotModified:
			return 'Not Modified'
		case httpStatus.UseProxy:
			return 'Use Proxy'
		case httpStatus.TemporaryRedirect:
			return 'Temporary Redirect'
		case httpStatus.PermanentRedirect:
			return 'Permanent Redirect'
		case httpStatus.BadRequest:
			return 'Bad Request'
		case httpStatus.Unauthorized:
			return 'Unauthorized'
		case httpStatus.PaymentRequired:
			return 'Payment Required'
		case httpStatus.Forbidden:
			return 'Forbidden'
		case httpStatus.NotFound:
			return 'Not Found'
		case httpStatus.MethodNotAllowed:
			return 'Method Not Allowed'
		case httpStatus.NotAcceptable:
			return 'Not Acceptable'
		case httpStatus.ProxyAuthRequired:
			return 'Proxy Authentication Required'
		case httpStatus.RequestTimeout:
			return 'Request Timeout'
		case httpStatus.Conflict:
			return 'Conflict'
		case httpStatus.Gone:
			return 'Gone'
		case httpStatus.LengthRequired:
			return 'Length Required'
		case httpStatus.PreconditionFailed:
			return 'Precondition Failed'
		case httpStatus.RequestEntityTooLarge:
			return 'Request Entity Too Large'
		case httpStatus.RequestURITooLong:
			return 'Request URI Too Long'
		case httpStatus.UnsupportedMediaType:
			return 'Unsupported Media Type'
		case httpStatus.RequestedRangeNotSatisfiable:
			return 'Requested Range Not Satisfiable'
		case httpStatus.ExpectationFailed:
			return 'Expectation Failed'
		case httpStatus.Teapot:
			return "I'm a teapot"
		case httpStatus.MisdirectedRequest:
			return 'Misdirected Request'
		case httpStatus.UnprocessableEntity:
			return 'Unprocessable Entity'
		case httpStatus.Locked:
			return 'Locked'
		case httpStatus.FailedDependency:
			return 'Failed Dependency'
		case httpStatus.TooEarly:
			return 'Too Early'
		case httpStatus.UpgradeRequired:
			return 'Upgrade Required'
		case httpStatus.PreconditionRequired:
			return 'Precondition Required'
		case httpStatus.TooManyRequests:
			return 'Too Many Requests'
		case httpStatus.RequestHeaderFieldsTooLarge:
			return 'Request Header Fields Too Large'
		case httpStatus.UnavailableForLegalReasons:
			return 'Unavailable For Legal Reasons'
		case httpStatus.InternalServerError:
			return 'Internal Server Error'
		case httpStatus.NotImplemented:
			return 'Not Implemented'
		case httpStatus.BadGateway:
			return 'Bad Gateway'
		case httpStatus.ServiceUnavailable:
			return 'Service Unavailable'
		case httpStatus.GatewayTimeout:
			return 'Gateway Timeout'
		case httpStatus.HTTPVersionNotSupported:
			return 'HTTP Version Not Supported'
		case httpStatus.VariantAlsoNegotiates:
			return 'Variant Also Negotiates'
		case httpStatus.InsufficientStorage:
			return 'Insufficient Storage'
		case httpStatus.LoopDetected:
			return 'Loop Detected'
		case httpStatus.NotExtended:
			return 'Not Extended'
		case httpStatus.NetworkAuthenticationRequired:
			return 'Network Authentication Required'
		default:
			return ''
	}
}
