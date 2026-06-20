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

from pathlib import Path

from kyc_checkup.client_record_schema import ClientRecord
from kyc_checkup.kyc_schemas import TriggerRequest
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


_REPO_ROOT = Path(__file__).resolve().parents[2]
_CLIENT1_PATH = _REPO_ROOT / "simulated_data_samples" / "clients" / "client1.json"
_CLIENT1_WEBSITE_TRIGGER_PATH = (
    _REPO_ROOT
    / "simulated_data_samples"
    / "triggers"
    / "client1_website_change.json"
)

_CLIENT1_RECORD = ClientRecord.model_validate_json(_CLIENT1_PATH.read_text(encoding="utf-8"))
_CLIENT1_WEBSITE_TRIGGER = TriggerRequest.model_validate_json(
    _CLIENT1_WEBSITE_TRIGGER_PATH.read_text(encoding="utf-8")
)

_client1_identification = _CLIENT1_RECORD.internal.identification
_client1_kyc = _CLIENT1_RECORD.internal.kyc_baseline
_client1_web = _CLIENT1_RECORD.external.web_presence

_CLIENT1 = Client(
    id=_CLIENT1_RECORD.client_id,
    legal_name=_client1_identification.legal_name,
    jurisdiction=_client1_identification.jurisdiction_of_incorporation,
    onboarded_at=_client1_kyc.onboarding_date.isoformat(),
    risk_rating=RiskRating(_client1_kyc.customer_risk_rating.upper()),
)

_CLIENT1_BASELINE = BaselineProfile(
    client_id=_CLIENT1_RECORD.client_id,
    business_model="B2B SaaS / logistics analytics",
    expected_activity=_client1_kyc.expected_business_model,
    expected_volume_band=VolumeBand.low,
    owners=[
        Owner(name=owner.name, pct=owner.ownership_pct, screened=True)
        for owner in _CLIENT1_RECORD.internal.ownership.beneficial_owners
    ],
    legal_form=_client1_identification.legal_form,
    domain=_client1_web.current_domain,
    risk_rating=RiskRating(_client1_kyc.customer_risk_rating.upper()),
)

_website_payload = _CLIENT1_WEBSITE_TRIGGER.payload
_website_drift = _website_payload["implied_drift"]
_CLIENT1_WEBSITE_SIGNAL = Signal(
    id="website-change-helvetia-analytics",
    client_id=_CLIENT1_RECORD.client_id,
    source=Source.wayback,
    observed_at="2026-06-20T10:30:00Z",
    kind=SignalKind.domain_change,
    summary=(
        "Website changed from logistics analytics SaaS to crypto OTC, "
        "digital-asset treasury, and stablecoin settlement services."
    ),
    evidence_url=f"https://{_client1_web.current_domain}",
    confidence=0.95,
    raw={
        **_website_drift,
        "business_model": _website_drift["new_business_domain"],
        "expected_volume_band": "high",
        "risk_rating": "HIGH",
    },
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
    _CLIENT1.id: _CLIENT1_BASELINE,
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
    _CLIENT1.id: [_CLIENT1_WEBSITE_SIGNAL],
}


def all_clients() -> list[Client]:
    return CLIENTS


def baseline_for(client_id: str) -> BaselineProfile:
    return BASELINES[client_id]


def public_signals_for(client_id: str) -> list[Signal]:
    return SIGNALS.get(client_id, [])


def helvetia_analytics_demo_client() -> Client:
    return _CLIENT1


def helvetia_analytics_website_change_trigger() -> TriggerRequest:
    return _CLIENT1_WEBSITE_TRIGGER
