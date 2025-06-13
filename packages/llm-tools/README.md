# @jahands/llm-tools

Tools for working with LLMs (Large Language Models).

## Installation

```bash
npm install @jahands/llm-tools
```

## Usage

### Format Utilities

The `fmt` object provides formatting functions useful for working with LLMs:

```typescript
import { fmt } from '@jahands/llm-tools'

// Format multi-line strings by removing unnecessary indentation
const formatted = fmt.trim(`
    This is a multi-line string
      with some indentation
    that will be normalized
`)
// Result: "This is a multi-line string\n  with some indentation\nthat will be normalized"

// Convert multi-line strings to single line
const oneLine = fmt.oneLine(`
    This is a multi-line string
    that will become one line
`)
// Result: "This is a multi-line string that will become one line"

// Convert array of objects to TSV (Tab-Separated Values)
const data = [
    { name: 'John', age: 30 },
    { name: 'Jane', age: 25 }
]
const tsv = await fmt.asTSV(data)
// Result: "name\tage\nJohn\t30\nJane\t25"
```

### Available Functions

#### `fmt.trim(str: string): string`

Formats a multi-line string by removing unnecessary indentation while preserving relative indentation between lines. Trims leading/trailing newlines from the entire string and trailing whitespace from each line. Empty or whitespace-only lines are preserved as empty lines.

Useful for formatting prompts and tool instructions.

#### `fmt.oneLine(str: string): string`

Converts a multi-line string into a single line by joining non-empty lines with spaces.

Useful for formatting tool instructions that need to be on one line.

#### `fmt.asTSV(data: any[]): Promise<string>`

Converts an array of objects to a string of tab-separated values (TSV). This is better than JSON for returning data to LLMs because it uses fewer tokens.

## License

MIT
