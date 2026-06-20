from __future__ import annotations

from enum import StrEnum
from typing import Any, Optional

from pydantic import BaseModel, Field

from schemas import AlertStatus, RecommendedAction, RiskBand


# ---------- Trigger types and routing ----------

class TriggerType(StrEnum):
    REGISTRY_UPDATE = "registry_update"
    TRANSACTION_UPDATE = "transaction_update"
    NEWS_UPDATE = "news_update"
    WEBSITE_UPDATE = "website_update"
    FUNDING_UPDATE = "funding_update"
    BUSINESS_PROFILE_UPDATE = "business_profile_update"
    MANUAL_REFRESH = "manual_refresh"


# could be made smarter
TRIGGER_TO_CHECK_GROUPS = {
    TriggerType.REGISTRY_UPDATE: ["legal"],
    TriggerType.TRANSACTION_UPDATE: ["financial"],
    TriggerType.NEWS_UPDATE: ["news", "business"],
    TriggerType.WEBSITE_UPDATE: ["website", "business"],
    TriggerType.FUNDING_UPDATE: ["financial", "business"],
    TriggerType.BUSINESS_PROFILE_UPDATE: ["business"],
    TriggerType.MANUAL_REFRESH: ["legal", "financial", "news", "website", "business"],
}


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
