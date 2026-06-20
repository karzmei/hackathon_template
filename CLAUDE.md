# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**DRIFTWATCH** — event-driven KYC drift intelligence (AMINA Bank, SwissHacks 2026). It models each
corporate client as a living KYC profile and measures drift from the onboarded baseline: ingest
public signals (Layer 1), compare against an internal baseline (Layer 2), score drift, and emit a
cited case file with a recommended action. This repo is a hackathon scaffold — a working vertical
slice with deliberately stubbed parts so the team can build pieces independently. Favor minimal,
targeted edits; keep the parts independently runnable.

Writing rule for generated text, comments, and copy: do not use em dashes or double dashes; use
semicolons, commas, or shorter sentences.

## Stack

- Frontend: Next.js (App Router, TypeScript, Tailwind) in `frontend/`
- Backend: Python, FastAPI, Pydantic in `backend/`
- LLM: Google ADK driving Azure OpenAI via LiteLLM (`backend/llm/adk_agent.py`)

Note: the original pitch brief specced a TypeScript/Hono/Azure stack; the chosen stack here is
Next.js + Python + Google ADK. Treat the brief as domain context, not the tech stack.

## Subdirectory guides

- `frontend/CLAUDE.md`: Next.js cockpit UI; layout, commands, the mock-first data layer, the
  `api.ts` <-> `schemas.py` contract, styling, and test conventions. Read it before frontend work.

## Commands (Windows / PowerShell)

```powershell
# Backend
cd backend
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000          # http://localhost:8000/docs
python -m unittest discover -s tests           # all @smoke tests, run offline
python -m unittest tests.test_pipeline.HelvetiaDriftTest   # single test class
```

Frontend commands and workflow live in `frontend/CLAUDE.md`.

Run the backend from inside `backend/` so module imports resolve (the app uses flat imports like
`from schemas import ...`, `from pipeline.orchestrator import ...`).

## Architecture

Two data planes, a four-step cascade, assembled into an `Alert` case file.

Request flow: `frontend/lib/api.ts` -> FastAPI routes in `backend/main.py` -> `pipeline/orchestrator.py`
-> steps 1-4 -> `store.py`. The orchestrator chains the steps and assembles the alert.

- **`backend/schemas.py`** is the contract. Every shape (Client, BaselineProfile, Signal,
  LiveProfile, DriftScore, Alert, Decision, AuditEvent) is a Pydantic model; the TS interfaces in
  `frontend/lib/api.ts` mirror them (snake_case matches the JSON). Change a shape here, then update
  both `api.ts` and any affected step. `DriftDimension` uses field aliases `from`/`to`; FastAPI
  serializes responses by alias, so the JSON keys are `from`/`to`.
- **Data planes (`backend/sources/`):** `public_source.py` (Layer 1, public signals) and
  `private_source.py` (Layer 2, internal baseline). Data-plane rule, enforced by imports: the
  public source and steps 1-2 must never import the private source. Only the drift engine (step 3)
  and the final assembly read the baseline.
- **Pipeline (`backend/pipeline/`):** each step is one module with a typed function and a `# TODO`,
  runnable independently. step1 = cheap rules/dedup (~0 cost); step2 = LLM reasoning filter
  (mid-tier deployment); step3 = deterministic drift engine + deep LLM narrative; step4 = human
  decision (the only path that mutates risk state, always writing an append-only audit event).
- **LLM (`backend/llm/adk_agent.py`):** the single model path. `run_agent(prompt, deployment, ...)`
  returns text plus token usage and a USD cost from the price table in `config.py`. If Azure is not
  configured it returns the caller's `offline_response` (an explicit, labelled demo fallback, not a
  silent mock) with estimated tokens, so the whole pipeline runs offline. `google.adk` is imported
  lazily inside the online branch so offline runs and tests do not require it installed.
- **Cost meter:** step2 + step3 costs sum onto `Alert.cost`; `GET /api/cost/today` aggregates. The
  price table lives in code so the figure is deterministic and demo-stable.
- **Store (`backend/store.py`):** in-memory alerts + append-only audit log; reset on each
  `POST /api/run`. Thin and swappable for a real DB later.

## Key invariants

- Recommend, never act: no code path changes a client's risk state except `step4_human_review`.
- Audit everything: state changes append an `AuditEvent`; never mutate or delete them.
- The four UX requirements live in `frontend/components/DetailPane.tsx` (the cockpit's detail pane)
  in order: risk delta + what it implies first, then baseline-vs-current, then the source-cited
  timeline, then the three decision actions with status pill and audit trail.

## Demo data

`backend/data/seed.py`: Helvetia SaaS GmbH (drifts to HIGH, reaches step 3, non-zero cost) and
Lakeside Trading AG (immaterial signal, dies at step 1, ~$0). Each signal carries the concrete
profile deltas it implies under `raw`; the drift engine applies those to derive the live profile,
which is what lets the pipeline run honestly offline.

## Conventions

- Keep dependencies minimal; small files, clear names, comments only for non-obvious logic.
- Tests are `@smoke`: they call the real pipeline and route functions (not mocks) with the offline
  LLM stub, so `unittest` passes without an Azure key or the ADK packages installed.
