"""Seed / demo data.

Two clients:
- Helvetia SaaS GmbH: the centrepiece. Signals arrive over ~6 weeks and jointly
  push drift across the high threshold (business model, ownership, volume, risk).
- Lakeside Trading AG: a "no change" control. Its only public signal is immaterial
  and dies at step 1, so it stays a low-cost "baseline confirmed" row.

Each signal carries the concrete profile deltas it implies under `raw`; the drift
engine (step 3) applies those to the baseline to derive the live profile. Keeping
the deltas in the fixture is what lets the whole pipeline run honestly offline.
"""

from __future__ import annotations

from schemas import (
    BaselineProfile,
    Client,
    Owner,
    RiskRating,
    Signal,
    SignalKind,
    Source,
    VolumeBand,
)


CLIENTS: list[Client] = [
    Client(
        id="helvetia",
        legal_name="Helvetia SaaS GmbH",
        jurisdiction="CH",
        lei="506700GE1G29325QX363",
        onboarded_at="2023-02-14",
        risk_rating=RiskRating.low,
    ),
    Client(
        id="lakeside",
        legal_name="Lakeside Trading AG",
        jurisdiction="CH",
        lei="529900T8BM49AURSDO55",
        onboarded_at="2022-09-01",
        risk_rating=RiskRating.low,
    ),
]


# Layer 2 (internal) golden records. Read only by the drift engine, never by the
# public connectors or the cheap/LLM filter stages.
BASELINES: dict[str, BaselineProfile] = {
    "helvetia": BaselineProfile(
        client_id="helvetia",
        business_model="B2B SaaS",
        expected_activity="Monthly subscription revenue from Swiss SME clients",
        expected_volume_band=VolumeBand.low,
        owners=[
            Owner(name="Anna Meier", pct=60, screened=True),
            Owner(name="Thomas Brun", pct=40, screened=True),
        ],
        legal_form="GmbH",
        domain="helvetia-saas.ch",
        risk_rating=RiskRating.low,
    ),
    "lakeside": BaselineProfile(
        client_id="lakeside",
        business_model="Commodity trading",
        expected_activity="Wholesale agricultural commodity trades, EU counterparties",
        expected_volume_band=VolumeBand.medium,
        owners=[Owner(name="Lakeside Holding AG", pct=100, screened=True)],
        legal_form="AG",
        domain="lakeside-trading.ch",
        risk_rating=RiskRating.low,
    ),
}


# Layer 1 (public) signals. In production these come from connectors; here they
# are fixtures so the demo is deterministic and runs offline.
SIGNALS: dict[str, list[Signal]] = {
    "helvetia": [
        Signal(
            id="hv-1",
            client_id="helvetia",
            source=Source.wayback,
            observed_at="2026-05-04",
            kind=SignalKind.domain_change,
            summary="Website overhauled from a SaaS product site to a crypto OTC trading desk.",
            evidence_url="https://web.archive.org/web/2026/helvetia-otc.io",
            confidence=0.82,
            raw={"business_model": "Crypto OTC desk", "domain": "helvetia-otc.io"},
        ),
        Signal(
            id="hv-2",
            client_id="helvetia",
            source=Source.zefix,
            observed_at="2026-05-19",
            kind=SignalKind.ownership_change,
            summary="ZEFIX filing: legal form changed to AG and a new 40% shareholder added.",
            evidence_url="https://zefix.ch/en/search/entity/list/firm/helvetia",
            confidence=0.9,
            raw={
                "legal_form": "AG",
                "add_owner": {"name": "Nordwind Holdings Ltd", "pct": 40, "screened": False},
            },
        ),
        Signal(
            id="hv-3",
            client_id="helvetia",
            source=Source.onchain_kyt,
            observed_at="2026-05-28",
            kind=SignalKind.onchain_exposure,
            summary="Counterparty wallet shows exposure to a high-risk VASP; Travel Rule gap.",
            evidence_url="https://kyt.example/cluster/helvetia",
            confidence=0.7,
            raw={"risk_rating": "HIGH"},
        ),
        Signal(
            id="hv-4",
            client_id="helvetia",
            source=Source.internal_tx,
            observed_at="2026-06-09",
            kind=SignalKind.dormancy_break,
            summary="Dormant account resumes activity with high-volume crypto-linked inflows.",
            evidence_url=None,
            confidence=0.75,
            raw={"expected_volume_band": "high"},
        ),
    ],
    "lakeside": [
        Signal(
            id="lk-1",
            client_id="lakeside",
            source=Source.gdelt,
            observed_at="2026-06-02",
            kind=SignalKind.adverse_media,
            summary="Local blog mentions the company name in an unrelated sponsorship post.",
            evidence_url="https://news.example/lakeside-sponsorship",
            confidence=0.15,
            raw={},
        ),
    ],
}


def all_clients() -> list[Client]:
    return CLIENTS


def baseline_for(client_id: str) -> BaselineProfile:
    return BASELINES[client_id]


def public_signals_for(client_id: str) -> list[Signal]:
    return SIGNALS.get(client_id, [])
