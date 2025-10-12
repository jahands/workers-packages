# create-wrangler-config

CLI tool for quickly setting up a `wrangler.jsonc` configuration file for Cloudflare Workers projects.

## Features

- 🚀 **Quick Setup**: Interactive prompts guide you through configuration
- 🧠 **Smart Defaults**: Auto-detects entry points and asset directories
- 📦 **Package Manager Integration**: Automatically installs wrangler if needed
- 🛡️ **Safety First**: Prevents overwriting existing configuration files
- ✅ **Validation**: Uses Zod for robust input validation

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

## Interactive Configuration

The tool will guide you through:

1. **Worker Name**: Validates and sanitizes the worker name
2. **Feature Selection**: Choose between Entry Point and/or Static Assets
3. **Feature Configuration**: Configure specific details for selected features

### Feature Detection

The tool automatically detects and pre-selects features based on your project:

- **Entry Point**: Auto-checked if `src/index.ts` or `index.ts` exists
- **Static Assets**: Auto-checked if assets directory provided or common directories detected (`public`, `static`, `assets`, `dist`)

## Generated Configuration

### Entry Point Only

```jsonc
{
  "name": "my-worker",
  "main": "src/index.ts",
  "compatibility_date": "2025-06-03",
  "observability": {
    "enabled": true,
  },
}
```

### Static Assets Only

```jsonc
{
  "name": "my-worker",
  "compatibility_date": "2025-06-03",
  "assets": {
    "directory": "./public",
  },
}
```

### Both Features

```jsonc
{
  "name": "my-worker",
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

## Requirements

- Node.js 20+
- npm/yarn/pnpm/bun for package management

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Type check
pnpm check:types

# Lint
pnpm check:lint
```

## License

MIT
