# Product Requirements Document: create-wrangler-config

## Overview

`create-wrangler-config` is a CLI tool for quickly setting up a `wrangler.jsonc` configuration file for Cloudflare Workers projects. This tool helps developers bootstrap their Workers configuration with interactive prompts and intelligent defaults.

## Goals

- **Simplify Workers setup**: Reduce friction in creating new Cloudflare Workers projects
- **Interactive configuration**: Guide users through the configuration process with prompts
- **Smart defaults**: Provide sensible defaults based on project structure and common patterns
- **Package manager integration**: Automatically install wrangler as a dependency if needed
- **Safety first**: Prevent overwriting existing configuration files

## Target Users

- Developers new to Cloudflare Workers
- Experienced developers who want to quickly bootstrap new Workers projects
- Teams standardizing on Workers configuration patterns

## Usage

```bash
npm create wrangler-config@latest [assets-directory]
```

### Arguments

- `assets-directory` (optional): Path to directory containing static assets to be served by the Worker

### Examples

```bash
# Basic setup in current directory
npm create wrangler-config@latest

# Setup with assets directory
npm create wrangler-config@latest ./public

# Setup in specific directory
cd my-worker-project && npm create wrangler-config@latest
```

## Core Features

### 1. Configuration File Detection

**Requirement**: Before creating any files, check for existing Wrangler configuration files.

**Behavior**:

- Check for existence of: `wrangler.jsonc`, `wrangler.json`, `wrangler.toml`
- If any exist, exit with warning message: "Wrangler configuration already exists. This tool only creates new configuration files."
- Exit code: 1

### 2. Interactive Configuration Flow

**Requirement**: Guide users through configuration prompts first, then handle dependency installation.

**Process Flow**:

1. **Configuration Prompts**: Complete all interactive prompts for Worker setup
2. **Configuration Generation**: Create and write `wrangler.jsonc` file
3. **Package Manager Detection & Installation**: Detect package manager and install dependencies

**Package Manager Detection Logic**:

1. Check for lock files in order of preference:
   - `bun.lockb` or `bun.lock` → Bun
   - `pnpm-lock.yaml` → pnpm
   - `yarn.lock` → Yarn
   - `package-lock.json` → npm
   - Default to npm if no lock file found

**Wrangler Dependency Installation**:

1. If `package.json` exists:
   - Parse dependencies and devDependencies
   - If `wrangler` not found, automatically install as devDependency
   - Use detected package manager for installation
2. If no `package.json`, skip dependency management

### 3. Interactive Configuration Prompts

**Step 1: Worker Name**

- Prompt: "What is your Worker name?"
- Validation: Must be valid identifier with strict rules:
  - Alphanumeric characters and hyphens only
  - Maximum 54 characters
  - Cannot start or end with a hyphen
  - Cannot be empty
- Default: Sanitized name from package.json (if exists), otherwise sanitized directory name
- Error Handling: If sanitization fails (results in empty string), throws descriptive error

**Step 2: Feature Selection (Checkbox)**

Present a checkbox list of features to configure:

- Prompt: "Which features do you want to configure for your Worker? (Select at least one)"
- Use `@inquirer/prompts` checkbox for multi-select
- Auto-detect and pre-check features based on project structure
- **Validation**: At least one option must be selected (Entry Point OR Static Assets)

**Feature Detection & Defaults**:

1. **Entry Point** - Auto-checked if `src/index.ts` or `index.ts` exists
2. **Static Assets** - Auto-checked if assets directory argument provided OR common directories detected (`public`, `static`, `assets`, `dist`)
3. **Fallback**: If neither detected, auto-check "Entry Point" as default

**Checkbox Options**:

```
☑ Entry Point (Worker code execution)
☑ Static Assets (Serve static files)
```

**Validation Logic**:

- If user deselects all options, show error: "You must select at least one feature (Entry Point or Static Assets)"
- Re-prompt until at least one option is selected

**Step 3: Feature-Specific Configuration**

Based on selected checkboxes, prompt for specific details:

**If "Entry Point" selected**:

- Prompt: "What is your main entry file?"
- Default: Auto-detected file (`src/index.ts` or `index.ts`) or `src/index.ts`

**If "Static Assets" selected**:

- If assets directory argument provided, use it
- If auto-detected directory, prompt: "Serve static assets from [detected-directory]?"
- Otherwise prompt: "Static assets directory path:"

### 4. Configuration Generation

**Output**: Generate `wrangler.jsonc` with selected features.

**Base Configuration Structure**:

