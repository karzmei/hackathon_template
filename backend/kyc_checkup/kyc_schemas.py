from __future__ import annotations

from enum import StrEnum
from typing import Any, Optional

from pydantic import BaseModel, Field

from schemas import AlertStatus, BaselineProfile, RecommendedAction, RiskBand


# ---------- Trigger types and routing ----------

class TriggerType(StrEnum):
    REGISTRY_UPDATE = "registry_update"
    TRANSACTION_UPDATE = "transaction_update"
    NEWS_UPDATE = "news_update"
    WEBSITE_UPDATE = "website_update"
    FUNDING_UPDATE = "funding_update"
    BUSINESS_PROFILE_UPDATE = "business_profile_update"
    MANUAL_REFRESH = "manual_refresh"


class CheckType(StrEnum):
    LEGAL_ENTITY = "legal_entity"
    OWNERSHIP = "ownership"
    SANCTIONS_WATCHLIST = "sanctions_watchlist"
    ADVERSE_MEDIA = "adverse_media"
    BUSINESS_ACTIVITY = "business_activity"
    WEBSITE_DOMAIN = "website_domain"
    FINANCIAL_ACTIVITY = "financial_activity"


# could be made smarter
TRIGGER_TO_CHECK_GROUPS = {
    TriggerType.REGISTRY_UPDATE: [
        CheckType.LEGAL_ENTITY,
        CheckType.OWNERSHIP,
        CheckType.SANCTIONS_WATCHLIST,
    ],
    TriggerType.TRANSACTION_UPDATE: [CheckType.FINANCIAL_ACTIVITY],
    TriggerType.NEWS_UPDATE: [
        CheckType.ADVERSE_MEDIA,
        CheckType.BUSINESS_ACTIVITY,
        CheckType.LEGAL_ENTITY,
        CheckType.OWNERSHIP,
        CheckType.SANCTIONS_WATCHLIST,
    ],
    TriggerType.WEBSITE_UPDATE: [
        CheckType.WEBSITE_DOMAIN,
        CheckType.BUSINESS_ACTIVITY,
    ],
    TriggerType.FUNDING_UPDATE: [
        CheckType.FINANCIAL_ACTIVITY,
        CheckType.BUSINESS_ACTIVITY,
    ],
    TriggerType.BUSINESS_PROFILE_UPDATE: [CheckType.BUSINESS_ACTIVITY],
    TriggerType.MANUAL_REFRESH: list(CheckType),
}


# ---------- KYC profile models ----------

class KycBaselineProfile(BaselineProfile):
    legal_name: str
    jurisdiction: str
    registered_address: str | None = None
    registry_status: str | None = None
    legal_identifier: str | None = None


# ---------- Request / Response models ----------

class TriggerRequest(BaseModel):
    client_id: str
    trigger_id: str
    trigger_type: str
    payload: dict[str, Any] = Field(default_factory=dict)


class TriggerAlert(BaseModel):
    alert_id: str
    trigger_id: str
    client_id: str
    type: str
    risk_level: RiskBand
    recommended_action: RecommendedAction
    summary: str
    details: Optional[str] = None
    status: AlertStatus
    signal_ids: list[str] = Field(default_factory=list)
    check_groups: list[str] = Field(default_factory=list)
    created_at: str


class TriggerResponse(BaseModel):
    trigger: TriggerRequest
    checks: list[str]
    alerts: list[TriggerAlert]
