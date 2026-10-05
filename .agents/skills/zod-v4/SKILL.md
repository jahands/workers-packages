---
name: zod-v4
description: Zod v4 coding guidelines and v3 migration reference. Use when writing, reviewing, or migrating code that uses Zod.
---

Most Zod code in training data is v3; write v4.

- Import as a namespace: `import * as z from 'zod'`
- Put each schema's inferred type directly above it with the same name (no `Schema` suffix), including for internal and helper schemas, and comment them with JSDoc rather than `//`:

```typescript
/** A registered user */
export type User = z.infer<typeof User>
export const User = z.object({...})
```

- Pass `error` only for business-logic messages; Zod's default messages are good
- Use `.refine()` for a simple check with one error and `.check()` for multiple issues, pushing `{ code: 'custom', message, input: ctx.value }` to `ctx.issues`
- `.default()` applies to the output; `.prefault()` gives v3's behavior
- `z.record()` requires both key and value schemas

| v3                                        | v4                                          |
| ----------------------------------------- | ------------------------------------------- |
| `z.string().email()`, `.url()`, `.uuid()` | `z.email()`, `z.url()`, `z.uuid()`          |
| `z.string().ip()`                         | `z.ipv4()`, `z.ipv6()`                      |
| `z.string().datetime()`, `.date()`        | `z.iso.datetime()`, `z.iso.date()`          |
| `z.number().int()`                        | `z.int()` (also `z.int32()`, `z.float64()`) |
| `{ message: '...' }`                      | `{ error: '...' }`                          |
| `.strict()`, `.passthrough()`             | `z.strictObject()`, `z.looseObject()`       |
| `.format()`, `.flatten()`                 | `z.treeifyError()`, or `z.prettifyError()`  |
| `z.function().args(...).returns(...)`     | `z.function({ input: [...], output })`      |
| `.superRefine()`, `ctx.addIssue()`        | `.check()`, `ctx.issues.push()`             |
| `z.ZodIssueCode.custom`                   | `'custom'`                                  |
