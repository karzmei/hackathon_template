"""Drift engine: deterministic baseline-vs-current comparison (the Part 3 core).

Pure functions, no LLM and no I/O. Apply signal-implied deltas to the baseline to
derive the live profile, diff per dimension into a severity-weighted drift score,
and map the band to a recommended action. This is kept separate from the LLM
narrative in step3 so the numbers stay deterministic and demo-stable, and so the
engine can be owned and tested on its own.

Aggregation is L2: each changed dimension contributes severity * confidence, and
the score is the square root of the sum of squared contributions. That lets the
single biggest risk dominate; many small drifts score less than one large one.
"""

from __future__ import annotations

import math

from drift_config import HIGH_THRESHOLD, MEDIUM_THRESHOLD, WEIGHTS
from schemas import (
    BaselineProfile,
    Dimension,
    DriftDimension,
    DriftScore,
    LiveProfile,
    Owner,
    RecommendedAction,
    RiskBand,
    RiskRating,
    Signal,
    VolumeBand,
)


def compute_live_profile(baseline: BaselineProfile, signals: list[Signal]) -> LiveProfile:
    """Apply signal-implied deltas to the baseline to derive the live profile."""
    data = baseline.model_dump()
    owners = [Owner(**o) for o in data["owners"]]

    for signal in signals:
        raw = signal.raw or {}
        if "business_model" in raw:
            data["business_model"] = raw["business_model"]
        if "domain" in raw:
            data["domain"] = raw["domain"]
        if "legal_form" in raw:
            data["legal_form"] = raw["legal_form"]
        if "jurisdiction" in raw:
            data["jurisdiction"] = raw["jurisdiction"]
        if "expected_volume_band" in raw:
            data["expected_volume_band"] = VolumeBand(raw["expected_volume_band"])
        if "risk_rating" in raw:
            data["risk_rating"] = RiskRating(raw["risk_rating"])
        if "add_owner" in raw:
            owners.append(Owner(**raw["add_owner"]))

    data["owners"] = owners
    return LiveProfile(**data)


def _owners_label(owners: list[Owner]) -> str:
    unscreened = sum(1 for o in owners if not o.screened)
    suffix = f" ({unscreened} unscreened)" if unscreened else ""
    return f"{len(owners)} owners{suffix}"


_RAW_KEY_TO_DIM: dict[str, Dimension] = {
    "business_model": Dimension.business_model,
    "domain": Dimension.domain,
    "legal_form": Dimension.legal_form,
    "jurisdiction": Dimension.jurisdiction,
    "expected_volume_band": Dimension.expected_volume,
    "risk_rating": Dimension.risk_rating,
    "add_owner": Dimension.ownership,
}


def _dim_confidence(signals: list[Signal]) -> dict[Dimension, float]:
    """Return the max signal confidence for each dimension touched by the signal set."""
    result: dict[Dimension, float] = {}
    for signal in signals:
        for key, dim in _RAW_KEY_TO_DIM.items():
            if key in (signal.raw or {}):
                result[dim] = max(result.get(dim, 0.0), signal.confidence)
    return result


def compute_drift(baseline: BaselineProfile, live: LiveProfile, signals: list[Signal]) -> DriftScore:
    """Diff baseline vs live per dimension and aggregate into a severity-weighted drift score.

    Each changed dimension contributes severity * signal_confidence; the aggregate
    is the L2 norm (square root of the sum of squared contributions), so the single
    biggest risk dominates and many small drifts score less than one large one.
    """
    comparisons: list[tuple[Dimension, str, str]] = [
        (Dimension.business_model, baseline.business_model, live.business_model),
        (Dimension.ownership, _owners_label(baseline.owners), _owners_label(live.owners)),
        (Dimension.legal_form, baseline.legal_form, live.legal_form),
        (Dimension.jurisdiction, baseline.jurisdiction, live.jurisdiction),
        (Dimension.expected_volume, baseline.expected_volume_band.value, live.expected_volume_band.value),
        (Dimension.risk_rating, baseline.risk_rating.value, live.risk_rating.value),
        (Dimension.domain, baseline.domain, live.domain),
    ]

    dim_conf = _dim_confidence(signals)
    per_dimension: list[DriftDimension] = []
    sum_of_squares = 0.0
    invalidated: list[str] = []

    for dim, frm, to in comparisons:
        changed = frm != to
        severity = WEIGHTS[dim]
        if changed:
            delta = dim_conf.get(dim, 1.0)
            contribution = severity * delta
            sum_of_squares += contribution ** 2
            invalidated.append(f"{dim.value.replace('_', ' ')}: {frm} -> {to}")
        else:
            delta = 0.0
        per_dimension.append(
            DriftDimension.model_validate(
                {"dimension": dim, "from": frm, "to": to, "delta": round(delta, 3), "weight": severity}
            )
        )

    aggregate = round(min(1.0, math.sqrt(sum_of_squares)), 4)
    if aggregate >= HIGH_THRESHOLD:
        band = RiskBand.high
    elif aggregate >= MEDIUM_THRESHOLD:
        band = RiskBand.medium
    else:
        band = RiskBand.low

    confidence = round(sum(s.confidence for s in signals) / len(signals), 3) if signals else 0.0

    return DriftScore(
        client_id=baseline.client_id,
        per_dimension=per_dimension,
        aggregate=aggregate,
        band=band,
        confidence=confidence,
        invalidated_assumptions=invalidated,
    )


def recommend_action(drift: DriftScore) -> RecommendedAction:
    if drift.band == RiskBand.high:
        return RecommendedAction.re_kyc
    if drift.band == RiskBand.medium:
        return RecommendedAction.edd
    return RecommendedAction.no_change
