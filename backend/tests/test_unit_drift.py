"""@unit tests for the deterministic drift engine and the cheap filter.

Pure functions only; no I/O, no LLM, no store. These pin the numeric behaviour the
demo depends on: materiality cut-off, delta application, weights, band thresholds.
"""

import unittest

from tests.factories import make_baseline, make_owner, make_signal

from drift_config import HIGH_THRESHOLD, MATERIALITY_THRESHOLD, MEDIUM_THRESHOLD, WEIGHTS
from pipeline.drift_engine import (
    _owners_label,
    compute_drift,
    compute_live_profile,
    recommend_action,
)
from pipeline.step1_basic_filter import basic_filter
from pipeline.step3_analysis import _offline_narrative
from schemas import (
    Dimension,
    RecommendedAction,
    RiskBand,
    RiskRating,
    SignalKind,
    VolumeBand,
)


class BasicFilterTest(unittest.TestCase):
    def test_keeps_signal_at_exactly_the_threshold(self):
        kept = basic_filter([make_signal(confidence=MATERIALITY_THRESHOLD)])
        self.assertEqual(len(kept), 1)

    def test_drops_signal_just_below_threshold(self):
        kept = basic_filter([make_signal(confidence=MATERIALITY_THRESHOLD - 0.01)])
        self.assertEqual(kept, [])

    def test_dedups_by_kind_and_summary(self):
        a = make_signal(id="a", kind=SignalKind.domain_change, summary="same")
        b = make_signal(id="b", kind=SignalKind.domain_change, summary="same")
        c = make_signal(id="c", kind=SignalKind.ownership_change, summary="same")
        kept = basic_filter([a, b, c])
        self.assertEqual([s.id for s in kept], ["a", "c"])

    def test_preserves_input_order_of_survivors(self):
        a = make_signal(id="a", summary="one")
        b = make_signal(id="b", summary="two", kind=SignalKind.funding)
        self.assertEqual([s.id for s in basic_filter([a, b])], ["a", "b"])


class ComputeLiveProfileTest(unittest.TestCase):
    def test_applies_each_delta_kind(self):
        baseline = make_baseline()
        signals = [
            make_signal(raw={"business_model": "Crypto OTC desk"}),
            make_signal(raw={"domain": "acme-otc.io"}),
            make_signal(raw={"legal_form": "AG"}),
            make_signal(raw={"expected_volume_band": "high"}),
            make_signal(raw={"risk_rating": "HIGH"}),
            make_signal(raw={"add_owner": {"name": "Nordwind Ltd", "pct": 40, "screened": False}}),
        ]
        live = compute_live_profile(baseline, signals)
        self.assertEqual(live.business_model, "Crypto OTC desk")
        self.assertEqual(live.domain, "acme-otc.io")
        self.assertEqual(live.legal_form, "AG")
        self.assertEqual(live.expected_volume_band, VolumeBand.high)
        self.assertEqual(live.risk_rating, RiskRating.high)
        self.assertEqual(len(live.owners), 3)
        self.assertFalse(live.owners[-1].screened)

    def test_empty_raw_is_a_no_op(self):
        baseline = make_baseline()
        live = compute_live_profile(baseline, [make_signal(raw={})])
        self.assertEqual(live.business_model, baseline.business_model)
        self.assertEqual(len(live.owners), len(baseline.owners))

    def test_baseline_is_not_mutated(self):
        baseline = make_baseline()
        compute_live_profile(baseline, [make_signal(raw={"add_owner": {"name": "X", "pct": 1}})])
        self.assertEqual(len(baseline.owners), 2)


