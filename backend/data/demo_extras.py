"""Extra demo clients for a richer cascade story.

Adds four clients so the cascade funnel shows all three depth levels:
  depth=3 HIGH  — Alpine Crypto Exchange AG (sanctions + ownership hit)
  depth=3 MED   — Rhone Logistics SA (domain + legal + volume drift)
  depth=1 LOW   — Basel Biotech GmbH (weak adverse media, dies at step 1)
  depth=1 LOW   — Ticino Retail SA   (routine ping, dies at step 1)

L2 aggregate targets (severity * confidence, then sqrt of sum of squares):
  Alpine : risk_rating(1.0*0.91) + ownership(0.85*0.88) = sqrt(0.828+0.561) = 1.18 -> HIGH
  Rhone  : domain(0.4*0.72) + legal_form(0.5*0.68) + volume(0.4*0.70)
           = sqrt(0.083+0.116+0.078) = 0.53 -> MEDIUM
  Basel  : conf=0.22 < MATERIALITY_THRESHOLD=0.35 -> killed at step 1
  Ticino : conf=0.19 < MATERIALITY_THRESHOLD=0.35 -> killed at step 1

To remove: delete this file and the two lines that import it in seed.py.
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

# --------------------------------------------------------------------------- #
# Alpine Crypto Exchange AG — depth 3, HIGH, re_kyc
# --------------------------------------------------------------------------- #

_ALPINE = Client(
    id="alpine",
    legal_name="Alpine Crypto Exchange AG",
    jurisdiction="CH",
    onboarded_at="2022-11-01",
    risk_rating=RiskRating.medium,
)

_ALPINE_BASELINE = BaselineProfile(
    client_id="alpine",
    business_model="Regulated spot crypto exchange (FINMA VQF member)",
    expected_activity="Retail crypto-to-fiat conversions, Swiss and EU clients",
    expected_volume_band=VolumeBand.medium,
    owners=[
        Owner(name="Stefan Auer", pct=55, screened=True),
        Owner(name="Miriam Kaspar", pct=45, screened=True),
    ],
    legal_form="AG",
    domain="alpine-exchange.ch",
    risk_rating=RiskRating.medium,
    jurisdiction="CH (low risk)",
)

_ALPINE_SIGNALS: list[Signal] = [
    Signal(
        id="alp-1",
        client_id="alpine",
        source=Source.opensanctions,
        observed_at="2026-05-12",
        kind=SignalKind.sanctions_hit,
        summary=(
            "OpenSanctions match: Stefan Auer (55% UBO) linked to an EU-sanctioned "
            "entity via a Liechtenstein holding structure disclosed last month."
        ),
        evidence_url="https://opensanctions.org/entities/alpine-auer",
        confidence=0.91,
        raw={"risk_rating": "HIGH"},
    ),
    Signal(
        id="alp-2",
        client_id="alpine",
        source=Source.zefix,
        observed_at="2026-05-27",
        kind=SignalKind.ownership_change,
        summary=(
            "ZEFIX filing: new 35% shareholder Vega Investments Ltd (BVI) registered; "
            "no beneficial owner disclosed, screened status unknown."
        ),
        evidence_url="https://zefix.ch/en/search/entity/list/firm/alpine",
        confidence=0.88,
        raw={
            "add_owner": {"name": "Vega Investments Ltd (BVI)", "pct": 35, "screened": False},
        },
    ),
]

# --------------------------------------------------------------------------- #
# Rhone Logistics SA — depth 3, MEDIUM, edd
# --------------------------------------------------------------------------- #

_RHONE = Client(
    id="rhone",
    legal_name="Rhone Logistics SA",
    jurisdiction="CH",
    onboarded_at="2021-03-15",
    risk_rating=RiskRating.low,
)

_RHONE_BASELINE = BaselineProfile(
    client_id="rhone",
    business_model="EU road freight brokerage",
    expected_activity="Invoice-based freight payments, EU counterparties, CHF and EUR",
    expected_volume_band=VolumeBand.low,
    owners=[Owner(name="Rhone Group Holding SA", pct=100, screened=True)],
    legal_form="SA",
    domain="rhone-logistics.ch",
    risk_rating=RiskRating.low,
    jurisdiction="CH (low risk)",
)

_RHONE_SIGNALS: list[Signal] = [
    Signal(
        id="rh-1",
        client_id="rhone",
        source=Source.wayback,
        observed_at="2026-04-18",
        kind=SignalKind.domain_change,
        summary=(
            "Website migrated from rhone-logistics.ch to rhone-intl.com; new site "
            "advertises cross-border cash logistics and currency exchange services."
        ),
        evidence_url="https://web.archive.org/web/2026/rhone-intl.com",
        confidence=0.72,
        raw={"domain": "rhone-intl.com"},
    ),
    Signal(
        id="rh-2",
        client_id="rhone",
        source=Source.zefix,
        observed_at="2026-05-06",
        kind=SignalKind.registry_change,
        summary=(
            "ZEFIX: purpose clause amended to include 'currency exchange and "
            "cash-in-transit services internationally'; legal form changed to SA (irrevocable)."
        ),
        evidence_url="https://zefix.ch/en/search/entity/list/firm/rhone",
        confidence=0.68,
        raw={"legal_form": "SA (international)"},
    ),
    Signal(
        id="rh-3",
        client_id="rhone",
        source=Source.internal_tx,
        observed_at="2026-05-22",
        kind=SignalKind.dormancy_break,
        summary=(
            "Account activity jumped 4x in May; large cash-equivalent transfers "
            "to non-EU jurisdictions not matching the freight payment profile."
        ),
        evidence_url=None,
        confidence=0.70,
        raw={"expected_volume_band": "medium"},
    ),
]

# --------------------------------------------------------------------------- #
# Basel Biotech GmbH — depth 1, LOW (dies at step 1, cost $0)
# --------------------------------------------------------------------------- #

_BASEL = Client(
    id="basel",
    legal_name="Basel Biotech GmbH",
    jurisdiction="CH",
    onboarded_at="2023-07-20",
    risk_rating=RiskRating.low,
)

_BASEL_BASELINE = BaselineProfile(
    client_id="basel",
    business_model="Life-sciences R&D services",
    expected_activity="Grant receipts and supplier payments, EU and US counterparties",
    expected_volume_band=VolumeBand.low,
    owners=[Owner(name="Novartis Venture Fund", pct=80, screened=True),
            Owner(name="Dr. Elena Brandt", pct=20, screened=True)],
    legal_form="GmbH",
    domain="basel-biotech.ch",
    risk_rating=RiskRating.low,
    jurisdiction="CH (low risk)",
)

_BASEL_SIGNALS: list[Signal] = [
    Signal(
        id="bb-1",
        client_id="basel",
        source=Source.gdelt,
        observed_at="2026-06-03",
        kind=SignalKind.adverse_media,
        summary=(
            "Local business blog mentions Basel Biotech in a roundup of "
            "Swiss startups attending a trade fair; no negative content."
        ),
        evidence_url="https://news.example/basel-biotech-tradefair",
        confidence=0.22,
        raw={},
    ),
]

# --------------------------------------------------------------------------- #
# Ticino Retail SA — depth 1, LOW (dies at step 1, cost $0)
# --------------------------------------------------------------------------- #

_TICINO = Client(
    id="ticino",
    legal_name="Ticino Retail SA",
    jurisdiction="CH",
    onboarded_at="2020-05-10",
    risk_rating=RiskRating.low,
)

_TICINO_BASELINE = BaselineProfile(
    client_id="ticino",
    business_model="Consumer retail chain (household goods)",
    expected_activity="POS card payments and supplier invoices, domestic",
    expected_volume_band=VolumeBand.medium,
    owners=[Owner(name="Ticino Family Trust", pct=100, screened=True)],
    legal_form="SA",
    domain="ticino-retail.ch",
    risk_rating=RiskRating.low,
    jurisdiction="CH (low risk)",
)

_TICINO_SIGNALS: list[Signal] = [
    Signal(
        id="ti-1",
        client_id="ticino",
        source=Source.gdelt,
        observed_at="2026-06-10",
        kind=SignalKind.adverse_media,
        summary=(
            "A regional newspaper listed Ticino Retail SA among sponsors of a "
            "local sports event; no adverse content detected."
        ),
        evidence_url="https://news.example/ticino-sponsor",
        confidence=0.19,
        raw={},
    ),
]

# --------------------------------------------------------------------------- #
# Public exports
# --------------------------------------------------------------------------- #

EXTRA_CLIENTS: list[Client] = [_ALPINE, _RHONE, _BASEL, _TICINO]

EXTRA_BASELINES: dict[str, BaselineProfile] = {
    "alpine": _ALPINE_BASELINE,
    "rhone": _RHONE_BASELINE,
    "basel": _BASEL_BASELINE,
    "ticino": _TICINO_BASELINE,
}

EXTRA_SIGNALS: dict[str, list[Signal]] = {
    "alpine": _ALPINE_SIGNALS,
    "rhone": _RHONE_SIGNALS,
    "basel": _BASEL_SIGNALS,
    "ticino": _TICINO_SIGNALS,
}
