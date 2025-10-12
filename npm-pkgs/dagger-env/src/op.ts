import { z } from 'zod/v4'

/**
 * 1Password vault information
 */
export type OPVault = z.infer<typeof OPVault>
export const OPVault = z.object({
	id: z.string(),
	name: z.string(),
})

/**
 * 1Password item section information
 */
export type OPSection = z.infer<typeof OPSection>
export const OPSection = z.object({
	id: z.string(),
	label: z.string().optional(),
})

/**
 * 1Password item field
 */
export type OPField = z.infer<typeof OPField>
export const OPField = z.object({
	id: z.string(),
	section: OPSection.optional(),
	type: z.enum(['STRING', 'CONCEALED', 'MONTH_YEAR']),
	purpose: z.enum(['NOTES']).optional(),
	label: z.string(),
	value: z.string(),
	reference: z.string(),
})

/**
 * 1Password item category
 */
export type OPCategory = z.infer<typeof OPCategory>
export const OPCategory = z.enum(['SECURE_NOTE'])

/**
 * Complete 1Password item structure
 */
export type OPItem = z.infer<typeof OPItem>
export const OPItem = z.object({
	id: z.string(),
	title: z.string(),
	favorite: z.boolean(),
	version: z.int(),
	vault: OPVault,
	category: OPCategory,
	last_edited_by: z.string(),
	created_at: z.iso.datetime(),
	updated_at: z.iso.datetime(),
	additional_information: z.string(),
	sections: z.array(OPSection),
	fields: z.array(OPField),
})
