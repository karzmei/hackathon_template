# DriftWatch: Task Division (4 participants)

## What we are building

DriftWatch is event-driven KYC drift intelligence for AMINA Bank (SwissHacks 2026). Each corporate
client is modelled as a living KYC profile. We ingest public signals, compare them against the
internal onboarding baseline, score how far reality has drifted, and emit a cited case file with a
recommended action. We do not rebuild what the bank already runs (sanctions matching, on-chain
monitoring, IDV); we read those as signals and automate the still-manual gap (re-KYC triggers,
adverse-media triage, ownership and business-model change detection).

Two demo clients prove the cascade: Helvetia (drifts from SaaS to crypto OTC, escalates to deep
analysis) and Lakeside (immaterial signal, dies at step 1 at near-zero cost).

## Architecture in one picture

```
sources/connectors/*  ->  public_source (Layer 1, public signals)  ┐
                                                                    ├─> orchestrator (cascade)
private_source (Layer 2, internal baseline)  ──────────────────────┘        |
                                                                            steps 1..4
  step1 cheap filter (~$0)  ->  step2 LLM filter  ->  step3 drift_engine + LLM narrative  ->  step4 decision
                                                                            |
                                              store (alerts + append-only audit)  ->  main.py (FastAPI)  ->  frontend
```

Judging weights to optimise for: AI Intelligence 25%, Cost Efficiency 20%, UX and Explainability 20%,
Compliance and Safety 20%, Engineering and Architecture 15%. Two things win disproportionate points:
the per-alert cost meter, and the baseline-vs-current panel with source citations.

## Shared contract (coordinate before changing)

These files touch everyone. Announce changes in the group chat.

- `backend/schemas.py`: the central Pydantic contract. Change a shape here, then update the TS mirror
  in `frontend/lib/api.ts` and any affected step. Note `DriftDimension` uses field aliases `from`/`to`.
- `backend/store.py`: in-memory alerts and append-only audit log; coordinate signature changes.
- `backend/drift_config.py`: weights and thresholds (Karina is primary editor; a tweak moves every band).
- `backend/pipeline/orchestrator.py`: pipeline glue; keep each step's input/output signature stable.

Invariant for everyone: recommend, never act. Only `step4_human_review` mutates risk state, and it
always appends an `AuditEvent`. Every stage has an offline mode, so everyone can run the pipeline and
the tests without an Azure key.

## Ari: Frontend, Design, Pitch, Compliance UX

**Goal:** a demo-ready analyst UI that wins UX/Explainability and visibly supports the Compliance and
Cost criteria; own the pitch and the compliance story.

**Owns:** `frontend/app/**`, `frontend/components/**`, `frontend/lib/api.ts` (the TS side of the schema mirror).

**Suggested features:**
- Flesh out the alert detail page (`frontend/app/alerts/[id]/page.tsx`) in the required order: risk
  delta and "what this implies" first, then baseline-vs-current, then the source-cited timeline, then
  the three decision actions with status pill and audit trail. Stub components already exist:
  `BaselineVsCurrent`, `SignalTimeline`, `RiskBand`, `ActionBar`, `StatusPill`, `CostMeter`.
- Per-alert and per-day cost meter (a disproportionate point-winner); read `GET /api/cost/today`.
- Baseline-vs-current panel showing each dimension as `baseline -> current`, with citations and confidence.
- Human-in-the-loop action bar: Approve Re-KYC, Escalate to MLRO, Dismiss as false positive; show the
  audit line after a decision.
- AMINA visual polish (navy, gold, cream; serif headers, sans body).

**Avoid:** backend pipeline internals. When a schema changes, mirror it in `lib/api.ts`.

## Dmitry: Stage 2 LLM filter + Stage 3 narrative

**Goal:** reliable mid-tier triage and a clear, compliant "what this implies" narrative, with accurate
per-call cost feeding the cost meter.

**Owns:** `backend/pipeline/step2_llm_filter.py`, `backend/llm/adk_agent.py`, the LLM-narrative part of
`backend/pipeline/step3_analysis.py`, and the LLM pricing and deployment names in `backend/config.py`.

