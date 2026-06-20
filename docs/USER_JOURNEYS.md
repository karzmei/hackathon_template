# DRIFTWATCH user journeys

Realistic, end-to-end journeys through DRIFTWATCH, written against the code as it actually runs and
each tied to the tests that verify it. The goal is to show the functionality convincingly without
overclaiming: every step names the exact action or call and the exact observable outcome.

DRIFTWATCH has two planes that are deliberately separate:

- The **cockpit** (`frontend/`): a three-role, two-lines-of-defence KYC case cockpit. It is
  frontend-only; case state lives in the browser (`localStorage`) and syncs across windows. This is
  what an analyst actually clicks through.
- The **drift pipeline** (`backend/`): the FastAPI ingestion and scoring engine that turns public
  signals into a cited, baseline-vs-current alert with a cost figure.

Honesty note: the two planes are not wired together yet. "Helvetia" appears in both, but as two
different artifacts: a Compliance escalation **case** in the cockpit (Helvetia Capital AG, an asset
manager), and a drift-scored **alert** in the pipeline (Helvetia SaaS GmbH pivoting to a crypto OTC
desk). Where a journey names data, the values are quoted from the source so they can be checked.

All figures below are from the deterministic offline mode (no Azure or Google key configured), which
is how the demo runs.

---

## Part A. The cockpit (three roles, two lines of defence)

Personas (from `frontend/lib/cockpit-types.ts`): **Lena Brunner**, Relationship Manager (1st line);
**Marco Reuss**, Account Manager (1st line); **Sofia Keller**, Compliance Officer (2nd line). The
seeded book holds seven clients (`frontend/lib/cockpit-seed.ts`). The lifecycle and every action are
in `frontend/lib/use-cockpit.ts`; the view model is `frontend/lib/cockpit-view.ts`.

The recurring principle: the AI and the first line **recommend**; only Compliance **decides**; and
every move appends to an append-only audit trail.

### FJ1. Start a shift (seat picker)

1. Open the cockpit. The seat picker asks "Who's on shift?" (`LoginScreen`).
2. Pick Lena Brunner (Relationship Manager).
3. The cockpit opens on "Your book", ranked by materiality with quiet clients pushed last. Helvetia
   Capital AG (materiality 92) and Castor Mining Ltd (78) sit at the top; Alpenrose and Meridian
   (quiet) sit at the bottom.

What this proves: a role-aware cockpit with a ranked morning digest, not a flat undifferentiated
queue. (UX and explainability.)

