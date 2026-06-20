# CLAUDE.md (frontend)

Guidance for the `frontend/` workspace. See the root `../CLAUDE.md` for product domain, the
backend pipeline, and the cross-language contract; this file covers the UI only.

Writing rule (same as root): no em dashes or double dashes; use semicolons, commas, or shorter
sentences.

## What this is

The DRIFTWATCH cockpit: a Next.js (App Router, TypeScript, Tailwind v4) single-page UI. An analyst
runs the pipeline, scans a queue of drifting clients on the left, and reviews a cited case file
with three decision actions on the right.

## Layout

- `app/`: `layout.tsx` loads fonts (Geist, Source Serif 4) and `globals.css`; `page.tsx` is the
  cockpit and owns all state (selected alert, queue rows, today's cost), runs the pipeline, and
  passes data down to components.
- `components/`: presentational, props-driven, `"use client"` components. `CockpitHeader` (brand,
  cost/signals pill, Run button); `QueueRail` (the left list, each row with a `Sparkline`);
  `DetailPane` (the case file, orchestrates `DriftBand`, `DimensionDrift`, `SignalTimeline`,
  `ActionBar`, `CostMeter`, `StatusPill`). `components/ui/` holds the shadcn/base-nova primitives
  (`button`, `card`, `badge`, `severity-badge`).
- `lib/`: `api.ts` (typed backend client), `data.ts` (mock-first data layer; UI calls this),
  `mock.ts` (typed offline dataset), `cockpit.ts` (pure view-model helpers), `risk.ts` (risk
  styling helpers), `utils.ts` (`cn`).
- `e2e/`: Playwright `@smoke` specs. `test/setup.ts` is the Vitest setup (RTL matchers, cleanup).

## Commands (Windows / PowerShell)

```powershell
cd frontend
npm install
npm run dev            # http://localhost:3000
npm run build          # production build / full typecheck
npx tsc --noEmit       # typecheck only
npm test               # Vitest unit + component tests (vitest run)
npm run test:e2e       # Playwright e2e (auto-boots dev server with mock data)
npm run test:e2e:smoke # Playwright, @smoke only
```

## Architecture (cockpit)

Single page, not a route per alert (the old `app/alerts/[id]/` route was removed). `page.tsx` holds
state, passes data down via props, and receives changes back through callbacks. `DetailPane`
renders the four UX requirements in order: risk delta and what it implies first, then
baseline-vs-current (`DimensionDrift`), then the source-cited timeline (`SignalTimeline`), then the
three decision actions with status pill and audit trail (`ActionBar`). Presentation logic lives in
pure functions in `cockpit.ts` so components stay declarative and testable.

## Data layer (mock-first)

The UI calls `data.*`, never `api.*` directly. `data.ts` tries the real backend and falls back to
typed mocks from `mock.ts` on any error, or whenever `NEXT_PUBLIC_USE_MOCK=1` (set by the Playwright
config). It keeps an in-session mutable store so offline decisions persist for the page lifetime,
mirroring backend `store.py` behavior. This is what lets the demo run with no backend or LLM key.

## Contract (api.ts <-> schemas.py)

Types in `lib/api.ts` mirror `backend/schemas.py`; the JSON is snake_case, and `DriftDimension`
uses the `from`/`to` aliases. Change a backend shape, then mirror it here and update any affected
component. Presentation-only metadata (`clientMeta`: jurisdiction, LEI, onboarded date, sparkline,
trend) is frontend-only and intentionally not part of the backend contract.

## Styling

Tailwind v4 via `@tailwindcss/postcss`. Design tokens are oklch CSS custom properties in
`app/globals.css`, surfaced as utilities through `@theme`, with a semantic status palette
(success/warning/danger/info). Dark mode is class-gated (`.dark`) and currently light-only. Use the
shadcn/base-nova primitives in `components/ui/`; compose class names with `cn()` from `lib/utils.ts`;
use inline `style` only for dynamic color/width derived from the helpers.

## Conventions

- Keep components presentational and props-driven; lift state to `page.tsx`. Add accessibility
  attributes (`aria-*`, semantic roles).
- Tests are colocated as `*.test.tsx` (Vitest + React Testing Library, jsdom). Adapt existing tests
  rather than adding new ones; e2e specs are `@smoke` in `e2e/`.
- Keep dependencies minimal; small files, clear names, comments only for non-obvious logic.