class ComputeDriftTest(unittest.TestCase):
    def test_aggregate_sums_changed_dimension_weights(self):
        baseline = make_baseline()
        signals = [make_signal(raw={"business_model": "Crypto OTC desk"})]
        live = compute_live_profile(baseline, signals)
        drift = compute_drift(baseline, live, signals)
        self.assertAlmostEqual(drift.aggregate, WEIGHTS[Dimension.business_model])
        self.assertEqual(drift.band, RiskBand.low)

    def test_band_high_at_threshold(self):
        # business_model + ownership + legal_form + risk_rating = 0.25+0.20+0.15+0.15 = 0.75
        baseline = make_baseline()
        signals = [
            make_signal(raw={"business_model": "Crypto OTC desk"}),
            make_signal(raw={"legal_form": "AG"}),
            make_signal(raw={"risk_rating": "HIGH"}),
            make_signal(raw={"add_owner": {"name": "New", "pct": 10}}),
        ]
        live = compute_live_profile(baseline, signals)
        drift = compute_drift(baseline, live, signals)
        self.assertGreaterEqual(drift.aggregate, HIGH_THRESHOLD)
        self.assertEqual(drift.band, RiskBand.high)

    def test_band_medium_between_thresholds(self):
        # legal_form + risk_rating = 0.15 + 0.15 = 0.30 is low; add business_model partial:
        # ownership (0.20) + risk_rating (0.15) = 0.35 -> medium.
        baseline = make_baseline()
        signals = [
            make_signal(raw={"add_owner": {"name": "New", "pct": 10}}),
            make_signal(raw={"risk_rating": "HIGH"}),
        ]
        live = compute_live_profile(baseline, signals)
        drift = compute_drift(baseline, live, signals)
        self.assertGreaterEqual(drift.aggregate, MEDIUM_THRESHOLD)
        self.assertLess(drift.aggregate, HIGH_THRESHOLD)
        self.assertEqual(drift.band, RiskBand.medium)

    def test_no_change_is_low_band_zero_aggregate(self):
        baseline = make_baseline()
        live = compute_live_profile(baseline, [make_signal(raw={})])
        drift = compute_drift(baseline, live, [make_signal(raw={})])
        self.assertEqual(drift.aggregate, 0.0)
        self.assertEqual(drift.band, RiskBand.low)
        self.assertEqual(drift.invalidated_assumptions, [])

    def test_per_dimension_has_all_six_with_binary_delta(self):
        baseline = make_baseline()
        signals = [make_signal(raw={"domain": "new.io"})]
        live = compute_live_profile(baseline, signals)
        drift = compute_drift(baseline, live, signals)
        self.assertEqual(len(drift.per_dimension), 6)
        domain_dim = next(d for d in drift.per_dimension if d.dimension == Dimension.domain)
        self.assertEqual(domain_dim.delta, 1.0)
        self.assertEqual(domain_dim.from_value, baseline.domain)
        self.assertEqual(domain_dim.to_value, "new.io")

    def test_invalidated_assumption_formatting(self):
        baseline = make_baseline()
        signals = [make_signal(raw={"business_model": "Crypto OTC desk"})]
        live = compute_live_profile(baseline, signals)
        drift = compute_drift(baseline, live, signals)
        self.assertEqual(
            drift.invalidated_assumptions,
            ["business model: B2B SaaS -> Crypto OTC desk"],
        )

    def test_confidence_is_mean_of_signal_confidences(self):
        baseline = make_baseline()
        signals = [make_signal(id="a", confidence=0.8), make_signal(id="b", confidence=0.6)]
        live = compute_live_profile(baseline, signals)
        drift = compute_drift(baseline, live, signals)
        self.assertAlmostEqual(drift.confidence, 0.7, places=3)

    def test_confidence_zero_when_no_signals(self):
        baseline = make_baseline()
        live = compute_live_profile(baseline, [])
        drift = compute_drift(baseline, live, [])
        self.assertEqual(drift.confidence, 0.0)

    def test_aggregate_capped_at_one(self):
        # Every dimension changes; weights sum to 1.0, so aggregate must be exactly 1.0.
        baseline = make_baseline()
        signals = [
            make_signal(raw={"business_model": "X"}),
            make_signal(raw={"legal_form": "AG"}),
            make_signal(raw={"domain": "x.io"}),
            make_signal(raw={"expected_volume_band": "high"}),
            make_signal(raw={"risk_rating": "HIGH"}),
            make_signal(raw={"add_owner": {"name": "New", "pct": 10}}),
        ]
        live = compute_live_profile(baseline, signals)
        drift = compute_drift(baseline, live, signals)
        self.assertEqual(drift.aggregate, 1.0)


class RecommendActionTest(unittest.TestCase):
    def _drift_with_band(self, band: RiskBand):
        baseline = make_baseline()
        live = compute_live_profile(baseline, [])
        drift = compute_drift(baseline, live, [])
        return drift.model_copy(update={"band": band})

    def test_high_recommends_re_kyc(self):
        self.assertEqual(recommend_action(self._drift_with_band(RiskBand.high)), RecommendedAction.re_kyc)

    def test_medium_recommends_edd(self):
        self.assertEqual(recommend_action(self._drift_with_band(RiskBand.medium)), RecommendedAction.edd)

    def test_low_recommends_no_change(self):
        self.assertEqual(recommend_action(self._drift_with_band(RiskBand.low)), RecommendedAction.no_change)


class HelpersTest(unittest.TestCase):
    def test_owners_label_without_unscreened(self):
        self.assertEqual(_owners_label([make_owner(screened=True)]), "1 owners")

    def test_owners_label_with_unscreened(self):
        owners = [make_owner("A", screened=True), make_owner("B", screened=False)]
        self.assertEqual(_owners_label(owners), "2 owners (1 unscreened)")

    def test_offline_narrative_confirmed_when_no_invalidations(self):
        baseline = make_baseline()
        drift = compute_drift(baseline, compute_live_profile(baseline, []), [])
        text = _offline_narrative(drift, RecommendedAction.no_change)
        self.assertIn("baseline is confirmed", text)

    def test_offline_narrative_mentions_changes_and_action(self):
        baseline = make_baseline()
        signals = [make_signal(raw={"business_model": "Crypto OTC desk"})]
        live = compute_live_profile(baseline, signals)
        drift = compute_drift(baseline, live, signals)
        text = _offline_narrative(drift, RecommendedAction.re_kyc)
        self.assertIn("Crypto OTC desk", text)
        self.assertIn("re-kyc", text)


if __name__ == "__main__":
    unittest.main()
