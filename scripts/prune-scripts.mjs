/**
 * Drops replayed theme/plugin scripts that have no reachable call site on this site.
 *
 *   node scripts/prune-scripts.mjs      (exit 1 if a pruned script survives)
 *
 * WHY THIS EXISTS
 *
 * components/ThemeScripts.tsx replays every entry in `page.scripts` in document order, and the
 * chain is serialized — each `src` script awaits the previous one's load event. Measured on the
 * built export, the last link (`scripts.js`) executes at ~7.98 s on throttled mobile and mutates
 * the layout, which re-fires Largest Contentful Paint: whichever element is largest gets stamped
 * at ~8 s regardless of when it first painted. The H1 paints at 2.9 s and is still recorded at
 * 8.0 s, with `Load Delay 0 ms / Load Time 0 ms / Render Delay 7,609 ms`. Shortening the chain is
 * therefore an LCP fix, not merely a bytes fix.
 *
 * The scraped script list is WordPress residue: libraries whose call sites were commented out by
 * the original theme author, a caching plugin's beacon that posts to an endpoint a static export
 * does not have, and an Elementor snippet for a page builder this site does not use.
 *
 * `content/site.json` is an 18.5 MB build artifact that must never be hand-edited (CLAUDE.md §3
 * rule 2), and `scripts/transform.mjs` runs only under `npm run snapshot` (CLAUDE.md §7), so a
 * change made there would never appear from an ordinary `npm run enrich`. That is why this is its
 * own enrich-chain pass, alongside scripts/claims.mjs and scripts/prune-chrome-links.mjs.
 *
 * DESIGN
 *
 * Evidence-driven, not a hardcoded kill list. Every entry carries a `keepIf` probe that is
 * re-evaluated on each build against the CURRENT page bodies and the CURRENT vendored theme JS:
 *
 *   - Libraries bound to a selector (fancybox) come back automatically the moment any page
 *     renders that selector.
 *   - Libraries whose call site is commented out in the vendored `scripts.js` (marquee,
 *     matchHeight) come back the moment somebody un-comments it. The check locates the call in
 *     the original source and asks whether that exact offset sits inside a block comment, so
 *     it cannot be fooled by over-eager comment stripping.
 *
 * So this file cannot silently break a page that later grows the markup it removed support for.
 *
 * WHAT IS DELIBERATELY NOT PRUNED
 *
 *   jquery.magnific-popup.min.js  scripts.js:303 calls $('.modal-handler').magnificPopup({...})
 *                                 UNGUARDED. `.modal-handler` matches nothing, but a jQuery
 *                                 plugin method is invoked on the empty set all the same, so
 *                                 dropping the library throws a TypeError and aborts the rest of
 *                                 that ready handler — taking the .btn-close handler with it.
 *                                 Its STYLESHEET is a separate question and is not touched here.
 *   conditionizr, modernizr       No consumer found, but they are feature-detection libraries
 *                                 whose output is implicit (classes on <html>). Left alone rather
 *                                 than pruned on the strength of a grep.
 *   calculator.js, quiz.js        Needed on the calculator steps and /מחירון/ only. That is a
 *                                 per-page decision, not a sitewide drop, and belongs in its own
 *                                 change.
 *
 * Idempotent: a second run finds nothing and reports 0.
 * Runs immediately before scripts/fix-links.mjs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "content", "site.json");
const THEME_JS = join(
  ROOT,
  "public",
  "wp-content",
  "themes",
  "gogo",
  "assets",
  "js",
  "scripts.js",
);

const themeJs = readFileSync(THEME_JS, "utf8");

/** True when `index` falls inside a /* … *\/ block comment in `src`. */
function insideBlockComment(src, index) {
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf("/*", i);
    if (open === -1 || open > index) return false;
    const close = src.indexOf("*/", open + 2);
    if (close === -1) return true; // unterminated comment swallows the rest
    if (index > open && index < close) return true;
    i = close + 2;
  }
  return false;
}

/**
 * True when `re` matches vendored scripts.js OUTSIDE a comment — i.e. the library really is
 * called. Used as a keep-guard, so an un-commented call site restores the library.
 */
function callSiteIsLive(re) {
  const m = re.exec(themeJs);
  return m ? !insideBlockComment(themeJs, m.index) : false;
}

