"""In-memory stores for alerts and the append-only audit log.

Thin and deliberately swappable: a real build would back these with a database
(the brief suggests two SQLite files for data-plane separation). For the
hackathon slice, process memory is enough and keeps the demo zero-infra.
"""

from __future__ import annotations

from datetime import datetime, timezone

from schemas import Alert, AuditEvent


_alerts: dict[str, Alert] = {}
_audit: list[AuditEvent] = []


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def reset() -> None:
    """Clear everything; called at the start of each /api/run."""
    _alerts.clear()
    _audit.clear()


def save_alert(alert: Alert) -> None:
    _alerts[alert.id] = alert


def get_alert(alert_id: str) -> Alert | None:
    return _alerts.get(alert_id)


def list_alerts() -> list[Alert]:
    return list(_alerts.values())


def append_audit(event: AuditEvent) -> AuditEvent:
    """Append-only: audit events are never mutated or deleted."""
    _audit.append(event)
    return event


def audit_for(entity_id: str) -> list[AuditEvent]:
    return [e for e in _audit if e.entity_id == entity_id]
