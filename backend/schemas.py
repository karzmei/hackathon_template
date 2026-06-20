"""DRIFTWATCH domain schemas (Pydantic v2).

This is the single source of truth for the shapes that flow between the data
sources, the four pipeline steps, the API, and the frontend. The TypeScript
interfaces in `frontend/lib/api.ts` mirror these intentionally; keep them in sync.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# --------------------------------------------------------------------------- #
# Enums
# --------------------------------------------------------------------------- #
class Source(str, Enum):
    zefix = "zefix"                # Swiss commercial registry
    gdelt = "gdelt"                # adverse media
    wayback = "wayback"            # domain / website change
    onchain_kyt = "onchain_kyt"    # on-chain transaction monitoring
    opensanctions = "opensanctions"
    internal_tx = "internal_tx"    # internal transaction monitoring


class SignalKind(str, Enum):
    domain_change = "domain_change"
    registry_change = "registry_change"
    ownership_change = "ownership_change"
    sanctions_hit = "sanctions_hit"
    adverse_media = "adverse_media"
    funding = "funding"
    onchain_exposure = "onchain_exposure"
    dormancy_break = "dormancy_break"
    # AML-specific signals (the analyst's core review surface).
    pep_hit = "pep_hit"                                # politically exposed person match
    high_risk_jurisdiction = "high_risk_jurisdiction"  # funds to/from a high-risk country
    suspicious_activity = "suspicious_activity"         # post-transaction structuring / pattern


class Dimension(str, Enum):
    business_model = "business_model"
    jurisdiction = "jurisdiction"
    legal_form = "legal_form"
    ownership = "ownership"
    domain = "domain"
    expected_volume = "expected_volume"
    risk_rating = "risk_rating"


class RiskRating(str, Enum):
    low = "LOW"
    medium = "MEDIUM"
    high = "HIGH"


class VolumeBand(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class RecommendedAction(str, Enum):
    no_change = "no_change"
    re_kyc = "re_kyc"
    edd = "edd"
    escalate = "escalate"


class AlertStatus(str, Enum):
    new = "new"
    needs_review = "needs_review"
    escalated = "escalated"
    dismissed = "dismissed"
    actioned = "actioned"


class RiskBand(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


# --------------------------------------------------------------------------- #
# Core entities
# --------------------------------------------------------------------------- #
class Owner(BaseModel):
    name: str
    pct: float = Field(..., ge=0, le=100, description="Ownership percentage")
    screened: bool = True


class Client(BaseModel):
    id: str
    legal_name: str
    jurisdiction: str
    lei: Optional[str] = None
    onboarded_at: str
    risk_rating: RiskRating


class BaselineProfile(BaseModel):
    """Layer 2 (internal) golden record: the onboarded assumptions."""

    client_id: str
    business_model: str
    expected_activity: str
    expected_volume_band: VolumeBand
    owners: list[Owner]
    legal_form: str
    domain: str
    risk_rating: RiskRating
    # Jurisdiction risk label (the key signal for fiat flows); defaulted so existing
    # constructions stay valid while the seed baselines fill it in explicitly.
    jurisdiction: str = "CH (low risk)"


class Signal(BaseModel):
    """Layer 1 (public) normalised observation."""

    id: str
    client_id: str
    source: Source
    observed_at: str
    kind: SignalKind
    summary: str
    evidence_url: Optional[str] = None
    confidence: float = Field(..., ge=0, le=1)
    raw: dict = Field(default_factory=dict)


class LiveProfile(BaselineProfile):
    """Same shape as the baseline but derived by applying recent signals."""


class DriftDimension(BaseModel):
    dimension: Dimension
    from_value: str = Field(..., alias="from")
    to_value: str = Field(..., alias="to")
    delta: float = Field(..., ge=0, le=1)
    weight: float = Field(..., ge=0, le=1)

    model_config = {"populate_by_name": True}


class DriftScore(BaseModel):
    client_id: str
    per_dimension: list[DriftDimension]
    aggregate: float = Field(..., ge=0, le=1)
    band: RiskBand
    confidence: float = Field(..., ge=0, le=1)
    invalidated_assumptions: list[str] = Field(default_factory=list)


class Cost(BaseModel):
    tokens_in: int = 0
    tokens_out: int = 0
    usd: float = 0.0

    def add(self, other: "Cost") -> "Cost":
        return Cost(
            tokens_in=self.tokens_in + other.tokens_in,
            tokens_out=self.tokens_out + other.tokens_out,
            usd=round(self.usd + other.usd, 6),
        )


class Decision(BaseModel):
    alert_id: str
    actor: str
    action: RecommendedAction
    reason: Optional[str] = None
    decided_at: str


class AuditEvent(BaseModel):
    entity_id: str
    type: str
    actor: str
    payload: dict = Field(default_factory=dict)
    at: str


class Alert(BaseModel):
    """A cited case file: the unit the analyst reviews."""

    id: str
    client_id: str
    client_name: str
    risk_band: str = Field(..., description="Human label, e.g. 'LOW -> HIGH'")
    drift_score: DriftScore
    recommended_action: RecommendedAction
    top_change: str
    implies: str
    signals: list[Signal] = Field(default_factory=list)
    baseline: BaselineProfile
    current: LiveProfile
    analysis_depth: int = Field(..., ge=1, le=3)
    cost: Cost
    cost_step2: Cost = Field(default_factory=Cost)
    cost_step3: Cost = Field(default_factory=Cost)
    status: AlertStatus
    created_at: str
    audit: list[AuditEvent] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# API request / response models
# --------------------------------------------------------------------------- #
class AlertRow(BaseModel):
    """Compact queue row for GET /api/alerts."""

    id: str
    client_name: str
    risk_band: str
    top_change: str
    status: AlertStatus
    recommended_action: RecommendedAction
    analysis_depth: int
    cost: Cost
    created_at: str


class DecisionRequest(BaseModel):
    action: RecommendedAction
    reason: Optional[str] = None
    actor: str = "analyst"


class RunResponse(BaseModel):
    alerts: list[AlertRow]


class StageCost(BaseModel):
    stage: str                  # "rules" | "reasoning" | "deep"
    label: str
    model: Optional[str] = None
    entered: int
    survived: int
    tokens_in: int = 0
    tokens_out: int = 0
    usd: float = 0.0


class ClientCost(BaseModel):
    client_id: str
    client_name: str
    depth: int
    band: str
    tokens_in: int = 0
    tokens_out: int = 0
    usd: float = 0.0


class CostDashboard(BaseModel):
    generated_at: str
    totals: "CostToday"
    by_stage: list[StageCost]
    by_client: list[ClientCost]
    usd_per_alert: float
    actionable_alerts: int
    usd_per_actionable: float
    cheap_exits: int


class CostToday(BaseModel):
    tokens_in: int
    tokens_out: int
    usd: float
    alerts: int
