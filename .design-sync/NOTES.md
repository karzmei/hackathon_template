# DRIFTWATCH design-sync notes

Repo-specific gotchas for future syncs of `frontend/` (the Next.js cockpit) to
claude.ai/design. Read this before re-running.

## Shape and setup

- Shape: **package** (synth-entry; the frontend is a Next.js app, no library
  `dist/`). The converter is pointed at a generated barrel entry,
  `frontend/.ds-entry.tsx` (gitignored), built by `cfg.buildCmd`
  (`node .design-sync/build-css.mjs frontend`). The barrel re-exports the 7
  components AND the pure helpers `buildView` / `seedCases` (see Previews below).
- `buildCmd` also compiles the Tailwind CSS. The styling is 100% utility-class
  driven with **no static stylesheet**, so `build-css.mjs` runs the installed
  `@tailwindcss/postcss` over `app/globals.css` with explicit `@source` globs
  (components, app, lib, previews) to emit a complete `frontend/.ds-css/styles.css`
  (`cfg.cssEntry`). Pointing `cssEntry` at raw `globals.css` would ship tokens but
  no utilities. Re-run `buildCmd` before every converter build.
- `build-css.mjs` also copies the Geist Variable woff2 (sans + mono) next to the
  compiled CSS, emits their `@font-face` + the `--font-geist-*` / `--font-serif`
  vars, and adds a remote `@import` for Source Serif 4 (OFL). The app sets these
  via next/font at runtime; the standalone bundle has none, so we ship them.
- Playwright is installed in `.ds-sync` pinned to **1.61.0** to match the cached
  chromium build 1228; `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` on install.
- `typescript` is installed in `.ds-sync` so the `[DTS_PARSE]` check runs.

## Process shim (browser eval guard)

`frontend/.ds-process-shim.ts` (gitignored, regenerated into the barrel as the
first import) defines `globalThis.process = { env: {} }`. `lib/api.ts` and
`lib/data.ts` read `process.env` at module-eval time; without the shim the IIFE
throws `process is not defined` and `window.DriftWatch` never populates.

## Prop contracts (cfg.dtsPropsFor)

There are no built `.d.ts`, so every component's prop contract is hand-written in
`cfg.dtsPropsFor`, with the domain / view-model types inlined from
`lib/cockpit-types.ts` and `lib/cockpit-view.ts`. **Re-sync risk:** these inline
shapes duplicate the source types and will silently drift if the cockpit view
model changes. If `CockpitView` / `DetailVM` / `Case` change, update the matching
`dtsPropsFor` bodies.

## Previews

- Authored under `.design-sync/previews/` (committed), graded all `good`.
- They import components from `"driftwatch-frontend"` (shimmed to the global) and
  build realistic data with `buildView` + `seedCases`, which are **also imported
  from `"driftwatch-frontend"`** (re-exported on the global by the barrel).
  Reason: the preview esbuild pass cannot resolve the `@/` alias (see Known issue),
  so previews must not import app source via `@/`. The bundle resolves the barrel's
  `@/` imports via esbuild's native tsconfig discovery (the barrel lives under
  `frontend/`).
- `AppHeader` and `CaseList` are wide; `cfg.overrides` sets `cardMode: column`.

## Known issue: tsconfig paths plugin

The converter's `lib/bundle.mjs` `tsconfigPathsPlugin` strips comments with a
regex that treats the `/*` in the `"@/*"` path key as a block-comment opener
running to the first `*/` (which appears in `"**/*.ts"` in `include`), so it
returns **null** for `frontend/tsconfig.json` and the `@/` alias is not resolved
for files outside `frontend/` (i.e. the previews). Worked around by (a) keeping a
minimal `.design-sync/tsconfig.ds.json` (no `*/` sequence) that the plugin can
parse, referenced by `cfg.tsconfig`, and (b) routing preview helper imports
through the global instead of `@/`. Do not fork `bundle.mjs`.

## Re-sync risks (watch-list)

- **Inlined view-model types in `dtsPropsFor`** drift from `lib/cockpit-*.ts`; the
  only thing tying them together is this note. Re-check on any cockpit refactor.
- **The frontend was rewritten once mid-sync** (a 12-component set was replaced by
  this 7-component cockpit). If the component inventory changes again, update
  `componentSrcMap`, `dtsPropsFor`, and the previews together.
- **Source Serif 4 loads from Google Fonts at render time** (remote `@import`), not
  shipped. If offline rendering matters, vendor the woff2 via `cfg.extraFonts`.
- **Tailwind CSS is a compiled subset** of utilities this system actually uses;
  utilities the components never use are absent from `styles.css`. Designs that
  reuse the components render fully; arbitrary new utility classes may not.

## Known render warns

- `[FONT_REMOTE] "Source Serif 4"` — expected; the serif loads via a Google Fonts
  `@import`. Not a missing font.
