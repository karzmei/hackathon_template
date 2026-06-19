# Project instructions for Codex

We are building a reusable hackathon app/demo template.

Main goal:
- Help me quickly build working AI/data/ML prototypes during a hackathon.
- Use a lightweight but reasonable architecture. Separate frontend, backend, schemas, and service logic clearly, but avoid production-level complexity unless it directly helps the demo.

Tech stack:
- Python
- FastAPI backend
- Streamlit frontend
- Pydantic for request/response schemas
- OpenAI/other LLM APIs through a small wrapper
- Pandas/DuckDB or SQLite for simple data handling
- PDF/text ingestion for RAG-style demos
- Plotly for simple charts

Project structure:
- backend/
  - main.py
  - schemas.py
  - services/
- frontend/
  - app.py
- examples/
- .env.example
- README.md
- Makefile or simple run scripts

Coding preferences:
- Keep dependencies minimal.
- Do not add heavy frameworks unless clearly useful.
- Use clear and informative function names and small files.
- Avoid overengineering.
- Prefer boring, robust solutions.
- Add comments only where they clarify non-obvious logic.
- Never hardcode API keys or secrets.
- Use environment variables and provide .env.example.
- When changing code, prefer minimal targeted edits over rewriting everything.

Workflow:
- Before implementing large changes, propose a short plan and file structure.
- After implementing, provide exact run commands.
- Mention likely failure points.
- When debugging, find the minimal fix first.
- Do not silently mock core functionality unless explicitly marked as mock/demo code.

Hackathon priorities:
1. Working demo
2. Clear user flow
3. Reliable enough for live presentation
4. Easy to modify quickly
5. Clean README

---

# Agent workflow

**Audience:** Claude Code, Cursor, and any other agent working in this repo. The sections above are
the original product brief; the stack actually in use (Next.js frontend, Python/FastAPI backend,
Google ADK over Azure) is authoritative in [`CLAUDE.md`](CLAUDE.md). Read `CLAUDE.md` for project
facts, architecture, and invariants; read this section for how to work, commit, and ship.

Writing rule (this file and all generated text, comments, and copy): do not use em dashes or double
dashes; use semicolons, commas, or shorter sentences.

## Operating defaults (all agents)

- Research the relevant code before editing; do not assume the files named in a prompt are
  exhaustive. Use the search tools (Grep, Glob, Explore) rather than shell `grep`/`find`.
- Start ambiguous tasks with a short plan, then execute end to end without unnecessary back and
  forth.
- Favor minimal, targeted edits; keep the parts independently runnable, as the scaffold intends.
- Prefer verifiable checks (build, test, typecheck, runtime) over speculative claims. Report
  evidence first (paths, commands, observed output), then recommendations.
- Keep code maintainable and clean; match the surrounding style, naming, and comment density.
- Never expose secrets in output; redact secret-like values in logs and snippets.
- At the end of a change, consolidate duplicates rather than keeping parallel copies; there is
  usually no need to preserve backwards compatibility.

## Testing

- Do Test Driven Development when relevant: decide the strict test first, calling real
  functionality rather than mocks, implement until it passes, and adapt the implementation rather
  than weakening the test.
- Adapt existing tests instead of adding near-duplicates. If you create a temporary test file, fold
  the useful parts into the permanent suite and delete the scratch file.
- Backend tests are `@smoke`: they call the real pipeline and route functions with the offline LLM
  stub, so they pass without an Azure key or the ADK packages. Run them from inside `backend/`:
  `python -m unittest discover -s tests`.
- Frontend: `npm run build` (full typecheck) or `npx tsc --noEmit`, plus the component and lib tests
  under `frontend/`.
- Run the tests relevant to your change and confirm they pass before handoff; if they fail, say so
  with the output rather than claiming success.

## Commits

- Commit or push only when the user asks. Never bypass hooks (`--no-verify`) or signing unless the
  user explicitly asks; if a hook fails, fix the underlying issue.
- Before committing, sync with `origin` and resolve any conflicts; self review the diff for leftover
  scaffolding, debug code, or secrets.
- Stage deliberately; prefer one logical change per commit. Write a concise, imperative subject that
  says what changed and why; keep the body short.
- Run the relevant tests before committing, and inspect the result with `git show` after.

## Pull requests and merge

- Do not commit straight to `main`; branch first (for example `feat/...`, `fix/...`, `docs/...`),
  then open a PR. Remote is `origin` -> `https://github.com/karzmei/hackathon_template.git`.
- Use the `gh` CLI for PR and issue operations. Keep the PR description short: what changed, why, and
  how it was verified.
- Drive the PR checks to green yourself; re-sync with `main` first if it has moved. Do not use
  `--admin` or force pushes to bypass failing checks; fix the cause.
- Merge with squash once checks pass, unless the user asks otherwise. Confirm before any action that
  is hard to reverse or outward facing.

## Agent config layout

| What | Edit here | Notes |
|------|-----------|--------|
| Agent workflow defaults | **`AGENTS.md`** | this section |
| Project facts, stack, architecture, invariants | **`CLAUDE.md`** | read first; authoritative stack |
| Skills, commands (if added) | **`.claude/skills/`**, **`.claude/commands/`** | one focused file each |
| User-facing overview | **`README.md`** | |

- Keep instructions concise and composable; prefer several focused files over one long rule.
- When you add a skill or command, give it a clear name and a single responsibility; reference it
  from here rather than inlining the full workflow.
- When a change shifts a workflow that this file or `CLAUDE.md` documents, update the doc in the same
  change; do not wait to be told to keep docs in sync.

## Basic agent instructions

- This is a hackathon scaffold with deliberately stubbed parts (`# TODO`) so pieces can be built
  independently. Respect that seam; do not collapse independently runnable modules.
- Honor the key invariants in `CLAUDE.md`: recommend, never act (only `step4_human_review` mutates
  risk state); audit everything (append `AuditEvent`, never mutate or delete one); keep the public
  data plane from importing the private source.
- The contract is `backend/schemas.py`; if you change a shape, update `frontend/lib/api.ts` and any
  affected pipeline step in the same change.
- Run the backend from inside `backend/` so the flat imports resolve.