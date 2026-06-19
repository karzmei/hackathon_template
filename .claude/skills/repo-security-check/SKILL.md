---
name: repo-security-check
description: >-
  Structured, evidence-first security audit for DRIFTWATCH: FastAPI routes and input validation,
  secrets and .env handling, the LLM prompt-injection boundary (untrusted public signals), data-plane
  separation as a security boundary, audit-log integrity, and dependency supply chain. Run when the
  user asks for a security review or /security-review, or before publishing a change that touches
  routes, sources, the LLM path, secrets, or dependencies.
---

# Security check (DRIFTWATCH)

A structured audit of the things most likely to go wrong in this stack. Evidence-first: every
finding names a file and line and states the concrete risk, not a generic worry. Prefer pass/fail
gates over prose. Delegate deep, single-issue rabbit holes to a focused subagent and summarize.

Writing rule: no em dashes or double dashes in the report.

## When to activate (agents)

| Trigger | Scope |
|---------|-------|
| User says `/security-review`, "security check", "is this safe" | The named scope or the current diff |
| About to publish a change touching FastAPI routes, `sources/`, the LLM path, `.env`, or deps | That change |
| New external input reaches the LLM, the store, or a route | The new data path |

**Skip** for: docs-only, skill-only, pure styling changes.

## Lenses (DRIFTWATCH-specific)

1. **API / input validation (`backend/main.py`).** Every route input is a Pydantic model, not raw
   dict access. Path/query params validated. No route mutates risk state outside the
   `step4_human_review` path. Errors do not leak stack traces or internal data to the client.

2. **Secrets and config (`backend/config.py`, `.env`, `.env.example`).** No hardcoded keys
   (`AZURE_OPENAI_API_KEY`, optional `OPENSANCTIONS_API_KEY`, `NEWS_API_KEY`). `.env` is
   gitignored; `.env.example` carries names only, never real values. Missing config fails closed or
   uses the explicit labelled offline stub, never a silent permissive default.

3. **LLM boundary / prompt injection (`backend/llm/adk_agent.py`, steps 2-3).** Public signals are
   **untrusted text** (Layer 1). When they are interpolated into a `run_agent` prompt, treat them as
   data, not instructions: they must not be able to flip the decision, exfiltrate the baseline, or
   change the recommended action on their own. The model **recommends**; only a human at step 4 acts.
   Check that signal text is never concatenated into a shell command, a query, or eval.

4. **Data-plane separation as a security boundary (`backend/sources/`).** Confirm the public source
   and steps 1-2 do not import `private_source.py`. The internal baseline (Layer 2) is the sensitive
   record; only the drift engine (step 3) and final assembly may read it. A leak across this line is
   a confidentiality bug, not just an architecture smell.

5. **Audit-log integrity (`backend/store.py`).** `AuditEvent`s are append-only; nothing mutates or
   deletes them. State changes always write an audit event. The store reset on `POST /api/run` is a
   demo behavior; confirm it cannot be triggered by an unauthenticated external caller in a way that
   erases an audit trail unexpectedly.

6. **Logging / PII.** No raw signal text, baseline records, or full LLM payloads in logs; log
   presence, counts, status, cost.

7. **Dependency supply chain.** `backend/requirements.txt` and `frontend/package.json`: no obviously
   abandoned or typosquatted packages, versions pinned sensibly. Flag any dependency that handles
   untrusted input and is unpinned.

## Output format

**Verdict line:** `PASS` or `FAIL (N High)`. A single High finding fails the gate.

**Findings table**, ordered by severity:

| # | Severity | Lens | File:line | Risk | Fix |
|---|----------|------|-----------|------|-----|

Severity: **High** = exploitable or a secret/PII/baseline leak or a broken repo invariant. **Medium**
= weakness that needs another condition to exploit. **Low** = hardening nit.

For each High, one paragraph: the attack or leak path and the concrete fix.

This skill reports; it does not silently apply fixes. Route fixes through [`bugfix`](../bugfix/SKILL.md)
(if a defect) or a normal change, and re-run this check after.

## Anti-patterns

- Generic worries with no file:line. Every finding is concrete or it is not a finding.
- Rubber-stamping. If you did not check a lens (e.g. could not see the deployed env), say so.
- Duplicating [`self-review`](../self-review/SKILL.md)'s fast security scan; this is the deep pass.

## Related

- Fast security scan inside a self-review: [`self-review`](../self-review/SKILL.md)
- Data-plane and invariant rules: [`clean-code`](../clean-code/SKILL.md)

## Keep this skill current

Update when routes, the sources/data-plane layout, the LLM path, the secret set, or the dependency
manifests change.
