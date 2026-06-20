# Sidebar OVERVIEW block: still reads as clickable nav

Design note for a focused pass on the left-rail OVERVIEW block. An earlier fix flattened the boxes
and renamed the header (NAVIGATION -> OVERVIEW), but the block still invites clicks. (Writing rule:
no em dashes or double dashes; use semicolons, commas, or shorter sentences.)

## Where it lives

Left rail, top, in `components/cockpit/Sidebar.tsx`. The full-height shell is three columns:
**Sidebar** (212px, this block), **CaseList** (372px, the *real* clickable rail), **CaseDetail**.
Below the OVERVIEW block sit a passive LINES OF DEFENCE legend and a SHARED CASE STATE notice.

## The block now

Four inert `<div>` rows (no onClick, no href, no cursor change), label left and count pill right,
under an "OVERVIEW" caption. Content is per seat:

| Seat | Rows (label -> pill tone) |
|---|---|
| RM | Morning digest (none) · My clients (neutral) · Escalated by me (blue) · Compliance requests (amber) |
| AM | Structural watch (none) · Accounts I own (neutral) · Handed to me (blue) · Escalated by me (blue) |
| Compliance | Inbox (red) · In review (blue) · Decided (green) · Audit log (none) |

Pills hide at zero for the tone-colored rows; the neutral and red counts always show; the first row
of each seat never shows one. Built spec: 212px light-grey field `oklch(0.985 0 0)`; caption mono
9.5px `oklch(0.6 0 0)`; row 13px label `oklch(0.45 0 0)`, padding 10px/5px, `select-none`, no box or
hover or selected state; pill `rounded-full`, mono 10px, tone bg+text (neutral = near-black/white,
info `#e0ebff`/`#1e3a8a`, warning `#faeeda`/`#412402`, danger `#fcebeb`/`#501313`, success
`#eaf3de`/`#173404`).

## Why it still reads as clickable

1. **Count badges.** A colored count pill next to a label is the universal "nav item with pending
   items" pattern (email folders, Slack, admin sidebars). "Inbox 3" reads as "click to see those 3."
   The flatten never touched this, the strongest cue.
2. **Labels are destinations.** "Inbox", "My clients", "Audit log", "In review" are places you go,
   not numbers you read.
3. **Canonical position.** Top-left is the slot where primary nav lives, so it is read as nav first.
4. **Color pulls toward action.** Red/amber/blue pills say "needs attention," implying "act on me";
   the passive legend below reuses the same swatches, blurring key vs. control.

It also competes with `CaseList.tsx`, the genuinely clickable rail beside it (real `<button>`s,
`cursor-pointer`, hover tint, `aria-pressed` selected state, accent bar). The header "Inbox 3" badge
is itself non-clickable yet uses the same pill language, so the screen sends mixed signals.

## Constraints

- Display-only in this prototype; do not make these real controls (that is a separate, larger pass).
- Counts must stay visible somewhere; they are the informative payload.
- Must render for all three seats and a zero state.
- Stay inside the light-only oklch + semantic palette system; tight 212px column.
- Cheap: one component (`Sidebar.tsx`) plus a small view-model (`navItem` in `lib/cockpit-view.ts`).

## Candidate directions

- **A.** Restyle as a number-first KPI readout; drop the pill shape so counts are typography, not
  badges.
- **B.** Strip pill color to neutral numerals; add a "read-only" caption with a lock/info glyph.
- **C.** Fold it into the LINES OF DEFENCE legend so the whole lower rail reads as one passive
  reference card.
- **D.** Move the counts onto the CaseList header (where action happens); leave the sidebar as pure
  legend.

Recommended starting point: A or B (kill the badge language), optionally with C.

## Files to touch

`components/cockpit/Sidebar.tsx`; `lib/cockpit-view.ts` (`NavItemVM` + `navItem`, per-role arrays) if
the data shape changes; `components/cockpit/Sidebar.test.tsx` and `lib/cockpit-view.test.ts` (adapt;
they already assert the rows are non-interactive); tokens in `app/globals.css` and the `TONES` map in
`lib/cockpit-types.ts`.

## View it live

```powershell
cd frontend
npm run dev   # http://localhost:3000 ; pick each seat and compare the OVERVIEW block to CaseList
```
