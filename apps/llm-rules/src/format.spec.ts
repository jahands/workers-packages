import { describe, expect, it } from 'vitest'

import { fmt } from './format'

describe('fmt', () => {
	describe('trim()', () => {
		it('should return an empty string for an empty input', () => {
			expect(fmt.trim('')).toBe('')
		})

		it('should trim common leading and all trailing spaces from a single line', () => {
			expect(fmt.trim('  hello  ')).toBe('hello')
		})

		it('should trim leading and trailing newlines', () => {
			expect(fmt.trim('\n\nhello\n\n')).toBe('hello')
		})

		it('should remove common leading whitespace, trim trailing spaces, and preserve relative indentation and empty lines', () => {
			const input = `
        line1
          line2

        line3
      `
			const expected = `line1
  line2

line3
`
			expect(fmt.trim(input)).toBe(expected)
		})

		it('should handle a string that is already trimmed', () => {
			expect(fmt.trim('hello\nworld')).toBe('hello\nworld')
		})

		it('should convert string containing only whitespace characters to empty string', () => {
			expect(fmt.trim('  	 ')).toBe('')
		})

		it('should handle a string with only newlines', () => {
			expect(fmt.trim('\n\n\n')).toBe('')
		})

		it('should preserve empty lines from the middle', () => {
			expect(fmt.trim('hello\n\nworld')).toBe('hello\n\nworld')
		})

		it('should only trim spaces up until the minimum indentation', () => {
			const input = `
      line1
        line2
      `
			expect(fmt.trim(input)).toBe('line1\n  line2\n')
		})

		it('should trim leading and trailing newlines before processing indent', () => {
			const input = `\n\n      line1\n        line2\n      \n\n`
			expect(fmt.trim(input)).toBe('line1\n  line2\n')
		})

		it('should preserve empty lines and remove common indentation', () => {
			const input = `
    line1

    line2
  `
			expect(fmt.trim(input)).toBe('line1\n\nline2\n')
		})

		it('should process all-whitespace lines to a single empty string', () => {
			const input = `


      `
			expect(fmt.trim(input)).toBe('')
		})

		it('should not change strings with no common indentation', () => {
			const input = `line1\n  line2\n    line3`
			expect(fmt.trim(input)).toBe('line1\n  line2\n    line3')
		})

		it('should correctly handle tabs as indentation', () => {
			const input = `
		line1
			line2
	`
			expect(fmt.trim(input)).toBe('line1\n	line2\n')
		})

		it('should handle a string with mixed spaces and tabs by removing common prefix', () => {
			const input = `
  	line1
  	  line2
  ` // Common prefix is "  \t"
			expect(fmt.trim(input)).toBe('line1\n  line2\n')
		})
	})

	describe('oneLine()', () => {
		it('should return an empty string for an empty input', () => {
			expect(fmt.oneLine('')).toBe('')
		})

		it('should convert a multi-line string to a single line', () => {
			expect(fmt.oneLine('hello\nworld')).toBe('hello world')
		})

		it('should trim leading/trailing spaces and newlines before joining', () => {
			expect(fmt.oneLine('  hello  \n  world  \n')).toBe('hello world')
		})

		it('should remove empty lines before joining', () => {
			expect(fmt.oneLine('hello\n\nworld')).toBe('hello world')
		})

		it('should handle a string that is already a single line', () => {
			expect(fmt.oneLine('hello world')).toBe('hello world')
		})

		it('should handle a string with only spaces and newlines', () => {
			expect(fmt.oneLine('  \n   \n  ')).toBe('')
		})
	})

	describe('asTSV()', () => {
		it('should convert an empty array to an empty string', async () => {
			expect(await fmt.asTSV([])).toBe('')
		})

		it('should convert an array of one object to a TSV string', async () => {
			const data = [{ a: 1, b: 'hello' }]
			expect(await fmt.asTSV(data)).toBe('a\tb\n1\thello')
		})

		it('should convert an array of multiple objects to a TSV string', async () => {
			const data = [
				{ a: 1, b: 'hello' },
				{ a: 2, b: 'world' },
			]
			expect(await fmt.asTSV(data)).toBe('a\tb\n1\thello\n2\tworld')
		})

		it('should handle objects with different keys (using keys from the first object as headers)', async () => {
			const data = [
				{ a: 1, b: 'hello' },
				{ a: 2, c: 'world' },
			]
			expect(await fmt.asTSV(data)).toBe('a\tb\n1\thello\n2\t')
			expect(await fmt.asTSV(data)).toMatchInlineSnapshot(`
				"a	b
				1	hello
				2	"
			`)
		})

		it('should handle values with tabs and newlines (fast-csv should quote them)', async () => {
			const data = [{ name: 'John\tDoe', description: 'Line1\nLine2' }]
			expect(await fmt.asTSV(data)).toBe('name\tdescription\n"John\tDoe"\t"Line1\nLine2"')
			expect(await fmt.asTSV(data)).toMatchInlineSnapshot(`
				"name	description
				"John	Doe"	"Line1
				Line2""
			`)
		})

		it('should handle values with quotes (fast-csv should escape them)', async () => {
			const data = [{ name: 'James "Jim" Raynor' }]
			expect(await fmt.asTSV(data)).toBe('name\n"James ""Jim"" Raynor"')
			expect(await fmt.asTSV(data)).toMatchInlineSnapshot(`
				"name
				"James ""Jim"" Raynor""
			`)
		})
	})
})
