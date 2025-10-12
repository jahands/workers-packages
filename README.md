# Workers Packages

A collection of npm packages for Cloudflare Workers and monorepos

## Why a Monorepo?

Managing multiple related services (like Cloudflare Workers) in separate repositories can become complex. A monorepo approach offers several advantages:

- **Simplified dependency management** - `pnpm workspaces` allow you to manage dependencies across all your workers and shared packages from a single place. The tool `syncpack` (configured via `.syncpackrc.cjs`) help keep versions consistent.
- **Code sharing and reuse** - Easily create and share common logic, types, and utilities between workers by placing them in the `packages/` directory. Changes to shared code are immediately available to all consumers.
- **Atomic commits** - Changes affecting multiple workers or shared libraries can be committed together, making the history easier to understand and reducing the risk of inconsistencies.
- **Consistent tooling** - Apply the same build, test, linting, and formatting configurations (e.g., via Turborepo in `turbo.json` and shared configs in `packages/`) across all projects, ensuring consistent tooling and code quality across Workers.
- **Streamlined CI/CD** - A single pipeline (like the ones in `.github/workflows/`) can build, test, and deploy all Workers, simplifying the release process.
- **Easier refactoring** - Refactoring code that spans multiple workers or shared packages is significantly easier within a single repository.
