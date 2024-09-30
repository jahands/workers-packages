import 'zx/globals'

async function build(name: string): Promise<void> {
	await $`bun ./scripts/${name}`
}

await fs.rm('./dist/', { force: true, recursive: true })

await Promise.all([build('build-lib.ts'), build('build-types.ts')])
