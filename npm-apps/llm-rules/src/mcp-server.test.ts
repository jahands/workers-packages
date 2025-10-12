import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import 'zx/globals'

describe('MCP Server', () => {
	const fixturesDir = join(__dirname, 'test', 'fixtures')
	const validFixturesDir = join(fixturesDir, 'valid')
	const invalidFixturesDir = join(fixturesDir, 'invalid')

	const serverPath = join(__dirname, '../dist/llm-rules.cjs')

	const exitPayload = '{"jsonrpc":"2.0","method":"exit","id":1}'
	const toolsListPayload = JSON.stringify({
		jsonrpc: '2.0',
		method: 'tools/list',
		id: 1,
		params: {},
	})
	const toolsCallPayload = JSON.stringify({
		jsonrpc: '2.0',
		method: 'tools/call',
		id: 1,
		params: {
			name: 'cursor_rule_typescript-style',
			arguments: {},
		},
	})

	describe('Server Startup', () => {
		it('should start and find all test rules', async () => {
			const result = await $({
				timeout: '5s',
			})`echo ${exitPayload} | node ${serverPath} --dir ${validFixturesDir}`

			expect(result.stderr).toContain('Found 6 rules')
			expect(result.stderr).toContain('MCP server started and listening on stdio')
		})

		it('should discover all expected rules with correct descriptions', async () => {
			const result = await $({
				timeout: '5s',
			})`echo ${exitPayload} | node ${serverPath} --dir ${validFixturesDir}`

			const expectedRules = [
				'typescript-style: TypeScript coding standards and style guide',
				'react-components: React component patterns and best practices',
				'api-design: RESTful API design principles and validation patterns',
				'always-apply: Project-wide coding standards that always apply',
				'manual-only: Database migration patterns and procedures',
			]

			for (const rule of expectedRules) {
				expect(result.stderr).toContain(rule)
			}
		})
	})

	describe('Rule Parsing', () => {
		it('should parse MDC files correctly', async () => {
			const ruleFiles = [
				'typescript-style.mdc',
				'react-components.mdc',
				'api-design.mdc',
				'always-apply.mdc',
				'manual-only.mdc',
			]

			for (const file of ruleFiles) {
				const filePath = join(validFixturesDir, '.cursor', 'rules', file)
				const content = await readFile(filePath, 'utf-8')

				// Verify MDC structure
				expect(content).toMatch(/^---\s*\n/)
				expect(content).toContain('description:')
				expect(content.split('---')).toHaveLength(3) // frontmatter + content
			}
		})

		it('should handle different frontmatter configurations', async () => {
			// Test always-apply rule
			const alwaysApplyPath = join(validFixturesDir, '.cursor', 'rules', 'always-apply.mdc')
			const alwaysApplyContent = await readFile(alwaysApplyPath, 'utf-8')
			expect(alwaysApplyContent).toContain('alwaysApply: true')

			// Test rule with globs
			const typescriptPath = join(validFixturesDir, '.cursor', 'rules', 'typescript-style.mdc')
			const typescriptContent = await readFile(typescriptPath, 'utf-8')
			expect(typescriptContent).toContain('globs: "**/*.ts,**/*.tsx"')
		})
	})

	describe('Error Handling', () => {
		it('should handle missing rules directory gracefully', async () => {
			const result = await $({
				timeout: '5s',
			})`echo ${exitPayload} | node ${serverPath} --dir /nonexistent`

			expect(result.stderr).toContain('Found 0 rules')
		})

		it('should handle invalid frontmatter gracefully', async () => {
			// Test with the invalid fixtures directory that contains invalid rule files
			const result = await $({
				timeout: '5s',
			})`echo ${exitPayload} | node ${serverPath} --dir ${invalidFixturesDir}`

			// Should parse only 1 rule (unquoted-globs) after filtering out manual rules
			// Rules need descriptions with at least 10 characters
			expect(result.stderr).toContain('Found 1 rules')
			expect(result.stderr).toContain('MCP server started and listening on stdio')

			// Should show warnings for filtered rules (must be at least 10 characters)
			expect(result.stderr).toContain('missing description (must be at least 10 characters)')

			// Should contain the successfully parsed rule (has valid description)
			expect(result.stderr).toContain('unquoted-globs: TypeScript style guide')

			// Should handle it gracefully without crashing
			expect(result.exitCode).toBe(0)
		})
	})

	describe('Tool Generation', () => {
		it('should generate tools with correct naming pattern', async () => {
			const result = await $({
				timeout: '5s',
			})`echo ${exitPayload} | node ${serverPath} --dir ${validFixturesDir}`

			// Verify that rules are found (tools are generated from rules)
			expect(result.stderr).toContain('typescript-style:')
			expect(result.stderr).toContain('react-components:')
			expect(result.stderr).toContain('api-design:')
			expect(result.stderr).toContain('always-apply:')
			expect(result.stderr).toContain('manual-only:')
		})

		it('should include metadata in tool descriptions', async () => {
			const result = await $({
				timeout: '5s',
			})`echo ${toolsListPayload} | node ${serverPath} --dir ${validFixturesDir}`

			// Parse the JSON response to check tool descriptions
			const lines = result.stdout.split('\n').filter((line) => line.trim())
			const responseLines = lines.filter((line) => {
				try {
					const parsed = JSON.parse(line)
					return parsed.result && parsed.result.tools
				} catch {
					return false
				}
			})

			expect(responseLines.length).toBeGreaterThan(0)

			const response = JSON.parse(responseLines[0])
			const tools = response.result.tools

			expect(Array.isArray(tools)).toBe(true)
			expect(tools.length).toBe(6)

			// Find typescript rule tool - should include globs in description
			const typescriptTool = tools.find((tool: any) => tool.name === 'cursor_rule_typescript-style')
			expect(typescriptTool).toBeDefined()
			expect(typescriptTool.description).toContain('applies to **/*.ts,**/*.tsx')

			// Find always-apply rule tool - should include always-apply flag
			const alwaysApplyTool = tools.find((tool: any) => tool.name === 'cursor_rule_always-apply')
			expect(alwaysApplyTool).toBeDefined()
			expect(alwaysApplyTool.description).toContain('always-apply')

			// Find manual-only rule tool - should not have metadata annotations
			const manualOnlyTool = tools.find((tool: any) => tool.name === 'cursor_rule_manual-only')
			expect(manualOnlyTool).toBeDefined()
			expect(manualOnlyTool.description).not.toContain('applies to')
			expect(manualOnlyTool.description).not.toContain('always-apply')
		})
	})

	describe('MCP Protocol', () => {
		it('should handle tools/list requests', async () => {
			const result = await $({
				timeout: '3s',
			})`echo ${toolsListPayload} | node ${serverPath} --dir ${validFixturesDir}`

			// Should not error out and should start the server
			expect(result.stderr).toContain('MCP server started and listening on stdio')
		})

		it('should handle tools/call requests', async () => {
			const result = await $({
				timeout: '3s',
			})`echo ${toolsCallPayload} | node ${serverPath} --dir ${validFixturesDir}`

			// Should not error out and should start the server
			expect(result.stderr).toContain('MCP server started and listening on stdio')
		})
	})
})
