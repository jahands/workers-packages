import 'zx/globals'

async function build(name: string): Promise<void> {
	const scriptPath = `./scripts/${name}`
	await $`bun ${scriptPath}`
}

await fs.rm('./dist/', { force: true, recursive: true })

await Promise.all([build('build-lib.ts'), build('build-types.ts')])
