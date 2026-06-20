"""Discover which Azure OpenAI deployments/models the configured key can reach.

Loads .env locally (the key never leaves your machine), then probes the
Azure data-plane and AI Foundry endpoints. Run from backend/:

    python scripts/list_models.py
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

from dotenv import load_dotenv

load_dotenv()

KEY = os.environ.get("AZURE_API_KEY", "")
BASE = os.environ.get("AZURE_API_BASE", "")
VERSION = os.environ.get("AZURE_API_VERSION", "2024-08-01-preview")

if not KEY or not BASE:
    raise SystemExit("AZURE_API_KEY / AZURE_API_BASE missing from .env")

# Resource root = everything before the /api/projects/... Foundry path.
resource_root = BASE.split("/api/projects")[0].rstrip("/")


def get(url: str) -> tuple[int, str]:
    req = urllib.request.Request(url, headers={"api-key": KEY})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", "replace")
    except Exception as exc:  # noqa: BLE001 - diagnostic script
        return 0, str(exc)


candidates = [
    f"{resource_root}/openai/deployments?api-version={VERSION}",
    f"{resource_root}/openai/models?api-version={VERSION}",
    f"{BASE.rstrip('/')}/deployments?api-version={VERSION}",
    f"{BASE.rstrip('/')}/models?api-version={VERSION}",
]

for url in candidates:
    status, body = get(url)
    print(f"\n=== {url}\nHTTP {status}")
    try:
        parsed = json.loads(body)
        names = [d.get("id") or d.get("name") for d in parsed.get("data", [])]
        print("models/deployments:", [n for n in names if n] or parsed)
    except json.JSONDecodeError:
        print(body[:800])
