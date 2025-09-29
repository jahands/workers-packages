import { z } from 'zod/v4'

type DeepPartial<T> = T extends object
	? {
			[P in keyof T]?: DeepPartial<T[P]>
		}
	: T

export type PartialProps<T> = Partial<{
	[K in keyof T]: DeepPartial<T[K]>
}>

/** Union of all property types */
export type Prop = status | date | relation | title | created_time | rich_text | checkbox | select

export type status = z.infer<typeof status>
export const status = z.object({
	id: z.string(),
	type: z.literal('status'),
	status: z.object({
		id: z.string(),
		name: z.string(),
		color: z.string(),
	}),
})

export type date = z.infer<typeof date>
export const date = z.object({
	id: z.string(),
	type: z.literal('date'),
	date: z.object({
		start: z.string(),
		end: z.string().nullable(),
		time_zone: z.string().nullable(),
	}),
})

export type relation = z.infer<typeof relation>
export const relation = z.object({
	id: z.string(),
	type: z.literal('relation'),
	relation: z.array(z.object({ id: z.string() })),
	has_more: z.boolean(),
})

export type title = z.infer<typeof title>
export const title = z.object({
	id: z.string(),
	type: z.literal('title'),
	title: z.array(
		z.object({
			type: z.literal('text'),
			text: z.object({ content: z.string(), link: z.unknown().nullable() }),
			annotations: z.object({
				bold: z.boolean(),
				italic: z.boolean(),
				strikethrough: z.boolean(),
				underline: z.boolean(),
				code: z.boolean(),
				color: z.string(),
			}),
			plain_text: z.string(),
			href: z.unknown().nullable(),
		})
	),
})

export type created_time = z.infer<typeof created_time>
export const created_time = z.object({
	id: z.string(),
	type: z.literal('created_time'),
	created_time: z.string(),
})

export type rich_text = z.infer<typeof rich_text>
export const rich_text = z.object({
	id: z.string(),
	type: z.literal('rich_text'),
	rich_text: z.array(
		z.object({
			type: z.string(),
			text: z.object({ content: z.string(), link: z.unknown().nullable() }),
			annotations: z.object({
				bold: z.boolean(),
				italic: z.boolean(),
				strikethrough: z.boolean(),
				underline: z.boolean(),
				code: z.boolean(),
				color: z.string(),
			}),
			plain_text: z.string(),
			href: z.unknown().nullable(),
		})
	),
})

export type checkbox = z.infer<typeof checkbox>
export const checkbox = z.object({
	id: z.string(),
	type: z.literal('checkbox'),
	checkbox: z.boolean(),
})

export type select = z.infer<typeof select>
export const select = z.object({
	id: z.string(),
	type: z.literal('select'),
	select: z.object({
		id: z.string(),
		name: z.string(),
		color: z.string(),
	}),
})
