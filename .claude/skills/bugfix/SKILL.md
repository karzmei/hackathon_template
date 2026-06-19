---
name: bugfix
description: >-
  Test-first bugfix discipline for DRIFTWATCH: reproduce the bug as a failing test (red) before
  touching product code, fix the root cause minimally (green), then sweep the codebase for the same
  pattern and fix every sibling in the same change, each with its own regression test. Run when the
  user reports a bug, asks to fix a defect/regression/crash/wrong output, or a test failure points at
  product code. Agents follow this for any bug fix, not only when the user names the skill.
---

# Bugfix (DRIFTWATCH)

A bug fix is not "make the symptom go away." It is: **prove the bug exists with a test, fix the
cause, then prove the same cause does not live elsewhere.** The three phases below run in order.
Skipping the red step or the sweep is the most common way a fixed bug comes back.

Core loop: **Red -> Green -> Sweep.**

Writing rule: no em dashes or double dashes in any code, comment, or message you add.

## When to activate (agents)

| Trigger | Scope |
|---------|-------|
| User reports a bug, crash, wrong output, regression, flaky behavior | The reported defect + its root-cause pattern |
| A `unittest` test fails and the cause is product code (not the test) | The failing assertion + the code under it |
| User says `/bugfix` or "fix this bug the right way" | As scoped by the request |

**Skip** (use the normal edit flow) for: new features, pure refactors with no behavior change,
docs/skill-only edits, dependency bumps, formatting. For feature work use
[`plan-build-isolated`](../plan-build-isolated/SKILL.md); for code-smell cleanup use
[`refactor-analyze`](../refactor-analyze/SKILL.md).

## Phase 0 - Reproduce and locate the root cause

1. **Reproduce.** Get a deterministic repro: a failing test, exact input, or request payload. The
   seed data in `backend/data/seed.py` (Helvetia drifts to HIGH; Lakeside dies at step 1) plus
   `POST /api/run` is usually the fastest way to trigger a pipeline bug offline. If you cannot
   reproduce it, say so and gather more (logs, actual vs expected) before editing.
2. **Find the root cause, not the symptom.** Trace from the symptom to the line that is actually
   wrong. A guard at the call site is a symptom patch; the missing validation upstream is the cause.
   Fix the cause.
3. **Name the pattern in one sentence**, e.g. "the drift engine assumes every signal carries `raw`
   deltas and throws on a signal without them." That sentence is what you grep for in the sweep.

## Phase 1 - Red: failing test first

Write the test **before** the production fix, and watch it fail.

- Put the test at the right altitude: a unit-style test for a pure function (drift scoring,
  dedup), a route test for an API/contract bug (mirror `backend/tests/test_api.py`), a pipeline
  test for a cascade bug (mirror `backend/tests/test_pipeline.py`).
- Tests are `@smoke`: call the **real** pipeline and route functions with the offline LLM stub, no
  mocks. The assertion must encode the **correct** behavior, so it fails now and passes after the fix.
- Run it and confirm it fails for the **right reason** (your assertion, not an import error):
  `cd backend; python -m unittest discover -s tests` (or a single class,
  `python -m unittest tests.test_pipeline.HelvetiaDriftTest`).
- Frontend bug: add or adjust the typed contract in `frontend/lib/api.ts`, verify with
  `cd frontend; npx tsc --noEmit`, and document a manual repro for UI behavior that has no test.

If the bug genuinely cannot be expressed as an automated test, say so explicitly and document the
manual repro steps in the PR; do not silently skip the red step.

## Phase 2 - Green: minimal root-cause fix

- Make the **smallest** change that fixes the cause named in Phase 0 and turns the red test green.
  No drive-by refactors; those go to a separate change ([`refactor-analyze`](../refactor-analyze/SKILL.md)).
- Apply write-time standards from [`clean-code`](../clean-code/SKILL.md), and respect the repo
  invariants: only `step4_human_review` mutates risk state; audit events are append-only; the public
  source and steps 1-2 never import the private source.
- Re-run the test (now green), then run the **full** suite to confirm no regression elsewhere.

## Phase 3 - Sweep: fix every sibling, not just the one reported

This is the phase agents skip and the reason bugs recur.

1. **Search for the pattern** named in Phase 0 across the whole repo, by function name, by the buggy
   idiom, and by the data shape. Use several angles; one search rarely finds them all. For a large
   sweep, delegate to an `Explore` subagent and act on the list it returns.
2. **Enumerate every hit** and triage each: same bug / related / false positive. Keep the list
   visible to the user.
3. **Fix each real sibling** in the same change and **add a regression test for each** (or one
   parametrized test covering all cases). A fix without a test is not done.
4. **No silent caps.** If you fix some and defer others, state which and why: "Found N, fixed M,
   deferred K because ...". Never quietly fix one and imply the class is clean.

## Phase 4 - Verify

- Run the full backend suite green: `cd backend; python -m unittest discover -s tests`.
- For frontend changes also `cd frontend; npx tsc --noEmit` (and `npm run build` for a UI change).
- Confirm the new regression test fails when the fix is removed; that is what proves it guards the bug.

## Commit

Commit with a focused, intent-first message that states the root cause, the repro test, and the
sweep result (N found / M fixed / K deferred). Stage deliberate paths only; never `git add .`.

## Anti-patterns

- **Fix before test.** The test then encodes the implementation, not the bug. Red first, always.
- **Symptom patch.** Guarding the crash site instead of fixing the cause upstream.
- **One-instance tunnel vision.** Fixing only the reported occurrence and skipping the sweep.
- **Test that never failed.** A regression test green before the fix proves nothing.
- **Silent sweep cap.** Fixing the easy hits and not reporting the rest.
- **Scope creep.** Bundling an unrelated refactor into the fix.

## Related

- Write-time standards: [`clean-code`](../clean-code/SKILL.md)
- Code-smell cleanup (not bugs): [`refactor-analyze`](../refactor-analyze/SKILL.md)
- Adversarial review of your own fix: [`self-review`](../self-review/SKILL.md)

## Keep this skill current

Update when the test entry points (`python -m unittest discover -s tests`), the test layout in
`backend/tests/`, or the Red -> Green -> Sweep phase model change.
