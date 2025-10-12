export function isDirEmpty(dir: string): boolean {
	const files = fs.readdirSync(dir)
	return files.length === 0
}
