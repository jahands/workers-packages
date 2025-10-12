import { $ } from 'zx'

export async function setup() {
	console.log('Building CLI before running tests...')

	try {
		await $`pnpm turbo build -F llm-rules`
		console.log('✅ CLI built successfully')
	} catch (error) {
		console.error('❌ Failed to build CLI:', error)
		throw error
	}
}
