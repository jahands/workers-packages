import { expect, test } from 'vitest'
import { z } from 'zod/v4'

import { Notion } from '..'

export type MyNotes_PartialProps = Notion.prop.PartialProps<MyNotes_Props>
export type MyNotes_Props = z.infer<typeof MyNotes_Props>
export const MyNotes_Props = z.object({
	Related: Notion.prop.relation,
	Created: Notion.prop.created_time,
	Keep: Notion.prop.checkbox,
	Notes: Notion.prop.rich_text,
	Priority: Notion.prop.select,
	Date: Notion.prop.title,
	Age: Notion.prop.number,
})

export type MyNotes = Notion.DataSource<typeof MyNotes_Props>
export const MyNotes = Notion.DataSource(MyNotes_Props)

test('schemas', () => {
	expect(Notion).toBeDefined()

	// TODO: Add tests
})
