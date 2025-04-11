---
'workers-tagged-logger': minor
---

feat: Add `@WithLogTags` class method decorator for automatic context management within classes

This release introduces a `@WithLogTags` class method decorator as a convenient alternative to the `withLogTags` function wrapper, specifically designed for use within classes.

**Key Features:**

- **Automatic Context:** Wraps method execution within an `AsyncLocalStorage` context, similar to `withLogTags`.
- **Automatic Tagging:**
  - Adds `$logger.methodName` tag with the name of the decorated method.
  - Adds `$logger.rootMethodName` tag with the name of the first decorated method entered in the async call chain.
  - Adds a `source` tag, determined with the following precedence:
    1.  Explicit source provided via `@WithLogTags("MySource")` or `@WithLogTags({ source: "MySource" })`.
    2.  Source inherited from an active `AsyncLocalStorage` context (e.g., from an outer `withLogTags` or `@WithLogTags` call).
    3.  Inferred from the class name (e.g., `MyClassName`) if no explicit or inherited source is found.
- **Configuration:** Accepts an optional configuration object (`@WithLogTags({ tags: {...} })`) to add specific tags for the duration of the method's execution.

**Requirements:**

- You **must** enable `experimentalDecorators` in your `tsconfig.json` to use this feature:
  ```json
  {
    "compilerOptions": {
      "experimentalDecorators": true
    }
  }
  ```

**Usage Example:**

```typescript
import { WithLogTags, WorkersLogger } from "workers-tagged-logger"

const logger = new WorkersLogger()

class ExampleHandler {
  // Source will be inferred as "ExampleHandler"
  @WithLogTags()
  async handleEvent(eventId: string) {
    logger.setTags({ eventId })
    logger.info("Handling event") // Tags: { source: "ExampleHandler", $logger..., eventId }
    await this.processEvent()
  }

  // Source is explicit, inherits eventId tag from caller's context
  @WithLogTags({ source: "EventProcessor", tags: { stage: "processing" } })
  async processEvent() {
    logger.info("Processing event") // Tags: { source: "EventProcessor", $logger..., eventId, stage: "processing" }
  }
}
```
