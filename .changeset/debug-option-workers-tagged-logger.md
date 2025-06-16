---
'workers-tagged-logger': minor
---

Add debug option to suppress noisy AsyncLocalStorage warnings

Add a new `debug` option to `WorkersLoggerOptions` that controls whether internal warning messages about missing AsyncLocalStorage context are shown. By default (`debug: false`), these warnings are suppressed to reduce noise in production environments.

**Breaking Change**: Warning messages that were previously logged at `warn` level are now only shown when `debug: true` is explicitly set, and they appear at `debug` level instead.

**New Features**:
- `debug?: boolean` option in `WorkersLoggerOptions` (defaults to `false`)
- Debug mode is inherited by child loggers created with `withTags()`, `withFields()`, and `withLogLevel()`
- Internal warnings now use `debug` level instead of `warn` level

**Benefits**:
- Cleaner production logs by default
- Development aid when debug mode is enabled
- Backward compatible API (existing code works without changes)
- Better warning categorization
