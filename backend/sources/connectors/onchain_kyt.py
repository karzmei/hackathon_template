"""On-chain KYT connector (Chainalysis-style exposure).

Maps wallet exposure and dormancy breaks to onchain_exposure / dormancy_break signals.
"""

from __future__ import annotations

from schemas import Signal


def fetch(client_id: str) -> list[Signal]:
    """Return on-chain exposure signals for a client.

    TODO (Juhi): read the client's linked wallets from a KYT provider, detect
    high-risk counterparty exposure or a dormancy break, and map each to a Signal
    (source=Source.onchain_kyt, kind=SignalKind.onchain_exposure or dormancy_break,
    confidence in [0, 1], evidence_url to the KYT report, `raw` carrying e.g.
    {"expected_volume_band": "high"} or {"risk_rating": "high"}). Return [] until
    implemented; public_source falls back to fixtures meanwhile.
    """
    return []
