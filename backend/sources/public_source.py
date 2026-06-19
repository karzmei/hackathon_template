"""Layer 1 (public) data plane.

Ingests non-sensitive public signals (news, registries, sanctions, domain, on-chain)
and returns normalised `Signal` records. Each source is its own module under
`sources/connectors/`; this file just registers them and concatenates their output.
Add a source by adding a connector file and listing it in `_CONNECTORS`.

Until the connectors return real data, `fetch_public_signals` falls back to the
demo fixtures in `data/seed.py` so the pipeline runs end to end offline.

Data-plane rule: this module lives in the public plane and must never import the
private baseline source. Keep it that way.
"""

from __future__ import annotations

from data import seed
from schemas import Signal
from sources.connectors import gdelt, onchain_kyt, opensanctions, wayback, zefix

# One entry per public source. Each is `fetch(client_id) -> list[Signal]`.
_CONNECTORS = (zefix.fetch, gdelt.fetch, wayback.fetch, opensanctions.fetch, onchain_kyt.fetch)


def fetch_public_signals(client_id: str) -> list[Signal]:
    """Return the public signals observed for a client.

    Runs every registered connector and concatenates the results. While the
    connectors are still stubs (returning nothing), falls back to demo fixtures.
    """
    collected: list[Signal] = []
    for fetch in _CONNECTORS:
        collected.extend(fetch(client_id))
    if collected:
        return collected
    return list(seed.public_signals_for(client_id))
