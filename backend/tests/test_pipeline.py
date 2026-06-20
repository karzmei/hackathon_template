"""@smoke tests for the cascade. Run offline (no Azure key needed).

These call the real pipeline functions, not mocks; the LLM steps use the explicit
offline stub so the chain is exercised end to end.
"""

import asyncio
import os
import unittest

import store

# Force offline mode so smoke tests never hit a real LLM endpoint.
os.environ.pop("GOOGLE_API_KEY", None)
os.environ.pop("GEMINI_API_KEY", None)
os.environ.pop("AZURE_API_KEY", None)
from data.seed import all_clients, baseline_for
from pipeline.orchestrator import run_pipeline
from schemas import RecommendedAction, RiskBand, RiskRating

HELVETIA = next(c for c in all_clients() if c.id == "helvetia")
LAKESIDE = next(c for c in all_clients() if c.id == "lakeside")


class HelvetiaDriftTest(unittest.TestCase):
    def setUp(self):
        store.reset()
        self.alert = asyncio.run(run_pipeline(HELVETIA))

    def test_reaches_deep_analysis(self):
        self.assertEqual(self.alert.analysis_depth, 3)

    def test_band_is_high_and_recommends_re_kyc(self):
        self.assertEqual(self.alert.drift_score.band, RiskBand.high)
        self.assertEqual(self.alert.recommended_action, RecommendedAction.re_kyc)

    def test_business_model_and_ownership_invalidated(self):
        joined = " | ".join(self.alert.drift_score.invalidated_assumptions)
        self.assertIn("business model", joined)
        self.assertIn("Crypto OTC desk", joined)
        self.assertEqual(len(self.alert.baseline.owners), 2)
        self.assertEqual(len(self.alert.current.owners), 3)

    def test_live_risk_escalates(self):
        self.assertEqual(self.alert.current.risk_rating, RiskRating.high)

    def test_cost_is_recorded(self):
        self.assertGreater(self.alert.cost.usd, 0)


class LakesideNoChangeTest(unittest.TestCase):
    def setUp(self):
        store.reset()
        self.alert = asyncio.run(run_pipeline(LAKESIDE))

    def test_dies_at_step_one_with_zero_cost(self):
        self.assertEqual(self.alert.analysis_depth, 1)
        self.assertEqual(self.alert.cost.usd, 0.0)

    def test_baseline_confirmed(self):
        self.assertEqual(self.alert.drift_score.aggregate, 0.0)
        self.assertEqual(self.alert.recommended_action, RecommendedAction.no_change)
        self.assertEqual(self.alert.baseline, baseline_for("lakeside"))


if __name__ == "__main__":
    unittest.main()
