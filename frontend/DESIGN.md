# DRIFTWATCH — Frontend design brief

Reference for designing the DRIFTWATCH UI. Keep it bank-grade, calm, evidence-first.
The AI proposes; the human disposes. (Writing rule: no em dashes or double dashes.)

## Product and user

Analyst tooling for AMINA Bank. Each corporate client is a living KYC profile; the app measures
how far reality has *drifted* from what the bank onboarded, then emits a cited case file with a
recommended action. The user is a compliance analyst triaging a morning queue who must decide each
alert in minutes: is this real drift, and what action. Trust comes from citations, confidence, and
an audit trail; never a black box.

## Visual system

- shadcn `base-nova` on `@base-ui/react`, Tailwind v4, lucide icons, CVA + `cn()` (`lib/utils.ts`).
- **Neutral grayscale.** Near-black primary, white `bg-card` with `ring-1 ring-foreground/10`,
  muted-gray secondary text. Color is reserved for *risk signaling only*.
- **Risk is the only color.** LOW -> success/green, MEDIUM -> warning/amber, HIGH -> danger/red,
  via the status tokens in `app/globals.css` and `lib/risk.ts` / `components/ui/severity-badge.tsx`.
  Encode severity twice (left card tint + badge).
- **Type.** Source Serif 4 headings (`font-serif`), Geist body, Geist Mono for timestamps/tokens.
- Radius `0.625rem`: cards `rounded-xl`, controls `rounded-lg`, pills `rounded-full`. Restrained
  spacing; do not over-style. The cockpit is a full-height shell (`h-screen`), not a centered page.

## Cockpit — one screen (`app/page.tsx`)

Master-detail on a single full-height screen: `CockpitHeader` on top, then a
`grid-cols-[392px_1fr]` of the queue rail and the case-file detail. The app runs on a mock-first
data layer (`lib/data.ts` -> `lib/mock.ts`), so it works offline and uses the backend when it is up.

### Header (`components/CockpitHeader.tsx`)

Brand + `/ queue`, a cost/throughput pill (today USD, signals, alerts, deep count), and the
`Run pipeline` CTA (`Button variant="brand"`) with a spinner while running.

### Queue rail (`components/QueueRail.tsx`)

Morning inbox. Each row a selectable button with a left accent by band: a `Sparkline` drift trend,
client name, drift %, plain-language "top change" (not a signal code), and a status dot line
(status, depth, cost, age). Selecting a row drives the detail pane. Includes a "risk went *down*,
baseline confirmed" row so it reads as judgment, not an alarm generator.

### Detail pane (`components/DetailPane.tsx`) — strict order

1. **Risk delta first** (`DriftBand`). Aggregate on a LOW/MEDIUM/HIGH gradient with a marker:
   "MEDIUM -> HIGH", confidence %, the `0.82 / HIGH` score; then a single "what this implies" line.
2. **Baseline vs current** (`DimensionDrift`). Per-dimension `baseline -> current` rows with a bar
   sized to the delta (business model, legal form, ownership, expected volume, domain, risk rating);
   changed rows emphasized. This is the money shot: KYC drift legible at a glance.
3. **Source-cited timeline** (`SignalTimeline`). Newest-first; each entry: uppercase muted source
   (ZEFIX, On-chain KYT, Wayback, GDELT), date, confidence badge, summary, evidence link.
4. **Human-in-the-loop** (`ActionBar`). Exactly three actions: Approve Re-KYC (`default`), Escalate
   to MLRO (`brand`), Dismiss false positive (`outline`); status pill in the header; append-only
   audit line at the bottom.

Plus a **cost meter**: per-alert ("DEEP, ~$0.12") in the detail header and a per-day total in the
cockpit header; visible, not buried.

## Make these unmissable (they win points)

Per-alert **cost meter**; **baseline-vs-current + citations**; **explainability** (reasoning and
sources on every flag).

## Constraints

- Recommend, never act: only the human decision mutates state.
- Citations + confidence on every flag; "unverified" is not auto-escalated.
- Audit is append-only.
- Keep the `lib/api.ts` snake_case contract unchanged (`risk_band`, `top_change`, `drift_score`,
  `invalidated_assumptions`, `analysis_depth`, `cost.usd`, `audit[]`).

## Opportunities to design better (beyond the current scaffold)

A drift-over-time sparkline per client; per-dimension contribution bars in the risk band; a
"why now" correlation note (several low-confidence signals jointly crossing the threshold);
explicit empty / loading / error states; keyboard-driven queue triage.
