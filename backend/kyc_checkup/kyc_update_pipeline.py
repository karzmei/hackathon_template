from __future__ import annotations

from datetime import datetime

from schemas import (
    AlertStatus,
    BaselineProfile,
    Cost,
    RecommendedAction,
    RiskBand,
    Signal,
)
from sources.private_source import get_baseline
from sources.public_source import fetch_public_signals
from kyc_checkup.kyc_schemas import TriggerAlert, TriggerRequest


async def process_trigger(
    trigger: TriggerRequest,
    check_groups: list[str],
) -> list[TriggerAlert]:
    baseline = get_baseline(trigger.client_id)
    signals = fetch_public_signals(trigger.client_id)

    # TODO: replace with real local check runners; minimal stub for now.
    findings: list[TriggerAlert] = []
    for group in check_groups:
        for signal in signals:
            findings.append(
                TriggerAlert(
                    alert_id=f"alert-{trigger.trigger_id}-{signal.id}-{group}",
                    trigger_id=trigger.trigger_id,
                    client_id=trigger.client_id,
                    type=group,
                    risk_level=RiskBand.medium,
                    recommended_action=RecommendedAction.no_change,
                    summary=signal.summary,
                    details=f"Signal from {signal.source} matched check group {group}.",
                    status=AlertStatus.new,
                    signal_ids=[signal.id],
                    check_groups=[group],
                    created_at=datetime.utcnow().isoformat() + "Z",
                )
            )

    return findings
