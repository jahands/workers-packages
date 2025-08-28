# opencode-plugin-cloudflare

A plugin for [opencode](https://opencode.ai) that enhances Cloudflare Workers development with a Cloudflare agent and Cloudflare Docs MCP server pre-configured..

## Features

- **Cloudflare Workers Specialist Agent**: Automatically configures a specialized AI agent with deep knowledge of Cloudflare Workers, including the runtime, APIs, and best practices
- **Documentation Integration**: Seamlessly integrates Cloudflare's official documentation via MCP (Model Context Protocol) for real-time access to the latest docs
- **Zero Configuration**: Works out of the box with sensible defaults

## Installation

### Local Project Installation

```bash
# Install the plugin in your project
npm install opencode-plugin-cloudflare

# Or with pnpm
pnpm add opencode-plugin-cloudflare

# Or with bun
bun add opencode-plugin-cloudflare
```

Then, update `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-plugin-cloudflare"]
}
```
