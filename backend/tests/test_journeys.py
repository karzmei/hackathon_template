"""@integration tests that pin the user journeys in docs/USER_JOURNEYS.md.

Each test class maps to one journey (J2-J6) and asserts that journey's headline
outcome by calling the real route and pipeline functions (no mocks; the LLM steps
use the offline stub). The cockpit-only journey J1 and the mock-plane sanctions
case J3 are exercised on the frontend (frontend/app/page.test.tsx); the decision
branch J3 relies on is proven here against the live decision endpoint.

Keep this in lockstep with the doc: if a journey's claimed outcome changes, the
assertion here should change with it.
"""

import asyncio
import unittest

import store
from main import cost_today, decide, get_alert, list_alerts, run
from schemas import (
    AlertStatus,
    DecisionRequest,
    RecommendedAction,
    RiskBand,
)


class HelvetiaReKycJourneyTest(unittest.TestCase):
    """J2/J5: Helvetia reaches deep analysis and an analyst approves Re-KYC."""

    def setUp(self):
        store.reset()
        asyncio.run(run())
        self.alert = get_alert("alert-helvetia")

    def test_case_file_is_a_deep_high_band_re_kyc(self):
        self.assertEqual(self.alert.analysis_depth, 3)
        self.assertEqual(self.alert.drift_score.band, RiskBand.high)
        self.assertEqual(self.alert.recommended_action, RecommendedAction.re_kyc)
        self.assertEqual(self.alert.risk_band, "LOW -> HIGH")

    def test_baseline_vs_current_shows_the_pivot(self):
        self.assertEqual(self.alert.baseline.business_model, "B2B SaaS")
        self.assertEqual(self.alert.current.business_model, "Crypto OTC desk")
        self.assertEqual(len(self.alert.baseline.owners), 2)
        self.assertEqual(len(self.alert.current.owners), 3)
        self.assertTrue(any(not o.screened for o in self.alert.current.owners))

    def test_seven_invalidated_assumptions_each_cited(self):
        self.assertEqual(len(self.alert.drift_score.invalidated_assumptions), 7)
        # Every supporting signal carries a source and a confidence (the citations).
        self.assertTrue(self.alert.signals)
        for signal in self.alert.signals:
            self.assertTrue(signal.source)
            self.assertGreater(signal.confidence, 0)

    def test_deep_reasoning_cost_is_recorded(self):
        self.assertGreater(self.alert.cost.usd, 0)

    def test_approve_re_kyc_actions_and_audits(self):
        before = get_alert("alert-helvetia")
        updated = decide(
            "alert-helvetia",
            DecisionRequest(action=RecommendedAction.re_kyc, actor="a.meier"),
        )
        self.assertEqual(updated.status, AlertStatus.actioned)
        self.assertEqual(len(updated.audit), len(before.audit) + 1)
        self.assertEqual(updated.audit[-1].type, "decision")
        self.assertEqual(updated.audit[-1].actor, "a.meier")


class EscalateJourneyTest(unittest.TestCase):
    """J3: the escalation decision branch (Escalate to MLRO -> Escalated)."""

    def setUp(self):
        store.reset()
        asyncio.run(run())

    def test_escalate_sets_escalated_status(self):
        updated = decide(
            "alert-helvetia",
            DecisionRequest(action=RecommendedAction.escalate, actor="analyst"),
        )
        self.assertEqual(updated.status, AlertStatus.escalated)


class DismissJourneyTest(unittest.TestCase):
    """J4: the no-change cascade plus the dismissal decision branch."""

    def setUp(self):
        store.reset()
        asyncio.run(run())

    def test_lakeside_dies_at_step_one_with_zero_cost(self):
        alert = get_alert("alert-lakeside")
        self.assertEqual(alert.analysis_depth, 1)
        self.assertEqual(alert.cost.usd, 0.0)
        self.assertEqual(alert.recommended_action, RecommendedAction.no_change)
        self.assertEqual(alert.drift_score.aggregate, 0.0)

    def test_dismiss_sets_dismissed_status(self):
        updated = decide(
            "alert-lakeside",
            DecisionRequest(action=RecommendedAction.no_change, actor="analyst"),
        )
        self.assertEqual(updated.status, AlertStatus.dismissed)


class RunDemoJourneyTest(unittest.TestCase):
    """J5: the live "Run the pipeline" demo and the per-day cost meter."""

    def setUp(self):
        store.reset()
        self.response = asyncio.run(run())

    def test_run_produces_two_alerts_helvetia_first(self):
        self.assertGreaterEqual(len(self.response.alerts), 2)
        self.assertEqual(self.response.alerts[0].recommended_action.value, "re_kyc")

    def test_cost_today_aggregates_both_clients(self):
        today = cost_today()
        self.assertGreaterEqual(today.alerts, 2)
        self.assertGreater(today.usd, 0)


class AuditIntegrityJourneyTest(unittest.TestCase):
    """J6: recommend-never-act and append-only audit across a decision."""

    def setUp(self):
        store.reset()
        asyncio.run(run())

    def test_run_writes_a_system_created_event_per_alert(self):
        for alert in list_alerts():
            events = store.audit_for(alert.id)
            self.assertTrue(any(e.type == "created" and e.actor == "system" for e in events))

    def test_decision_only_appends_never_mutates_prior_events(self):
        before = list(store.audit_for("alert-helvetia"))
        decide(
            "alert-helvetia",
            DecisionRequest(action=RecommendedAction.re_kyc, actor="analyst"),
        )
        after = store.audit_for("alert-helvetia")
        # The prior events are unchanged and still present; the decision is appended.
        self.assertEqual(after[: len(before)], before)
        self.assertEqual(len(after), len(before) + 1)
        self.assertEqual(after[-1].type, "decision")


if __name__ == "__main__":
    unittest.main()
