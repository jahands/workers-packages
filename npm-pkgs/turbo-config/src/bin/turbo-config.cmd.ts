#!/usr/bin/env node

import 'zx/globals'

import { Command } from '@commander-js/extra-typings'
import { catchProcessError } from '@jahands/cli-tools'
import { z } from 'zod'

import { checkTurboJson, generateTurboJson } from '../cli'

const isCI = () => z.stringbool().safeParse(process.env.CI).success

export const program = new Command('turbo-config')
	.description('Commands for working with turbo.config.ts and turbo.json')
	.option('--skip-in-ci', 'Skip checks in CI')
	.action(async ({ skipInCi }) => {
		if (isCI()) {
			if (skipInCi) {
				return
			}

			await checkTurboJson()
		} else {
			await generateTurboJson()
		}
	})

program
	.command('generate')
	.description('Generate turbo.json')
	.action(async () => {
		await generateTurboJson()
	})

program
	.command('check')
	.description('Ensure turbo.config.ts is valid and matches turbo.json')
	.option('--skip-in-ci', 'Skip checks in CI')
	.action(async ({ skipInCi }) => {
		if (isCI() && skipInCi) {
			return
		}

		await checkTurboJson()
	})

program
	// don't hang for unresolved promises
	.hook('postAction', () => process.exit(0))
	.parseAsync()
	.catch(catchProcessError())
