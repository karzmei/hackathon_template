"""Layer 1 (public) data plane.

Ingests non-sensitive public signals (news, registries, sanctions, domain, on-chain)
and returns normalised `Signal` records. For the hackathon these come from fixtures;
swap the body of `fetch_public_signals` for real connectors (OpenSanctions, ZEFIX,
GDELT, Wayback) behind the same signature and the rest of the pipeline is unchanged.

Data-plane rule: this module lives in the public plane and must never import the
private baseline source. Keep it that way.
"""

from __future__ import annotations

from data import seed
from schemas import Signal


def fetch_public_signals(client_id: str) -> list[Signal]:
    """Return the public signals observed for a client.

    TODO: replace the fixture lookup with real connectors. Each connector should
    implement the same contract: take a client, return normalised `Signal`s with
    source, summary, evidence_url, and a confidence in [0, 1].
    """
    return list(seed.public_signals_for(client_id))
