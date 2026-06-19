"""Orchestrator: chains the four steps and assembles the case file.

Each signal is logged at the stage where it dies, so the cascade story is visible:
Lakeside dies at step 1 (near-zero cost), Helvetia reaches step 3. The orchestrator
is the assembler; the public connectors and the cheap/LLM filters never read the
baseline, only this final assembly and the drift engine do.
"""

from __future__ import annotations

import logging

import store
from schemas import (
    Alert,
    AlertStatus,
    AuditEvent,
    BaselineProfile,
    Client,
    Cost,
    Dimension,
    DriftDimension,
    DriftScore,
    LiveProfile,
    RecommendedAction,
    RiskBand,
)
from sources.private_source import get_baseline
from sources.public_source import fetch_public_signals

from pipeline.step1_basic_filter import basic_filter
from pipeline.step2_llm_filter import llm_reasoning_filter
from pipeline.step3_analysis import deep_analysis

logger = logging.getLogger("driftwatch.pipeline")


def _risk_band_label(baseline: BaselineProfile, live: LiveProfile, drift: DriftScore) -> str:
    if drift.band == RiskBand.low:
        return f"{baseline.risk_rating.value} (confirmed)"
    return f"{baseline.risk_rating.value} -> {live.risk_rating.value}"


def _no_change_drift(baseline: BaselineProfile) -> DriftScore:
    per_dimension = [
        DriftDimension.model_validate(
            {"dimension": Dimension.business_model, "from": baseline.business_model,
             "to": baseline.business_model, "delta": 0.0, "weight": 0.25}
        )
    ]
    return DriftScore(
        client_id=baseline.client_id,
        per_dimension=per_dimension,
        aggregate=0.0,
        band=RiskBand.low,
        confidence=1.0,
        invalidated_assumptions=[],
    )


def _assemble(
    client: Client,
    baseline: BaselineProfile,
    live: LiveProfile,
    drift: DriftScore,
    implies: str,
    action: RecommendedAction,
    signals: list,
    depth: int,
    cost: Cost,
) -> Alert:
    created_at = store.now_iso()
    top_change = drift.invalidated_assumptions[0] if drift.invalidated_assumptions else "No material change; baseline confirmed"
    status = AlertStatus.needs_review if drift.band != RiskBand.low else AlertStatus.new

    alert_id = f"alert-{client.id}"
    created_event = AuditEvent(
        entity_id=alert_id,
        type="created",
        actor="system",
        payload={"analysis_depth": depth, "band": drift.band.value},
        at=created_at,
    )
    store.append_audit(created_event)

    alert = Alert(
        id=alert_id,
        client_id=client.id,
        client_name=client.legal_name,
        risk_band=_risk_band_label(baseline, live, drift),
        drift_score=drift,
        recommended_action=action,
        top_change=top_change,
        implies=implies,
        signals=signals,
        baseline=baseline,
        current=live,
        analysis_depth=depth,
        cost=cost,
        status=status,
        created_at=created_at,
        audit=[created_event],
    )
    store.save_alert(alert)
    return alert


async def run_pipeline(client: Client) -> Alert:
    """Run ingestion + cascade for one client and return the assembled alert."""
    baseline = get_baseline(client.id)
    raw_signals = fetch_public_signals(client.id)

    # Step 1: cheap filter.
    survivors = basic_filter(raw_signals)
    dropped_at_1 = [s.id for s in raw_signals if s not in survivors]
    if dropped_at_1:
        logger.info("%s: %d signal(s) died at step 1: %s", client.id, len(dropped_at_1), dropped_at_1)
    if not survivors:
        live = LiveProfile(**baseline.model_dump())
        drift = _no_change_drift(baseline)
        implies = "No material change detected; the onboarding baseline is confirmed."
        return _assemble(client, baseline, live, drift, implies, RecommendedAction.no_change, [], 1, Cost())

    # Step 2: LLM reasoning filter.
    survivors2, cost2 = await llm_reasoning_filter(survivors)
    if not survivors2:
        live = LiveProfile(**baseline.model_dump())
        drift = _no_change_drift(baseline)
        implies = "Signals were not material on reasoning; the baseline is confirmed."
        return _assemble(client, baseline, live, drift, implies, RecommendedAction.no_change, [], 2, cost2)

    # Step 3: deep analysis (drift engine reads the baseline here).
    drift, live, implies, action, cost3 = await deep_analysis(baseline, survivors2)
    total_cost = cost2.add(cost3)
    return _assemble(client, baseline, live, drift, implies, action, survivors2, 3, total_cost)
