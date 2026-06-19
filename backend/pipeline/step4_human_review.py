"""Step 4: human review (the analyst's decision; AI proposes, human disposes).

Most of this step lives in the frontend; the backend exposes the decision endpoint
that this module implements. It is the ONLY code path allowed to change a client's
risk state, and every change writes an append-only audit event.
"""

from __future__ import annotations

import store
from schemas import (
    Alert,
    AlertStatus,
    AuditEvent,
    Decision,
    DecisionRequest,
    RecommendedAction,
)

# Maps the analyst's chosen action to the resulting alert status.
_STATUS_BY_ACTION: dict[RecommendedAction, AlertStatus] = {
    RecommendedAction.re_kyc: AlertStatus.actioned,
    RecommendedAction.edd: AlertStatus.actioned,
    RecommendedAction.escalate: AlertStatus.escalated,
    RecommendedAction.no_change: AlertStatus.dismissed,
}


def apply_decision(alert: Alert, request: DecisionRequest) -> Alert:
    """Record the analyst decision, update status, and append an audit event."""
    decided_at = store.now_iso()
    decision = Decision(
        alert_id=alert.id,
        actor=request.actor,
        action=request.action,
        reason=request.reason,
        decided_at=decided_at,
    )

    new_status = _STATUS_BY_ACTION.get(request.action, AlertStatus.needs_review)
    event = store.append_audit(
        AuditEvent(
            entity_id=alert.id,
            type="decision",
            actor=request.actor,
            payload=decision.model_dump(mode="json"),
            at=decided_at,
        )
    )

    updated = alert.model_copy(update={"status": new_status, "audit": alert.audit + [event]})
    store.save_alert(updated)
    return updated
