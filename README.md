# DRIFTWATCH

Event-driven KYC drift intelligence for a digital-asset bank (AMINA Bank, SwissHacks 2026).

DRIFTWATCH treats each corporate client as a living KYC profile and measures how far reality has
drifted from what the bank onboarded. It ingests public signals (Layer 1), compares them against
an internal baseline (Layer 2), and emits a cited case file with a recommended action. Heavy
reasoning is spent only where it matters, and the per-alert cost is visible in the UI.

This repository is a hackathon scaffold: a working vertical slice with clearly-stubbed parts so a
team can build the two data sources and four pipeline steps independently.

## Background

The product direction comes from a customer interview with AMINA. See
[customer_interview_summary.md](customer_interview_summary.md) for the distilled findings and our
build decisions; it links back to the [raw interview notes](customer_interview_notes.md).

## Stack

- **Frontend:** Next.js (App Router, TypeScript, Tailwind)
- **Backend:** Python, FastAPI, Pydantic
- **LLM:** Google ADK driving Azure OpenAI through LiteLLM

## Architecture

Two data planes and a four-step cascade:

```
Layer 1 (public)        Layer 2 (private/synthetic)
public_source.py        private_source.py  (baseline golden record)
        |                        |
        v                        |
 step1 basic filter   (cheap, ~0 cost; drops noise)
        v                        |
 step2 LLM filter     (mid-tier Azure; keeps material signals)
        v                        |
 step3 analysis  <---------------+  (drift engine reads baseline; deep Azure narrative)
        v
 step4 human review   (analyst decides; audit log; the only path that changes risk state)
```

The cascade is the cost story: a "no change" client (Lakeside) dies at step 1 with near-zero
cost, while a drifting client (Helvetia) reaches step 3 and becomes a re-KYC case file.

## Run it

Two terminals. The app runs offline out of the box; without an Azure key the LLM steps use a
clearly-labelled stub so the demo still works.

### Backend (Terminal 1)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000   # http://localhost:8000/docs
```

### Frontend (Terminal 2)

```powershell
cd frontend
npm install
npm run dev                             # http://localhost:3000
```

### Environment (optional, for real LLM calls)

Copy `.env.example` to `.env` (backend reads it) and set the Azure variables. Without them the
pipeline runs with the offline stub.

## Demo script

Open `http://localhost:3000`, click **Run pipeline**. Helvetia SaaS GmbH climbs from LOW to a
HIGH-risk re-KYC alert (analysis depth 3, visible cost) while Lakeside Trading AG stays a "baseline
confirmed" row (step 1, ~$0). Open Helvetia: read the risk band and "what this implies" first,
then the baseline-vs-current panel (B2B SaaS to Crypto OTC desk, owners 2 to 3, volume low to
high), then the source-cited timeline. Click **Approve Re-KYC** and watch the audit trail update.

## Tests

```powershell
cd backend
python -m unittest discover -s tests    # @smoke, runs offline
```

## Where to build next

Each part is independently runnable with a typed contract; replace a stub without touching the
rest:

- `backend/sources/public_source.py` — wire real connectors (OpenSanctions, ZEFIX, GDELT, Wayback).
- `backend/sources/private_source.py` — back the baseline with a real internal store.
- `backend/pipeline/step1..step4` — each step has one typed function and a `# TODO`.
- `backend/data/seed.py` — add more clients and signals.