```jsonc
{
  "name": "worker-name",
  "compatibility_date": "2025-06-03", // Always today's date
  // Optional fields based on selected features:
  // "main": "src/index.ts" (if Entry Point selected)
  // "observability": { "enabled": true } (if Entry Point selected)
  // "assets": { "directory": "./public" } (if Static Assets selected but no Entry Point)
  // "assets": { "directory": "./public", "binding": "ASSETS" } (if both selected)
}
```

**Configuration Examples by Feature Selection**:

**Static Assets only** (Entry Point not selected):

```jsonc
{
  "name": "worker-name",
  "compatibility_date": "2025-06-03",
  "assets": {
    "directory": "./public",
  },
}
```

**Entry Point only** (Static Assets not selected):

```jsonc
{
  "name": "worker-name",
  "main": "src/index.ts",
  "compatibility_date": "2025-06-03",
  "observability": {
    "enabled": true,
  },
}
```

**Both Entry Point and Static Assets** selected:

```jsonc
{
  "name": "worker-name",
  "main": "src/index.ts",
  "compatibility_date": "2025-06-03",
  "observability": {
    "enabled": true,
  },
  "assets": {
    "directory": "./public",
    "binding": "ASSETS",
  },
}
```

**Note**: A configuration with neither Entry Point nor Static Assets is not valid for Cloudflare Workers. At least one must be selected.

### 5. Success Output

**Completion Message**:

```
✅ Created wrangler.jsonc successfully!

Next steps:
1. Implement your Worker code
2. Develop locally: npx wrangler dev
3. Deploy: npx wrangler deploy

Documentation: https://developers.cloudflare.com/workers/
```

## Technical Requirements

### Architecture

**Scaffolding Pattern**: Follow `apps/llm-rules` structure:

- `src/bin/create-wrangler-config.ts` - CLI entry point
- `src/cli.ts` - CLI setup and argument parsing
- `src/create-config.ts` - Main configuration logic
- `package.json` with proper bin configuration
- `tsconfig.json` - Must use exact same settings as `apps/llm-rules` (extends `@repo/typescript-config/lib.json`)

**Dependencies**:

- `zx` for shell commands (package manager detection/installation)
- `zod` v4 for data validation/parsing
- `@inquirer/prompts` for interactive prompts (following `create-workers-monorepo` pattern)
- `@commander-js/extra-typings` for CLI argument parsing
- `@types/fs-extra` for file system type definitions
- `empathic` for temp directory utilities in tests

**Key Modules**:

1. **Package Manager Detection** (`src/package-manager.ts`)

   - Detect package manager from lock files
   - Check for wrangler dependency
   - Install wrangler if needed

2. **Configuration Builder** (`src/config-builder.ts`)

   - Zod schemas for configuration validation
   - Generate wrangler.jsonc content

3. **File System Operations** (`src/fs.ts`)

   - Check for existing config files
   - Detect common file patterns
   - Write configuration file

4. **Prompts** (`src/prompts.ts`)
   - Interactive configuration prompts
   - Input validation
   - Default value logic

**Important Notes**:

- `src/bin/create-wrangler-config.ts` must contain `import 'zx/globals'` to provide global access to fs and other utilities
- Never use 'utils' in file or directory names (use `fs.ts` not `fs-utils.ts`)
- Use `echo('')` function and `chalk` package for nice log messages (both available as zx globals)

### Error Handling

- Graceful handling of file system errors
- Clear error messages for validation failures
- Proper exit codes for different error conditions
- Rollback on partial failures

### Testing Strategy

- Unit tests for configuration generation
- Integration tests for CLI flow
- Use fixtures in `test/fixtures` directory instead of mocking
- Tests that create files should use temp directories from `empathic` pkg.cache({ create: true })
- Test package manager detection logic

## Future Enhancements

### Phase 2 Features

1. **Advanced Configuration Options**

   - Custom domains/routes
   - Environment-specific configurations

2. **Migration Support**

   - Convert from wrangler.toml to wrangler.jsonc
   - Upgrade existing configurations

3. **Integration Features**
   - Git repository initialization
   - TypeScript configuration setup
   - ESLint/Prettier configuration

### Success Metrics

- Adoption rate among new Workers projects
- Reduction in configuration-related support requests
- User feedback on setup experience
- Time to first successful deployment

## Dependencies

- Node.js 20+ (18 is EOL)
- npm/yarn/pnpm/bun for package management
- Cloudflare account (for deployment, not required for config generation)

## Risks & Mitigations

**Risk**: Overwriting existing configurations
**Mitigation**: Strict pre-flight checks for existing files

**Risk**: Package manager detection failures
**Mitigation**: Fallback to npm, clear error messages

**Risk**: Invalid configuration generation
**Mitigation**: Comprehensive Zod validation, testing

**Risk**: Breaking changes in Wrangler
**Mitigation**: Pin to stable Wrangler versions, regular updates
