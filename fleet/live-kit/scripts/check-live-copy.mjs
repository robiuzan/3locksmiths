/**
 * FLEET LIVE-KIT — check-live-copy.mjs. The kit files in this repo are COPIES of the fleet's one
 * tested source (3locksmiths.co.il: lib/live/*, fleet/live-kit/*, public/assets/live.js and the
 * calendar), installed by `node fleet/live-kit/sync.mjs <this repo>`. This gate fails the build
 * when any copy differs from what was installed — a local "quick fix" to the resolver, the head
 * script or the claim rules would silently fork one site from the other ten. Fix it upstream,
 * then re-sync every site. Runs first in npm `prebuild`.
 *
 *   node scripts/live/check-live-copy.mjs
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOCK = join(ROOT, "live-kit.lock.json");
if (!existsSync(LOCK)) {
  console.error(
    "live-copy: live-kit.lock.json is missing — install the kit with fleet/live-kit/sync.mjs",
  );
  process.exit(1);
}
const lock = JSON.parse(readFileSync(LOCK, "utf8"));
const problems = [];
/** Every file the kit installs — a lock that leaves one out (or an empty lock) is not trusted.
 *  Keep in step with FILES in 3locksmiths.co.il/fleet/live-kit/sync.mjs (sync.mjs checks it). */
const REQUIRED = [
  "lib/live/resolve.mjs",
  "lib/live/compile.mjs",
  "lib/live/head-script.mjs",
  "lib/live/topbar.mjs",
  "lib/live/israel-time.mjs",
  "lib/live/claims.mjs",
  "lib/live/render.mjs",
  "lib/live/live-core.css",
  "public/assets/live.js",
  "content/live/_calendar.json",
  "content/live/_calendar.overlay.json",
  "scripts/live/check-live-copy.mjs",
  "scripts/live/check-live-register.mjs",
  "scripts/live/check-live-out.mjs",
  "scripts/live/check-live-schedule.mjs",
  "scripts/live/check-reminders.mjs",
];
for (const rel of REQUIRED)
  if (!lock.files || !(rel in lock.files))
    problems.push(`${rel} is not in live-kit.lock.json`);
for (const [rel, want] of Object.entries(lock.files ?? {})) {
  const file = join(ROOT, rel);
  if (!existsSync(file)) {
    problems.push(`${rel} is missing`);
    continue;
  }
  const got = createHash("sha256").update(readFileSync(file)).digest("hex");
  if (got !== want) {
    const lf = createHash("sha256")
      .update(readFileSync(file, "utf8").replace(/\r\n/g, "\n"))
      .digest("hex");
    problems.push(
      lf === want
        ? `${rel}: line endings were changed (CRLF) — check .gitattributes (eol=lf for the kit files)`
        : `${rel} differs from the installed kit copy`,
    );
  }
}
if (problems.length) {
  console.error(`\nlive-copy: ${problems.length} kit file(s) were edited in this repo:`);
  for (const p of problems) console.error(`  ! ${p}`);
  console.error(
    "  The kit is shared by the whole fleet: change it in 3locksmiths.co.il, then run\n" +
      "  `node fleet/live-kit/sync.mjs <each site>` there.",
  );
  process.exit(1);
}
console.log(
  `live-copy: ${Object.keys(lock.files ?? {}).length} kit file(s) match the installed copy (kit ${lock.source?.commit ?? "?"}, ${lock.source?.date ?? "?"}) ✅`,
);
