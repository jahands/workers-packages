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

## Why Another HTTP Library?

Honestly I just love Go and wanted one that was very similar to how Go's http package works.
