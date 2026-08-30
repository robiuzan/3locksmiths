/**
 * Rewrites ⛔ business claims that live in SCRAPED WordPress HTML.
 *
 * WHY A PIPELINE PASS — the homepage body (id 7) is scraped WordPress markup, not an authored
 * module, and `content/site.json` is a build artifact that must never be hand-edited
 * (CLAUDE.md §3 rule 2). So the only correct place to correct scraped copy is here, inside the
 * enrich chain, where the change is re-applied on every rebuild instead of being destroyed by it.
 *
 * WHAT IT FIXES — claims the site itself refutes elsewhere:
 *   · "ניסיון של 25 שנה"  — site.config.json has foundedYear: null.
 *   · "זמינות 24/7"       — WAS ⛔ while the schema said 08:00–18:00; the owner confirmed
 *                          24/7 on 2026-08-30, so these rules now run in reverse. See §D.3.
 *   · a "Google rating 5.0 ★★★★★" BADGE IMAGE — see §rating below.
 * All were live on the homepage, the single highest-value page on the site, and all were
 * invisible to module-level review because no module contains them.
 *
 * §rating — 2026-08-26. The vendored gogo theme ships `assets/img/GoogleRating.png`, which
 * renders the words "Google rating 5.0" beside five filled stars. The scraped header placed it
 * on ALL 71 pages. docs/business-facts.md §B records zero collected reviews, no Business Profile
 * and an empty `sameAs` — so the badge asserted a rating that does not exist.
 *
 * It survived every previous audit because every rating guard we had looks for `aggregateRating`
 * or `reviewCount` in MARKUP. This claim was baked into a PNG, where no schema validator and no
 * text scan could see it. A fabricated rating is a Google policy violation and an Israeli
 * consumer-protection exposure (CLAUDE.md §3 rule 1), not a styling detail — so it is removed
 * here rather than hidden with CSS, and `FORBIDDEN` below fails the build if it ever returns.
 *
 * DESIGN — every rewrite is enumerated with its exact before/after text. No blanket regex: a
 * broad substitution over scraped marketing copy is how you silently mangle a page. A rule that
 * matches nothing is reported as STALE so it gets removed rather than rotting. Replacements are
 * plain string swaps whose output does not match their input, so the pass is idempotent.
 *
 * It also rewrites the JSON-LD, because the homepage FAQPage block mirrors the visible accordion
 * — fixing only the HTML would leave the contradicted claim in the structured data.
 *
 *   node scripts/claims.mjs      (exit 1 if a ⛔ claim survives the pass)
 */
import { readFileSync, writeFileSync } from "node:fs";

const PATH = "content/site.json";

/** Enumerated rewrites. `from` must be the exact scraped text. */
const REWRITES = [
  {
    id: "home-intro-25-years",
    from: "אנו מתמחים בשירותי מנעולנות רכב עם ניסיון של 25 שנה ועם הבנה עמוקה בכל סוגי המפתחות והמנגנונים.",
    to: "אנו מתמחים בשירותי מנעולנות רכב ובעלי הבנה עמוקה בכל סוגי המפתחות והמנגנונים.",
  },
  {
    // Must run after the rewrite above, which contains this substring.
    id: "home-card-25-years",
    from: "ניסיון של 25 שנה",
    to: "מומחיות במנעולנות רכב",
  },
  {
    id: "home-section-25-years",
    from: "25 שנות ניסיון במנעולנות רכב.",
    to: "מנעולנות רכב ובית – עבודה מדויקת בשטח, עד אליכם.",
  },
  // --- 24/7: RESTORED 2026-08-30 ------------------------------------------------------------
  // These three rules used to run the other way, stripping 24/7 out of the scraped homepage
  // because the schema published 08:00–18:00 and the page contradicted itself. The owner
  // confirmed 24/7 availability on 2026-08-30 (docs/business-facts.md §D.3), the schema in
  // scripts/enrich.mjs now publishes 00:00–23:59 all week, and the claim is sourced.
  //
  // They are reversed rather than deleted because content/site.json PERSISTS: the earlier pass
  // already overwrote the original scraped wording, so simply removing the rules would leave the
  // hedged 08:00–18:00 copy frozen on the homepage forever. `from` is therefore the text this
  // script itself wrote, not the WordPress original.
  {
    id: "home-card-247-heading",
    from: "מענה לקריאות דחופות",
    to: "זמינות 24/7",
  },
  {
    id: "home-card-247-body",
    from: "קריאות דחופות מטופלות בעדיפות. התקשרו ונעדכן זמן הגעה מדויק.",
    to: "אין שעות עבודה – השירות שלנו פועל גם בשעות חירום ובלילות.",
  },
  {
    id: "home-faq-247",
    from: "שעות הפעילות המפורסמות שלנו הן א׳–ו׳ 08:00–18:00 ושבת 08:00–17:00. לקריאה דחופה מחוץ לשעות אלה התקשרו ל-055-6601006 ונאמר לכם מיד אם יש ניידת פנויה באזורכם.",
    to: "כן. אנחנו זמינים 24/7, כולל לילות, שבתות וחגים. התקשרו ל-055-6601006 ונמסור לכם זמן הגעה מדויק.",
  },
];

