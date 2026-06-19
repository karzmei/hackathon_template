---
name: self-review
description: >-
  Adversarial self-review of the agent's own recent work: re-examines the working tree plus commits
  made this session, checks intent-vs-implementation, missed edge cases, test gaps, hidden
  assumptions, and pattern divergence; produces a severity-grouped, effort-rated follow-up fix plan
  and lists adjacent areas worth further testing. Run when the user invokes /self-review or asks the
  agent to review its own work or spot what it missed. Complements refactor-analyze (code smells) and
  repo-security-check (broad audit); delegate findings in those lanes rather than duplicating them.
---

# Self-review of own recent work (DRIFTWATCH)

This skill is the agent reviewing **its own output** as if a stranger wrote it. Adversarial,
evidence-first, no rubber-stamping. The goal is to surface what the implementation pass missed:
gaps in intent coverage, untested edge cases, hidden assumptions, divergence from surrounding
patterns, and to produce a concrete follow-up plan, not a vague "looks good".

Frame every run with: **"Treat this diff as if a stranger wrote it. Your job is to find what's
wrong, not to defend it."**

Writing rule: no em dashes or double dashes in the report.

## When to activate (agents)

| Trigger | Scope |
|---------|-------|
| User says `/self-review` | Working tree + this session's commits (see Scope) |
| User asks "did you miss anything", "review your own work", "self-check before I push" | Same |
| User scopes by path: `/self-review backend/pipeline` | Restrict diff and commit walk to those paths |

**Skip** for: docs-only edits, single-line typo fixes, skill-only changes, formatting-only passes.

## Scope: what counts as own past work

Review two layers together:

1. **Working tree:** `git status` plus `git diff` (staged and unstaged).
2. **This session's commits:** commits by the current user ahead of the base branch. PowerShell:
   ```powershell
   git log --author="$(git config user.email)" main..HEAD
   ```
   Use `main..HEAD` (this repo works on `main`); if an upstream is set, prefer
   `@{u}..HEAD`. Restrict both layers to user-named paths when given.

**Empty scope.** If `git diff`, `git diff --cached`, and the session-commit log are all empty, say
so and exit ("Nothing to review; clean tree, no commits ahead."). Do not produce a vacuous "looks
good". Do **not** expand scope to files the agent did not touch; that is review of others' code.

## The seven lenses

Walk every change through each lens. Anything that does not fit a lens still belongs in the table.

1. **Intent vs. implementation.** Restate in one sentence what the user asked for. Map every change
   to a clause. Anything unmapped is suspect: gold-plating, scope creep, or a misread.
2. **Missed edge cases.** Walk the taxonomy: empty / boundary / large / null-or-missing / concurrent
   / partial-failure / time / locale. For DRIFTWATCH specifically: a signal with no `raw` deltas, a
   client with no baseline, an immaterial signal that should die at step 1, the Azure-offline path,
   a zero-cost alert. List the cases the code does **not** exercise.
3. **Hidden assumptions about system state.** What does the code assume is true: env var set, Azure
   configured, store reset by `POST /api/run`, baseline present, ADK installed? For each, add a
   "what happens if false?" note.
4. **Pattern consistency.** Same error-handling, logging, and config-access style as neighbors?
   Diverging from surrounding code is a smell even when the new code is technically correct.
5. **Security-sensitive surface (fast scan).** Hardcoded secrets, untrusted public-signal text
   flowing into an LLM prompt or a query, missing input validation, log lines that leak signal or
   baseline content. Deep audits belong to [`repo-security-check`](../repo-security-check/SKILL.md);
   this lens flags suspects, it does not resolve them.
6. **Test coverage and observable behavior.** What changed behavior has a `@smoke` test? What has
   **none**? Are tests calling the real pipeline or only asserting trivia? Were tests written after
   the implementation (weak signal that they encode the implementation, not the requirement)?
   Distinguish "tested" from "type-checked" from "ran once".
7. **Reversibility and blast radius.** Does the change touch risk state outside `step4_human_review`,
   mutate or delete an `AuditEvent`, or break data-plane separation (steps 1-2 importing the private
   source)? Flag these explicitly even when they look correct; they violate repo invariants.

## Output format

Produce exactly this, in this order, every run. Lead with the highest-severity findings.

**Severity summary** - one line above the table, e.g. `Summary: 3 High / 2 Medium / 1 Low`. If there
are truly no findings after all seven lenses, write `No findings after walking all seven lenses:
<list them>` instead of an empty table.

**Evidence table** - one row per finding, ordered High -> Medium -> Low.

| # | Severity | Effort | Lens | File:line | Observation | Proposed action |
|---|----------|--------|------|-----------|-------------|-----------------|

Severity: **High** = behavior wrong, missing test for changed behavior, hidden assumption that
breaks in production, security suspect, repo-invariant violation. **Medium** = pattern divergence,
edge case unlikely in context. **Low** = nit, naming, clarification.

Effort: **XS** = one-line/local. **S** = single function. **M** = multi-function or one file.
**L** = cross-file or a new abstraction.

**High findings, one paragraph each** - after the table, one short paragraph per High row: impact and
suggested fix direction.

**Follow-up fix plan** - two groups: *Must-fix before handoff* (every High row) and *Nice-to-have*
(Medium/Low worth doing while the change is open).

This skill is **read-only**; it never applies the fixes itself. When the fix plan is non-trivial
(more than about 3 edits or any cross-file change), propose entering plan mode for the fixes.

**Suggested further testing** - bulleted; each bullet ties to a row by `#`, names the test type
(unit / pipeline / route / manual repro), and gives a one-line justification.

## Anti-patterns

- **Don't rubber-stamp.** "Looks good" without an evidence table is a failure of the skill.
- **Don't duplicate other skills.** Code-smell findings -> [`refactor-analyze`](../refactor-analyze/SKILL.md);
  deep security findings -> [`repo-security-check`](../repo-security-check/SKILL.md). Reference, do not restate.
- **Don't run tests or scanners here.** This is a reading pass.
- **Don't expand scope** to files the agent did not touch.
- **Don't defend the code.** Write down what the lenses surface, even when uncomfortable.
- **Don't bury the Highs.** Lead with the summary count; order High -> Low.

## Related

- Refactor pass (code smells): [`refactor-analyze`](../refactor-analyze/SKILL.md)
- Deep security audit: [`repo-security-check`](../repo-security-check/SKILL.md)
- Write-time standards: [`clean-code`](../clean-code/SKILL.md)

## Keep this skill current

Update when the lens list changes, the session-commit detection changes, the output format changes,
or the delegation boundary with refactor-analyze / repo-security-check shifts.
