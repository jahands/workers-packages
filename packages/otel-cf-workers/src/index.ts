// Export commonly needed APIs from otel-cf-workers and otel api

export { instrument, instrumentDO } from '@microlabs/otel-cf-workers'
export type { ResolveConfigFn } from '@microlabs/otel-cf-workers'

export { trace } from '@opentelemetry/api'
export type { Tracer } from '@opentelemetry/api'
