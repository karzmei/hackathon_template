"""Send a 1-token chat request to candidate deployment names to see which are live.

Loads .env locally (the key never leaves your machine). Run from backend/:

    python scripts/probe_deployments.py gpt-4o-mini gpt-4o
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

from dotenv import load_dotenv

load_dotenv()

KEY = os.environ.get("AZURE_API_KEY", "")
BASE = os.environ.get("AZURE_API_BASE", "")
VERSION = os.environ.get("AZURE_API_VERSION", "2024-08-01-preview")
resource_root = BASE.split("/api/projects")[0].rstrip("/")

names = sys.argv[1:] or ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"]

for name in names:
    url = f"{resource_root}/openai/deployments/{name}/chat/completions?api-version={VERSION}"
    payload = json.dumps(
        {"messages": [{"role": "user", "content": "ping"}], "max_tokens": 1}
    ).encode()
    req = urllib.request.Request(
        url, data=payload, headers={"api-key": KEY, "Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(f"{name:16} LIVE  (HTTP {resp.status})")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")
        try:
            msg = json.loads(body)["error"]["message"]
        except Exception:  # noqa: BLE001
            msg = body[:160]
        print(f"{name:16} HTTP {exc.code}: {msg}")
    except Exception as exc:  # noqa: BLE001
        print(f"{name:16} ERROR: {exc}")