**Suggested features:**
- Replace the offline stub in step 2 with real reasoning via `run_agent` (Google ADK driving Azure
  through LiteLLM, already wired). Keep robust JSON parsing with a fail-open fallback that preserves evidence.
- Prompt-engineer the step 3 narrative so it reads well for a compliance analyst and stays concise.
- Verify token to USD figures are demo-stable using the price table in `config.py`.

**Avoid:** the deterministic drift math (now in `pipeline/drift_engine.py`) and the public connectors.
Keep `run_agent`'s signature stable; coordinate any change with the orchestrator.

## Juhi: Part 1, public data ingestion and connectors

**Goal:** real public signals normalised to the `Signal` shape so the cascade runs on live data.

**Owns:** `backend/sources/connectors/**` and `backend/sources/public_source.py`.

**Suggested features:** implement connectors one file at a time. Stubs and per-source TODOs already
exist for ZEFIX (registry_change, ownership_change), GDELT / Google News (adverse_media), Wayback /
Diffbot (domain_change, business model), OpenSanctions (sanctions_hit), and on-chain KYT
(onchain_exposure, dormancy_break). Each `fetch(client_id)` returns normalised `Signal`s with `source`,
`kind`, `summary`, `evidence_url`, a `confidence` in [0, 1], and a `raw` dict carrying the implied
profile delta. Add a source by writing its file and registering it in `_CONNECTORS`. Handle API errors
and rate limits gracefully; `public_source` falls back to fixtures while connectors are empty, so the
demo keeps running as you build.

**Data-plane rule:** never import `private_source.py`. Coordinate before adding a `Source` or
`SignalKind` value (that is a `schemas.py` change).

## Karina: Part 2, internal/synthetic data and Stage 1 checks

**Goal:** trustworthy baselines and a cheap step-1 filter that drops the bulk of noise at near-zero
cost, plus the synthetic demo scenario that proves the cascade.

**Owns:** `backend/sources/private_source.py`, `backend/data/seed.py`,
`backend/pipeline/step1_basic_filter.py`, and `backend/drift_config.py` (primary editor).

**Suggested features:**
- Internal KYC baseline store behind `get_baseline(client_id)`.
- Richer step-1 materiality and dedup (embedding-based relevance per the TODO; the contract stays the same).
- Tune weights and thresholds in `drift_config.py` from compliance domain knowledge.
- Curate seed clients: Helvetia (SaaS to crypto OTC drift that reaches depth 3 and recommends re-KYC)
  and Lakeside (no-change, dies at step 1 at ~$0). Each signal carries its implied profile delta under
  `raw`, which the drift engine applies; that is what lets the pipeline run honestly offline.

**Data-plane rule:** step 1 must not import `private_source.py`; baselines are read only by the drift
engine (step 3) and the final assembly.

## Part 3: Drift engine (floating, first to finish claims it)

**What:** `backend/pipeline/drift_engine.py` (deterministic baseline-vs-current diff, weighted aggregate
score, band, invalidated assumptions, `recommend_action`) plus `orchestrator.py` polish (correlation
across sources and time, logging where each signal dies). This is the AI-Intelligence core: we detect
invalidated onboarding assumptions, not keyword alerts.

**Why floating:** it bridges Karina's baselines and Dmitry's narrative, so assign it to whoever finishes
their core task first. Ari helps define what Part 3 must surface for the UI and the pitch.

**Stretch ideas:** confidence-weighted deltas instead of binary changed/unchanged; per-industry weight
overrides; correlation that lets several low-confidence signals on different dimensions jointly cross
the threshold.

## How to run and test

From `backend/` (run from inside this directory so the flat imports resolve):

```powershell
cd backend
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000          # http://localhost:8000/docs
python -m unittest discover -s tests           # all @smoke tests, offline, no Azure key
```

From `frontend/`:

```powershell
cd frontend
npm install
npm run dev        # http://localhost:3000
```

End-to-end demo check: start the backend, `POST /api/run`, then `GET /api/alerts` returns two alerts
with Helvetia first (depth 3, high band, re-KYC) and Lakeside (depth 1, ~$0). The smoke tests assert
exactly this, so keep them green as you build.
