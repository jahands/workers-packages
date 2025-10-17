// @ts-check

const codeImports = [
	// Groups
	'<BUILTIN_MODULES>',
	'<THIRD_PARTY_MODULES>',
	'',
	'^(@repo)(\/.*)$', // Workspace imports
	'',
	// aliases
	'^~\/', // ~/
	'^@\/', // @/
	'',
	// Local (relative) imports
	'^[.]{2}$', // ..
	'^[.]{2}\/', // ../
	'^[.]\/(?!index)', // ./foo (but not ./index)
	'^[.]$', // .
	'^[.]/index$', // ./index
	'',
]

// Type imports are ordered the same way, but without separators.
// We also need a catch-all <TYPES> here to prevent prettier from failing.
const typeImports = ['<TYPES>'].concat(
	codeImports.filter((i) => i !== '').map((i) => `<TYPES>${i}`)
)

/** @type {import("prettier").Config} */
const config = {
	trailingComma: 'es5',
	tabWidth: 2,
	useTabs: true,
	semi: false,
	singleQuote: true,
	printWidth: 100,
	plugins: [
		'@ianvs/prettier-plugin-sort-imports',
		'prettier-plugin-packagejson',
		'@babel/plugin-proposal-explicit-resource-management',
	],
	importOrder: [...codeImports, ...typeImports],
	importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
	importOrderTypeScriptVersion: '5.8.2',
	overrides: [
		{
			files: ['*.jsonc', '*.code-workspace'],
			options: {
				trailingComma: 'none',
			},
		},
		{
			files: 'Justfile',
			options: {
				useTabs: false,
			},
		},
		{
			files: '*.md',
			options: {
				useTabs: false,
			},
		},
	],
}

module.exports = config
