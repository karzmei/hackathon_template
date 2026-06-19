"""Step 3: deep analysis = deterministic drift engine + plain-language narrative.

Runs only on escalated candidates. This is the one stage that reads the internal
baseline. The drift math lives in `pipeline.drift_engine` and stays deterministic
so the numbers are demo-stable; this module adds the single top-tier Azure call
that turns the invalidated assumptions into a short "what this implies" narrative.
"""

from __future__ import annotations

import config
from llm.adk_agent import run_agent
from schemas import BaselineProfile, Cost, DriftScore, LiveProfile, RecommendedAction, Signal

from pipeline.drift_engine import compute_drift, compute_live_profile, recommend_action


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