Verified by: `frontend/app/page.test.tsx` (FJ1); `frontend/e2e/queue.spec.ts` ("RM reviews the
book"); `frontend/components/cockpit/LoginScreen.test.tsx`; `frontend/components/cockpit/CaseList.test.tsx`;
`frontend/lib/cockpit-view.test.ts` ("RM book is ranked by materiality with quiet clients last").

### FJ2. RM triage and escalate (Castor Mining Ltd)

1. As Lena, open Castor Mining Ltd (HIGH, previous band MEDIUM).
2. Read the case file top-down: the risk-delta header (MEDIUM -> HIGH), the weighted DRIFT SIGNALS
   bars (adverse media on a director, high-risk commodities sector, flagged shipments), the
   source-cited WHAT CHANGED timeline (each line names its source and date, e.g. "Adverse media ·
   19 Jun"), then key facts, then the first-line recommendation card "Escalate to Compliance ·
   adverse media".
3. Click "Escalate to Compliance".
4. The status pill flips to "Flagged · awaiting Compliance" and the audit trail gains "Escalated to
   Compliance (1st -> 2nd line)".

What this proves: signals correlated into a recommendation with citations, and a clean hand-up from
the first to the second line. (AI intelligence, explainability, compliance.)

Verified by: `frontend/e2e/queue.spec.ts` ("RM reviews the book and escalates"); `frontend/app/page.test.tsx`
(FJ2); `frontend/lib/use-cockpit.test.ts` ("escalateCompliance flags the case and appends an audit
entry"); `frontend/components/cockpit/CaseDetail.test.tsx` ("offers the RM first-line actions and
dispatches their keys").

### FJ3. RM hands a case sideways to the Account Manager (Bernina Wealth Partners)

1. As Lena, open Bernina Wealth Partners (MEDIUM, structural complexity: new trust layers and an
   offshore feeder). The recommendation here is not "escalate" but "Hand over to the Account
   Manager"; this is complexity, not a red flag.
2. Click "Hand over to Account Manager".
3. Ownership moves to the AM, the status pill reads "Reassigned to Account Manager", and the audit
   gains "Handed over to Account Manager (1st-line reassignment)". Bernina now shows up in Marco's
   "Accounts you own" / "Handed to me". Marco can hand it back, which returns it to Lena.

What this proves: the system models first-line reassignment (RM <-> AM), not just up-escalation, so
the right owner services the client. (UX, engineering.)

Verified by: `frontend/e2e/queue.spec.ts` ("RM hands Bernina over to the Account Manager");
`frontend/lib/use-cockpit.test.ts` ("handover reassigns the case to the AM" and "handback returns an
AM-owned case to the RM").

### FJ4. Compliance decides (the second line)

1. Switch seats to Sofia Keller (Compliance). The inbox is titled "Escalations · ranked".
2. Open the flagged Helvetia Capital AG. Opening it as Compliance automatically moves it to "In
   Compliance review" and writes "Opened case, review started" to the audit.
3. Compliance is offered five decisions: Require Re-KYC, Request document, Add to watchlist, Escalate
   to MLRO, Dismiss. The recommended decision (here Re-KYC) is highlighted as primary.
4. Click "Require Re-KYC". The status becomes "Compliance: Re-KYC required" and the audit gains
   "Required Re-KYC (instruction to 1st line)".

What this proves: recommend-versus-decide separation made literal; the second line is the only place
a decision is taken, and the full menu of control outcomes is available. (Compliance and safety.)

Verified by: `frontend/e2e/queue.spec.ts` ("Compliance decides a flagged escalation");
`frontend/app/page.test.tsx` (FJ4); `frontend/lib/use-cockpit.test.ts` ("compliance opening a flagged
case moves it into review" and "decide records the Compliance decision");
`frontend/components/cockpit/CaseDetail.test.tsx` ("offers the five Compliance decisions on a flagged
case").

### FJ5. The instruction returns to the first line and is confirmed

1. Switch back to Lena (RM). Helvetia now carries a Re-KYC instruction banner from Compliance.
2. Click "Confirm Re-KYC initiated".
3. The instruction is marked done, the status reads "Re-KYC initiated", and the audit gains
   "Confirmed Re-KYC initiated".

What this proves: the control loop closes; a second-line decision flows back down to the owner and
the completion is recorded, end to end. (Compliance, auditability.)

Verified by: `frontend/e2e/queue.spec.ts` ("the Re-KYC instruction returns to the RM and is
confirmed"); `frontend/lib/use-cockpit.test.ts` ("confirmInstruction marks the instruction done for
the owner"); `frontend/components/cockpit/CaseDetail.test.tsx` ("shows the instruction banner to the
owner after a Re-KYC decision").

### FJ6. Live two-window handoff (cross-window sync)

1. Open two windows: Lena (RM) in one, Sofia (Compliance) in the other.
2. In the RM window, escalate Castor.
3. Without any reload, the Compliance window picks up the change (a `storage` event plus a 1100ms
   poll); Castor's pill in the Compliance inbox flips to "Flagged · awaiting Compliance".

What this proves: the lines-of-defence handoff is live and shared, so the demo can run the first-line
to second-line flow across two screens. (The centerpiece; UX and engineering.)

Verified by: `frontend/lib/use-cockpit.test.ts` ("picks up an external localStorage change via the
storage event"), which covers the sync mechanism; the two-window propagation itself is run as a
manual demo (open two browser windows on the same origin).

### FJ7. Quiet client, no action (Alpenrose Family Office)

1. As Lena, open Alpenrose Family Office (LOW, quiet). The header reads "No change overnight" and the
   recommendation is "No action, keep monitoring".
2. Click "Reviewed · no change". The status becomes "Reviewed · no change" and the audit records
   "Reviewed, no change".

What this proves: the cockpit is not just an alarm generator; it surfaces "nothing changed" cases and
lets the analyst close them cleanly. (UX.)

Verified by: `frontend/e2e/queue.spec.ts` ("RM reviews a quiet client with no change");
`frontend/lib/use-cockpit.test.ts` ("markReviewed closes a quiet case with no change").

### FJ8. Case conversation and audit trail

1. On any open case, pick a recipient (Account Manager or Compliance) and type a message.
2. Send it. It appends to the case conversation thread, attributed to the sender.
3. The audit trail under the actions records every state change and is never mutated or deleted.

What this proves: collaboration is in-context and everything is auditable. (Compliance, UX.)

Verified by: `frontend/lib/use-cockpit.test.ts` ("sendMsg appends a message to the case thread" and
"ignores an empty message"); `frontend/components/cockpit/CaseDetail.test.tsx` ("sends a message
through the conversation composer").

---

## Part B. The drift pipeline (backend API)

The pipeline turns public signals into a cited alert through a cost-aware cascade (`backend/main.py`,
`backend/pipeline/*`). Two seed clients (`backend/data/seed.py`): Helvetia SaaS GmbH (drifts to HIGH)
and Lakeside Trading AG (immaterial, dies early).

### BJ1. Run the pipeline demo

1. `POST /api/run` resets the store and replays both clients.
2. Helvetia climbs LOW -> HIGH: `analysis_depth` 3, `recommended_action` re_kyc, drift aggregate
   ~0.87 in offline mode (the engine weights each changed dimension by signal confidence), with six
   invalidated assumptions and owners 2 -> 3 (one unscreened). Cost is non-zero (about $0.0022).
3. Lakeside stays quiet: its one low-confidence signal dies at step 1, so `analysis_depth` is 1 and
   cost is $0.00 ("baseline confirmed").

What this proves: drift, not keyword alerts; correlated signals jointly cross the threshold while a
non-material signal is filtered for free. (AI intelligence, cost efficiency.)

Verified by: `backend/tests/test_journeys.py` (`RunDemoJourneyTest`); `backend/tests/test_integration_pipeline.py`
(`HelvetiaCascadeTest`, `LakesideControlTest`, `QueueOrderingTest`).

### BJ2. Cost-aware cascade and the per-day meter

1. Each alert carries its own `cost` (tokens in/out and USD); the cascade spends the deep model only
   where it matters (Helvetia reaches step 3; Lakeside dies at step 1).
2. `GET /api/cost/today` aggregates across alerts (here: 2 alerts, the same ~$0.0022 total, since
   only Helvetia incurred cost).

What this proves: cost is tracked per alert and surfaced, and the cheap filter keeps the bill near
zero on no-change clients. (Cost efficiency.)

Verified by: `backend/tests/test_journeys.py` (`RunDemoJourneyTest.test_cost_today_aggregates_both_clients`);
`backend/tests/test_unit_pricing.py`.

### BJ3. Decision endpoint and the recommend-never-act invariant

1. `POST /api/alerts/{id}/decision` with `re_kyc` (or `edd`) sets status `actioned`; `escalate` sets
   `escalated`; `no_change` sets `dismissed`. Each writes an append-only `AuditEvent`.
2. `GET` requests never change state; the system only acts through this one human endpoint.
3. An unknown alert id returns HTTP 404.

What this proves: human-in-the-loop with a single, audited mutation path. (Compliance, safety.)

Verified by: `backend/tests/test_journeys.py` (`HelvetiaReKycJourneyTest`, `EscalateJourneyTest`,
`DismissJourneyTest`, `AuditIntegrityJourneyTest`); `backend/tests/test_api.py`.

### BJ4. Compliance and data-plane separation

1. The public source and steps 1 and 2 never import the private baseline; only the drift engine
   (step 3) and final assembly read it.
2. Every signal carries a source and a confidence, so every claim on the alert traces to an artifact.

What this proves: the data-plane boundary is enforced in code, and explainability is structural.
(Compliance, engineering.)

Verified by: `backend/tests/test_unit_dataplane.py`; `backend/tests/test_journeys.py`
(`AuditIntegrityJourneyTest`).

---

## How to run and verify

```powershell
# Cockpit (frontend)
cd frontend
npm install
npm run dev                 # http://localhost:3000  (walk FJ1-FJ8; open two windows for FJ6)
npm test                    # Vitest: state machine, view model, components, full-page journeys
npm run test:e2e:smoke      # Playwright: FJ1-FJ7 + the live cross-window FJ6, in a real browser
npx tsc --noEmit            # typecheck

# Pipeline (backend)
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000   # http://localhost:8000/docs
python -m unittest discover -s tests    # all backend tests, offline
```

### Verification log (this build, offline mode)

- Backend: `python -m unittest discover -s tests` -> 74 passed. Live curl walk: `GET /api/health` ok;
  `POST /api/run` -> Helvetia `LOW -> HIGH`, depth 3, re_kyc, aggregate 0.8695, cost $0.002187, six
  invalidated assumptions; Lakeside depth 1, $0.00; `GET /api/cost/today` -> 2 alerts; decision
  branches re_kyc -> actioned, escalate -> escalated, no_change -> dismissed; GET does not mutate;
  unknown id -> 404.
- Frontend: `npx tsc --noEmit` clean; `npm test` -> 73 passed; `npm run test:e2e:smoke` -> 6 passed
  (FJ1-FJ5 and FJ7 in a real browser; FJ6 cross-window sync is verified by the unit storage-event
  test and run as a manual two-window demo).
