from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field

from schemas import AlertStatus, RecommendedAction, RiskBand


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
