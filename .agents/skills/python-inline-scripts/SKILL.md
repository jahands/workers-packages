---
name: python-inline-scripts
description: Guide for running inline Python scripts with uv. This should be used when the user says "use inline python"
---

## Python Inline Scripts with uv

- List only PyPI packages in `dependencies`. Stdlib modules (`json`, `os`, `re`) are not on PyPI, so uv fails to resolve the script.
- Target Python 3.12+.

### Example

```bash
uv run --no-project -q --script - < <(cat <<'EOF'
# /// script
# # omit dependencies when the script only uses the stdlib
# dependencies = [
#   "httpx"
# ]
# requires-python = ">=3.12"
# ///

import httpx
print(httpx.get("https://api.github.com/zen").text)
EOF
)
```
