/**
 * Maintains `content/lastmod.json` — the per-page `<lastmod>` ledger that `app/sitemap.ts`
 * reads.
 *
 * WHY THIS EXISTS — measured 2026-09-02 against the live Search Console property:
 *
 *   lastSubmitted:  2026-06-11
 *   lastDownloaded: 2026-06-24        <- 70 days earlier
 *   contents:       submitted=53      <- the file has had 105 URLs since 2026-08-30
 *
 * Google was still working from a June snapshot of 53 URLs, and 96 of the 105 live URLs
 * inspected as "URL is unknown to Google — last crawled: never". The sitemap carried no
 * `<lastmod>` at all, so nothing ever told Google the file had changed, and Google's
 * sitemap ping endpoint was retired in 2023. A resubmit fixes it once; this makes the
 * signal self-maintaining.
 *
 * WHY A CONTENT HASH, NOT A DATE FROM GIT OR THE CLOCK
 *
 * Three sources were considered and two are wrong here:
 *
 *   - Build time. Stamps all 105 URLs with "today" on every deploy. That trains Google to
 *     ignore the field, which is worse than omitting it.
 *   - The git author date of `content/enriched/<id>.mjs`. Deterministic on a workstation,
 *     but CI checks out with `actions/checkout@v4` at its default depth of 1, so `git log`
 *     yields nothing there and the value would not reproduce. It is also misleading in
 *     practice: a sitewide sweep (the 2026-09-02 phone-number rewrite touched every module)
 *     moves all 105 dates at once even for pages whose output is unchanged.
 *   - A hash of the rendered page. Moves exactly when the bytes a visitor receives move,
 *     which is what `<lastmod>` is specified to mean. Since 2026-11-04 that is the page's own
 *     <main>, its metadata and its JSON-LD — not the shared header and footer (see mainOf).
 *
 * DETERMINISM. `npm run enrich` is byte-reproducible and CI asserts that. Identical input
 * therefore hashes identically, the stored dates are reused untouched, and re-running this
 * script is a no-op — including in CI, where the committed ledger is simply confirmed. The
 * clock is read only for a page whose hash actually changed.
 *
 * This runs LAST in the enrich chain, after `phone.mjs`, because every earlier step still
 * mutates `content/site.json` and hashing before they finish would record a page state that
 * never ships.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { parse } from "node-html-parser";
import { withoutLiveRegions } from "../lib/live/regions.mjs";

// `--rekey`: the one-off migration that moves the ledger to a new fingerprint WITHOUT re-dating.
// A page whose stored hash still equals the legacy fingerprint keeps its date; anything else is a
// real change and is stamped as usual. Run once when the fingerprint definition changes, commit the
// ledger, and the ordinary chain (no flag) is a no-op afterwards.
const REKEY = process.argv.includes("--rekey");

const ROOT = process.cwd();
const SITE = join(ROOT, "content", "site.json");
const LEDGER = join(ROOT, "content", "lastmod.json");

if (!existsSync(SITE)) {
  console.error("lastmod: content/site.json does not exist — run `npm run enrich`.");
  process.exit(1);
}

const site = JSON.parse(readFileSync(SITE, "utf8"));
const pages = site.pages ?? [];
if (!pages.length) {
  console.error("lastmod: content/site.json has no pages.");
  process.exit(1);
}

/**
 * The page's OWN content: its <main> element, with the live regions cut, as the raw bytes that
 * ship. Since 2026-11-04 the header and footer are out of the fingerprint.
 *
 * WHY — the footer and header are identical on every page, so any edit to them (the 2026-10-13
 * address line, a footer column, a header label) re-dated all ~109 URLs at once, which tells Google
 * the whole site changed when no page's content did, and spends the one per-page freshness signal
 * the sitemap carries. `<lastmod>` is for the page's own content.
 *
 * THE NESTED-MAIN TRAP — the homepage's price calculator is a `<main class="page-quiz">` INSIDE
 * `<main class="page-template-builder">`. Slicing from the first `<main` to the first `</main>`
 * would keep ~14% of the homepage and stop its FAQ, brand grid and advantages from ever moving its
 * date. The element is found with the parser (the selector scripts/enrich.mjs uses) and cut by its
 * source offsets, so the outer element is taken whole. A page with no <main> hashes its whole body.
 */
