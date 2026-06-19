# Project Agent Skills (DRIFTWATCH)

**Canonical path:** `.claude/skills/`. Claude Code auto-loads these project skills from here; there
are no symlinks or `.agents/` mirror in this repo. Each skill is `skill-name/SKILL.md`, self-contained
(no `reference.md` / `evaluation.md` side files). Author new skills with
[create-skill](create-skill/SKILL.md).

These were ported from the `inc-b2c-mvp` skill library and adapted to this repo: Python + FastAPI
backend, Next.js (App Router) frontend, Windows / PowerShell, offline `@smoke` `unittest` tests, no
Docker. Domain-specific skills from that repo (insurer onboarding, coverage eval, localization,
Azure/Cosmos ops, cloud-agent automation) were intentionally not ported.

Writing rule across all skills and generated copy: no em dashes or double dashes; use semicolons,
commas, or shorter sentences.

| Skill | Agent runs when (summary) | Command |
|-------|---------------------------|---------|
| [clean-code](clean-code/SKILL.md) | Proactive write-time standards for `backend/` (Python) and `frontend/` (TS) | - |
| [bugfix](bugfix/SKILL.md) | Fix a defect: failing `@smoke` test first, root-cause fix, sweep for siblings | `/bugfix` |
| [refactor-analyze](refactor-analyze/SKILL.md) | Code-smell pass on a diff after non-trivial edits and before commit | `/refactor-analyze` |
| [self-review](self-review/SKILL.md) | User asks the agent to review its own recent work (working tree + session commits) | `/self-review` |
| [repo-security-check](repo-security-check/SKILL.md) | Security audit: routes, secrets, LLM boundary, data planes, audit log, deps | `/security-review` |
| [doc-sync](doc-sync/SKILL.md) | Keep README, CLAUDE.md, .env.example, and the schemas.py <-> api.ts contract aligned | - |
| [plan-build-isolated](plan-build-isolated/SKILL.md) | Isolated branch before building; verify with unittest + tsc; ask before publishing | `/plan-build` |
| [create-skill](create-skill/SKILL.md) | Add or restructure a skill; defines the `.claude/skills/` layout | - |

**Quality pipeline:** clean-code (write) -> refactor-analyze (diff) -> self-review (optional
adversarial pass) -> focused commit. Bugfixes run the bugfix loop; security-sensitive changes run
repo-security-check before publishing.
