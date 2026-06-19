"""Step 2: LLM reasoning filter (mid-tier Azure deployment).

Runs only on step-1 survivors. Asks the model to judge each signal's materiality
to a potential KYC change and to keep or drop it, returning an adjusted confidence.
Records token usage so its cost lands on the alert. Lives in the public plane: it
sees only signals, never the internal baseline.
"""

from __future__ import annotations

import json

import config
from llm.adk_agent import run_agent
from schemas import Cost, Signal

SYSTEM = (
    "You are a KYC analyst triaging public signals about a corporate client. "
    "For each signal decide whether it is material to a possible change in the "
    "client's KYC profile. Return strict JSON only."
)


def _build_prompt(signals: list[Signal]) -> str:
    items = [
        {"id": s.id, "kind": s.kind.value, "summary": s.summary, "confidence": s.confidence}
        for s in signals
    ]
    return (
        "Signals:\n"
        + json.dumps(items, indent=2)
        + '\n\nReturn JSON of the form '
        '{"results": [{"id": "...", "keep": true, "confidence": 0.0, "reason": "..."}]}. '
        "Keep a signal only if it could plausibly invalidate an onboarding assumption."
    )


def _offline_response(signals: list[Signal]) -> str:
    # Deterministic offline judgement: keep everything that survived step 1,
    # nudging confidence slightly to reflect a (simulated) reasoning pass.
    results = [
        {
            "id": s.id,
            "keep": True,
            "confidence": min(1.0, round(s.confidence + 0.05, 2)),
            "reason": "Materiality confirmed by offline heuristic.",
        }
        for s in signals
    ]
    return json.dumps({"results": results})


async def llm_reasoning_filter(signals: list[Signal]) -> tuple[list[Signal], Cost]:
    if not signals:
        return [], Cost()

    result = await run_agent(
        _build_prompt(signals),
        config.DEPLOYMENT_REASONING,
        system_instruction=SYSTEM,
        offline_response=_offline_response(signals),
    )
    cost = Cost(tokens_in=result.tokens_in, tokens_out=result.tokens_out, usd=result.usd)

    try:
        verdicts = {r["id"]: r for r in json.loads(result.text).get("results", [])}
    except (json.JSONDecodeError, AttributeError):
        # If the model returns unparseable text, fail open: keep the signals as-is
        # rather than silently dropping evidence.
        return signals, cost

    kept: list[Signal] = []
    for signal in signals:
        verdict = verdicts.get(signal.id)
        if verdict is None or verdict.get("keep", True):
            if verdict and isinstance(verdict.get("confidence"), (int, float)):
                signal = signal.model_copy(update={"confidence": float(verdict["confidence"])})
            kept.append(signal)
    return kept, cost
