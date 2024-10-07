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
import { httpStatus } from 'http-codex'

const res = new Response('hello world!', {
	status: httpStatus.OK // 200
	statusText: httpStatus.text(http.StatusOK) // 'OK'
})
```

If preferred, status codes can be imported by themselves to reduce bundle size:

```ts
import { httpStatus } from 'http-codex/status'

const status = httpStatus.OK // 200
```

### Bundle Size

Here are the bundle sizes of each import:

| **Import**          | **Minified** | **Minified + Gzip'd** |
| ------------------- | ------------ | --------------------- |
| `http-codex`        | 4.1 KB       | 1.46 KB               |
| `http-codex/status` | 1.2 KB       | 728 bytes             |

Note: `http-codex/status` is smaller because it excludes the `statusText()` function.

## Why Another HTTP Status Code Library?

Honestly I just love Go and wanted one that was very similar to how Go's http package works.
