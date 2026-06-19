---
name: refactor-analyze
description: >-
  Code-smell review on a diff for DRIFTWATCH: pattern divergence, naming, duplication, function
  size, dead code, simplification, and efficiency. Self-contained workflow with a severity/effort
  output table and an Apply/Verify policy. Run proactively after non-trivial backend/ or frontend/
  edits and before commit, not only when the user says /refactor-analyze.
---

# Refactor analysis (DRIFTWATCH)

A focused reading pass over a diff to catch maintainability smells before they ship. This is **not**
a bug hunt (use [`bugfix`](../bugfix/SKILL.md) for defects) and not a security audit (use
[`repo-security-check`](../repo-security-check/SKILL.md)). It catches code that works but reads or
ages badly.

Writing rule: no em dashes or double dashes in the report or any edits.

## When to activate (agents)

| Trigger | Scope |
|---------|--------|
| Finished implementation touching `backend/` or `frontend/` (>= 2 files or a new module/route/step) | `git diff` for the task |
| Before commit on a non-trivial change | Same diff; apply High + straightforward Medium |
| Before reporting "done" on a feature or bugfix | Same diff |
| User asks | `/refactor-analyze`, "refactor pass", "code smells", "maintainability" |

**Skip** for: docs-only, skill-only, single-line typo fixes.

## Pattern vocabulary (what to look for)

- **Naming** divergence from neighbors or from [`clean-code`](../clean-code/SKILL.md) (snake_case in
  `backend/`, camelCase in `frontend/`; booleans `is_*`/`has_*`).
- **Duplication:** the same logic in two steps, or a shape redefined instead of imported from
  `schemas.py` / mirrored once in `lib/api.ts`.
- **Function size / single purpose:** a step function doing filtering and scoring and assembly; split it.
- **Dead code:** unused params, unreachable branches, leftover scaffolding TODOs that are now done.
- **Divergence:** a new step that bypasses the orchestrator, a component that calls the API directly
  instead of through `lib/api.ts`, a config value hardcoded instead of read from `config.py`.
- **Simplification:** nested conditionals that flatten to a guard clause; a manual loop that is a
  comprehension; redundant Pydantic re-validation.
- **Efficiency:** an LLM call where a step-1 rule would do (cost matters here; the cascade exists to
  keep cheap work cheap), re-fetching the baseline more than once per alert.

## Output format

**Severity summary** - one line, e.g. `Summary: 2 High / 3 Medium / 1 Low`. If nothing after the
full pass, say so explicitly; no empty table.

**Evidence table** - one row per finding, ordered High -> Medium -> Low.

| # | Severity | Effort | Smell | File:line | Observation | Proposed change |
|---|----------|--------|-------|-----------|-------------|-----------------|

Severity: **High** = duplication or divergence that will cause drift or a maintenance trap; a
broken-window pattern others will copy. **Medium** = local smell worth fixing while the file is open.
**Low** = nit. Effort: **XS** one-line, **S** one function, **M** one file, **L** cross-file.

**High findings, one paragraph each** after the table.

## Apply and verify

- **Apply** when this pass is part of commit prep or an implementation task: fix all in-scope **High**
  findings and the straightforward **Medium** ones in touched files; defer **Low** and out-of-scope
  Medium with a one-line note. Keep refactors behavior-preserving; if a change alters behavior, it
  belongs in a [`bugfix`](../bugfix/SKILL.md) or feature change, not here.
- **Verify** if code paths changed:
  - Backend: `cd backend; python -m unittest discover -s tests` (offline `@smoke`, must stay green).
  - Frontend: `cd frontend; npx tsc --noEmit` (and `npm run build` for a UI change).

## Related

- Write-time standards (the rules this pass checks against): [`clean-code`](../clean-code/SKILL.md)
- Defects, not smells: [`bugfix`](../bugfix/SKILL.md)
- Adversarial self-review: [`self-review`](../self-review/SKILL.md)

## Keep this skill current

Update when the pattern vocabulary, the output table, or the verify commands change.
