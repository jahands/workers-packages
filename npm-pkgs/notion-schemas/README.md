# notion-schemas

Zod v4 schemas for Notion

## Disclaimer

This is NOT comprehensive and only includes the schemas I need and is quite opinionated.

**Use at your own risk.**

## Installation

```bash
npm install notion-schemas
```

## Usage

```ts
import { Client as NotionClient } from '@notionhq/client'
import { Notion } from 'notion-schemas'
import { z } from 'zod/v4'

export type MyNotes_Props = z.infer<typeof MyNotes_Props>
export type MyNotes_PartialProps = Notion.prop.PartialProps<MyNotes_Props>
export const MyNotes_Props = z.object({
  Related: Notion.prop.relation,
  Created: Notion.prop.created_time,
  Keep: Notion.prop.checkbox,
  Notes: Notion.prop.rich_text,
  Priority: Notion.prop.select,
  Date: Notion.prop.title
})

export type MyNotes = Notion.DataSource<typeof MyNotes_Props>
export const MyNotes = Notion.DataSource(MyNotes_Props)

const notion = new NotionClient()

const res = MyNotes.query.parse(
  await notion.dataSources.query({
    data_source_id: 'a6e71658-f7bc-4ba1-9a01-6ed35b079fa1'
  })
)

const page = MyNotes.page.parse(
  await notion.pages.retrieve({
    page_id: '0395f6ea58f44ef29fac0f4f5b30c523'
  })
)
```
