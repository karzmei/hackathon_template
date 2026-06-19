"""Step 3: deep analysis = deterministic drift engine + plain-language narrative.

Runs only on escalated candidates. This is the one stage that reads the internal
baseline. The drift math lives in `pipeline.drift_engine` and stays deterministic
so the numbers are demo-stable; this module adds the single top-tier model call
that turns the invalidated assumptions into a short "what this implies" narrative.
"""

from __future__ import annotations

import json

import config
from llm.adk_agent import run_agent
from schemas import BaselineProfile, Cost, DriftScore, LiveProfile, RecommendedAction, Signal

from pipeline.drift_engine import compute_drift, compute_live_profile, recommend_action

SYSTEM = (
    "You are a compliance officer writing case notes for a KYC review team at a Swiss bank. "
    "Your notes are factual, precise, and concise. You cite specific changes and their "
    "compliance implications. You never use em dashes. You write in plain English."
)


def _build_narrative_prompt(
    baseline: BaselineProfile,
    live: LiveProfile,
    drift: DriftScore,
    signals: list[Signal],
    action: RecommendedAction,
) -> str:
    dimension_changes = [
        f"  {d.dimension.value}: {d.from_value} -> {d.to_value} (delta {d.delta:.0%})"
        for d in drift.per_dimension
        if d.delta > 0
    ]
    signal_summaries = [
        f"  [{s.source.value}] {s.summary} (confidence {s.confidence:.0%})"
        for s in signals
    ]
    return (
        "A corporate client's KYC profile has drifted from the onboarded baseline.\n\n"
        f"Client: {baseline.client_id}\n"
        f"Baseline business model: {baseline.business_model}\n"
        f"Current business model: {live.business_model}\n"
        f"Baseline expected volume: {baseline.expected_volume_band.value}\n"
        f"Current expected volume: {live.expected_volume_band.value}\n"
        f"Baseline owners: {len(baseline.owners)}, current owners: {len(live.owners)}\n\n"
        "Profile dimension changes:\n"
        + ("\n".join(dimension_changes) if dimension_changes else "  (none recorded)")
        + "\n\nInvalidated onboarding assumptions:\n"
        + "\n".join(f"  - {a}" for a in drift.invalidated_assumptions)
        + "\n\nSupporting signals:\n"
        + ("\n".join(signal_summaries) if signal_summaries else "  (none)")
        + f"\n\nDrift score: {drift.aggregate:.0%} ({drift.band.value} band)"
        f"\nRecommended action: {action.value}\n\n"
        "Write two to three sentences for the case file explaining what this profile "
        "drift implies for the client's compliance risk and why the recommended action "
        "is warranted. Be specific, cite the most significant change, and keep it under "
        "80 words."
    )


def _offline_narrative(drift: DriftScore, action: RecommendedAction) -> str:
    if not drift.invalidated_assumptions:
        return "No onboarding assumptions were invalidated; the baseline is confirmed."
    changes = "; ".join(drift.invalidated_assumptions)
    return (
        f"Multiple public signals jointly moved the profile: {changes}. "
        f"These changes invalidate the onboarded assumptions and warrant "
        f"{action.value.replace('_', '-')}. [offline demo narrative]"
    )


async def deep_analysis(
    baseline: BaselineProfile, signals: list[Signal]
) -> tuple[DriftScore, LiveProfile, str, RecommendedAction, Cost]:
    live = compute_live_profile(baseline, signals)
    drift = compute_drift(baseline, live, signals)
    action = recommend_action(drift)

    result = await run_agent(
        _build_narrative_prompt(baseline, live, drift, signals, action),
        config.DEPLOYMENT_DEEP,
        system_instruction=SYSTEM,
        offline_response=_offline_narrative(drift, action),
    )
    cost = Cost(tokens_in=result.tokens_in, tokens_out=result.tokens_out, usd=result.usd)
    return drift, live, result.text, action, cost
