# http-codex

A simple library for http status codes, ported from Go's [http package](https://go.dev/src/net/http/status.go).

## Usage

### Install

```shell
# npm
npm install http-codex
# pnpm
pnpm add http-codex
# bun
bun add http-codex
# yarn
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