/**
 * Rewrites applied to each page's `bodyHtml` AFTER the file is parsed, not to the raw file text.
 *
 * WHY A SECOND LIST — `REWRITES` above is a whole-file string pass. That works for the claims it
 * carries because they are quote-free Hebrew prose, which appears identically in the raw JSON and
 * inside the double-escaped `jsonLd` strings. A rule containing HTML attributes cannot work that
 * way: `class="value"` is stored as `class=\"value\"` in site.json and would never match. These
 * run against the decoded `bodyHtml` string, where the markup looks exactly as authored.
 */
const HTML_REWRITES = [
  {
    // §rating — the fabricated "Google rating 5.0 ★★★★★" badge, on all 71 pages.
    // Removed outright: there is no rating to show until the owner collects real reviews.
    id: "fabricated-google-rating-badge",
    from: '<img class="mob-gr" src="/wp-content/themes/gogo/assets/img/GoogleRating.png" alt>',
    to: "",
  },
  {
    // The header hours strip. It first published Saturday 16:00 while the schema said 17:00 —
    // the site contradicting itself on every page — and was aligned to 17:00 on 2026-08-26.
    // Now that the owner has confirmed 24/7 (docs/business-facts.md §D.3) it prints that instead,
    // matching the 00:00–23:59 openingHoursSpecification in scripts/enrich.mjs.
    id: "header-hours-strip",
    from: `<div class="value">א׳–ו׳: 8:00–18:00 | שבת: 8:00–17:00</div>`,
    to: `<div class="value">זמינים 24/7, כל ימות השבוע</div>`,
  },
  {
    // The SECOND hours block — the footer "שעות פתיחה" info panel, on all 116 pages. It is a
    // different element from the header strip above and was missed when the header was first
    // aligned on 2026-08-26, so the site published two different opening-hours statements in the
    // same document for four days. Found by grepping the rendered artifact for the time string
    // rather than by reading the templates.
    id: "footer-hours-block",
    from: `<div class="work-time">\n\t\t\t\t\t\t\t\t\t\t<p>א׳-ו׳: 8:00–18:00 | שבת: 8:00–17:00</p>`,
    to: `<div class="work-time">\n\t\t\t\t\t\t\t\t\t\t<p>זמינים 24/7, כל ימות השבוע</p>`,
  },
  {
    // Same block, entity-encoded variant (one page kept the &#8217; form of the geresh).
    id: "footer-hours-block-encoded",
    from: `<p>א&#8217;-ו&#8217;: 8:00–18:00 | שבת: 8:00–17:00</p>`,
    to: `<p>זמינים 24/7, כל ימות השבוע</p>`,
  },
  {
    // The brand logo shipped with an empty alt on every page, so the one image that names the
    // business was invisible to screen readers and to image search.
    //
    // The anchor deliberately includes the logo FILENAME. Anchoring on the class attribute alone
    // (`class="attachment-full size-full" alt decoding=`) looks equivalent and is not: the gogo
    // theme puts those classes on 884 images sitewide, so that version captioned every decorative
    // image on the site with the company name. The other images keep `alt` empty, which is the
    // correct WCAG treatment for decoration — an empty alt is not a missing alt.
    id: "logo-alt-text",
    from: `-לוגו.webp" class="attachment-full size-full" alt decoding=`,
    to: `-לוגו.webp" class="attachment-full size-full" alt="שלושה מנעולנים – מנעולן לרכב ולבית" decoding=`,
  },
];

