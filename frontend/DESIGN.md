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
  spacing; do not over-style. Content width `max-w-5xl`.

## Screen 1 — Queue (`app/page.tsx`)

Morning inbox. Each row a `Card` with a colored left accent by band: client name; plain-language
"top change" (not a signal code); status pill; depth + cost chip. Top bar: `Run pipeline` CTA
(`Button variant="brand"`) with spinner, plus a per-day cost chip. Include one "risk went *down*,
baseline confirmed" row so it reads as judgment, not an alarm generator.

## Screen 2 — Alert detail (`app/alerts/[id]/page.tsx`) — strict order

1. **Risk delta first.** Tone band: "MEDIUM -> HIGH", confidence %, count of invalidated
   assumptions; then a single "what this implies" line, before any raw signal.
2. **Baseline vs current.** A `label | baseline -> current` grid (business model, legal form,
   ownership, expected volume, domain, risk rating); changed rows emphasized; lucide `ArrowRight`
   between values. This is the money shot: KYC drift legible at a glance.
3. **Source-cited timeline.** Newest-first; each entry: uppercase muted source (ZEFIX, On-chain
   KYT, Wayback, GDELT), relative time, confidence badge, summary, evidence link (`ExternalLink`).
4. **Human-in-the-loop.** Exactly three actions: Approve Re-KYC (`default`), Escalate to MLRO
   (`brand`), Dismiss false positive (`outline`); status pill in header; append-only audit line at
   bottom.

Plus a **cost meter**: per-alert ("DEEP, ~$0.12") and per-day total; visible, not buried.

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
