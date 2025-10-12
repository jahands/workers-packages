import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import matter from 'gray-matter'
import z, { z as z3 } from 'zod/v3'
import { glob } from 'zx'

export type RuleFrontmatter = z3.infer<typeof RuleFrontmatter>
export const RuleFrontmatter = z3
	.object({
		description: z3.string().nullable().default(''),
		globs: z3.string().nullable().optional(),
		alwaysApply: z3.boolean().optional(),
	})
	.transform((data) => ({
		...data,
		description: data.description || '', // Will be handled in parseRuleFile
	}))

export type ParsedRule = z3.infer<typeof ParsedRule>
export const ParsedRule = z3.object({
	filename: z3.string(),
	name: z3.string(),
	frontmatter: RuleFrontmatter,
	content: z3.string(),
	fullContent: z3.string(),
})

/**
 * Find and parse all .mdc files in .cursor/rules directory
 */
export async function parseRulesFromDir(rulesDir: string): Promise<ParsedRule[]> {
	try {
		const files = await glob('*.mdc', { cwd: rulesDir })

		const results = await Promise.all(files.map((file) => parseRuleFile(join(rulesDir, file))))

		return results.filter((rule): rule is ParsedRule => rule !== null)
	} catch (error) {
		console.warn(`Could not read rules directory: ${rulesDir}`, error)
		return []
	}
}

/**
 * Sanitize YAML frontmatter to handle common issues like unquoted glob patterns
 */
function sanitizeYamlFrontmatter(content: string): string {
	// Split into frontmatter and content parts
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
	if (!frontmatterMatch) {
		return content
	}

	const [, frontmatter, markdownContent] = frontmatterMatch

	// Fix common YAML issues
	const sanitizedFrontmatter = frontmatter
		// Quote glob patterns that contain asterisks (like *.ts,*.tsx)
		.replace(/^(\s*globs:\s*)([^"'\n]*\*[^"'\n]*)$/gm, (_, prefix, value) => {
			const trimmedValue = value.trim()
			// Only quote if not already quoted and contains asterisk
			if (
				!trimmedValue.startsWith('"') &&
				!trimmedValue.startsWith("'") &&
				trimmedValue.includes('*')
			) {
				return `${prefix}"${trimmedValue}"`
			}
			return prefix + value
		})

	return `---\n${sanitizedFrontmatter}\n---\n${markdownContent}`
}

/**
 * Parse a single .mdc rule file
 */
export async function parseRuleFile(filePath: string): Promise<ParsedRule | null> {
	try {
		const fullContent = await readFile(filePath, 'utf-8')

		// Try parsing as-is first, then with sanitization if it fails
		let parsed: matter.GrayMatterFile<string>
		try {
			parsed = matter(fullContent)
		} catch {
			// If YAML parsing fails, try with sanitization
			console.warn(`YAML parsing failed for ${filePath}, attempting to sanitize...`)
			const sanitizedContent = sanitizeYamlFrontmatter(fullContent)
			parsed = matter(sanitizedContent)
		}

		const frontmatterResult = RuleFrontmatter.safeParse(parsed.data)
		if (!frontmatterResult.success) {
			console.warn(`Invalid frontmatter in ${filePath}:`, frontmatterResult.error)
			return null
		}

		const filename = filePath.split('/').pop() || filePath
		const name = filename.replace('.mdc', '')

		const frontmatter = frontmatterResult.data

		// Filter out "manual" rules that don't have a description
		// These rules should never be auto-added by the LLM
		const hasDescription = z.string().min(10).safeParse(frontmatter.description).success

		if (!hasDescription) {
			console.warn(
				`Ignoring manual rule ${filename}: missing description (must be at least 10 characters)`
			)
			return null
		}

		return {
			filename,
			name,
			frontmatter,
			content: parsed.content.trim(),
			fullContent,
		}
	} catch (error) {
		console.warn(`Error parsing rule file ${filePath}:`, error)
		return null
	}
}
