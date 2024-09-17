export interface Answers {
	name: string
	uploadSecrets: 'yes' | 'no'
	useAuth: 'yes' | 'no'
	appsDir: 'examples'
	turbo: Turbo
}

export interface Turbo {
	paths: Paths
}

export interface Paths {
	cwd: string
	root: string
	workspace: string
}
