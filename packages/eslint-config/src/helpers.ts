import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { includeIgnoreFile } from '@eslint/compat'

import type { Linter } from 'eslint'

export function getDirname(importMetaUrl: string): string {
	const __filename = fileURLToPath(importMetaUrl)
	return path.dirname(__filename)
}

export function getGitIgnoreFiles(importMetaUrl: string): Linter.Config[] {
	// always include the root gitignore file
	const rootGitignorePath = fileURLToPath(new URL('../../../.gitignore', import.meta.url))

	const ignoreFiles: Linter.Config[] = [includeIgnoreFile(rootGitignorePath)]

	const packageDir = getDirname(importMetaUrl)
	const packageGitignorePath = path.join(packageDir, '.gitignore')
	if (existsSync(packageGitignorePath)) {
		ignoreFiles.push(includeIgnoreFile(packageGitignorePath))
	}

	return ignoreFiles
}

export function getTsconfigRootDir(importMetaUrl: string): string | undefined {
	const tsconfigRootDir = getDirname(importMetaUrl)
	return existsSync(path.join(tsconfigRootDir, 'tsconfig.json')) ? tsconfigRootDir : undefined
}
