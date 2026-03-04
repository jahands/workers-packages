---
'prefixed-nanoid': minor
---

feat: add InferId helper for easily creating ID types

## Example

```typescript
import { createPrefixedNanoIds } from 'prefixed-nanoid'

import type { InferId } from 'prefixed-nanoid'

const ids = createPrefixedNanoIds({
  project: { prefix: 'prj', len: 24 },
  user: { prefix: 'usr', len: 16 }
})

type ProjectId = InferId<typeof ids, 'project'>
type UserId = InferId<typeof ids, 'user'>
type AnyId = InferId<typeof ids> // union of all configured ID types
```
