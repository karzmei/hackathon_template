"""Step 2: LLM reasoning filter (mid-tier model).

Runs only on step-1 survivors. Asks the model to judge each signal's materiality
to a potential KYC change and to keep or drop it with an adjusted confidence.
Records token usage so its cost lands on the alert. Lives in the public plane:
it sees only signals, never the internal baseline.
"""

from __future__ import annotations

import json
import re

import config
from llm.adk_agent import run_agent
from schemas import Cost, Signal

SYSTEM = (
    "You are a senior KYC analyst at a Swiss private bank. "
    "You review public signals about corporate clients and decide which ones "
    "could plausibly invalidate an assumption made at onboarding: changes to "
    "business model, ownership structure, jurisdiction, transaction volumes, "
    "domain/website, or legal form. Immaterial signals (routine press mentions, "
    "minor site updates, unrelated news) should be dropped. "
    "Return strict JSON only, no markdown, no explanation outside the JSON."
)


def _build_prompt(signals: list[Signal]) -> str:
    items = [
        {
            "id": s.id,
            "kind": s.kind.value,
            "source": s.source.value,
            "summary": s.summary,
            "confidence": s.confidence,
        }
        for s in signals
    ]
    return (
        "Review these public signals for KYC materiality.\n\n"
        "Signals:\n"
        + json.dumps(items, indent=2)
        + "\n\nFor each signal, decide:\n"
        "- keep: true if the signal could invalidate an onboarding assumption\n"
        "- confidence: your adjusted confidence in [0.0, 1.0]\n"
        "- reason: one short sentence explaining your decision\n\n"
        'Return exactly: {"results": [{"id": "...", "keep": true, "confidence": 0.0, "reason": "..."}]}'
    )


def _offline_response(signals: list[Signal]) -> str:
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


def _extract_json(text: str) -> dict:
    """Extract JSON from model output, stripping markdown code fences if present."""
    text = text.strip()
    # Strip ```json ... ``` or ``` ... ```
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text.strip())


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
        verdicts = {r["id"]: r for r in _extract_json(result.text).get("results", [])}
    except (json.JSONDecodeError, AttributeError, KeyError):
        # Fail open: keep all signals rather than silently dropping evidence.
        return signals, cost

    kept: list[Signal] = []
    for signal in signals:
        verdict = verdicts.get(signal.id)
        if verdict is None or verdict.get("keep", True):
            if verdict and isinstance(verdict.get("confidence"), (int, float)):
                signal = signal.model_copy(update={"confidence": float(verdict["confidence"])})
            kept.append(signal)
    return kept, cost
