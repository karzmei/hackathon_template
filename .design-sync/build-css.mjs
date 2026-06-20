// Compile a complete, static Tailwind v4 stylesheet for the design-sync bundle.
//
// The DRIFTWATCH frontend is a Next.js app whose styling is driven entirely by
// Tailwind utility classes; there is no shipped stylesheet that carries them.
// Tailwind generates utilities by scanning source, so cssEntry pointing at the
// raw globals.css would emit only the @theme tokens and miss every utility a
// component uses. This script runs the installed @tailwindcss/postcss plugin
// over an input that @imports globals.css and declares explicit @source globs
// (components, app, lib, and the authored design-sync previews), producing a
// self-contained styles.css the converter can ship.
//
// Usage:  node .design-sync/build-css.mjs <frontend-dir>
// Output: <frontend-dir>/.ds-css/styles.css

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const base = path.resolve(process.argv[2] || "frontend");
if (!fs.existsSync(path.join(base, "package.json"))) {
  console.error(`[build-css] frontend dir not found: ${base}`);
  process.exit(1);
}

// Resolve postcss + the Tailwind plugin from the frontend's own node_modules,
// regardless of where this script is invoked from.
const req = createRequire(path.join(base, "package.json"));
const postcss = req("postcss");
const tailwind = (await import(pathToFileURL(req.resolve("@tailwindcss/postcss")))).default;

const previewsDir = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "previews");

// Input CSS: pull in the app's real entry, then declare what to scan. @import
// and @source paths are resolved by Tailwind relative to the `from` file below,
// so we anchor `from` at the app/ dir and use app-relative paths.
const input = [
  `@import "./globals.css";`,
  `@source "../components/**/*.{ts,tsx}";`,
  `@source "../app/**/*.{ts,tsx}";`,
  `@source "../lib/**/*.{ts,tsx}";`,
  `@source "${previewsDir.replace(/\\/g, "/")}/**/*.tsx";`,
].join("\n");

const fromPath = path.join(base, "app", "_ds_css_input.css");
const outDir = path.join(base, ".ds-css");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "styles.css");

const result = await postcss([tailwind({ base })]).process(input, {
  from: fromPath,
  to: outPath,
});

// Brand fonts. The Next app loads Geist Sans/Mono via the `geist` package and
// Source Serif 4 via next/font at runtime, setting --font-geist-sans /
// --font-geist-mono / --font-serif. The standalone bundle has no next/font, so
// those vars are undefined and Tailwind's font-sans/mono/serif utilities fall
// back to system fonts. We ship Geist locally (copying the Variable woff2 next
// to styles.css so the converter copies them into the bundle's fonts/) and pull
// Source Serif 4 from Google Fonts, then define the three vars the utilities read.
const fontsOut = path.join(outDir, "fonts");
fs.mkdirSync(fontsOut, { recursive: true });
const geist = path.join(base, "node_modules", "geist", "dist", "fonts");
const fontCopies = [
  ["geist-sans/Geist-Variable.woff2", "Geist-Variable.woff2"],
  ["geist-mono/GeistMono-Variable.woff2", "GeistMono-Variable.woff2"],
];
for (const [src, dst] of fontCopies) {
  const s = path.join(geist, src);
  if (fs.existsSync(s)) fs.copyFileSync(s, path.join(fontsOut, dst));
  else console.warn(`[build-css] missing font ${s}`);
}
const fontBlock = `
@font-face {
  font-family: "Geist";
  src: url("./fonts/Geist-Variable.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Geist Mono";
  src: url("./fonts/GeistMono-Variable.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
:root {
  --font-geist-sans: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-geist-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  --font-serif: "Source Serif 4", ui-serif, Georgia, "Times New Roman", serif;
}
`;
// @import must lead the file; Source Serif 4 is OFL, fetched at render time.
const googleImport = `@import url("https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap");\n`;
const finalCss = googleImport + result.css + "\n" + fontBlock;

fs.writeFileSync(outPath, finalCss);
const kb = (finalCss.length / 1024).toFixed(1);
console.log(`[build-css] wrote ${outPath} (${kb} KB, +Geist woff2, +Source Serif 4 @import)`);

// Emit the bundle barrel entry from componentSrcMap. A Next.js app has no
// library entry; this explicit re-export barrel gives the converter a real
// dist-style entry (so PKG_DIR resolves to the frontend package) and lists
// exactly the components we sync, rather than relying on a source-wide scan.
const cfgPath = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "config.json");
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const srcMap = cfg.componentSrcMap || {};
const lines = Object.entries(srcMap)
  .filter(([, p]) => typeof p === "string")
  .map(([name, p]) => {
    const mod = "@/" + p.replace(/\\/g, "/").replace(/\.(tsx?|jsx?)$/, "");
    return `export { ${name} } from ${JSON.stringify(mod)};`;
  });
// Process shim (gitignored, regenerated): app lib modules read process.env at
// eval time, but the standalone bundle runs in a bare browser. Imported first by
// the barrel so it runs before any app module. Generated here so a fresh clone
// is fully reproducible from committed inputs.
const shimPath = path.join(base, ".ds-process-shim.ts");
fs.writeFileSync(
  shimPath,
  [
    "// Generated by .design-sync/build-css.mjs — do not edit.",
    "const g = globalThis as unknown as { process?: { env: Record<string, string | undefined> } };",
    "if (!g.process) g.process = { env: {} };",
    "export {};",
    "",
  ].join("\n"),
);

const barrelPath = path.join(base, ".ds-entry.tsx");
const header = [
  "// Generated by .design-sync/build-css.mjs — do not edit.",
  // First import: process shim, so it evaluates before any app module.
  'import "@/.ds-process-shim";',
].join("\n");
// Expose the pure view-model helpers on the bundle global so authored previews
// can build realistic CockpitView data without importing app source directly
// (preview builds can't resolve the @/ alias; the global can). esbuild resolves
// their transitive @/ imports natively because this barrel lives under frontend/.
const helpers = [
  'export { buildView } from "@/lib/cockpit-view";',
  'export { seedCases } from "@/lib/cockpit-seed";',
];
fs.writeFileSync(barrelPath, header + "\n" + lines.join("\n") + "\n" + helpers.join("\n") + "\n");
console.log(`[build-css] wrote ${barrelPath} (${lines.length} exports)`);
