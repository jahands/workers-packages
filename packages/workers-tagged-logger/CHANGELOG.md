# workers-tagged-logger

## 0.4.4

### Patch Changes

- 42377e9: fix: Only include dist folder in published package

## 0.4.3

### Patch Changes

- 40c9aeb: BANDA-601 fix: Add node exports to support node targets

## 0.4.2

### Patch Changes

- 628e064: chore: export type LoggerHonoBindings

## 0.4.1

### Patch Changes

- 117e81d: BANDA-600 chore: Simplify type for withLogTags()

  This function doesn't need to be async because als.run() is not async.

## 0.4.0

### Minor Changes

- cf86b62: fix: bump minimum Hono version to 4.6.16 to resolve type issues

### Patch Changes

- 03df0b2: chore: update dependencies

## 0.3.8

### Patch Changes

- 794eb5b: fix: await als.run() for improved stack traces (hopefully)

## 0.3.7

### Patch Changes

- a50da50: fix: Update tests to expect string message
- 61feaf4: chore: Narrow ConsoleLog.message type
- 77f30ab: chore: Narrow message type

## 0.3.6

### Patch Changes

- b6447f2: chore: update readme to shorten install instructions

## 0.3.5

### Patch Changes

- 9d8540b: chore: Add installation instructions for other package managers
- 7ae8b95: chore: update tsconfig
- 10cd896: chore: update dependencies
- e89bf36: fix: revert hono version due to breaking change
- fdec52a: fix: spelling in readme

## 0.3.4

### Patch Changes

- aca9d27: chore: add homepage to package.json

## 0.3.3

### Patch Changes

- 8cda7b1: chore: update deps
- 1da8fb8: chore: update author url in package.json

## 0.3.2

### Patch Changes

- 148bfbd: fix: Update tests

## 0.3.1

### Patch Changes

- 74ac1bf: fix: Log error string instead of error object when unable to get log tags from AsyncLocalStorage

## 0.3.0

### Minor Changes

- cdb374e: fix: Ensure message field is always logged as a string

## 0.2.3

### Patch Changes

- 34bfb34: chore: Add top-level module/types to package.json

  This might be needed in some cases: https://stackoverflow.com/a/75097813

## 0.2.2

### Patch Changes

- 10b04a0: chore: update readme
- eefec7d: Update readme
- 2a9ba5a: chore: add keywords to package.json

## 0.2.1

### Patch Changes

- 5a92794: chore: Add usage guide to readme

## 0.2.0

### Minor Changes

- c7cb238: feat: Add WorkersLogger

## 0.1.1

### Patch Changes

- 129bb08: chore: Add repository and description to package.json
