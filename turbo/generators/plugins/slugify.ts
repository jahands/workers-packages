import slugify from 'slugify'

export function slugifyText(text: string) {
	const options = {
		lower: true,
		remove: /['.]/g,
	}

	const slug = slugify(text, options)
	return slug
}
