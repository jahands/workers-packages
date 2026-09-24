---
name: zod-v4
description: Zod v4 coding guidelines and migration reference. ALWAYS read this when using Zod validation library
---

## Zod v4 Guidelines

### Type Inference

Every schema MUST have inferred type above it:

```typescript
export type User = z.infer<typeof User>
export const User = z.object({...})
```

**Requirements:**
- ALWAYS place type above schema
- ALWAYS use same name for type & schema
- NEVER use "Schema" suffix
- ALWAYS use JSDoc (`/** */`), never `//`
- NO EXCEPTIONS - even for internal/helper schemas

### String Validation

String validations are standalone functions:

```typescript
// WRONG: z.string().email()
// RIGHT: z.email(), z.url(), z.uuid(), z.ip()
```

### Error Messages

Use `error` param sparingly - Zod's defaults are excellent:

```typescript
// WRONG: z.email({error: "Invalid email"}) // Redundant!
// RIGHT: z.email() // Zod says "Invalid email"
// RIGHT: Only for business logic:
z.string().refine((val) => /[A-Z]/.test(val), {
  error: 'Must contain uppercase',
})
```

### Number Types

- Use `z.number()` for general numbers
- `z.int()` for integers only (not `z.number().int()`)
- `z.int32()`, `z.float64()` for specific types
- Numbers finite by default

### Object Types

- `z.object()` - strips unknowns (default)
- `z.strictObject()` - rejects extras
- `z.looseObject()` - allows extras

### Custom Validation

Use `.check()` for advanced validation, `.refine()` for simple validation:

**Migration steps:**
- `.superRefine()` → `.check()` for advanced validation with multiple issues
- In `.check()`: `val` → `ctx.value`, `ctx.addIssue()` → `ctx.issues.push()`
- `z.ZodIssueCode.custom` → `'custom'` string
- Add `input: ctx.value` to issue object
- Use `.refine()` for simple boolean validation with single error

### Error Formatting

- `z.prettifyError()` - Human-readable format
- `z.treeifyError()` - Tree structure format

### Functions

Define function schemas with input/output types:

```typescript
z.function({
  input: [z.string()],
  output: z.number(),
})
```

### Records

```typescript
z.record(keyType, valueType)
```

### ISO Formats

- `z.iso.datetime()` - ISO 8601 datetime
- `z.iso.date()` - ISO 8601 date

### Additional Features

- **Default:** `.default()` applies to output; use `.prefault()` for v3 behavior
- **File validation:** `z.file().min(1024).max(5*1024*1024).mime(['image/jpeg'])`
- **Pipe:** `z.pipe(z.string(), z.number())` for transformations
- **Async:** Use `.check(async (val) => {...})` for async validation
- **Arrays:** `z.array(z.email())` or `z.email().array()`
- **Optional:** `.optional()`, `.nullable()`, `.nullish()`

## Quick Reference: v3 → v4

| v3                      | v4                          |
| ----------------------- | --------------------------- |
| z.string().email()      | z.email()                   |
| {message: "err"}        | {error: "err"}              |
| .strict()               | z.strictObject()            |
| .format()               | z.treeifyError()            |
| z.string().datetime()   | z.iso.datetime()            |
| .args().returns()       | {input:[...], output:...}   |
| .superRefine()          | .check()                    |
| ctx.addIssue()          | ctx.issues.push()           |
| z.ZodIssueCode.custom   | 'custom'                    |

## Complete Example

```typescript
import * as z from 'zod'

/** User registration */
export type UserReg = z.infer<typeof UserReg>
export const UserReg = z.object({
  email: z.email(),
  password: z
    .string()
    .min(8)
    .refine((pwd) => /[A-Z]/.test(pwd) && /\d/.test(pwd), { error: 'Need uppercase & number' }),
  age: z.number().min(18),
})

/** Function with input/output types */
export type ProcessUser = z.infer<typeof ProcessUser>
export const ProcessUser = z.function({
  input: [UserReg],
  output: z.object({
    id: z.string(),
    createdAt: z.iso.datetime(),
  }),
})
```
