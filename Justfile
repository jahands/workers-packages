# This Justfile isn't strictly necessary, but it's
# a convenient way to run commands in the repo
# without needing to remember all commands.

[private]
@help:
  just --list

# Aliases
alias new-pkg := new-package
alias new-worker := gen
alias up := update
alias i := install
alias dagx := daggerx

# =============================== #
#         DEV COMMANDS            #
# =============================== #

# Install dependencies
[group('1. dev')]
install:
  pnpm install --child-concurrency=10

# Check for issues with deps, lint, types, format, etc.
[group('1. dev')]
[no-cd]
check *flags:
  bun runx check {{flags}}

# Fix issues with deps, lint, format, etc.
[group('1. dev')]
[no-cd]
fix *flags:
  bun runx fix {{flags}}

[group('1. dev')]
[no-cd]
test *flags:
  bun vitest {{flags}}

[group('1. dev')]
[no-cd]
build *flags:
  bun turbo build {{flags}}


[group('1. dev')]
dagger-test *flags:
  #!/bin/bash
  set -euo pipefail
  SECRETS='op://xxcrgwtyu2wmeh2jdcnee2eqda/dzxntwosd46ykwyz7qjdijfr2m'
  export DAGGER_CLOUD_TOKEN="$SECRETS/DAGGER_CLOUD_TOKEN"
  op run --no-masking -- dagger call test \
    --TURBO_TOKEN="$SECRETS/TURBO_TOKEN" \
    --TURBO_REMOTE_CACHE_SIGNATURE_KEY="$SECRETS/TURBO_REMOTE_CACHE_SIGNATURE_KEY" \
    {{flags}}

# Helpers for managing dagger modules
[group('1. dev')]
[no-cd]
daggerx *flags:
  @bun runx daggerx {{flags}}

# =============================== #
#       LOCAL DEV COMMANDS        #
# =============================== #

# Run dev script. Runs turbo dev if not in a specific project directory.
[group('2. local dev')]
[no-cd]
dev *flags:
  bun runx dev {{flags}}

# Run Workers in preview mode (if available)
[group('2. local dev')]
[no-cd]
preview:
  bun run preview

# Deploy Workers
[group('2. local dev')]
[no-cd]
deploy *flags:
  bun turbo deploy {{flags}}

# =============================== #
#       GENERATOR COMMANDS        #
# =============================== #

# Create changeset
[group('3. generator')]
cs:
  bun run-changeset-new

[group('3. generator')]
gen *flags:
  bun run-turbo-gen {{flags}}

[group('3. generator')]
new-package *flags:
  bun run-turbo-gen new-package {{flags}}

# =============================== #
#        UTILITY COMMANDS         #
# =============================== #

# CLI in packages/tools for updating deps, pnpm, etc.
[group('4. utility')]
update *flags:
  bun runx update {{flags}}

# CLI in packages/tools for running commands in the repo.
[group('4. utility')]
runx *flags:
  bun runx {{flags}}
