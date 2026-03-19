---
'prefixed-nanoid': patch
---

chore: fix InferId example in README.md

`InferId` requires using `as const` in `createPrefixedNanoIds()`:

```ts
import { createPrefixedNanoIds } from 'prefixed-nanoid'

import type { InferId } from 'prefixed-nanoid'

const ids = createPrefixedNanoIds({
	project: { prefix: 'prj', len: 24 },
	user: { prefix: 'usr', len: 16 },
} as const) // need to add `as const`

type ProjectId = InferId<typeof ids, 'project'>
type UserId = InferId<typeof ids, 'user'>
type AnyId = InferId<typeof ids> // union of all configured ID types
```
