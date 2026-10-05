---
name: python-inline-scripts
description: Guide for running inline Python scripts with uv. This should be used when the user says "use inline python"
---

Run inline scripts with uv, declaring dependencies in the script metadata. List only PyPI packages: stdlib modules (`json`, `os`, `re`) aren't on PyPI, so listing them makes uv fail to resolve the script. Target Python 3.12+.

```bash
uv run --no-project -q --script - < <(cat <<'EOF'
# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx"]
# ///
import httpx
print(httpx.get("https://api.github.com/zen").text)
EOF
)
```