/** ⛔ patterns that must not survive. Mirrors scripts/check-claims.mjs. */
const FORBIDDEN = [
  ["years-in-business", /\d{1,2}\s*\+?\s*שנות ניסיון|ניסיון של\s*\d{1,2}\s*שנ/],
  // "always-open" was here until 2026-08-30. Removed, not relaxed: the owner confirmed 24/7
  // (docs/business-facts.md §D.3) and the schema now publishes 00:00–23:59 all week, so the
  // claim is sourced. A guard that forbids something we can source is a guard people learn to
  // ignore — and the surrounding rules only work while this list is trusted. If 24/7 ever stops
  // being true, restore it here AND revert the schema; one without the other is the exact
  // self-contradiction §D.3 exists to prevent.
  // Tested against raw HTML, not visible text — this claim lives in an <img src>, which is
  // exactly why every text- and schema-level rating guard missed it. See §rating above.
  ["fabricated-rating-badge", /GoogleRating/],
];

const raw = readFileSync(PATH, "utf8");
let out = raw;
const counts = new Map();

for (const r of REWRITES) {
  const n = out.split(r.from).length - 1;
  counts.set(r.id, n);
  if (n) out = out.split(r.from).join(r.to);
}

// --- markup-level pass: operate on decoded bodyHtml, then re-serialise ---
const doc = JSON.parse(out);
const docPages = Array.isArray(doc) ? doc : (doc.pages ?? Object.values(doc));
for (const r of HTML_REWRITES) counts.set(r.id, 0);
for (const p of docPages) {
  if (typeof p.bodyHtml !== "string") continue;
  for (const r of HTML_REWRITES) {
    const n = p.bodyHtml.split(r.from).length - 1;
    if (!n) continue;
    counts.set(r.id, counts.get(r.id) + n);
    p.bodyHtml = p.bodyHtml.split(r.from).join(r.to);
  }
}
out = JSON.stringify(doc, null, 2);

writeFileSync(PATH, out);

const applied = [...counts].filter(([, n]) => n > 0);
const stale = [...counts].filter(([, n]) => n === 0);
console.log(
  `claims: rewrote ${applied.reduce((a, [, n]) => a + n, 0)} occurrence(s) across ${applied.length} rule(s).`,
);
for (const [id, n] of applied) console.log(`   ${id.padEnd(24)} ×${n}`);
if (stale.length) {
  console.log(
    `   ${stale.length} rule(s) matched nothing (already clean, or STALE — remove if the source text is gone):`,
  );
  for (const [id] of stale) console.log(`     - ${id}`);
}

// --- self-verify: no ⛔ claim may survive -------------------------------------------------
const site = JSON.parse(out);
const pages = Array.isArray(site) ? site : (site.pages ?? Object.values(site));
const survivors = [];
for (const p of pages) {
  const hay = [
    String(p.bodyHtml ?? p.body ?? p.html ?? ""),
    p.seo?.title ?? "",
    p.seo?.description ?? "",
    JSON.stringify(p.jsonLd ?? p.schema ?? ""),
  ].join(" ");
  for (const [id, re] of FORBIDDEN) {
    const m = hay.match(re);
    if (m) survivors.push(`${id} :: ${decodeURIComponent(p.path ?? p.id)} :: "${m[0]}"`);
  }
}

if (survivors.length) {
  console.error(`\nclaims: ${survivors.length} ⛔ claim(s) SURVIVED the pass:`);
  for (const s of survivors.slice(0, 20)) console.error("  ! " + s);
  console.error("\nAdd an explicit rewrite above, or fix the authored module.\n");
  process.exit(1);
}
console.log("claims: no ⛔ claim survives ✅");
