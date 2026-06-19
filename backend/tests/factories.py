"""Shared test builders (mirrors the inc-b2c-mvp test-utils/fixtures pattern).

Terse factories so tests construct domain objects with only the fields they care
about. Defaults describe a plausible material signal / baseline; pass overrides to
shape a specific case.
"""

from __future__ import annotations

from llm.adk_agent import LlmResult
from schemas import (
    BaselineProfile,
    Owner,
    RiskRating,
    Signal,
    SignalKind,
    Source,
    VolumeBand,
)


def make_owner(name: str = "Anna Meier", pct: float = 100.0, screened: bool = True) -> Owner:
    return Owner(name=name, pct=pct, screened=screened)


def make_signal(**over) -> Signal:
    """A material domain-change signal by default; override any field."""
    data = {
        "id": "sig-1",
        "client_id": "acme",
        "source": Source.wayback,
        "observed_at": "2026-05-01",
        "kind": SignalKind.domain_change,
        "summary": "Website changed.",
        "evidence_url": "https://example.test/evidence",
        "confidence": 0.8,
        "raw": {},
    }
    data.update(over)
    return Signal(**data)


def make_baseline(**over) -> BaselineProfile:
    """A low-risk B2B SaaS baseline with two screened owners; override any field."""
    data = {
        "client_id": "acme",
        "business_model": "B2B SaaS",
        "expected_activity": "Subscription revenue",
        "expected_volume_band": VolumeBand.low,
        "owners": [make_owner("Anna Meier", 60), make_owner("Thomas Brun", 40)],
        "legal_form": "GmbH",
        "domain": "acme.test",
        "risk_rating": RiskRating.low,
    }
    data.update(over)
    return BaselineProfile(**data)


def make_llm_result(text: str = "ok", **over) -> LlmResult:
    """An LlmResult as run_agent would return; default mimics an online call."""
    data = {
        "text": text,
        "tokens_in": 100,
        "tokens_out": 50,
        "usd": 0.001,
        "model": "azure/test",
        "offline": False,
    }
    data.update(over)
    return LlmResult(**data)
