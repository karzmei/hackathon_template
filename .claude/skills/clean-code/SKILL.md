---
name: clean-code
description: >-
  Proactive writing standards for DRIFTWATCH: Python in backend/ and TypeScript in frontend/.
  Function design, naming, types, error handling, tests, module boundaries, and the repo's
  invariants (recommend-never-act, audit append-only, data-plane separation, cost meter).
  Run when writing or modifying any source in those trees; agents apply from the start of
  implementation, not only on explicit review request.
---

# Clean code (DRIFTWATCH)

Apply these standards **while writing** code under **`backend/`** (Python) and **`frontend/`**
(TypeScript). They complement the reactive skills that run later: [`refactor-analyze`](../refactor-analyze/SKILL.md)
(diff pass) and [`self-review`](../self-review/SKILL.md) (adversarial check).

Writing rule for all comments, docstrings, and UI copy: no em dashes or double dashes; use
semicolons, commas, or shorter sentences.

## When to activate (agents)

| Trigger | Scope |
|---------|--------|
| Creating or editing any `*.py` under `backend/` | The file(s) being changed |
| Creating or editing any `*.ts` / `*.tsx` under `frontend/` | The file(s) being changed |
| Adding a pipeline step, source connector, FastAPI route, React component, or test | Same + adjacent boundary files |
| User asks for clean code / style / maintainability | Explicit review of touched files |

**Skip** for: single-line typo fixes, docs-only edits, and edits to `.claude/skills/**`.

## Quality pipeline (where this skill sits)

```
WRITE  -> clean-code (this skill)
          v
POST   -> refactor-analyze (git diff, code smells)
          v
DONE   -> self-review (optional, user-triggered adversarial pass)
          v
COMMIT -> focused, intent-first commit (stage deliberate paths, never `git add .`)
```

## 1. Function design (both trees)

- Prefer **small, single-purpose** functions; if the name needs "and", split it.
- **Guard clauses / early returns**; keep nesting shallow (avoid `if` inside `else` inside `if`).
- Orchestrators may be longer only when they **delegate**; `pipeline/orchestrator.py` chains the
  four steps without inlining their logic, which is the pattern to follow.
- Pure helpers where possible; side effects (HTTP, store writes, LLM calls) live at the boundaries.

## 2. Naming

| Kind | Python (`backend/`) | TypeScript (`frontend/`) |
|------|---------------------|--------------------------|
| Functions / vars | `snake_case` (`run_agent`, `live_profile`) | `camelCase` (`fetchAlert`, `rawFacts`) |
| Classes / types / components | `PascalCase` (`BaselineProfile`) | `PascalCase` (`SignalTimeline`, `Alert`) |
| Constants | `UPPER_SNAKE_CASE` (`PRICE_TABLE`) | `UPPER_SNAKE_CASE` (`API_BASE_URL`) |
| Booleans | `is_*` / `has_*` (`is_material`) | `is*` / `has*` / `should*` |
| Action verbs | `score_*`, `build_*`, `run_*`, `load_*`, `assemble_*` | `fetch*`, `map*`, `render*` |

JSON keys cross the boundary, so they stay **snake_case** on both sides; the TS interfaces in
`frontend/lib/api.ts` mirror the Pydantic models exactly. `DriftDimension` uses field aliases
`from`/`to`; FastAPI serializes by alias, so the JSON keys are `from`/`to`, and `api.ts` must use
those names too. Avoid abbreviations unless already established (`kyc`, `llm`, `avb`).

## 3. Types and contracts

- **`backend/schemas.py` is the contract.** Every shape (Client, BaselineProfile, Signal,
  LiveProfile, DriftScore, Alert, Decision, AuditEvent) is a Pydantic model. Change a shape there
  first, then update `frontend/lib/api.ts` and any affected step in the same change.
- Backend: full **type hints** on function signatures; validate external input with Pydantic, not
  ad-hoc dict access.
- Frontend: **`type`** over `interface` for object shapes; **no `any`** (narrow with a type guard);
  use `import type` for type-only imports.

## 4. Error handling

- Backend: raise real exceptions, never return sentinel strings for errors. **No bare `except:`**;
  catch the specific exception and let unexpected ones surface.
- **No fail-open** on missing config or auth. The LLM path is the one deliberate exception: when
  Azure is not configured, `run_agent` returns the caller's explicit, labelled `offline_response`;
  that is a documented demo fallback, not a silent mock, and it must stay labelled.
- Frontend: branch UI on a typed error/status, not on message text; one `try/catch` per data-fetch
  boundary in `lib/api.ts`.

## 5. Comments

- Comment **non-obvious business rules** (a drift threshold, a cost-cascade decision), not syntax.
- No narration (`# increment counter`). Let names carry the meaning.
- HTTP contracts live in the FastAPI route signatures and Pydantic models (served at `/docs`), not
  in source comments.

## 6. Tests

- Backend tests are **`@smoke`**: they call the real pipeline and route functions (not mocks) with
  the offline LLM stub, so `unittest` passes without an Azure key or the ADK packages installed.
- Put new tests in `backend/tests/`, mirroring `test_pipeline.py` and `test_api.py`.
- Run: `cd backend; python -m unittest discover -s tests` (single class:
  `python -m unittest tests.test_pipeline.HelvetiaDriftTest`).
- Frontend: typecheck with `cd frontend; npx tsc --noEmit`; full build with `npm run build`.

## 7. Module boundaries and repo invariants

These are enforced by reading imports and code paths; treat them as hard rules.

| Rule | Where |
|------|-------|
| **Data-plane separation:** the public source (`sources/public_source.py`) and steps 1-2 must never import the private source (`sources/private_source.py`). Only the drift engine (step 3) and final assembly read the baseline. | `backend/sources/`, `backend/pipeline/` |
| **Recommend, never act:** no code path changes a client's risk state except `step4_human_review`. | `backend/pipeline/step4_human_review.py` |
| **Audit everything:** state changes append an `AuditEvent`; never mutate or delete one. | `backend/store.py` |
| **Cost meter:** step2 + step3 costs sum onto `Alert.cost`; keep the price table in `config.py` so figures stay deterministic. | `backend/config.py`, `backend/llm/adk_agent.py` |
| Frontend components live in `frontend/components/`; all API access goes through `frontend/lib/api.ts`. | `frontend/` |

## 8. Logging and privacy

- Log **presence, counts, status, cost, latency**; do not log raw signal text, baseline records, or
  full LLM payloads.

## Self-check before handoff

Function size and single purpose; naming matches the table; `schemas.py` and `api.ts` still agree;
no `any`, no bare `except`, no fail-open; tests added and green offline; data-plane and
recommend-never-act invariants intact; no em dashes in new prose.

## Related

- Post-write diff analysis: [`refactor-analyze`](../refactor-analyze/SKILL.md)
- Adversarial self-check: [`self-review`](../self-review/SKILL.md)
- Keeping docs and the schema contract aligned: [`doc-sync`](../doc-sync/SKILL.md)

## Keep this skill current

Update when the repo's language conventions, the `schemas.py` <-> `api.ts` contract rules, the
data-plane import rule, or the test entry points change.
