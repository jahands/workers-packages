---
'@jahands/otel-cf-workers': patch
'http-codex': patch
'@repo/tools': patch
---

Remove bun from dependencies to speed up pnpm install time

I originally added bun as a dep here for "correctness", but it made pnpm install time ~tripple. We already have bun in `.mise.toml`, which is good enough for me.
