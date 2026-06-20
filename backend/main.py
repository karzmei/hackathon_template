"""FastAPI app for DRIFTWATCH.

Thin HTTP layer over the pipeline and store. Every request/response is validated
by the Pydantic domain schemas. The frontend (Next.js) calls these routes; CORS is
opened only for the configured frontend origin.
"""

from __future__ import annotations

import config
import store
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import (
    Alert,
    AlertRow,
    ClientCost,
    CostDashboard,
    CostToday,
    DecisionRequest,
    RecommendedAction,
    RunResponse,
    StageCost,
)

from data.seed import all_clients
from pipeline.orchestrator import run_pipeline
from pipeline.step4_human_review import apply_decision

app = FastAPI(title="DRIFTWATCH API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _to_row(alert: Alert) -> AlertRow:
    return AlertRow(
        id=alert.id,
        client_name=alert.client_name,
        risk_band=alert.risk_band,
        top_change=alert.top_change,
        status=alert.status,
        recommended_action=alert.recommended_action,
        analysis_depth=alert.analysis_depth,
        cost=alert.cost,
        created_at=alert.created_at,
    )


def _severity(alert: Alert) -> float:
    return alert.drift_score.aggregate


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/run", response_model=RunResponse)
async def run() -> RunResponse:
    """Demo trigger: run ingestion + cascade for all seed clients."""
    store.reset()
    for client in all_clients():
        await run_pipeline(client)
    return RunResponse(alerts=_sorted_rows())


@app.get("/api/alerts", response_model=list[AlertRow])
def list_alerts() -> list[AlertRow]:
    return _sorted_rows()


def _sorted_rows() -> list[AlertRow]:
    alerts = sorted(store.list_alerts(), key=lambda a: (_severity(a), a.created_at), reverse=True)
    return [_to_row(a) for a in alerts]


@app.get("/api/alerts/{alert_id}", response_model=Alert)
def get_alert(alert_id: str) -> Alert:
    alert = store.get_alert(alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="alert not found")
    return alert


@app.post("/api/alerts/{alert_id}/decision", response_model=Alert)
def decide(alert_id: str, request: DecisionRequest) -> Alert:
    alert = store.get_alert(alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="alert not found")
    return apply_decision(alert, request)


@app.get("/api/cost/today", response_model=CostToday)
def cost_today() -> CostToday:
    alerts = store.list_alerts()
    return CostToday(
        tokens_in=sum(a.cost.tokens_in for a in alerts),
        tokens_out=sum(a.cost.tokens_out for a in alerts),
        usd=round(sum(a.cost.usd for a in alerts), 6),
        alerts=len(alerts),
    )


@app.get("/api/cost/dashboard", response_model=CostDashboard)
def cost_dashboard() -> CostDashboard:
    alerts = store.list_alerts()
    total_usd = round(sum(a.cost.usd for a in alerts), 6)
    total_in = sum(a.cost.tokens_in for a in alerts)
    total_out = sum(a.cost.tokens_out for a in alerts)
    n = len(alerts)

    depth2 = [a for a in alerts if a.analysis_depth >= 2]
    depth3 = [a for a in alerts if a.analysis_depth >= 3]

    by_stage = [
        StageCost(
            stage="rules",
            label="Cheap rules",
            model=None,
            entered=n,
            survived=len(depth2),
            tokens_in=0,
            tokens_out=0,
            usd=0.0,
        ),
        StageCost(
            stage="reasoning",
            label="Reasoning filter",
            model=config.DEPLOYMENT_REASONING,
            entered=len(depth2),
            survived=len(depth3),
            tokens_in=sum(a.cost_step2.tokens_in for a in depth2),
            tokens_out=sum(a.cost_step2.tokens_out for a in depth2),
            usd=round(sum(a.cost_step2.usd for a in depth2), 6),
        ),
        StageCost(
            stage="deep",
            label="Deep analysis",
            model=config.DEPLOYMENT_DEEP,
            entered=len(depth3),
            survived=len(depth3),
            tokens_in=sum(a.cost_step3.tokens_in for a in depth3),
            tokens_out=sum(a.cost_step3.tokens_out for a in depth3),
            usd=round(sum(a.cost_step3.usd for a in depth3), 6),
        ),
    ]

    by_client = [
        ClientCost(
            client_id=a.client_id,
            client_name=a.client_name,
            depth=a.analysis_depth,
            band=a.drift_score.band.value,
            tokens_in=a.cost.tokens_in,
            tokens_out=a.cost.tokens_out,
            usd=a.cost.usd,
        )
        for a in alerts
    ]

    actionable = sum(
        1 for a in alerts
        if a.recommended_action in (RecommendedAction.re_kyc, RecommendedAction.escalate)
        or a.drift_score.band.value == "high"
    )
    cheap_exits = sum(1 for a in alerts if a.analysis_depth == 1 and a.cost.usd == 0.0)

    return CostDashboard(
        generated_at=store.now_iso(),
        totals=CostToday(tokens_in=total_in, tokens_out=total_out, usd=total_usd, alerts=n),
        by_stage=by_stage,
        by_client=by_client,
        usd_per_alert=round(total_usd / n, 6) if n else 0.0,
        actionable_alerts=actionable,
        usd_per_actionable=round(total_usd / actionable, 6) if actionable else 0.0,
        cheap_exits=cheap_exits,
    )
