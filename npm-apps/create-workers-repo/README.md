# create-workers-repo

[![npm version](https://badge.fury.io/js/create-workers-repo.svg)](https://badge.fury.io/js/create-workers-repo)

A CLI to bootstrap a monorepo for building Cloudflare Workers applications.

**Note:** This is an alias for [create-workers-monorepo](https://npmjs.org/package/create-workers-monorepo)

![demo](https://monorepo.rocks/images/create-workers-monorepo-demo.gif)

## Usage

To create a new monorepo, run:

```bash
npm create workers-repo@latest
```

This will scaffold a new monorepo based on [github.com/jahands/workers-monorepo-template](https://github.com/jahands/workers-monorepo-template).

Note: The created monorepo uses `pnpm` workspaces. After creating your monorepo, ensure you have `pnpm` version 10 or higher installed.
For more info, see [pnpm.io/installation](https://pnpm.io/installation).
