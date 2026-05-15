---
'workers-tagged-logger': patch
'@jahands/cli-tools': patch
'@jahands/dagger-helpers': patch
'dagger-env': patch
'http-codex': patch
'llm-tools': patch
'notion-schemas': patch
'opencode-plugin-cloudflare': patch
'yaplib': patch
---

fix: embed sourcesContent in published .js.map files

Enable `inlineSources` in the shared lib-emit tsconfig so that published
source maps embed source content rather than referencing `../src/*.ts`
files that aren't included in the npm tarball. Resolves bundler warnings
(e.g. Vite) when consuming these packages.
