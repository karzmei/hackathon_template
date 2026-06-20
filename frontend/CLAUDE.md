# CLAUDE.md (frontend)

Guidance for the `frontend/` workspace. See the root `../CLAUDE.md` for product domain, the
backend pipeline, and the cross-language contract; this file covers the UI only.

Writing rule (same as root): no em dashes or double dashes; use semicolons, commas, or shorter
sentences.

## What this is

The DRIFTWATCH cockpit: a Next.js (App Router, TypeScript, Tailwind v4) single-page UI. It is a
three-role KYC drift cockpit. A seat picker chooses a role (Relationship Manager or Account Manager
on the first line, Compliance on the second line); each role scans a ranked book of drifting clients
on the left and works a cited case file on the right. Cases flow up (escalate), sideways (RM <-> AM
handover) and back down (Compliance instruction), and the shared case state syncs across browser
windows so the handoff can be run live. The cockpit is frontend-only; it does not call the backend.

## Layout

- `app/`: `layout.tsx` loads fonts (Geist, Source Serif 4) and `globals.css`; `page.tsx` is the
  cockpit. It calls the `useCockpit()` hook for state, builds the view model, renders the
  `LoginScreen` until a role is chosen, then the app shell, and routes detail-pane button keys to
  the matching hook action.
- `components/cockpit/`: presentational, props-driven, `"use client"` components. `LoginScreen`
  (seat picker); `AppHeader` (brand, Compliance inbox pill, role badge, switch role); `Sidebar`
  (role nav + lines-of-defence legend); `CaseList` (the ranked middle rail); `CaseDetail` (the case
  file: risk delta, drift signals, what-changed timeline, key facts, recommendation, instruction
  flow, decision actions, case conversation, audit trail). `components/ui/` holds the shadcn/base-nova
  primitives (`button`, `severity-badge`).
- `lib/`: `cockpit-types.ts` (model types + the `TONES`/`ROLES` maps), `cockpit-seed.ts` (the seven
  seeded cases), `cockpit-view.ts` (pure view-model helpers: `buildView`, `statusPill`, `recVM`,
  `rowVM`, `navItem`), `use-cockpit.ts` (the stateful hook: localStorage persistence, cross-window
  sync, all actions), `api.ts` (typed backend client, the `schemas.py` contract; not used by the
  current cockpit but kept as the cross-language contract), `utils.ts` (`cn`).
- `e2e/`: Playwright `@smoke` specs. `test/setup.ts` is the Vitest setup (RTL matchers, cleanup).

## Commands (Windows / PowerShell)

```powershell
cd frontend
npm install
npm run dev            # http://localhost:3000
npm run build          # production build / full typecheck
npx tsc --noEmit       # typecheck only
npm test               # Vitest unit + component tests (vitest run)
npm run test:e2e       # Playwright e2e (auto-boots dev server; seeds localStorage)
npm run test:e2e:smoke # Playwright, @smoke only
```

## Architecture (cockpit)

Single page. `page.tsx` calls `useCockpit()` (the only stateful piece), derives the view model with
`buildView(...)`, and passes plain data plus callbacks down to presentational components. `CaseDetail`
renders the UX sections in order: risk delta and what it implies first, then the drift signals and
the source-cited "what changed" timeline, then key facts and the recommendation, then the decision
actions with the status pill and the append-only audit trail. All presentation logic is pure
functions in `cockpit-view.ts`, so components stay declarative and the logic is unit-testable
without React. Detail-pane buttons carry a string `key`; `page.tsx` maps each key to a hook action,
which keeps the view model free of handlers.

## Data layer (localStorage, frontend-only)

State lives entirely in the browser. `use-cockpit.ts` seeds the seven cases from `cockpit-seed.ts`
into `localStorage` (key `dw_p1_cases_v2`) on first load and persists every change there; the chosen
role lives in `sessionStorage` (key `dw_p1_role`). A 1100ms poll plus the `storage` event keep two
windows in sync, which is what makes the live first-line/second-line handoff demo work. The only
path that mutates a case is a user action (escalate, handover, decide, confirm, send message), each
appending an audit entry; nothing is ever deleted from the audit trail.

## Contract (api.ts <-> schemas.py)

`lib/api.ts` mirrors `backend/schemas.py` (snake_case JSON; `DriftDimension` uses the `from`/`to`
aliases). The current cockpit does not call it, but it is kept as the documented cross-language
contract: change a backend shape, then mirror it here.

## Styling

Tailwind v4 via `@tailwindcss/postcss`. Design tokens are oklch CSS custom properties in
`app/globals.css`, surfaced as utilities through `@theme`, with a semantic status palette
(success/warning/danger/info), reused by the `TONES` map in `cockpit-types.ts`. Dark mode is
class-gated (`.dark`) and currently light-only. The cockpit is pixel-tuned from a design prototype,
so components lean on inline `style` for dynamic and branded colour/spacing; the cockpit motion
(`dw-pulse`, `dw-in`, `dw-bar`) and hover helpers live in `app/globals.css`. Compose class names
with `cn()` from `lib/utils.ts`.

## Conventions

- Keep components presentational and props-driven; lift state to `page.tsx`. Add accessibility
  attributes (`aria-*`, semantic roles).
- Tests are colocated as `*.test.tsx` (Vitest + React Testing Library, jsdom). Adapt existing tests
  rather than adding new ones; e2e specs are `@smoke` in `e2e/`.
- Keep dependencies minimal; small files, clear names, comments only for non-obvious logic.
