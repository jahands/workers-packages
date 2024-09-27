set shell := ["zsh", "-c"]

[private]
@help:
  just --list --unsorted

# Build packages
[no-cd]
@build:
  turbo build

# Fix deps, lint, format, etc.
@fix:
  pnpm fix

# Run Vitest tests
@test *flags:
	pnpm vitest {{flags}}

# Update deps via syncpack
@update:
  pnpm syncpack update
  just -q changes && just fix || true


# Check for issues with deps/lint/types/format
[no-cd]
@check *flags:
  pnpm check:ci

# ========================= #
# ======== HELPERS ======== #
# ========================= #

# Update lockfile (if needed)
[private]
@update-lockfile:
  just -q deps-changed && pnpm i --child-concurrency=10 || true

# Check if any file has changed
[private]
@changes:
  test $(git status --porcelain | wc -l) -gt 0

# Check if package.json has changed
[private]
@deps-changed:
  git status --porcelain | grep -q 'package.json'
