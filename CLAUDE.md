# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<repository-overview>

<title>Workers Packages Monorepo</title>

<description>
Monorepo of Cloudflare Workers-related NPM packages managed with pnpm workspaces and Turborepo. The codebase uses TypeScript with strict type checking and follows a type-first development approach.
</description>

</repository-overview>

<development-commands>

<title>Development Commands</title>

<building>
- `pnpm turbo build` or `just build` - Build all packages
- `turbo build -F './packages/*'` - Build only packages (not examples)
</building>

<testing>
- `pnpm test` or `just test` - Run tests in watch mode (15s timeout)
- `pnpm test:ci` - Run tests in CI mode
- Tests use Vitest with `.spec.ts` for unit tests and `.test.ts` for integration tests
</testing>

<code-quality>
- `pnpm check:ci` or `just check` - Run all checks (types, exports, lint, format)
- `pnpm fix` or `just fix` - Auto-fix formatting, linting, and dependency issues
- `pnpm check:deps` - Check dependency consistency with syncpack
- `pnpm fix:lint` - Fix ESLint issues
</code-quality>

<dependencies>
- `just update-deps` - Update dependencies via syncpack and fix/commit changes
- `pnpm syncpack update` - Update dependencies across workspace
</dependencies>

<release-process>
- `pnpm changeset:new` - Create a new changeset for release
- `pnpm release` - Build packages and publish to npm (includes build + clean + publish)
</release-process>

</development-commands>

<architecture>

<title>Architecture</title>

<package-structure>
- `packages/` - Core library packages
  - Each package has independent versioning and publishing
  - Common structure: `src/`, `dist/`, `package.json`, `tsconfig.json`, `vitest.config.ts`
- `examples/` - Example applications demonstrating package usage
- `turbo/` - Code generation templates
</package-structure>

<key-packages>
- `@repo/tools` - Custom build tooling (build, check, deploy commands)
- `@repo/eslint-config` - Shared ESLint configuration
- `@repo/typescript-config` - TypeScript configs for different environments
- `workers-tagged-logger` - Structured logging for Workers with Hono integration
- `otel-cf-workers` - OpenTelemetry integration for Workers
- `prefixed-nanoid` - Type-safe prefixed nanoid generation
</key-packages>

<build-system>
- Turborepo orchestrates builds with caching enabled
- Remote caching with signatures for faster builds
- Build outputs go to `dist/` directories
- TypeScript builds use ESBuild via @repo/tools
</build-system>

</architecture>

<development-guidelines>

<title>Development Guidelines</title>

<typescript-conventions>
- Always use Vitest for tests
- Error variables: use `e` or `err`, never `error`
- Every Zod schema MUST have inferred type above it with same name
- Import Zod from 'zod/v4', never just 'zod'
</typescript-conventions>

<testing-workers>
<description>For packages targeting Workers, use the Workers-specific Vitest config:</description>
<example>
```typescript
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'
```
</example>
</testing-workers>

<linting-formatting>
- ESLint and Prettier are configured at the root
- Run `pnpm fix` to auto-fix issues
- Check formatting with `pnpm check:format`
</linting-formatting>

</development-guidelines>

<important-notes>

<title>Important Notes</title>

<rules>
- This is a pnpm workspace - always use pnpm, not npm or yarn
- Turbo caching is enabled - clean builds rarely needed
- Each package maintains its own CHANGELOG.md via changesets
- Workers packages must be compatible with the Workers runtime constraints
- Use `just` command for common tasks when available (requires Justfile)
</rules>

</important-notes>
