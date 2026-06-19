"""OpenSanctions connector (sanctions and PEP screening).

Maps screening hits on the client or its owners to sanctions_hit signals.
"""

from __future__ import annotations

from schemas import Signal


def fetch(client_id: str) -> list[Signal]:
    """Return sanctions / PEP screening signals for a client.

    TODO (Juhi): screen the client and its known owners against OpenSanctions, and
    map any match to a Signal (source=Source.opensanctions, kind=SignalKind.sanctions_hit,
    confidence in [0, 1], evidence_url to the match record). Return [] until
    implemented; public_source falls back to fixtures meanwhile.
    """
    return []
