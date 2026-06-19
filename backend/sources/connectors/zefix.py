"""ZEFIX connector (Swiss commercial registry).

Maps registry deltas to registry_change / ownership_change / legal-form signals.
"""

from __future__ import annotations

from schemas import Signal


def fetch(client_id: str) -> list[Signal]:
    """Return ZEFIX-derived signals for a client.

    TODO (Juhi): query ZEFIX for this client and map registry deltas to normalised
    Signal records (source=Source.zefix, kind=SignalKind.registry_change or
    ownership_change, confidence in [0, 1], evidence_url to the registry page, and a
    `raw` dict carrying the implied profile delta, e.g. {"legal_form": "..."} or
    {"add_owner": {"name": "...", "pct": 0, "screened": false}}).
    Return [] until implemented; public_source falls back to fixtures meanwhile.
    """
    return []
