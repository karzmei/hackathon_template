"""Step 1: cheap basic filter (no LLM, ~0 cost).

Drops the bulk of incoming signals with simple rules: dedup and a materiality
threshold on confidence. This is what keeps the "no change" clients (Lakeside)
from ever reaching a paid model. Runs independently; input and output are both
lists of `Signal`.
"""

from __future__ import annotations

from drift_config import MATERIALITY_THRESHOLD
from schemas import Signal


def basic_filter(signals: list[Signal]) -> list[Signal]:
    """Return the material, de-duplicated subset of signals.

    TODO: extend with embedding-based relevance/dedup. The contract stays the same.
    """
    seen: set[tuple[str, str]] = set()
    survivors: list[Signal] = []
    for signal in signals:
        if signal.confidence < MATERIALITY_THRESHOLD:
            continue
        key = (signal.kind.value, signal.summary)
        if key in seen:
            continue
        seen.add(key)
        survivors.append(signal)
    return survivors
