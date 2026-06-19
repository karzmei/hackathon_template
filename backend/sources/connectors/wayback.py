"""Wayback / Diffbot connector (website and business-model change).

Maps website snapshots over time to domain_change signals.
"""

from __future__ import annotations

from schemas import Signal


def fetch(client_id: str) -> list[Signal]:
    """Return domain / business-model change signals for a client.

    TODO (Juhi): pull historical snapshots of the client's domain from the Wayback
    Machine (or diff with Diffbot), detect a material shift, and map it to a Signal
    (source=Source.wayback, kind=SignalKind.domain_change, confidence in [0, 1],
    evidence_url to the snapshot, `raw` carrying e.g. {"business_model": "..."} or
    {"domain": "..."}). Return [] until implemented; public_source falls back to
    fixtures meanwhile.
    """
    return []
