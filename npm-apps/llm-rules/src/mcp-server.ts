import { join } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { version } from '../package.json'
import { parseRulesFromDir } from './rule-parser.js'

/**
 * Create and start an MCP server that provides tools for each .cursor/rules/*.mdc file
 */
export async function createMCPServer(workingDir: string = process.cwd()) {
	const rulesDir = join(workingDir, '.cursor', 'rules')
	const rules = await parseRulesFromDir(rulesDir)

	console.error(`Found ${rules.length} rules in ${rulesDir}`)
	rules.forEach((rule) => {
		console.error(`  - ${rule.name}: ${rule.frontmatter.description}`)
	})

	const server = new McpServer({
		name: 'llm-rules',
		version,
	})

	// Generate tools dynamically from rules
	for (const rule of rules) {
		// Build description with metadata to help LLMs decide when to use this rule
		let description = `Read Cursor rule: ${rule.frontmatter.description}`

		const metadata: string[] = []
		if (rule.frontmatter.globs) {
			metadata.push(`applies to ${rule.frontmatter.globs}`)
		}
		if (rule.frontmatter.alwaysApply) {
			metadata.push('always-apply')
		}

		if (metadata.length > 0) {
			description += ` (${metadata.join(', ')})`
		}

		server.tool(`cursor_rule_${rule.name}`, description, {}, async () => {
			return {
				content: [
					{
						type: 'text',
						text: rule.content,
					},
				],
			}
		})
	}

	return server
}

/**
 * Start the MCP server with stdio transport
 */
export async function startMCPServer(workingDir?: string) {
	const server = await createMCPServer(workingDir)
	const transport = new StdioServerTransport()
	await server.connect(transport)
	console.error('MCP server started and listening on stdio')
}
