import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
	'{examples,packages}/*/vitest.config{,.node}.ts',
	'dist/tests/*/*/vitest.config{,.node}.ts',
])
