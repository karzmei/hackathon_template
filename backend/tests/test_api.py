"""@smoke tests for the API route functions. Run offline.

Calls the route handlers directly (no live server) to assert response shapes and
the decision/audit flow.
"""

import asyncio
import unittest
from unittest.mock import patch

import store

_NO_KEYS = {"GOOGLE_API_KEY": "", "GEMINI_API_KEY": "", "AZURE_API_KEY": "", "PUBLICAI_API_KEY": ""}
from main import cost_today, decide, get_alert, list_alerts, run
from schemas import AlertStatus, DecisionRequest, RecommendedAction


class ApiSmokeTest(unittest.TestCase):
    def setUp(self):
        store.reset()
        with patch.dict("os.environ", _NO_KEYS):
            self.run_response = asyncio.run(run())

    def test_run_produces_two_alerts(self):
        self.assertEqual(len(self.run_response.alerts), 2)

    def test_queue_sorted_high_severity_first(self):
        rows = list_alerts()
        self.assertEqual(rows[0].client_name, "Helvetia SaaS GmbH")

    def test_get_alert_returns_full_case_file(self):
        alert = get_alert("alert-helvetia")
        self.assertEqual(alert.client_id, "helvetia")
        self.assertTrue(alert.signals)
        self.assertTrue(alert.drift_score.invalidated_assumptions)

    def test_decision_updates_status_and_audit(self):
        before = get_alert("alert-helvetia")
        updated = decide("alert-helvetia", DecisionRequest(action=RecommendedAction.re_kyc, actor="ari"))
        self.assertEqual(updated.status, AlertStatus.actioned)
        self.assertEqual(len(updated.audit), len(before.audit) + 1)

    def test_cost_today_aggregates(self):
        cost = cost_today()
        self.assertEqual(cost.alerts, 2)
        self.assertGreaterEqual(cost.usd, 0)


if __name__ == "__main__":
    unittest.main()
