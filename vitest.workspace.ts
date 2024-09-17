import fs from 'node:fs'
import { parse } from 'yaml'

const pnpmWorkspace = parse(fs.readFileSync('./pnpm-workspace.yaml').toString())
export default pnpmWorkspace
