"""Snapshot test for the Helvetia case file (mirrors inc-b2c *.demo / toMatchSnapshot).

Locks the full assembled alert so an accidental change to a shape, a weight, or the
wiring is caught. Volatile timestamps are normalized so the snapshot is stable. The
golden file is bootstrapped on first run and committed; afterwards it must match.
"""

import asyncio
import json
import unittest
from pathlib import Path
from unittest.mock import patch

import store
from data.seed import all_clients
from pipeline.orchestrator import run_pipeline

_NO_KEYS = {"GOOGLE_API_KEY": "", "GEMINI_API_KEY": "", "AZURE_API_KEY": "", "PUBLICAI_API_KEY": ""}

HELVETIA = next(c for c in all_clients() if c.id == "helvetia")
GOLDEN = Path(__file__).parent / "golden" / "helvetia_alert.json"
_VOLATILE = {"created_at", "at", "decided_at"}
_PLACEHOLDER = "<normalized>"


def _normalize(value):
    if isinstance(value, dict):
        return {k: (_PLACEHOLDER if k in _VOLATILE else _normalize(v)) for k, v in value.items()}
    if isinstance(value, list):
        return [_normalize(v) for v in value]
    return value


class HelvetiaSnapshotTest(unittest.TestCase):
    def test_alert_matches_golden(self):
        store.reset()
        with patch.dict("os.environ", _NO_KEYS):
            alert = asyncio.run(run_pipeline(HELVETIA))
        snapshot = _normalize(alert.model_dump(mode="json", by_alias=True))

        if not GOLDEN.exists():
            GOLDEN.parent.mkdir(parents=True, exist_ok=True)
            GOLDEN.write_text(json.dumps(snapshot, indent=2, sort_keys=True), encoding="utf-8")

        expected = json.loads(GOLDEN.read_text(encoding="utf-8"))
        self.assertEqual(
            snapshot,
            expected,
            "Helvetia alert drifted from the golden snapshot; review and update "
            "tests/golden/helvetia_alert.json if the change is intended.",
        )


if __name__ == "__main__":
    unittest.main()
