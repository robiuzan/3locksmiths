/**
 * Rebuilds the global footer on every page (backlog §9.2).
 *
 * The scraped WordPress footer shipped 6 links — phone, email, a contact CTA and three legal
 * links — and reached **zero** of the 30 service pages and 17 location pages, while one of its
 * two columns (`footer-col sidebar-1`) was completely empty and rendered as a blank gap. That
 * footer is on all 67 routes, so it was 67 wasted opportunities to link into both silos.
 *
 * This script fills `sidebar-1` with the service silo, inserts an areas column for the location
 * silo, and preserves the existing contact column untouched.
 *
 * PIPELINE POSITION — this matters:
 *   pages → build-manifest → enrich → **footer** → fix-links
 *   - after build-manifest, because the link lists come from content/enriched/_manifest.json
 *   - before fix-links, so every link emitted here is validated against the real route set
 *     (a broken href fails the build) and picks up its data-cta automatically.
 *   It deliberately does NOT live in transform.mjs, which only runs during `npm run snapshot`
 *   and would therefore require re-scraping the live WordPress origin to take effect.
 *
 * Idempotent: the rebuilt row is marked `data-footer-rebuilt`, and a marked row is replaced
 * rather than appended to, so repeated `npm run enrich` runs converge.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "content", "site.json");
const MANIFEST = join(ROOT, "content", "enriched", "_manifest.json");

const site = JSON.parse(readFileSync(FILE, "utf8"));
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
// The brand from the roster-synced manifest, never typed here (CLAUDE.md §6).
const BRAND_NAME = JSON.parse(
  readFileSync(join(ROOT, "site.config.json"), "utf8"),
).brandName;

/** Minimal HTML-escape for text we inject as element content. */
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// --- link lists, straight from the manifest (never hardcode a route) -------------------
// Hub paths are the live Hebrew permalinks, percent-encoded exactly as content/site.json
// stores them.
const HUB_SERVICES = "/services/";
const HUB_AREAS = "/%d7%90%d7%96%d7%95%d7%a8%d7%99-%d7%a9%d7%99%d7%a8%d7%95%d7%aa/";
const HUB_GUIDES = "/%d7%9e%d7%93%d7%a8%d7%99%d7%9b%d7%99%d7%9d/";

const byKind = (k) => manifest.pages.filter((p) => p.kind === k);

/** Keep the first entry per label; return [kept, dropped]. */
function dedupeByLabel(items) {
  const seen = new Set();
  const kept = [];
  const dropped = [];
  for (const it of items) {
    if (seen.has(it.label)) dropped.push(it);
    else {
      seen.add(it.label);
      kept.push(it);
    }
  }
  return [kept, dropped];
}

// Service column: the generic services. Since 2026-08-25 the Tier-1 head term (id 95) is a
// normal `service` row in the manifest, so it is already included — concatenating it again
// listed "שכפול מפתח לרכב" twice. Brand-key pages are 18 and belong behind the services hub
// rather than in a footer column.
const [serviceLinks] = dedupeByLabel(
  byKind("service")
    .map((p) => ({ label: p.keyword || p.title, href: p.path }))
    .filter((l) => l.href),
);

// Areas column: every location, deduped by city name. נתניה and חולון each have TWO live
// location pages (duplicate WordPress permalinks), and a column reading "נתניה · נתניה" is
// just confusing. The deduped-out twins are not dropped from the site — they move to the
// bottom-bar strip below, so nothing is orphaned. Never truncate a silo to fit a layout.
const [areaLinks, areaTwins] = dedupeByLabel(
  byKind("location")
    .map((p) => ({ label: p.city || p.keyword || p.title, href: p.path }))
    .filter((l) => l.href),
);

// Guides column: the editorial hub (/מדריכים/). Rendered only once guides actually exist, so
// the footer never shows an empty column — the exact defect this whole script fixed.
const guideLinks = byKind("guide")
  .filter((p) => p.path && p.path !== HUB_GUIDES)
  .map((p) => ({ label: p.keyword || p.title, href: p.path }));

// Bottom-bar links: every top-level Hebrew lander, as a secondary-navigation strip.
//
// These are ALL head-term pages, and four of them are duplicate-intent twins of a /services/
// URL (מנעולן רכב, מנעולן לבית, שכפול שלט לרכב, קודן לרכב) — both halves of each pair are live
// WordPress permalinks holding ranking signal, so neither is merged away
// (docs/keyword-map.md §8). An earlier version of this filter dropped any lander whose label
// matched a services-column label, to avoid showing the same words twice. That left
// /שכפול-שלט-לרכב-2/ with ZERO inbound links sitewide — a real orphan. A repeated label in a
// secondary-nav strip is a much smaller problem than an unreachable page, so they all ship
// here. The underlying duplication is a content decision flagged for the owner.
const infoLinks = byKind("core")
  .filter((p) => p.path && p.path !== HUB_AREAS)
  .map((p) => ({ label: p.keyword || p.title, href: p.path }))
  // …plus any location twin deduped out of the areas column, so it keeps an inbound link.
  // Labelled with its full keyword ("שכפול מפתחות נתניה") rather than the bare city, so the
  // two halves of the pair are distinguishable.
  .concat(
    areaTwins.map((t) => {
      const page = byKind("location").find((p) => p.path === t.href);
      return { label: page?.keyword || page?.title || t.label, href: t.href };
    }),
  );

