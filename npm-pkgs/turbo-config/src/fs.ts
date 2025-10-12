export async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath)
		return true
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return false
		}
		throw error
	}
}

export async function readJsonFile(filePath: string): Promise<unknown> {
	const contents = await fs.readFile(filePath, 'utf8')
	return JSON.parse(contents)
}
