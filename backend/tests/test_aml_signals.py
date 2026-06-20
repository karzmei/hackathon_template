"""@integration tests for the AML seed signals and their drift impact.

The post-transaction surface is the analyst's core review surface, so the seed
carries PEP, high-risk-jurisdiction, suspicious-activity, and adverse-media
signals on Helvetia. These tests call the real drift engine, not mocks, and assert
both signal presence and the risk/jurisdiction deltas the signals imply. They stay
robust to in-flight scoring tweaks by asserting on risk_rating/jurisdiction rather
than the exact aggregate number.
"""

import unittest

from data.seed import baseline_for, public_signals_for
from drift_config import MATERIALITY_THRESHOLD
from pipeline.drift_engine import compute_drift, compute_live_profile
from schemas import RiskRating, SignalKind

PROBE_URL = "/sources/helvetia-probe.html"


class HelvetiaAmlSignalsPresentTest(unittest.TestCase):
    def setUp(self):
        self.signals = public_signals_for("helvetia")
        self.by_id = {s.id: s for s in self.signals}

    def test_new_aml_signals_present_by_id_and_kind(self):
        expected = {
            "hv-5": SignalKind.pep_hit,
            "hv-6": SignalKind.high_risk_jurisdiction,
            "hv-7": SignalKind.suspicious_activity,
            "hv-8": SignalKind.adverse_media,
        }
        for sid, kind in expected.items():
            self.assertIn(sid, self.by_id, f"missing seed signal {sid}")
            self.assertEqual(self.by_id[sid].kind, kind)

    def test_original_signals_are_preserved(self):
        for sid in ("hv-1", "hv-2", "hv-3", "hv-4"):
            self.assertIn(sid, self.by_id)

    def test_fake_article_evidence_url_is_the_served_path(self):
        article = self.by_id["hv-8"]
        self.assertEqual(article.kind, SignalKind.adverse_media)
        self.assertEqual(article.evidence_url, PROBE_URL)


class AmlSignalsRaiseRiskTest(unittest.TestCase):
    """Feed only the AML signals through the real engine; risk must escalate."""

    def setUp(self):
        self.baseline = baseline_for("helvetia")
        by_id = {s.id: s for s in public_signals_for("helvetia")}
        self.aml = [by_id["hv-5"], by_id["hv-6"], by_id["hv-7"], by_id["hv-8"]]

    def test_live_risk_rating_escalates_to_high(self):
        self.assertEqual(self.baseline.risk_rating, RiskRating.low)
        live = compute_live_profile(self.baseline, self.aml)
        self.assertEqual(live.risk_rating, RiskRating.high)

    def test_high_risk_jurisdiction_signal_carries_jurisdiction_delta(self):
        # The jurisdiction delta lives on the signal even if the engine has not yet
        # wired the dimension; assert the seed carries it so scoring can consume it.
        juris = next(s for s in self.aml if s.kind == SignalKind.high_risk_jurisdiction)
        self.assertEqual(juris.raw.get("jurisdiction"), "KY (high risk)")
        self.assertNotEqual(juris.raw["jurisdiction"], self.baseline.jurisdiction)

    def test_drift_flags_risk_rating_as_invalidated(self):
        live = compute_live_profile(self.baseline, self.aml)
        drift = compute_drift(self.baseline, live, self.aml)
        joined = " | ".join(drift.invalidated_assumptions)
        self.assertIn("risk rating", joined)
        self.assertGreater(drift.aggregate, 0.0)


class LakesideStaysImmaterialTest(unittest.TestCase):
    def test_only_signal_is_below_materiality_threshold(self):
        signals = public_signals_for("lakeside")
        self.assertEqual(len(signals), 1)
        self.assertLess(signals[0].confidence, MATERIALITY_THRESHOLD)


if __name__ == "__main__":
    unittest.main()