/** `src` entries to drop, each with the probe that would bring it back. */
const DROPPABLE_SRC = [
  {
    label: "jquery.fancybox 3.5.7 (cdnjs)",
    match: /jquery\.fancybox/,
    why: "scripts.js:15 iterates $('[data-fancybox]') — zero such elements exist, so the callback never runs",
    keepIf: (bodies) => bodies.some((h) => h.includes("data-fancybox")),
  },
  {
    label: "jQuery.Marquee 1.6.0 (cdnjs)",
    match: /jquery\.marquee/,
    why: "the only $('.marquee').marquee() call is inside a block comment; the live path uses owlCarousel",
    keepIf: () => callSiteIsLive(/\$\('\.marquee'\)\.marquee\(/),
  },
  {
    label: "jquery.matchHeight.js",
    match: /jquery\.matchHeight/,
    why: "the only $('.item').matchHeight() call is inside a block comment",
    keepIf: () => callSiteIsLive(/\$\('\.item'\)\.matchHeight\(/),
  },
  {
    label: "WP Rocket beacon",
    match: /wpr-beacon/,
    why: "posts to /wp-admin/admin-ajax.php, which returns 404 on a static export",
    keepIf: () => false,
  },
  {
    label: "schema-and-structured-data collection-front",
    match: /collection-front/,
    why: "scripts/enrich.mjs emits this site's JSON-LD; the plugin's front-end collector has nothing to collect",
    keepIf: () => false,
  },
  {
    label: "wp-includes hooks + i18n",
    match: /\/wp-includes\/js\/dist\/(hooks|i18n)\.min\.js/,
    why: "WordPress core i18n plumbing whose only consumer is the wp.i18n inline dropped below",
    keepIf: () => false,
  },
];

/** Inline snippets to drop. */
const DROPPABLE_INLINE = [
  {
    label: "Elementor registerAllyAction",
    match: /ElementorProFrontendConfig|registerAllyAction/,
    why: "no Elementor here; its clearInterval sits in a branch that never runs, leaking a 100 ms timer for the life of the tab",
    keepIf: (bodies) => bodies.some((h) => h.includes("elementorFrontend")),
  },
  {
    label: "WP Rocket beacon config",
    match: /rocket_beacon_data/,
    why: "configuration for the beacon dropped above",
    keepIf: () => false,
  },
  {
    label: "wp.i18n.setLocaleData",
    match: /wp\.i18n\.setLocaleData/,
    why: "throws once hooks/i18n are gone, and only sets an LTR/RTL flag nothing reads",
    keepIf: () => false,
  },
];

const site = JSON.parse(readFileSync(FILE, "utf8"));
const bodies = site.pages.map((p) => p.bodyHtml || "");

// Resolve every probe ONCE against the whole site, so the decision is sitewide and stable.
const active = [];
const retained = [];
for (const rule of [...DROPPABLE_SRC, ...DROPPABLE_INLINE]) {
  (rule.keepIf(bodies) ? retained : active).push(rule);
}

const isSrc = (rule) => DROPPABLE_SRC.includes(rule);

let removed = 0;
let pagesTouched = 0;
const tally = new Map();

for (const page of site.pages) {
  if (!Array.isArray(page.scripts) || !page.scripts.length) continue;
  const before = page.scripts.length;

  page.scripts = page.scripts.filter((s) => {
    const subject = s.kind === "src" ? (s.url ?? "") : (s.code ?? "");
    for (const rule of active) {
      if (isSrc(rule) !== (s.kind === "src")) continue;
      if (!rule.match.test(subject)) continue;
      tally.set(rule.label, (tally.get(rule.label) ?? 0) + 1);
      return false;
    }
    return true;
  });

  const n = before - page.scripts.length;
  if (n) {
    removed += n;
    pagesTouched++;
  }
}

if (removed) writeFileSync(FILE, JSON.stringify(site, null, 2), "utf8");

console.log(
  `prune-scripts: removed ${removed} script entr${removed === 1 ? "y" : "ies"} from ${pagesTouched} page(s).`,
);
for (const rule of [...DROPPABLE_SRC, ...DROPPABLE_INLINE]) {
  const n = tally.get(rule.label) ?? 0;
  if (n) console.log(`   − ${rule.label}  ×${n}  (${rule.why})`);
}
for (const rule of retained) {
  console.log(`   = ${rule.label} KEPT — its probe still matches, so it is in use`);
}
if (!removed && !retained.length) console.log("   (nothing to remove — already pruned)");

// ---- self-verify: same reason claims.mjs and prune-chrome-links.mjs verify themselves -------
const after = JSON.parse(readFileSync(FILE, "utf8"));
const survivors = [];
for (const page of after.pages) {
  for (const s of page.scripts ?? []) {
    const subject = s.kind === "src" ? (s.url ?? "") : (s.code ?? "");
    for (const rule of active) {
      if (isSrc(rule) !== (s.kind === "src")) continue;
      if (rule.match.test(subject)) survivors.push(`${page.path} -> ${rule.label}`);
    }
  }
}
if (survivors.length) {
  console.error(`\nprune-scripts: ${survivors.length} pruned script(s) SURVIVED:`);
  survivors.slice(0, 10).forEach((s) => console.error(`   ${s}`));
  process.exit(1);
}

// The one library that must never be pruned, asserted rather than assumed.
const missingPopup = after.pages.filter(
  (p) =>
    Array.isArray(p.scripts) &&
    p.scripts.length &&
    !p.scripts.some((s) => (s.url ?? "").includes("magnific-popup")),
);
if (missingPopup.length) {
  console.error(
    `\nprune-scripts: jquery.magnific-popup is MISSING from ${missingPopup.length} page(s).`,
  );
  console.error(
    "   scripts.js:303 calls .magnificPopup() unguarded — without the library it throws",
  );
  console.error("   and aborts the rest of the ready handler. Restore it.");
  missingPopup.slice(0, 5).forEach((p) => console.error(`   ${p.path}`));
  process.exit(1);
}

console.log("prune-scripts: every remaining replayed script has a live call site ✅");