const linkList = (links, extraClass = "") =>
  `<ul class="footer-links ${extraClass}">` +
  links.map((l) => `<li><a href="${l.href}">${esc(l.label)}</a></li>`).join("") +
  `</ul>`;

const column = (heading, links, hubHref, hubLabel, extraClass) =>
  `<div class="footer-col footer-col--links">` +
  `<div class="text">` +
  `<h4>${esc(heading)}</h4>` +
  linkList(links, extraClass) +
  `<a class="footer-seeall" href="${hubHref}">${esc(hubLabel)}</a>` +
  `</div></div>`;

let rebuilt = 0;
let skipped = 0;

for (const page of site.pages) {
  if (!/<footer/i.test(page.bodyHtml)) {
    skipped++;
    continue;
  }
  const root = parse(page.bodyHtml, {
    blockTextElements: { script: true, style: true, noscript: true, pre: true },
  });

  const row = root.querySelector("footer .footer-top .footer-row");
  if (!row) {
    skipped++;
    continue;
  }

  // Preserve the existing contact column verbatim — it carries hours, NAP and the CTA, and is
  // the one part of the original footer that was doing real work.
  const contactCol =
    row.querySelector(".footer-col.footer-info") ||
    row.querySelector(".footer-col.sidebar-3") ||
    row.querySelector(".footer-col:last-child");
  // The scraped chrome writes the opening-hours abbreviation with U+2019 (an English
  // apostrophe): "א’-ו’". Hebrew abbreviations take גרש U+05F3 (CLAUDE.md §8, backlog §11.7).
  // Fixed here because this column is otherwise preserved verbatim from the scrape.
  // NOTE: the scrape stores it as the HTML ENTITY `&#8217;`, not the literal character, so
  // both forms have to be matched — a literal-only regex silently does nothing here.
  const contactHtml = contactCol
    ? contactCol.outerHTML.replace(/([א-ת])(?:’|&#8217;|&rsquo;)/g, "$1׳")
    : "";

  row.setAttribute("data-footer-rebuilt", "1");
  row.set_content(
    column("שירותים", serviceLinks, HUB_SERVICES, "כל השירותים", "footer-links--2col") +
      column(
        "אזורי שירות",
        areaLinks,
        HUB_AREAS,
        "כל אזורי השירות",
        "footer-links--2col",
      ) +
      (guideLinks.length
        ? column("מדריכים", guideLinks, HUB_GUIDES, "כל המדריכים", "")
        : "") +
      contactHtml,
  );

  // Bottom bar: prepend the informational landers to the legal menu, so /מחירון/ and
  // /אודותינו/ get a sitewide link without duplicating a label already in the services
  // column. Idempotent — skips anything already present.
  const legalMenu = root.querySelector("footer .footer-bot .footer-menu ul");
  if (legalMenu) {
    const existing = legalMenu.querySelectorAll("a").map((a) => a.getAttribute("href"));
    const prepend = infoLinks
      .filter((l) => !existing.includes(l.href))
      .map((l) => `<li><a href="${l.href}">${esc(l.label)}</a></li>`)
      .join("");
    if (prepend) legalMenu.set_content(prepend + legalMenu.innerHTML);
  }

  // The scraped "© 2025" reads as an abandoned site every January, and a year computed at
  // build time would break the byte-reproducible enrich (and freeze on the day of the last
  // deploy anyway). A year-free notice is what the plan chose (docs/dynamic-presence-plan.md
  // §3.5). Idempotent: the text is set, not appended.
  const copyright = root.querySelector("footer .footer-bot .copyright");
  if (copyright) {
    copyright.set_content(`© כל הזכויות שמורות ל${esc(BRAND_NAME)}`);
  }

  page.bodyHtml = root.toString();
  rebuilt++;
}

writeFileSync(FILE, JSON.stringify(site, null, 2), "utf8");
console.log(
  `footer: rebuilt ${rebuilt} page(s) (${skipped} without a footer row) — ` +
    `${serviceLinks.length} service links, ${areaLinks.length} area links per page.`,
);

if (rebuilt === 0) {
  console.error("\nFOOTER PROBLEM: no page had a .footer-top .footer-row to rebuild.");
  process.exit(1);
}
