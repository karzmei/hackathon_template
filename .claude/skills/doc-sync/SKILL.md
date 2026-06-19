---
name: doc-sync
description: >-
  Keeps DRIFTWATCH docs and the cross-language contract aligned after code changes: README.md,
  CLAUDE.md, .env.example, and the schemas.py <-> frontend/lib/api.ts mirror. Run after a change that
  alters a schema, a route, an env var, a run command, or an architectural invariant, so the docs do
  not drift from the code.
---

# Doc sync (DRIFTWATCH)

Code changes that alter a contract, a command, or an invariant must update the docs in the same
change. The aim is a minimal, correct doc set, not exhaustive prose.

Writing rule: no em dashes or double dashes in any doc text you add.

## When to activate (agents)

| Trigger | Update |
|---------|--------|
| Changed a Pydantic model in `backend/schemas.py` | Mirror it in `frontend/lib/api.ts`; note the contract change in `CLAUDE.md` if a shape's meaning changed |
| Added or changed a FastAPI route in `backend/main.py` | README run/demo notes; the cost-meter or invariant note in `CLAUDE.md` if relevant |
| Added or renamed an env var | `.env.example` (name only) + the README/CLAUDE.md env section |
| Changed a run or test command | `README.md` and the Commands block in `CLAUDE.md` |
| Changed an architectural invariant (data planes, recommend-never-act, audit, cost meter) | The Key invariants / Architecture section of `CLAUDE.md` |

**Skip** when nothing user-facing or contractual changed (pure internal refactor with identical
shapes, commands, and invariants).

## The contract is the schema, not a hand-written spec

FastAPI serves a live OpenAPI doc at `/docs`, so there is no `openapi.yaml` to maintain. The single
source of truth is `backend/schemas.py`. The rule: **change a shape there first, then update
`frontend/lib/api.ts` and any affected pipeline step in the same change.** JSON keys are snake_case
on both sides; remember `DriftDimension` serializes by its `from`/`to` aliases, so `api.ts` must use
those key names.

## Minimal doc set by change type

- **Schema shape change** -> `schemas.py` (source) + `lib/api.ts` (mirror). Add a one-line note to
  `CLAUDE.md` only if the field's meaning or an invariant changed, not for a plain field add.
- **New route** -> a line in `README.md` under the run/demo steps; update the request-flow sentence
  in `CLAUDE.md` only if the pipeline path changed.
- **New env var** -> `.env.example` with the name and a comment, plus the env list in `README.md`.
  Never put a real secret in either file.
- **New command / changed port** -> the Commands block in both `README.md` and `CLAUDE.md`, kept
  identical (PowerShell form).
- **Invariant change** -> the Key invariants and Architecture sections of `CLAUDE.md`.

## How to work

1. Diff the code change; list which of the triggers above it hits.
2. Make the smallest doc edits that restore truth. Do not rewrite whole sections; edit the lines
   that are now wrong.
3. Verify the mirror by eye: every field in the changed `schemas.py` model exists in `api.ts` with
   the same key and a compatible type. Run `cd frontend; npx tsc --noEmit` to catch a broken mirror.
4. Confirm commands you documented actually run (at least the one you changed).

## Anti-patterns

- Updating `schemas.py` and forgetting `lib/api.ts` (or vice versa); the two must move together.
- Documenting a command you did not run.
- Adding aspirational docs for code that does not exist yet.
- Putting a real key in `.env.example`.

## Related

- The schema/api contract rules: [`clean-code`](../clean-code/SKILL.md)
- After a schema or route change, sweep for callers: [`refactor-analyze`](../refactor-analyze/SKILL.md)

## Keep this skill current

Update when the doc set (README, CLAUDE.md, .env.example), the schema/api mirror rule, or the
command list changes.
