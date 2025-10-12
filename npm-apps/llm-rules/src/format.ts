import { writeToString } from '@fast-csv/format'

/**
 * A collection of formatting functions (think of it like Golang's `fmt` package)
 */
export const fmt = {
	/**
	 * Formats a multi-line string by removing unnecessary indentation while preserving
	 * the relative indentation between lines. Trims leading/trailing newlines from the
	 * entire string and trailing whitespace from each line. Empty or whitespace-only
	 * lines are preserved as empty lines.
	 *
	 * Useful for formatting prompts and tool instructions.
	 */
	trim: (str: string): string => {
		// trim leading/trailing newlines from the whole string
		const trimmedNewlines = str.replace(/^\n+|\n+$/g, '')
		if (trimmedNewlines === '') {
			return ''
		}

		const lines = trimmedNewlines.split('\n')

		// find minimum indentation of non-empty lines
		let minIndent = Infinity
		for (const line of lines) {
			if (line.trim().length > 0) {
				const leadingSpaces = line.match(/^\s*/)?.[0].length ?? 0
				minIndent = Math.min(minIndent, leadingSpaces)
			}
		}

		// if all lines are empty or there's no common indentation, proceed without removing leading spaces
		if (minIndent === Infinity) {
			minIndent = 0
		}

		// remove minimum indentation from each line and trim trailing spaces
		return lines
			.map((line) => {
				if (line.trim().length === 0) {
					return '' // preserve empty lines as truly empty
				}
				// remove common leading spaces
				const commonRemoved = line.substring(minIndent)
				// trim only trailing spaces
				return commonRemoved.replace(/\s+$/, '')
			})
			.join('\n')
	},

	/**
	 * Converts a multi-line string into a single line.
	 * Useful for formatting tool instructions.
	 */
	oneLine: (str: string): string =>
		str
			.trim()
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.join(' '),

	/**
	 * Convert an array of objects to a string of tab-separated values (TSV).
	 * This is better than JSON for returning data to the model because it uses fewer tokens
	 */
	asTSV: (data: any[]): Promise<string> => writeToString(data, { headers: true, delimiter: '\t' }),
} as const
