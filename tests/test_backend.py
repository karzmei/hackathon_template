import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException

from backend.main import analyze_text, health
from backend.schemas import AnalyzeRequest


class BackendSmokeTest(unittest.TestCase):
    def test_health_returns_ok(self):
        self.assertEqual(health(), {"status": "ok"})

    def test_analyze_reports_missing_openrouter_key(self):
        request = AnalyzeRequest(text="messy notes", output_type="summary", tone="neutral")

        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(HTTPException) as ctx:
                analyze_text(request)

        self.assertEqual(ctx.exception.status_code, 500)
        self.assertEqual(ctx.exception.detail, "OPENROUTER_API_KEY is not set")


if __name__ == "__main__":
    unittest.main()
