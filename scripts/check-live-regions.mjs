/**
 * Asserts the live regions in the RENDERED site obey the /dynamic-presence rules — the ones
 * that, if broken, fail silently: Google would snippet a Hanukkah line in March, one topbar
 * edit would re-stamp <lastmod> on every URL, or a variant stored as JSON would slip past
 * check-claims (which strips <script> blocks before matching, scripts/check-claims.mjs:27-34).
 *
 * A live region is anything the pipeline wraps in the sentinels that scripts/lastmod.mjs
 * strips before hashing:
 *
 *   <!--lm:ignore--> … <!--/lm:ignore-->
 *
 * Rules (docs/dynamic-presence-plan.md §2.2 rule 3, §4.3):
 *   1. sentinels are balanced on every page;
 *   2. no live region sits inside <main> — chrome only. The updates strip is deliberately NOT a
 *      live region (a new item is a real content change and should move the homepage lastmod);
 *   3. the first element of every region carries data-nosnippet, in the static HTML (Google:
 *      never add it via JS);
 *   4. no <script> inside a region, and no data-campaign / data-live attribute outside one —
 *      copy for a variant is HTML the guards can read, never JSON in a script.
 *
 * Runs in npm `prebuild`. Passes when no region exists yet (Phase 0 ships the gate first).
 *
 *   node scripts/check-live-regions.mjs        (exit 1 on any violation)
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "content", "site.json");

if (!existsSync(SITE)) {
  console.error("live-regions: content/site.json does not exist — run `npm run enrich`.");
  process.exit(1);
}

const OPEN = "<!--lm:ignore-->";
const CLOSE = "<!--/lm:ignore-->";
const REGION_RE = /<!--lm:ignore-->([\s\S]*?)<!--\/lm:ignore-->/g;

const site = JSON.parse(readFileSync(SITE, "utf8"));
const problems = [];
let regions = 0;
let pagesWithRegions = 0;

for (const page of site.pages ?? []) {
  const html = String(page.bodyHtml ?? "");
  const opens = html.split(OPEN).length - 1;
  const closes = html.split(CLOSE).length - 1;
  if (opens !== closes) {
    problems.push(
      `${page.path}: ${opens} opening vs ${closes} closing lm:ignore sentinels`,
    );
    continue;
  }
  if (opens === 0) {
    // Rule 4b still applies: a variant attribute with no region around it is unguarded chrome.
    if (/\sdata-(campaign|live)=/.test(html)) {
      problems.push(
        `${page.path}: data-campaign/data-live attribute outside any lm:ignore region`,
      );
    }
    continue;
  }
  pagesWithRegions += 1;

  // The OUTERMOST <main> pair. The homepage nests the calculator's own <main class="page-quiz">
  // inside the page's <main>, so the first </main> closes the quiz at ~33 KB and would leave
  // ~323 KB of the homepage judged "chrome" (review finding, 2026-09-30). The last </main> is
  // the outer one on every page; on the 108 single-main pages it equals the first.
  const mainStart = html.search(/<main[\s>]/i);
  const mainEnd = html.toLowerCase().lastIndexOf("</main>");

  let stripped = html;
  for (const m of html.matchAll(REGION_RE)) {
    regions += 1;
    const inner = m[1];
    const at = m.index ?? 0;
    const label = `${page.path} region@${at}`;

    if (mainStart !== -1 && mainEnd !== -1 && at > mainStart && at < mainEnd) {
      problems.push(`${label}: live region inside <main> — live regions are chrome only`);
    }
    if (!/^\s*<[a-z][^>]*\sdata-nosnippet(?:[\s=>]|$)/i.test(inner)) {
      problems.push(`${label}: first element lacks data-nosnippet in the static HTML`);
    }
    if (/<script[\s>]/i.test(inner)) {
      problems.push(
        `${label}: <script> inside a live region — variants are HTML, never JSON`,
      );
    }
    stripped = stripped.replace(m[0], " ");
  }
  if (/\sdata-(campaign|live)=/.test(stripped)) {
    problems.push(
      `${page.path}: data-campaign/data-live attribute outside an lm:ignore region`,
    );
  }
}

if (regions === 0 && problems.length === 0) {
  console.log(
    "live-regions: no lm:ignore regions in content/site.json yet — nothing to check ✅",
  );
  process.exit(0);
}
if (problems.length) {
  console.error(`\nlive-regions: ${problems.length} problem(s):`);
  for (const p of problems.slice(0, 40)) console.error(`  ! ${p}`);
  if (problems.length > 40) console.error(`  … and ${problems.length - 40} more`);
  process.exit(1);
}
console.log(
  `live-regions: ${regions} region(s) on ${pagesWithRegions} page(s), all chrome, all data-nosnippet, no scripts ✅`,
);
