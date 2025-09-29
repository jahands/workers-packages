import { defineWorkspace } from 'vitest/config'

export default defineWorkspace(['{examples,packages,test}/*/vitest.config{,.node}.ts'])
