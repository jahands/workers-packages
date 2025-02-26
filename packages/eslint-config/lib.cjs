// @ts-check
const { resolve } = require('node:path')

const project = resolve(process.cwd(), 'tsconfig.json')

/** @type {import("eslint").Linter.Config} */
module.exports = {
	extends: ['./workers.cjs', 'plugin:require-extensions/recommended'],
	plugins: ['require-extensions'],
}
