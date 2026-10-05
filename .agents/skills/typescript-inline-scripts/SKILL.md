---
name: typescript-inline-scripts
description: Guide for running inline TypeScript scripts with Bun. This should be used when the user says "use inline typescript"
---

Run inline scripts with Bun; `--install=fallback` installs imported npm packages automatically. Prefer Bun APIs (`Bun.file`, `Bun.write`, `$` from `bun`) over Node equivalents.

```bash
bun run --install=fallback - < <(cat <<'EOF'
import * as z from 'zod'
console.log(z.coerce.number().parse('5'))
EOF
)
```
