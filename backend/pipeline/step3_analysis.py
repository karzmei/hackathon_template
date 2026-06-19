"""Step 3: advanced data analysis (the drift engine + deep narrative).

Runs only on escalated candidates. This is the one stage that reads the internal
baseline. It is deterministic where it matters (live profile + drift score) and
uses the top-tier Azure deployment only for the plain-language "what this implies"
narrative, so the numbers stay demo-stable while the explanation reads well.

Correlation across sources/time is structural: several individually modest signals
that each move a different dimension jointly push the aggregate over the threshold.
"""

from __future__ import annotations

import config
from llm.adk_agent import run_agent
from schemas import (
    BaselineProfile,
    Cost,
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

# Per-dimension weights; they sum to 1.0 so the aggregate is already in [0, 1].
WEIGHTS: dict[Dimension, float] = {
    Dimension.business_model: 0.25,
    Dimension.ownership: 0.20,
    Dimension.legal_form: 0.15,
    Dimension.expected_volume: 0.15,
    Dimension.risk_rating: 0.15,
    Dimension.domain: 0.10,
}

HIGH_THRESHOLD = 0.67
MEDIUM_THRESHOLD = 0.34


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


def compute_drift(baseline: BaselineProfile, live: LiveProfile, signals: list[Signal]) -> DriftScore:
    """Diff baseline vs live per dimension and aggregate into a drift score."""
    comparisons: list[tuple[Dimension, str, str]] = [
        (Dimension.business_model, baseline.business_model, live.business_model),
        (Dimension.ownership, _owners_label(baseline.owners), _owners_label(live.owners)),
        (Dimension.legal_form, baseline.legal_form, live.legal_form),
        (Dimension.expected_volume, baseline.expected_volume_band.value, live.expected_volume_band.value),
        (Dimension.risk_rating, baseline.risk_rating.value, live.risk_rating.value),
        (Dimension.domain, baseline.domain, live.domain),
    ]

    per_dimension: list[DriftDimension] = []
    aggregate = 0.0
    invalidated: list[str] = []
    for dim, frm, to in comparisons:
        changed = frm != to
        weight = WEIGHTS[dim]
        if changed:
            aggregate += weight
            invalidated.append(f"{dim.value.replace('_', ' ')}: {frm} -> {to}")
        per_dimension.append(
            DriftDimension.model_validate(
                {"dimension": dim, "from": frm, "to": to, "delta": 1.0 if changed else 0.0, "weight": weight}
            )
        )

    aggregate = round(min(1.0, aggregate), 4)
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


def _offline_narrative(drift: DriftScore, action: RecommendedAction) -> str:
    if not drift.invalidated_assumptions:
        return "No onboarding assumptions were invalidated; the baseline is confirmed."
    changes = "; ".join(drift.invalidated_assumptions)
    return (
        f"Multiple public signals jointly moved the profile: {changes}. "
        f"These invalidate the onboarded assumptions and warrant {action.value.replace('_', '-')}. "
        "[offline demo narrative]"
    )


async def deep_analysis(
    baseline: BaselineProfile, signals: list[Signal]
) -> tuple[DriftScore, LiveProfile, str, RecommendedAction, Cost]:
    live = compute_live_profile(baseline, signals)
    drift = compute_drift(baseline, live, signals)
    action = recommend_action(drift)

    prompt = (
        "Given these invalidated KYC assumptions, write two or three sentences explaining "
        "what this implies for the client's risk and why, for a compliance analyst. "
        "Do not use em dashes.\n\nInvalidated assumptions:\n"
        + "\n".join(f"- {a}" for a in drift.invalidated_assumptions)
        + f"\n\nRecommended action: {action.value}"
    )
    result = await run_agent(
        prompt,
        config.DEPLOYMENT_DEEP,
        system_instruction="You explain KYC drift clearly and concisely for analysts.",
        offline_response=_offline_narrative(drift, action),
    )
    cost = Cost(tokens_in=result.tokens_in, tokens_out=result.tokens_out, usd=result.usd)
    return drift, live, result.text, action, cost
