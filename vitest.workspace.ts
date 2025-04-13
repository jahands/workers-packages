import { defineWorkspace } from 'vitest/config'

export default defineWorkspace(['{examples,packages,tests}/*/vitest.config{,.node}.ts'])
