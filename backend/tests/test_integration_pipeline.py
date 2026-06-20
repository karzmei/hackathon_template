"""@integration tests: the full cascade through real steps (offline LLM stub).

Real internal seams (sources, filters, drift engine, store, route helpers); only the
external Azure call is the offline stub. These pin the cross-stage invariants the
unit tests cannot see: cost summation across steps, audit emission, and queue order.
"""

import asyncio
import unittest

import store
from data.seed import (
    all_clients,
    baseline_for,
    helvetia_analytics_demo_client,
    helvetia_analytics_website_change_trigger,
    public_signals_for,
)

from main import cost_today, _sorted_rows
from pipeline.step1_basic_filter import basic_filter
from pipeline.step2_llm_filter import llm_reasoning_filter
from pipeline.step3_analysis import deep_analysis
from pipeline.orchestrator import run_pipeline
from schemas import AlertStatus, RecommendedAction, RiskBand

HELVETIA = next(c for c in all_clients() if c.id == "helvetia")
LAKESIDE = next(c for c in all_clients() if c.id == "lakeside")


class HelvetiaCascadeTest(unittest.TestCase):
    def setUp(self):
        store.reset()
        self.alert = asyncio.run(run_pipeline(HELVETIA))

    def test_reaches_depth_three(self):
        self.assertEqual(self.alert.analysis_depth, 3)
        self.assertEqual(self.alert.drift_score.band, RiskBand.high)
        self.assertEqual(self.alert.status, AlertStatus.needs_review)

    def test_total_cost_is_step2_plus_step3(self):
        baseline = baseline_for("helvetia")
        survivors = basic_filter(public_signals_for("helvetia"))
        kept, cost2 = asyncio.run(llm_reasoning_filter(survivors))
        _, _, _, _, cost3 = asyncio.run(deep_analysis(baseline, kept))
        self.assertEqual(self.alert.cost, cost2.add(cost3))
        self.assertGreater(self.alert.cost.usd, 0)

    def test_drift_has_six_dimensions(self):
        self.assertEqual(len(self.alert.drift_score.per_dimension), 6)

    def test_created_audit_event_is_recorded(self):
        events = store.audit_for("alert-helvetia")
        self.assertTrue(any(e.type == "created" and e.actor == "system" for e in events))


class LakesideControlTest(unittest.TestCase):
    def setUp(self):
        store.reset()
        self.alert = asyncio.run(run_pipeline(LAKESIDE))

    def test_dies_at_step_one_zero_cost(self):
        self.assertEqual(self.alert.analysis_depth, 1)
        self.assertEqual(self.alert.cost.usd, 0.0)
        self.assertEqual(self.alert.status, AlertStatus.new)

    def test_baseline_confirmed(self):
        self.assertEqual(self.alert.drift_score.aggregate, 0.0)
        self.assertEqual(self.alert.recommended_action, RecommendedAction.no_change)


class HelvetiaAnalyticsWebsiteChangeTest(unittest.TestCase):
    def test_material_website_change_reaches_review(self):
        client = helvetia_analytics_demo_client()
        trigger = helvetia_analytics_website_change_trigger()
        signals = public_signals_for(client.id)

        self.assertEqual(trigger.client_id, client.id)
        self.assertEqual(basic_filter(signals), signals)

        store.reset()
        alert = asyncio.run(run_pipeline(client))

        self.assertEqual(alert.analysis_depth, 3)
        self.assertIn(alert.recommended_action, {RecommendedAction.edd, RecommendedAction.re_kyc})
        self.assertIn("crypto OTC", alert.current.business_model)
        self.assertIn("business model", " | ".join(alert.drift_score.invalidated_assumptions))


class QueueOrderingTest(unittest.TestCase):
    def setUp(self):
        store.reset()
        for client in all_clients():
            asyncio.run(run_pipeline(client))

    def test_high_severity_sorts_first(self):
        rows = _sorted_rows()
        self.assertEqual(rows[0].client_name, "Helvetia SaaS GmbH")
        self.assertEqual(rows[-1].client_name, "Lakeside Trading AG")

    def test_cost_today_aggregates_both_clients(self):
        today = cost_today()
        self.assertEqual(today.alerts, 2)
        self.assertGreater(today.usd, 0)


if __name__ == "__main__":
    unittest.main()
