"""Layer 1 (public) data plane.

Ingests non-sensitive public signals (news, registries, sanctions, domain, on-chain)
and returns normalised `Signal` records. Each source is its own module under
`sources/connectors/`; this file just registers them and concatenates their output.
Add a source by adding a connector file and listing it in `_CONNECTORS`.

When a connector returns nothing (still a stub, the live API failed, or no hits),
`fetch_public_signals` falls back to the demo fixtures in `data/seed.py` for that
source, so the pipeline runs end to end offline and the demo never loses a signal
when a live feed is down.

Data-plane rule: this module lives in the public plane and must never import the
private baseline source. Keep it that way.
"""

from __future__ import annotations

from data import seed
from schemas import Signal, Source
from sources.connectors import gdelt, onchain_kyt, opensanctions, wayback, zefix

# One entry per public source: the `Source` it produces and its connector
# module (each exposes `fetch(client_id) -> list[Signal]`). The source lets us
# fall back to that source's demo fixtures when the connector returns nothing;
# `.fetch` is resolved at call time so the connectors stay easy to patch in tests.
_CONNECTORS = (
    (Source.zefix, zefix),
    (Source.gdelt, gdelt),
    (Source.wayback, wayback),
    (Source.opensanctions, opensanctions),
    (Source.onchain_kyt, onchain_kyt),
)


def fetch_public_signals(client_id: str) -> list[Signal]:
    """Return the public signals observed for a client.

    Runs every registered connector. Any connector that returns nothing (a stub,
    a failed live request, or simply no hits) falls back to that source's demo
    fixtures, so a single dead feed degrades to demo data instead of vanishing.
    Sources with no connector yet (e.g. internal_tx) always come from the
    fixtures.
    """
    collected: list[Signal] = []
    live_sources: set[Source] = set()
    for source, connector in _CONNECTORS:
        live = connector.fetch(client_id)
        if live:
            collected.extend(live)
            live_sources.add(source)
    # Demo fallback for every source that produced no live signals this run.
    collected.extend(s for s in seed.public_signals_for(client_id) if s.source not in live_sources)
    return collected
