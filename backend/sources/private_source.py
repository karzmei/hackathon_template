"""Layer 2 (private / synthetic) data plane.

Holds the internal golden record: the `BaselineProfile` per client captured at
onboarding (expected business model, activity, volumes, ownership, jurisdiction,
risk rating). This is sensitive KYC data; only the drift engine (step 3) reads it.

For the hackathon the baselines are synthetic fixtures. Swap the body for a real
internal store later; keep the signature so callers do not change.
"""

from __future__ import annotations

from data import seed
from schemas import BaselineProfile


def get_baseline(client_id: str) -> BaselineProfile:
    """Return the onboarded baseline (golden record) for a client.

    TODO: back this with the real internal KYC store. The public connectors and the
    cheap/LLM filter stages must never call into this module.
    """
    return seed.baseline_for(client_id)
