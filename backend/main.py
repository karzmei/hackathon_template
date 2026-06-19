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
    CostToday,
    DecisionRequest,
    RunResponse,
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
