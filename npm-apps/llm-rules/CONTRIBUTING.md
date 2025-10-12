# Contributing to llm-rules

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Type check
pnpm check
```

## Architecture

- `src/rule-parser.ts`: Parses MDC files and extracts frontmatter/content
- `src/mcp-server.ts`: Creates and manages the MCP server
- `src/cli.ts`: Command-line interface for starting the server

## Testing

The project includes comprehensive tests for both rule parsing and MCP server functionality:

- `src/rule-parser.test.ts`: Tests for MDC file parsing and frontmatter extraction
- `src/mcp-server.test.ts`: Tests for MCP server creation and tool generation
- Test fixtures in `src/test/fixtures/.cursor/rules/`: Sample rule files for testing

## Rule Format

The server expects Cursor rule files in MDC format with frontmatter:

```markdown
---
description: 'A brief description of what this rule covers'
globs: ['**/*.ts', '**/*.tsx']
alwaysApply: false
---

# Rule Content

Your rule content goes here...
```

## Testing the CLI

### Quick Testing

For development testing, use the `--exit-after-start` flag to verify rule discovery without the server hanging:

```bash
# Build and test rule discovery
pnpm build
node ./dist/llm-rules.cjs --dir /path/to/test/repo --exit-after-start
```

### Full Server Testing

To test the full MCP server functionality:

```bash
# Start the server (will keep running)
node ./dist/llm-rules.cjs --dir /path/to/test/repo

# In another terminal, send MCP requests
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node ./dist/llm-rules.cjs --dir /path/to/test/repo
```

## Making Changes

1. Make your changes
2. Run tests: `pnpm test`
3. Build: `pnpm build`
4. Test rule discovery: `node ./dist/llm-rules.cjs --dir /path/to/test/repo --exit-after-start`
