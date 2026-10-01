/**
 * Keeps the guides' dates honest (docs/dynamic-presence-plan.md Phase 2 step 3).
 *
 * The 11 guides show "פורסם / עודכן dd/mm/yyyy" on the page and carry the same two dates in their
 * Article JSON-LD, both from the module fields `datePublished` / `dateModified`
 * (lib/enrich/render.mjs guideDates, scripts/enrich.mjs articleSchema). A visible date is a
 * promise to the reader and to Google: it must move when the guide's content moves, and only
 * then. A fresh-looking date on unchanged text is fake freshness; a rewritten guide still dated
 * August hides the work. Neither is caught by reading the module, so this compares each guide's
 * CONTENT fingerprint (every string in the module except the two dates) with a committed ledger:
 *
 *   content changed, dateModified did not  → fail: bump dateModified, then --accept
 *   dateModified changed, content did not  → fail: the date moved on its own
 *   datePublished changed at all           → fail: publication is a one-time fact
 *   dateModified < datePublished, a date in the future (Israel), or not a real date → fail
 *
 * The ledger is content/guide-dates.json — outside content/enriched/ on purpose, so accepting a
 * change never makes content/site.json look stale. No clock is read except to reject a future
 * date, and the enrich chain never runs this file.
 *
 *   node scripts/check-dates.mjs            check (in npm prebuild)
 *   node scripts/check-dates.mjs --accept   after a deliberate edit: record the new fingerprints
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENRICHED = join(ROOT, "content", "enriched");
const LEDGER = join(ROOT, "content", "guide-dates.json");
const ACCEPT = process.argv.includes("--accept");
// `--minor <id>`: record a content change the editor judged not significant (a typo, a link)
// WITHOUT moving dateModified. Named per guide, so it is a decision, never a default.
const MINOR = new Set(
  process.argv.flatMap((a, i, all) =>
    a === "--minor" && all[i + 1] ? [all[i + 1]] : [],
  ),
);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const realDate = (d) => {
  if (!DATE_RE.test(d ?? "")) return false;
  const t = new Date(`${d}T12:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
};
/**
 * Every string in the module, in order — the guide's content — except what is not the guide's
 * advice: the two date fields, the related-link lists, and phone numbers. A sitewide NAP change
 * (the 2026-09-02 move to 076-599-1266 touched all 11) or a re-pointed link list is not an update
 * a reader would call one, and Google asks dateModified to move for significant changes only.
 */
const SKIP = new Set(["datePublished", "dateModified", "related", "areas"]);
const PHONE = /(?:\+972|0)\d{1,2}[-\s]?\d{3}[-\s]?\d{4}/g;
function fingerprint(data) {
  const out = [];
  const walk = (v, key) => {
    if (SKIP.has(key)) return;
    if (typeof v === "string") out.push(v.replace(PHONE, "{phone}"));
    else if (Array.isArray(v)) v.forEach((x) => walk(x));
    else if (v && typeof v === "object")
      for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(data);
  return createHash("sha256").update(JSON.stringify(out)).digest("hex").slice(0, 16);
}

// Israel's civil date (+3 h is summer time; in winter one hour generous — it can only ever
// accept a real same-day edit).
const today = new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
const ledger = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, "utf8")) : {};
const next = {};
const problems = [];
let guides = 0;

for (const f of readdirSync(ENRICHED)
  .filter((f) => /^\d+\.mjs$/.test(f))
  .sort()) {
  const data = (await import(pathToFileURL(join(ENRICHED, f)).href)).default;
  if (!data || data.kind !== "guide") continue;
  guides += 1;
  const id = f.replace(/\.mjs$/, "");
  const where = `content/enriched/${f}`;
  const { datePublished: pub, dateModified: mod } = data;
  if (!realDate(pub))
    problems.push(
      `${where}: datePublished ${JSON.stringify(pub)} is not a real YYYY-MM-DD date`,
    );
  if (!realDate(mod))
    problems.push(
      `${where}: dateModified ${JSON.stringify(mod)} is not a real YYYY-MM-DD date`,
    );
  if (realDate(pub) && realDate(mod) && mod < pub)
    problems.push(`${where}: dateModified ${mod} is before datePublished ${pub}`);
  for (const [k, v] of [
    ["datePublished", pub],
    ["dateModified", mod],
  ]) {
    if (realDate(v) && v > today) problems.push(`${where}: ${k} ${v} is in the future`);
  }
  const hash = fingerprint(data);
  next[id] = { hash, datePublished: pub, dateModified: mod };
  const was = ledger[id];
  if (!was) continue;
  // --accept records an edit; it never excuses a moved publication date or a date that moved on
  // its own, and a content change with an unmoved date needs an explicit `--minor <id>`.
  if (was.datePublished !== pub) {
    problems.push(
      `${where}: datePublished moved ${was.datePublished} → ${pub} — publication is a one-time fact`,
    );
  }
  if (was.hash !== hash && was.dateModified === mod && !MINOR.has(id)) {
    problems.push(
      `${where}: the guide's content changed but dateModified is still ${mod} — set it to today's date and run \`node scripts/check-dates.mjs --accept\`; if the change is not significant (a typo, a link), run \`--accept --minor ${id}\` instead`,
    );
  }
  if (was.hash === hash && was.dateModified !== mod) {
    problems.push(
      `${where}: dateModified moved ${was.dateModified} → ${mod} but the content did not — a date may not move on its own`,
    );
  }
  if (was.hash !== hash && was.dateModified !== mod && !ACCEPT) {
    problems.push(
      `${where}: content and dateModified both changed — if that is the edit you meant, run \`node scripts/check-dates.mjs --accept\` to record it`,
    );
  }
}
for (const id of Object.keys(ledger)) {
  if (!next[id])
    problems.push(
      `content/guide-dates.json lists guide ${id}, which no longer exists — run --accept`,
    );
}
if (!ACCEPT) {
  for (const id of Object.keys(next)) {
    if (!ledger[id])
      problems.push(
        `content/enriched/${id}.mjs is a guide the ledger does not know — run \`node scripts/check-dates.mjs --accept\``,
      );
  }
}

if (
  problems.length &&
  !(ACCEPT && problems.every((p) => /ledger|no longer exists/.test(p)))
) {
  console.error(`\ndates: ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ! ${p}`);
  process.exit(1);
}
if (ACCEPT) {
  writeFileSync(LEDGER, JSON.stringify(next, null, 2) + "\n", "utf8");
  console.log(
    `dates: recorded ${Object.keys(next).length} guide fingerprint(s) in content/guide-dates.json`,
  );
} else {
  console.log(`dates: ${guides} guide(s) — every visible date matches its content ✅`);
}
