## DRIFTWATCH design system

DRIFTWATCH is the AMINA KYC drift cockpit: a light-only Next.js + Tailwind v4
(shadcn / base-nova) UI. Components render from `window.DriftWatch.*`. No theme
provider or context is needed; do not wrap anything.

### Two component families

- **Primitives** (`Button`, `SeverityBadge`) take simple, self-contained props.
  Style them with their own props; pass extra Tailwind via `className`.
  - `Button`: `variant` (`default` | `brand` | `outline` | `secondary` | `ghost`
    | `destructive` | `link`) and `size` (`default` | `xs` | `sm` | `lg` | `icon`
    | `icon-xs` | `icon-sm` | `icon-lg`). `brand` is the high-contrast CTA.
  - `SeverityBadge`: `tone` (`info` | `success` | `warning` | `danger` | `neutral`)
    + `label`, optional lucide `icon`. Risk bands map low -> success,
    medium -> warning, high -> danger. Use this for any status/risk pill.
- **Cockpit** (`AppHeader`, `Sidebar`, `CaseList`, `CaseDetail`, `LoginScreen`)
  are view-model driven. They never take raw domain objects; they take the output
  of `buildView(...)`, which is also exposed on the global. Build a view, then
  pass slices of it down:

```jsx
const { buildView, seedCases, AppHeader, Sidebar, CaseList, CaseDetail } = window.DriftWatch;
const view = buildView({ role: "compliance", cases: seedCases(), selectedId: "helvetia", msgTo: null });

<AppHeader view={view} onLogout={() => {}} />
<Sidebar nav={view.nav} />
<CaseList view={view} onSelect={(id) => {}} />
{view.detail && (
  <CaseDetail detail={view.detail} recipients={view.msgRecipients}
    msgDraft="" msgPlaceholder={view.msgPlaceholder}
    onAction={() => {}} onConfirmInstruction={() => {}}
    onPickRecipient={() => {}} onMsgChange={() => {}} onSend={() => {}} />
)}
```

`buildView({ role, cases, selectedId, msgTo })` takes `role` of `"rm" | "am" |
"compliance"` and `cases` from `seedCases()` (or your own array of the same
shape). The role decides the queue, nav counts and which decision actions appear.
`LoginScreen` is standalone: `<LoginScreen onPick={(role) => {}} />`.

### Styling idiom

Tailwind v4 utility classes, composed with `cn()`; light mode only (`.dark`
utilities exist but are never activated). The shipped `styles.css` is compiled
from this system's own usage, so prefer the classes the components already use.

- **Neutral palette (shadcn tokens):** `bg-background`, `bg-card`, `bg-primary`,
  `bg-secondary`, `bg-destructive`, `text-foreground`, `text-muted-foreground`,
  `text-primary-foreground`, `text-secondary-foreground`, `border-border`. Radii
  `rounded-lg` / `rounded-full` / `rounded-xl`.
- **Fonts:** `font-sans` = Geist (body/UI), `font-mono` = Geist Mono (kickers,
  labels, codes; used heavily for the small uppercase section labels), `font-serif`
  = Source Serif 4 (case headlines and reading text).
- **Status / risk colours** are NOT Tailwind colour utilities. Use `SeverityBadge`
  for pills, or the CSS custom properties directly via inline `style` for accents:
  `--color-background-{info,success,warning,danger}`,
  `--color-border-{...}`, `--color-text-{...}` (the cockpit uses these for left
  borders, dots and banners).

### Where the truth lives

Read the bound `styles.css` for the exact tokens and the available utility set,
and each component's `<Name>.prompt.md` for its props and examples. The view-model
field shapes are in `CaseDetail` / `CaseList` / `AppHeader` prop docs.
