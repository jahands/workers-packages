# http-codex

A simple library for http status codes, adapted from Go's [http package](https://go.dev/src/net/http/status.go).

## Usage

### Install

```shell
# Install using your favorite package manager:
npm install http-codex
pnpm add http-codex
bun add http-codex
yarn add http-codex
```

### Example

```ts
import { http } from 'http-codex'

const res = new Response('hello world!', {
	status: http.StatusOK
	statusText: http.statusText(http.StatusOK)
})
```

If preferred, codes can be imported by themselves to reduce bundle size:

```ts
import { http } from 'http-codex/status'

const status = http.StatusOK // 200
```

### Bundle Size

Here are the bundle sizes of each import:

| **Import**          | **Minified** | **Minified, Gzip'd** |
| ------------------- | ------------ | -------------------- |
| `http-codex`        | 4.9 KB       | 1.5 KB               |
| `http-codex/status` | 1.6 KB       | 749 bytes            |

Note: `http-codex/status` is smaller because it excludes the `statusText()` function.

## Why Another HTTP Library?

Honestly I just love Go and wanted one that was very similar to how Go's http package works.
