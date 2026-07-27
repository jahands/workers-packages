import memoizeOne from 'memoize-one'
import pFilter from 'p-filter'

export type AIEditorCommand = 'cursor' | 'code' | 'windsurf'

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
