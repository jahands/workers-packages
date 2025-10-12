import memoizeOne from 'memoize-one'
import pFilter from 'p-filter'

export type AIEditorCommand = 'cursor' | 'code' | 'windsurf'

/**
 * Note: AmpCode has a 'amp' command, but it may or may not be installed
 * when users are using the VSCode extension.
 */
export type AIAssistantCommand = 'claude' | 'amp'
export type AIAssistant = AIEditorCommand | AIAssistantCommand

interface Editor {
	name: string
	command: AIEditorCommand
}

const editors = [
	{ name: 'Cursor', command: 'cursor' },
	{ name: 'Visual Studio Code', command: 'code' },
	{ name: 'Windsurf', command: 'windsurf' },
] as const satisfies Editor[]

export const getAvailableEditors = memoizeOne(async () => {
	const availableEditors = await pFilter(
		editors,
		async (editor) => Boolean(await which(editor.command, { nothrow: true })),
		{ concurrency: 10 }
	)
	return availableEditors.sort((a, b) => a.name.localeCompare(b.name))
})

export const claudeExists = memoizeOne(async (): Promise<boolean> => {
	return Boolean(await which('claude', { nothrow: true }))
})

export const ampExists = memoizeOne(async (): Promise<boolean> => {
	return Boolean(await which('amp', { nothrow: true }))
})
