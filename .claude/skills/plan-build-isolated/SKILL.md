---
name: plan-build-isolated
description: >-
  Isolated branch before implementing in DRIFTWATCH: feat/fix/chore/refactor branch from origin/main,
  with a worktree when the checkout is busy or parallel agents run. Run when the user clicks Plan mode
  Build, says /plan-build or plan and build, or says build/implement/execute the plan; run Phase 0
  before any file edit even if planning already finished. Verify with unittest + tsc; ask before
  publishing.
---

# Isolated plan -> build (DRIFTWATCH)

Plan and implement **never on a dirty unrelated checkout**, and prefer a dedicated branch off
`origin/main` so work is reviewable and easy to drop. This is a hackathon repo where the team works
on `main`, so the value here is a clean, named branch per feature plus verification before handoff.

Writing rule: no em dashes or double dashes in commit messages, branch notes, or PR text.

## When to activate (agents)

| Trigger | Phase order |
|---------|-------------|
| User clicked **Build** on an approved Plan mode plan | 0 -> 2 -> 3 -> 4 (plan already done; skip 1) |
| User says `/plan-build`, **plan and build**, **plan then build** | 0 -> 1 -> 2 -> 3 -> 4 |
| User says **build / implement / execute** the plan | 0 first, unless already on a branch for this task |

**Skip** when the user explicitly wants the current branch without isolation, or you are already on a
`<prefix>/<slug>` branch created for this task in this session (report the branch and go to Phase 2).

## Phase 0 - Isolate (before any edit; before planning on the plan-and-build path)

Run this **before the first `Write`/`Edit`**, including when Plan mode handed you an approved plan.

1. `git fetch origin`
2. If `git branch --show-current` is already `feat/*`, `fix/*`, `chore/*`, or `refactor/*` for this
   task, report it and skip to Phase 2.
3. Derive `<branch>` = `<prefix>/<short-slug>`:
   - `feat/` new user-facing work (default)
   - `fix/` bugfixes
   - `refactor/` structural change, no new behavior
   - `chore/` tooling, deps, skills, config
   Infer the prefix from the plan title or the user's words; make it unique on `origin` (append
   `-2`, `-3` if needed).
4. Choose isolation mode:

| Condition | Action (PowerShell) |
|-----------|---------------------|
| Tree dirty with unrelated edits, or parallel agents running | `$root = git rev-parse --show-toplevel; git worktree add ../hackathon_template-<slug> -b <branch> origin/main; cd ../hackathon_template-<slug>` |
| Clean checkout, single agent | `git checkout -b <branch> origin/main` |

5. In a new worktree, set up the envs you need before building:
   `cd backend; python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt`
   and `cd ../frontend; npm install`. Copy `backend/.env` over if you had one locally.
6. **Report** the branch name (and worktree path) before editing files.

## Phase 1 - Plan (plan-and-build path only)

Skip when the user already approved a plan. Otherwise survey scope (optional read-only `Explore`
subagent for large scope), restrict to user-named paths, write the plan, and stop for confirmation.

## Phase 2 - Build

Implement the **approved** plan only; apply [`clean-code`](../clean-code/SKILL.md) and the repo
invariants (recommend-never-act, audit append-only, data-plane separation, cost meter). Stage
deliberate paths only; never `git add .`.

## Phase 3 - Verify (hard stop on failure)

- Backend: `cd backend; python -m unittest discover -s tests` (offline `@smoke`, must be green).
- Frontend: `cd frontend; npx tsc --noEmit` (and `npm run build` for a UI change).

If either fails, stop and fix before Phase 4.

## Phase 4 - Handoff (ask before publishing)

> Ready to publish? I can commit and open a PR into `main`, or leave the changes on `<branch>` for
> your review.

| User answer | Action |
|-------------|--------|
| Yes | Run a refactor pass ([`refactor-analyze`](../refactor-analyze/SKILL.md)), commit with a focused intent-first message (stage deliberate paths, no `git add .`), push the branch, and open a PR into `main` |
| No / not yet | Report the branch, worktree path, and a diff summary; remind the user it is ready to publish later |

**Worktree cleanup:** only after the branch is merged, `git worktree remove ../hackathon_template-<slug>`
from the main checkout.

## Related

- Write-time standards applied during the build: [`clean-code`](../clean-code/SKILL.md)
- Pre-commit refactor pass: [`refactor-analyze`](../refactor-analyze/SKILL.md)
- If the build is fixing a defect: [`bugfix`](../bugfix/SKILL.md)

## Keep this skill current

Update when the branch-prefix set, the verify commands, the worktree setup steps, or the handoff
flow change.
