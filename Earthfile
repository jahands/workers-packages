VERSION --raw-output --build-auto-skip 0.8
PROJECT jahands/docker

prepare-workspace:
	FROM --platform=linux/amd64 node:22-bookworm-slim
	WORKDIR /work
	RUN apt-get update \
		&& apt-get install -y curl jq git unzip \
		&& rm -rf /var/lib/apt/lists/*
	RUN curl -fsSL https://sh.uuid.rocks/install/mise | bash
	ENV PATH="$HOME/.local/share/mise/shims:$HOME/.local/bin:$PATH"
	COPY .mise.toml .
	RUN mise install --yes && mise reshim

setup-project:
	FROM +prepare-workspace
	COPY --dir \
		examples \
		packages \
		.

	COPY \
		.earthlyignore \
		.eslintrc.cjs \
		.gitignore \
		.npmrc \
		.prettierignore \
		.prettierrc.cjs \
		.syncpackrc.cjs \
		package.json \
		pnpm-lock.yaml \
		pnpm-workspace.yaml \
		tsconfig.json \
		turbo.json \
		vitest.workspace.ts \
		.

install-deps:
	FROM +setup-project
	CACHE /pnpm-store
	RUN pnpm config set store-dir /pnpm-store
	RUN pnpm install --frozen-lockfile --child-concurrency=10

test:
	FROM +install-deps
	LET TURBO_TEAM=team_jahands
	LET FORCE_COLOR=1
	LET DO_NOT_TRACK=1
	ARG GITHUB_ACTIONS
	RUN --raw-output \
		--secret TURBO_TOKEN \
		--secret TURBO_API \
		--secret TURBO_REMOTE_CACHE_SIGNATURE_KEY \
		pnpm turbo check:ci

build:
	FROM +install-deps
	LET TURBO_TEAM=team_jahands
	LET FORCE_COLOR=1
	LET DO_NOT_TRACK=1
	ARG GITHUB_ACTIONS
	RUN	--raw-output --secret TURBO_TOKEN \
		--secret TURBO_TOKEN \
		--secret TURBO_API \
		--secret TURBO_REMOTE_CACHE_SIGNATURE_KEY \
		pnpm turbo build

# ==================== #
# ======= all ======== #
# ==================== #
test-and-build:
	BUILD +test
	BUILD +build-workers