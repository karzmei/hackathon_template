// Post-step for the demo recorder. Playwright writes the take to demo-out/<slug>/video.webm;
// this copies it to a stable demo-out/driftwatch-demo.webm, and builds the polished
// demo-out/driftwatch-demo.mp4 if ffmpeg is on PATH (the safest format for a Google Slides
// demo slide). The mp4 is built in two steps: trim the opening browser load off the head
// (the cut point is demo-out/trim.json, written by the spec), then loop the clean pass
// DEMO_LOOPS times so the deliverable loops with no reload in the seam. The mp4 is best
// effort: if ffmpeg is missing the script prints the commands and exits cleanly, the webm
// still stands (note the raw webm keeps the load; the mp4 is the trimmed, looped one).
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "demo-out");
const WEBM = join(OUT_DIR, "driftwatch-demo.webm");
const MP4 = join(OUT_DIR, "driftwatch-demo.mp4");
const PASS_MP4 = join(OUT_DIR, "_pass.mp4");

// Where to cut the opening load (seconds), written by the recorder spec; 0 if absent.
function readTrimSec() {
  try {
    const v = JSON.parse(readFileSync(join(OUT_DIR, "trim.json"), "utf8")).startSec;
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

// How many times the clean pass repeats in the deliverable (default 2).
const LOOPS = Math.max(1, Number(process.env.DEMO_LOOPS) || 2);

// Find the newest .webm Playwright produced under demo-out/.
function findNewestWebm(dir) {
  let newest = null;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const inner = findNewestWebm(full);
      if (inner && (!newest || inner.mtimeMs > newest.mtimeMs)) newest = inner;
    } else if (entry.name.endsWith(".webm") && full !== WEBM) {
      const mtimeMs = statSync(full).mtimeMs;
      if (!newest || mtimeMs > newest.mtimeMs) newest = { path: full, mtimeMs };
    }
  }
  return newest;
}

if (!existsSync(OUT_DIR)) {
  console.error("No demo-out/ directory found. Did the recording run?");
  process.exit(1);
}

const found = findNewestWebm(OUT_DIR);
if (!found) {
  console.error("No recorded .webm found under demo-out/. Did the spec record a video?");
  process.exit(1);
}

copyFileSync(found.path, WEBM);
console.log(`Recording (raw, keeps the load): ${WEBM}`);

const startSec = readTrimSec();
const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
if (hasFfmpeg) {
  // 1) Trim the opening load off the head and re-encode to h264. -ss after -i so the seek
  //    is frame accurate (the webm has sparse keyframes; a fast pre-input seek would jump).
  const trim = spawnSync(
    "ffmpeg",
    ["-y", "-i", WEBM, "-ss", String(startSec),
     "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-an", PASS_MP4],
    { stdio: "inherit" },
  );
  // 2) Loop the clean pass into the deliverable. Identical encodes concat with a stream copy,
  //    so the seam is a hard cut seat-picker -> seat-picker with no reload flash.
  const loop = trim.status === 0
    ? spawnSync(
        "ffmpeg",
        ["-y", "-stream_loop", String(LOOPS - 1), "-i", PASS_MP4, "-c", "copy", MP4],
        { stdio: "inherit" },
      )
    : { status: 1 };
  try { rmSync(PASS_MP4, { force: true }); } catch {}
  if (trim.status === 0 && loop.status === 0) {
    console.log(`MP4 (trimmed, looped ${LOOPS}x; use this in Google Slides): ${MP4}`);
  } else {
    console.warn("ffmpeg failed; the raw .webm above is still usable.");
  }
} else {
  console.log("ffmpeg not found; skipping mp4. To build it manually:");
  console.log(`  ffmpeg -i "${WEBM}" -ss ${startSec} -c:v libx264 -pix_fmt yuv420p -crf 20 -an "${PASS_MP4}"`);
  console.log(`  ffmpeg -stream_loop ${LOOPS - 1} -i "${PASS_MP4}" -c copy "${MP4}"`);
  console.log("Then in Google Slides: Insert > Video > upload the mp4 to Drive, set Play automatically.");
}
