/**
 * Drops location links from the two SCRAPED chrome surfaces that no other script owns, when the
 * page they point at no longer exists.
 *
 *   node scripts/prune-chrome-links.mjs      (exit 1 if a dead link survives)
 *
 * WHY THIS EXISTS
 *
 * Retiring a location page is mostly self-healing on this site: the footer is rebuilt from the
 * manifest (scripts/footer.mjs), /sitemap/ and the hub lists are regenerated (scripts/pages.mjs),
 * app/sitemap.ts derives from content/site.json, and `related`/`areas` arrays live in authored
 * modules where a human edits them. Two surfaces are not covered by any of that:
 *
 *   1. The header mega-menu. `div.hide > div.locations-drop-down.sub-menu` is a template
 *      reservoir the vendored gogo jQuery clones into the header nav. It hardcodes the 17
 *      original location links and sits on every page — generated pages inherit it through the
 *      chrome clone in scripts/pages.mjs. Nothing regenerates it.
 *
 *   2. The homepage areas band. Page id 7 has no content/enriched/ module — its <main> is kept
 *      exactly as scraped — so `section.section-areas ul.location-list` is raw WordPress markup
 *      listing the same 17 cities, and enrich.mjs never replaces it.
 *
 * Both are inside content/site.json, an 18.5 MB build artifact that must never be hand-edited
 * (CLAUDE.md §3 rule 2), so the only durable fix is a pipeline pass — the same reasoning that put
 * scripts/claims.mjs and scripts/scraped-copy.mjs in the chain.
 *
 * DESIGN
 *
 * Route-driven, not a list of retired cities: it removes a link because its target is absent from
 * the page set, so the next retirement needs no edit here. Deliberately narrow — it only touches
 * the two selectors above. A blanket "remove every dead link" pass would mask exactly the errors
 * scripts/fix-links.mjs exists to shout about, so anything outside these two surfaces is left for
 * fix-links to fail on.
 *
 * Removes the enclosing <li> rather than the <a>, because a bare text fragment in a nav list
 * renders as an unstyled orphan item. Idempotent: a second run finds nothing and reports 0.
 *
 * Runs immediately before scripts/fix-links.mjs, which then validates the result.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "content", "site.json");

/** The two scraped surfaces nothing else regenerates. */
const SELECTORS = [".locations-drop-down a[href]", ".location-list a[href]"];

const site = JSON.parse(readFileSync(FILE, "utf8"));
const routes = new Set(site.pages.map((p) => p.path));

/** Walk up to the enclosing <li>, if there is one within a few hops. */
function enclosingLi(node) {
  let n = node.parentNode;
  for (let i = 0; n && i < 4; i++, n = n.parentNode) {
    if (n.rawTagName && n.rawTagName.toLowerCase() === "li") return n;
  }
  return null;
}

let pagesTouched = 0;
let linksRemoved = 0;
const byTarget = new Map();

for (const page of site.pages) {
  if (!page.bodyHtml || !page.bodyHtml.includes("/locations/")) continue;
  const root = parse(page.bodyHtml);
  let dirty = false;

  for (const sel of SELECTORS) {
    for (const a of root.querySelectorAll(sel)) {
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/locations/")) continue;
      if (routes.has(href)) continue;
      (enclosingLi(a) ?? a).remove();
      byTarget.set(href, (byTarget.get(href) ?? 0) + 1);
      linksRemoved++;
      dirty = true;
    }
  }

  if (dirty) {
    page.bodyHtml = root.toString();
    pagesTouched++;
  }
}

if (linksRemoved) writeFileSync(FILE, JSON.stringify(site, null, 2), "utf8");

console.log(
  `chrome-links: removed ${linksRemoved} dead location link(s) from ${pagesTouched} page(s).`,
);
for (const [href, n] of [...byTarget].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${decodeURIComponent(href)}  ×${n}`);
}
if (!linksRemoved)
  console.log("   (nothing to remove — every chrome location link resolves)");

// ---- self-verify: the same reason claims.mjs verifies itself ---------------
const after = JSON.parse(readFileSync(FILE, "utf8"));
const afterRoutes = new Set(after.pages.map((p) => p.path));
const survivors = [];
for (const page of after.pages) {
  if (!page.bodyHtml || !page.bodyHtml.includes("/locations/")) continue;
  const root = parse(page.bodyHtml);
  for (const sel of SELECTORS) {
    for (const a of root.querySelectorAll(sel)) {
      const href = a.getAttribute("href");
      if (href?.startsWith("/locations/") && !afterRoutes.has(href)) {
        survivors.push(`${page.path} -> ${href}`);
      }
    }
  }
}
if (survivors.length) {
  console.error(`\nchrome-links: ${survivors.length} dead link(s) SURVIVED:`);
  survivors.slice(0, 10).forEach((s) => console.error(`   ${s}`));
  process.exit(1);
}
console.log("chrome-links: every location link in the scraped chrome resolves ✅");
