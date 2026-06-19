---
name: create-skill
description: >-
  Author or restructure a project agent skill in DRIFTWATCH. Defines the .claude/skills/ layout,
  frontmatter, SKILL.md structure, the catalog row, and a manual validation checklist. Run when the
  user wants to add a new skill, split an overloaded one, or fix a skill's structure.
---

# Create a skill (DRIFTWATCH)

Project skills live at **`.claude/skills/<name>/SKILL.md`** and are auto-loaded by Claude Code from
that path; no symlinks, no `.agents/` canonical tree, no `.mdc` rule stubs in this repo. Keep each
skill **self-contained** in a single `SKILL.md`; this repo does not use `reference.md` /
`evaluation.md` side files.

Writing rule for all skill text: no em dashes or double dashes; use semicolons, commas, or shorter
sentences (this matches the repo-wide rule in `CLAUDE.md`).

## When to activate (agents)

| Trigger | Scope |
|---------|-------|
| User asks to add a new skill or workflow guardrail | The new `<name>/SKILL.md` + a catalog row |
| A skill has grown two distinct jobs | Split into two skills, update both catalog rows |
| A skill's commands or invariants went stale | Fix the skill and its "Keep this skill current" note |

**Skip** for: editing the body of an existing, correctly structured skill (just edit it directly).

## Layout

```
.claude/skills/
  README.md            (catalog; one row per skill)
  <name>/SKILL.md      (one self-contained skill)
```

Name folders in `kebab-case`; the `name:` in frontmatter must equal the folder name.

## Required SKILL.md structure

1. **Frontmatter** (YAML): `name` (kebab-case, matches folder) and `description`. The description is
   what an agent reads to decide relevance, so write it as "what it does + when to run it", and make
   it specific. Use a block scalar (`>-`) for multi-line.
2. **Title** line: `# <Title> (DRIFTWATCH)`.
3. **When to activate (agents)** table: concrete triggers and the scope each implies, plus a
   **Skip** line for cases the skill must not fire on.
4. **Body:** the actual workflow, phases, or rules. Keep it tight; prefer tables and short lists.
   Encode any DRIFTWATCH invariant the skill touches (recommend-never-act, audit append-only,
   data-plane separation, cost meter).
5. **Related:** links to sibling skills with relative paths `../<name>/SKILL.md`. Only link to skills
   that exist in `.claude/skills/`.
6. **Keep this skill current:** one short paragraph naming the commands, paths, or contracts whose
   change should trigger an update to this skill.

## Commands a skill should reference (this repo)

- Backend tests: `cd backend; python -m unittest discover -s tests` (offline `@smoke`, no Azure key).
- Single test class: `python -m unittest tests.test_pipeline.HelvetiaDriftTest`.
- Frontend typecheck: `cd frontend; npx tsc --noEmit`; full build: `npm run build`.

Do not invent infra (no Docker, no `security-scan.sh`, no `validate-skills.sh`); reference only
commands that exist here.

## After authoring: manual validation checklist

There is no validation script; check by hand:

1. Frontmatter has `name` (matching the folder) and a specific `description`.
2. Every `../<name>/SKILL.md` link points to a skill folder that exists.
3. A catalog row was added to `.claude/skills/README.md`.
4. No em dashes or double dashes in the prose.
5. Every command in the skill runs in this repo.

## Related

- The writing standards a code-focused skill should encode: [`clean-code`](../clean-code/SKILL.md)
- Keeping docs aligned when a skill documents a contract: [`doc-sync`](../doc-sync/SKILL.md)

## Keep this skill current

Update when the skills location (`.claude/skills/`), the required SKILL.md structure, or the repo's
canonical commands change.
