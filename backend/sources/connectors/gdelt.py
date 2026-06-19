"""GDELT / Google News connector (adverse media).

Maps news hits about the client to adverse_media signals.
"""

from __future__ import annotations

from schemas import Signal


def fetch(client_id: str) -> list[Signal]:
    """Return adverse-media signals for a client.

    TODO (Juhi): query GDELT or a Google News RSS feed for the client's legal name,
    filter to adverse coverage, and map each hit to a normalised Signal
    (source=Source.gdelt, kind=SignalKind.adverse_media, confidence in [0, 1],
    evidence_url to the article). Return [] until implemented; public_source falls
    back to fixtures meanwhile.
    """
    return []
