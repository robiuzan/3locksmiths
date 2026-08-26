/**
 * Asserts that `content/site.json` is newer than everything that feeds it.
 *
 * WHY THIS EXISTS — a real incident, 2026-08-25. A batch of authored modules was edited by a
 * background process *after* `npm run enrich` had run. `npm run build` does NOT regenerate
 * `content/site.json`, so the export was built from stale content and **deployed to
 * production**. Nothing failed. No warning anywhere. The defect was only caught by manually
 * diffing the live page against the source afterwards.
 *
 * That is the third staleness trap in `/deploy-3locksmiths`, and it is the nastiest of the
 * three precisely because it is silent: the build succeeds, the gate passes, and the site
 * ships the previous copy.
 *
 * This turns it into a loud failure. Run it before any build you intend to ship.
 *
 *   node scripts/check-freshness.mjs     (exit 1 if content/site.json is stale)
 */
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SITE = join(ROOT, "content", "site.json");

if (!existsSync(SITE)) {
  console.error("content/site.json does not exist — run `npm run enrich`.");
  process.exit(1);
}

const siteMtime = statSync(SITE).mtimeMs;

/** Everything whose content ends up inside content/site.json. */
const sources = [];

// Authored page modules.
const enrichedDir = join(ROOT, "content", "enriched");
for (const f of readdirSync(enrichedDir)) {
  if (/\.(mjs|json)$/.test(f)) sources.push(join(enrichedDir, f));
}

// The pipeline itself, and the renderer + manifest it reads.
for (const f of readdirSync(join(ROOT, "scripts"))) {
  // Exclude the checkers themselves — they never affect site.json.
  if (/^check-/.test(f)) continue;
  if (f.endsWith(".mjs")) sources.push(join(ROOT, "scripts", f));
}
sources.push(join(ROOT, "lib", "enrich", "render.mjs"));
sources.push(join(ROOT, "site.config.json"));

const stale = sources
  .filter((f) => existsSync(f))
  .map((f) => ({ f, m: statSync(f).mtimeMs }))
  .filter((x) => x.m > siteMtime)
  .sort((a, b) => b.m - a.m);

if (stale.length === 0) {
  console.log("freshness: content/site.json is up to date ✅");
  process.exit(0);
}

console.error(
  `\nSTALE CONTENT — content/site.json is older than ${stale.length} of its source file(s).`,
);
console.error("Building now would ship the PREVIOUS copy, silently.\n");
for (const s of stale.slice(0, 12)) {
  const ago = Math.round((s.m - siteMtime) / 1000);
  console.error(`  ! ${s.f.replace(ROOT, "").replace(/\\/g, "/")}  (${ago}s newer)`);
}
if (stale.length > 12) console.error(`  … and ${stale.length - 12} more`);
console.error("\nFix: npm run enrich\n");
process.exit(1);
