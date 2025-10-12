import { join, resolve } from 'node:path'
import { assert, describe, expect, it } from 'vitest'

import { parseRuleFile, parseRulesFromDir } from './rule-parser.js'

describe('Rule Parser', () => {
	const fixturesDir = join(__dirname, 'test', 'fixtures')
	const validRulesDir = join(fixturesDir, 'valid', '.cursor', 'rules')
	const invalidRulesDir = join(fixturesDir, 'invalid', '.cursor', 'rules')

	describe('parseRulesFromDir', () => {
		it('should find and parse all rules with valid descriptions', async () => {
			const rules = await parseRulesFromDir(validRulesDir)

			// All rules in valid directory have descriptions with at least 10 characters, so all should be included
			expect(rules).toHaveLength(6)

			const ruleNames = rules.map((r) => r.name).sort()
			expect(ruleNames).toEqual([
				'always-apply',
				'api-design',
				'manual-only',
				'react-components',
				'typescript-style',
				'zod-v4',
			])
		})

		it('should return empty array for non-existent directory', async () => {
			const rules = await parseRulesFromDir('/nonexistent/path')
			expect(rules).toEqual([])
		})
	})

	describe('parseRuleFile', () => {
		it('should parse TypeScript style rule correctly', async () => {
			const filePath = join(validRulesDir, 'typescript-style.mdc')
			const rule = await parseRuleFile(filePath)

			assert(rule)
			expect(rule.name).toBe('typescript-style')
			expect(rule.filename).toBe('typescript-style.mdc')
			expect(rule.frontmatter.description).toBe('TypeScript coding standards and style guide')
			expect(rule.frontmatter.globs).toBe('**/*.ts,**/*.tsx')
			expect(rule.frontmatter.alwaysApply).toBe(false)
			expect(rule.content).toContain('# TypeScript Style Guide')
			expect(rule.fullContent).toContain('---')
		})

		it('should parse always-apply rule correctly', async () => {
			const filePath = join(validRulesDir, 'always-apply.mdc')
			const rule = await parseRuleFile(filePath)

			assert(rule)
			expect(rule.frontmatter.alwaysApply).toBe(true)
			expect(rule.frontmatter.description).toBe('Project-wide coding standards that always apply')
		})

		it('should handle empty description gracefully', async () => {
			const filePath = join(validRulesDir, 'manual-only.mdc')
			const rule = await parseRuleFile(filePath)

			assert(rule)
			expect(rule.frontmatter.description).toBe('Database migration patterns and procedures')
		})

		it('should handle null globs field', async () => {
			const filePath = join(validRulesDir, 'always-apply.mdc')
			const rule = await parseRuleFile(filePath)

			assert(rule)
			expect(rule.frontmatter.globs).toBe(null)
		})

		it('should return null for non-existent file', async () => {
			const rule = await parseRuleFile('/nonexistent/file.mdc')
			expect(rule).toBeNull()
		})

		it('should filter out rules without valid descriptions', async () => {
			// Test with our empty frontmatter file
			const filePath = join(invalidRulesDir, 'empty-frontmatter.mdc')
			const rule = await parseRuleFile(filePath)

			// Should return null because it has no description (manual rule)
			expect(rule).toBeNull()
		})

		it('should handle unquoted glob patterns with asterisks', async () => {
			const filePath = join(invalidRulesDir, 'unquoted-globs.mdc')
			const rule = await parseRuleFile(filePath)

			assert(rule)
			expect(rule.frontmatter.description).toBe('TypeScript style guide')
			expect(rule.frontmatter.globs).toBe('*.ts,*.tsx')
			expect(rule.frontmatter.alwaysApply).toBe(false)
			expect(rule.content).toBe(
				'# TypeScript Style Guide\n\nUse strict typing and proper interfaces.'
			)
		})

		it('should validate all fixture files have correct structure', async () => {
			const files = [
				'typescript-style.mdc',
				'react-components.mdc',
				'api-design.mdc',
				'always-apply.mdc',
				'manual-only.mdc',
				'zod-v4.mdc',
			]

			for (const file of files) {
				const filePath = join(validRulesDir, file)
				const rule = await parseRuleFile(filePath)

				assert(rule, `Failed to parse ${file}`)
				expect(rule.name).toBe(file.replace('.mdc', ''))
				expect(rule.frontmatter.description).toBeTruthy()
				expect(rule.content.length).toBeGreaterThan(0)
				expect(rule.fullContent).toContain('---')
			}
		})
	})

	describe('Frontmatter Validation', () => {
		it('should handle various frontmatter configurations', async () => {
			const rules = await parseRulesFromDir(validRulesDir)

			// Check that we have rules with different configurations
			const alwaysApplyRule = rules.find((r) => r.name === 'always-apply')
			expect(alwaysApplyRule?.frontmatter.alwaysApply).toBe(true)

			const typescriptRule = rules.find((r) => r.name === 'typescript-style')
			expect(typescriptRule?.frontmatter.globs).toBe('**/*.ts,**/*.tsx')
			expect(typescriptRule?.frontmatter.alwaysApply).toBe(false)
		})

		it('should not use fallback for fixture files', async () => {
			// All our test fixture rules should have proper descriptions (not using fallback)
			const rules = await parseRulesFromDir(validRulesDir)

			// Should only have valid rules
			expect(rules).toHaveLength(6)

			for (const rule of rules) {
				expect(rule.frontmatter.description).toBeTruthy()
				expect(rule.frontmatter.description).not.toMatch(/^Coding guidelines and rules for/) // Should not use fallback
			}
		})

		it('should filter out manual rules without valid descriptions', async () => {
			// Test that rules without valid descriptions (at least 10 characters) are considered "manual" and filtered out
			const filePath = join(invalidRulesDir, 'empty-frontmatter.mdc')
			const rule = await parseRuleFile(filePath)

			expect(rule).toBeNull()
		})

		it('should require descriptions to be at least 10 characters', async () => {
			// Test that descriptions must be at least 10 characters long
			// All valid rules should have descriptions >= 10 characters
			const rules = await parseRulesFromDir(validRulesDir)

			for (const rule of rules) {
				expect(rule.frontmatter.description.length).toBeGreaterThanOrEqual(10)
			}
		})

		it('should filter out rules without valid descriptions', async () => {
			// Test that rules without valid descriptions (at least 10 characters) are filtered out
			const rules = await parseRulesFromDir(invalidRulesDir)

			// All files in invalid directory should be filtered out:
			// - empty-frontmatter.mdc: no description
			// - invalid-frontmatter.mdc: broken YAML that can't be sanitized
			// - unquoted-globs.mdc: YAML parsing issues that result in empty frontmatter
			expect(rules).toHaveLength(0)

			const emptyRule = rules.find((r) => r.name === 'empty-frontmatter')
			expect(emptyRule).toBeUndefined() // Should be filtered out

			const invalidRule = rules.find((r) => r.name === 'invalid-frontmatter')
			expect(invalidRule).toBeUndefined() // Should be filtered out

			const unquotedRule = rules.find((r) => r.name === 'unquoted-globs')
			expect(unquotedRule).toBeUndefined() // Should be filtered out
		})
	})

	describe('YAML edge cases', () => {
		it('should handle unquoted glob patterns', async () => {
			const result = await parseRuleFile(
				resolve(__dirname, 'test/fixtures/yaml-issues/.cursor/rules/unquoted-globs.mdc')
			)
			assert(result !== null)
			expect(result.name).toBe('unquoted-globs')
			expect(result.frontmatter.globs).toBe('*.ts,*.tsx')
			expect(result.frontmatter.alwaysApply).toBe(false)
		})

		it('should handle quoted glob patterns normally', async () => {
			const result = await parseRuleFile(
				resolve(__dirname, 'test/fixtures/yaml-issues/.cursor/rules/quoted-globs.mdc')
			)
			assert(result !== null)
			expect(result.name).toBe('quoted-globs')
			expect(result.frontmatter.description).toBe('TypeScript style guide')
			expect(result.frontmatter.globs).toBe('*.ts,*.tsx')
		})
	})
})