const PARSE = {
  blockTextElements: { script: true, style: true, noscript: true, pre: true },
};
function mainOf(html) {
  const body = withoutLiveRegions(html);
  const root = parse(body, PARSE);
  const main =
    root.querySelector("main.page-template-builder") || root.querySelector("main");
  if (!main) return body;
  const [start, end] = main.range;
  return body.slice(start, end);
}

/**
 * What a visitor actually receives of THIS page: its <main>, the metadata that renders into
 * <head>, and the structured data. Deliberately excludes `scripts` (the theme replay list,
 * identical on every page) and `bodyClass`, neither of which is content a recrawl would care about.
 */
const hash16 = (v) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 16);
const fingerprint = (p) =>
  hash16([mainOf(p.bodyHtml ?? ""), p.seo ?? {}, p.jsonLd ?? []]);
/** The fingerprint until 2026-11-04 (whole body). Only `--rekey` uses it. */
const legacyFingerprint = (p) =>
  hash16([withoutLiveRegions(p.bodyHtml ?? ""), p.seo ?? {}, p.jsonLd ?? []]);

// Self-check: the extraction must take the outer homepage <main> whole (the FAQ sits after the
// nested calculator <main>), and an authored page's <main> must hold its content blocks.
const home = pages.find((p) => p.isFront);
if (home && !mainOf(home.bodyHtml ?? "").includes("section-faq")) {
  console.error(
    "lastmod: the homepage <main> extraction lost the FAQ — the nested-main trap.",
  );
  process.exit(1);
}
const authored = pages.find((p) => (p.bodyHtml ?? "").includes('data-enriched="1"'));
if (authored && !mainOf(authored.bodyHtml).includes("content-blocks")) {
  console.error(
    `lastmod: the <main> of ${authored.path} has no content-blocks — extraction is wrong.`,
  );
  process.exit(1);
}

// The body with every live region (`data-lm-ignore`) cut out — lib/live/regions.mjs explains
// why an attribute, why the raw string, and why a nested region is cut once. The announcement
// bar holds EVERY seasonal line on every page (scripts/live-surfaces.mjs); without the cut,
// rewording one line would re-stamp all ~109 URLs at once — the failure described at the top.
const previous = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, "utf8")) : {};
const today = new Date().toISOString().slice(0, 10);

const next = {};
let added = 0;
let changed = 0;
let held = 0;
let rekeyed = 0;

// Sorted by path so the file diffs cleanly and never reorders on a pipeline change.
for (const page of [...pages].sort((a, b) => a.path.localeCompare(b.path))) {
  const hash = fingerprint(page);
  const before = previous[page.path];

  if (REKEY && before && before.hash === legacyFingerprint(page)) {
    // Same content under the old definition: same date under the new one.
    next[page.path] = { hash, lastmod: before.lastmod };
    rekeyed++;
  } else if (!before) {
    next[page.path] = { hash, lastmod: today };
    added++;
  } else if (before.hash !== hash) {
    next[page.path] = { hash, lastmod: today };
    changed++;
  } else {
    next[page.path] = { hash, lastmod: before.lastmod };
    held++;
  }
}

const dropped = Object.keys(previous).filter((p) => !(p in next));

writeFileSync(LEDGER, JSON.stringify(next, null, 2) + "\n", "utf8");

console.log(
  `lastmod: ${Object.keys(next).length} pages — ${added} new, ${changed} changed, ${held} unchanged` +
    (REKEY
      ? `, ${rekeyed} rekeyed to the <main> fingerprint with their dates kept`
      : "") +
    (dropped.length ? `, ${dropped.length} removed` : ""),
);
for (const p of dropped) console.log(`  removed: ${decodeURIComponent(p)}`);

// A ledger that moved every page at once is almost always a bug in an upstream step (or a
// genuine sitewide sweep). Say so rather than silently telling Google the whole site changed.
if (changed && changed === Object.keys(next).length) {
  console.log(
    "lastmod: NOTE — every page changed in this run. Expected after a sitewide edit such as a\n" +
      "         NAP change; otherwise check whether an earlier pipeline step is non-deterministic.",
  );
}
