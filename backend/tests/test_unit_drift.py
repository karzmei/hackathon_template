"""@unit tests for the deterministic drift engine and the cheap filter.

Pure functions only; no I/O, no LLM, no store. These pin the numeric behaviour the
demo depends on: materiality cut-off, delta application, severities, L2
aggregation, band thresholds.
"""

import unittest

from tests.factories import make_baseline, make_owner, make_signal

from data.seed import baseline_for, public_signals_for
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
            make_signal(raw={"jurisdiction": "RU (high risk)"}),
            make_signal(raw={"expected_volume_band": "high"}),
            make_signal(raw={"risk_rating": "HIGH"}),
            make_signal(raw={"add_owner": {"name": "Nordwind Ltd", "pct": 40, "screened": False}}),
        ]
        live = compute_live_profile(baseline, signals)
        self.assertEqual(live.business_model, "Crypto OTC desk")
        self.assertEqual(live.domain, "acme-otc.io")
        self.assertEqual(live.legal_form, "AG")
        self.assertEqual(live.jurisdiction, "RU (high risk)")
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
    def test_single_change_contribution_is_severity_times_confidence(self):
        # One changed dimension contributes severity * signal_confidence; with a single
        # contribution the L2 norm equals that contribution.
        baseline = make_baseline()
        signals = [make_signal(confidence=0.8, raw={"business_model": "Crypto OTC desk"})]
        live = compute_live_profile(baseline, signals)
        drift = compute_drift(baseline, live, signals)
        self.assertAlmostEqual(drift.aggregate, WEIGHTS[Dimension.business_model] * 0.8, places=4)

    def test_one_big_risk_beats_many_small_ones(self):
        # L2 / biggest-risk behaviour: a single severity-1.0 full-confidence change scores
        # HIGHER than several severity~0.4 changes whose naive additive sum would be larger.
        baseline = make_baseline()

        big_signals = [make_signal(confidence=1.0, raw={"risk_rating": "HIGH"})]
        big = compute_drift(baseline, compute_live_profile(baseline, big_signals), big_signals)

        # domain (0.4) + expected_volume (0.4) -> additive sum 0.8 > 1.0? no; build three
        # low-severity changes so the naive sum (1.2) exceeds the single big one (1.0).
        small_signals = [
            make_signal(confidence=1.0, raw={"domain": "new.io"}),
            make_signal(confidence=1.0, raw={"expected_volume_band": "high"}),
            make_signal(confidence=1.0, raw={"legal_form": "AG"}),
        ]
        small = compute_drift(baseline, compute_live_profile(baseline, small_signals), small_signals)

        naive_sum_small = WEIGHTS[Dimension.domain] + WEIGHTS[Dimension.expected_volume] + WEIGHTS[Dimension.legal_form]
        self.assertGreater(naive_sum_small, big.aggregate)  # additive would rank small higher
        self.assertGreater(big.aggregate, small.aggregate)  # L2 ranks the single big risk higher

    def test_max_severity_full_confidence_dominates_to_high(self):
        # A single max-severity (risk_rating 1.0) full-confidence change pushes a high aggregate.
        baseline = make_baseline()
        signals = [make_signal(confidence=1.0, raw={"risk_rating": "HIGH"})]
        live = compute_live_profile(baseline, signals)
        drift = compute_drift(baseline, live, signals)
        self.assertAlmostEqual(drift.aggregate, 1.0, places=4)
        self.assertGreaterEqual(drift.aggregate, HIGH_THRESHOLD)
        self.assertEqual(drift.band, RiskBand.high)

    def test_single_low_severity_modest_change_is_low(self):
        # Only domain (severity 0.4) at modest confidence stays LOW.
        baseline = make_baseline()
        signals = [make_signal(confidence=0.6, raw={"domain": "new.io"})]
        live = compute_live_profile(baseline, signals)
        drift = compute_drift(baseline, live, signals)
        self.assertLess(drift.aggregate, MEDIUM_THRESHOLD)
        self.assertEqual(drift.band, RiskBand.low)

    def test_jurisdiction_change_flows_through_and_contributes(self):
        # A jurisdiction raw delta moves the live profile and lifts the score.
        baseline = make_baseline()
        signals = [make_signal(confidence=1.0, raw={"jurisdiction": "RU (high risk)"})]
        live = compute_live_profile(baseline, signals)
        self.assertEqual(live.jurisdiction, "RU (high risk)")
        drift = compute_drift(baseline, live, signals)
        jur = next(d for d in drift.per_dimension if d.dimension == Dimension.jurisdiction)
        self.assertEqual(jur.delta, 1.0)
        self.assertEqual(jur.weight, WEIGHTS[Dimension.jurisdiction])
        self.assertAlmostEqual(drift.aggregate, WEIGHTS[Dimension.jurisdiction], places=4)

    def test_no_change_is_low_band_zero_aggregate(self):
        baseline = make_baseline()
        live = compute_live_profile(baseline, [make_signal(raw={})])
        drift = compute_drift(baseline, live, [make_signal(raw={})])
        self.assertEqual(drift.aggregate, 0.0)
        self.assertEqual(drift.band, RiskBand.low)
        self.assertEqual(drift.invalidated_assumptions, [])

    def test_per_dimension_has_all_seven_with_confidence_delta(self):
        # The changed dimension's delta is the signal confidence; unchanged ones are 0.0.
        baseline = make_baseline()
        signals = [make_signal(confidence=0.8, raw={"domain": "new.io"})]
        live = compute_live_profile(baseline, signals)
        drift = compute_drift(baseline, live, signals)
        self.assertEqual(len(drift.per_dimension), 7)
        domain_dim = next(d for d in drift.per_dimension if d.dimension == Dimension.domain)
        self.assertEqual(domain_dim.delta, 0.8)
        self.assertEqual(domain_dim.from_value, baseline.domain)
        self.assertEqual(domain_dim.to_value, "new.io")

    def test_dimension_delta_takes_max_confidence_of_its_signals(self):
        # Two signals touch the same dimension; the higher confidence wins the delta.
        baseline = make_baseline()
        signals = [
            make_signal(id="weak", confidence=0.4, raw={"business_model": "Crypto OTC desk"}),
            make_signal(id="strong", confidence=0.9, raw={"business_model": "Crypto OTC desk"}),
        ]
        live = compute_live_profile(baseline, signals)
        drift = compute_drift(baseline, live, signals)
        bm = next(d for d in drift.per_dimension if d.dimension == Dimension.business_model)
        self.assertEqual(bm.delta, 0.9)

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

    def test_aggregate_caps_at_one_at_full_confidence(self):
        # Every dimension changes at full confidence; the L2 norm exceeds 1.0 and is capped.
        baseline = make_baseline()
        signals = [
            make_signal(confidence=1.0, raw={"business_model": "X"}),
            make_signal(confidence=1.0, raw={"legal_form": "AG"}),
            make_signal(confidence=1.0, raw={"jurisdiction": "RU (high risk)"}),
            make_signal(confidence=1.0, raw={"domain": "x.io"}),
            make_signal(confidence=1.0, raw={"expected_volume_band": "high"}),
            make_signal(confidence=1.0, raw={"risk_rating": "HIGH"}),
            make_signal(confidence=1.0, raw={"add_owner": {"name": "New", "pct": 10}}),
        ]
        live = compute_live_profile(baseline, signals)
        drift = compute_drift(baseline, live, signals)
        self.assertEqual(drift.aggregate, 1.0)

    def test_helvetia_seed_computes_to_high(self):
        # Demo invariant: the real Helvetia baseline + signals must land in band HIGH.
        baseline = baseline_for("helvetia")
        signals = public_signals_for("helvetia")
        live = compute_live_profile(baseline, signals)
        drift = compute_drift(baseline, live, signals)
        self.assertEqual(drift.band, RiskBand.high)
        self.assertGreaterEqual(drift.aggregate, HIGH_THRESHOLD)


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
