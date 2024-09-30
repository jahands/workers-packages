import 'zx/globals'

async function run(name: string): Promise<void> {
	await $`bun ./scripts/${name}`
}

await fs.rm('./dist/', { force: true, recursive: true })

await Promise.all([run('build-lib.ts'), run('build-types.ts')])
