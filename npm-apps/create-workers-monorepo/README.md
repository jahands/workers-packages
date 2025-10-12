# create-workers-monorepo

[![npm version](https://badge.fury.io/js/create-workers-monorepo.svg)](https://badge.fury.io/js/create-workers-monorepo)

A CLI to bootstrap a monorepo for building Cloudflare Workers applications.

![demo](https://monorepo.rocks/images/create-workers-monorepo-demo.gif)

## Usage

To create a new monorepo, run:

```bash
npm create workers-monorepo@latest
```

This will scaffold a new monorepo based on [github.com/jahands/workers-monorepo-template](https://github.com/jahands/workers-monorepo-template).

Note: The created monorepo uses `pnpm` workspaces. After creating your monorepo, ensure you have `pnpm` version 10 or higher installed.
For more info, see [pnpm.io/installation](https://pnpm.io/installation).
