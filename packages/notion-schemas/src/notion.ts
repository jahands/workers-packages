import { z } from 'zod/v4'

import * as prop from './props.js'

export { prop }

export const Page = <T extends z.ZodType>(properties: T) =>
	z.object({
		object: z.literal('page'),
		id: z.string(),
		created_time: z.string(),
		last_edited_time: z.string(),
		created_by: z.object({ object: z.string(), id: z.string() }),
		last_edited_by: z.object({ object: z.string(), id: z.string() }),
		cover: z.unknown().nullable(),
		icon: z.unknown().nullable(),
		// TODO: support other parent types
		parent: z.object({
			type: z.literal('data_source_id'),
			data_source_id: z.string(),
			database_id: z.string(),
		}),
		archived: z.boolean(),
		in_trash: z.boolean(),
		is_locked: z.boolean(),
		properties,
		url: z.string(),
		public_url: z.unknown().nullable(),
		request_id: z.string().optional().describe('not present in query results'),
	})

export const Query = <T extends z.ZodType>(properties: T) =>
	z.object({
		object: z.literal('list'),
		results: z.array(Page(properties).omit({ request_id: true })),
		next_cursor: z.string().nullable(),
		has_more: z.boolean(),
		type: z.string(),
		page_or_data_source: z.object({}),
		request_id: z.string(),
	})

export const DataSource = <T extends z.ZodType>(properties: T) => ({
	/** Response from notion.dataSources.retrieve() */
	data_source: z.object({
		object: z.literal('data_source'),
		id: z.string(),
		created_time: z.string(),
		last_edited_time: z.string(),
		created_by: z.object({ object: z.string(), id: z.string() }),
		last_edited_by: z.object({ object: z.string(), id: z.string() }),
	}),
	props: properties,
	page: Page(properties),
	query: Query(properties),
})

export type DataSource<T extends z.ZodType> = {
	data_source: z.infer<ReturnType<typeof DataSource<T>>['data_source']>
	properties: z.infer<T>
	page: z.infer<ReturnType<typeof DataSource<T>>['page']>
	query: z.infer<ReturnType<typeof DataSource<T>>['query']>
}
