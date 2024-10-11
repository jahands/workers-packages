---
'http-codex': minor
---

feat: Add `isNullBodyStatus()`

This helper is useful in situations where you need to fetch a resource and then customize the response returned.

Example:

```ts
import { httpStatus, isNullBodyStatus } from 'http-codex'

const res = await fetch(url) // Might be 204, 304, etc.
return new Response(isNullBodyStatus(res.status) ? null : res.body, {
	// Useful for when we need to customize response headers/init/etc.
})
```
