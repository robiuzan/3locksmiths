/**
 * Corrects SCRAPED WordPress copy that is wrong on the merits — leftover theme demo content and
 * weak on-page SEO copy in markup no authored module owns.
 *
 * WHY IT IS SEPARATE FROM scripts/claims.mjs — that script has one job: removing claims our own
 * data refutes (a rating we cannot source, an experience claim with `foundedYear: null`). What is
 * fixed here is not a truthfulness problem, it is a *wrong page* problem, and folding the two
 * together would blur a scope that has been useful to keep sharp.
 *
 * WHY A PIPELINE PASS AT ALL — the homepage body (id 7) is scraped WordPress markup, not an
 * authored module, and `content/site.json` is a build artifact that must never be hand-edited
 * (CLAUDE.md §3 rule 2). The only durable place to correct scraped copy is inside the enrich
 * chain, where the fix is re-applied on every rebuild instead of being destroyed by it.
 *
 * WHAT IT FIXES
 *
 *   §demo — The gogo theme shipped its own demo content and the scrape captured it verbatim: the
 *   homepage's main CTA band advertised "שירותי תיקון והתקנה של דלתות הזזה באזור נאפולי פלורידה"
 *   — sliding-door repair in Naples, Florida — with a sub-heading crediting "גוגו", the theme
 *   vendor. On an Israeli locksmith homepage this is both an irrelevance signal to search engines
 *   and plainly confusing to a visitor.
 *
 *   This was reported fixed in commit 0b3c2a2 and was not: it stayed live in content/site.json,
 *   in out/index.html and in production. That is precisely why the section is REWRITTEN here
 *   rather than deleted by hand, and why `FORBIDDEN` below fails the build if it ever returns.
 *   The band itself is kept — it carries a working click-to-call CTA — and only its copy changes.
 *
 *   §h1 — The homepage `<h1>` was the bare string "מנעולן רכב": no brand, no service scope, and
 *   no alignment with a `<title>` that promises car *and* home locksmithing. It was also the only
 *   heading on the page's most valuable ranking surface.
 *
 * DESIGN — mirrors scripts/claims.mjs deliberately: every rewrite is enumerated with its exact
 * before/after text, no blanket regex, replacements whose output does not match their input (so
 * the pass is idempotent), a STALE report for rules that match nothing, and a self-verify that
 * exits non-zero if a forbidden string survives.
 *
 *   node scripts/scraped-copy.mjs      (exit 1 if demo content survives)
 */
import { readFileSync, writeFileSync } from "node:fs";

const PATH = "content/site.json";

// Link targets for the homepage pivot come from the build manifest (scripts/build-manifest.mjs runs
// earlier in the chain) — never a hand-typed percent-encoded href.
const PAGE_MANIFEST = JSON.parse(readFileSync("content/enriched/_manifest.json", "utf8"));
function pathOf(id) {
  const p = PAGE_MANIFEST.lookup?.[id]?.path;
  if (!p) {
    console.error(
      `scraped-copy: no manifest path for page ${id} — the link target is gone.`,
    );
    process.exit(1);
  }
  return p;
}

/**
 * The homepage's copy after the 2026-11-04 pivot to "שכפול מפתח לרכב" (owner decision: the homepage
 * leads visually with car-key duplication, page 95 stays the page that ranks for the term).
 * Shared by the WordPress-original rules below and by HOME_REWRITES, so a re-scrape lands on the
 * same text as the stateful file does.
 */
const PIVOT = {
  h1: "<h1>מנעולן לרכב ולבית – שכפול מפתח לרכב בשטח, קידוד ופתיחת מנעולים</h1>",
  tagline:
    "שכפול וקידוד מפתח לרכב ליד הרכב – שבב, שלט ומפתח חכם – וגם פתיחת דלתות והחלפת מנעולים בבית. טווח המחיר נמסר בטלפון לפני היציאה.",
  ctaHeading: "צריכים מפתח נוסף לרכב או ננעלתם בחוץ? מגיעים אליכם עם ניידת מצוידת",
  ctaSubheading: "מפתח יחיד לרכב, רכב נעול או דלת שלא נפתחת?",
};

/** Enumerated rewrites. `from` must be the exact scraped text. */
const REWRITES = [
  // --- §demo: the Naples, Florida sliding-door CTA band on the homepage ---
  {
    id: "home-cta-demo-heading",
    from: "שירותי תיקון והתקנה של דלתות הזזה באזור נאפולי פלורידה",
    to: PIVOT.ctaHeading,
  },
  {
    id: "home-cta-demo-subheading",
    from: "דלת ההזזה שלך תקועה, קשה לפתיחה או פגומה?",
    to: PIVOT.ctaSubheading,
  },
  {
    id: "home-cta-demo-vendor",
    from: "תיקון דלתות הזזה של גוגו כאן כדי לעזור:",
    to: "שלושה מנעולנים פותרים את זה בשטח, באותו ביקור:",
  },
  {
    // A fourth sliding-door reference, further up the page and easy to miss: it sat inside the
    // car-services band, so the homepage offered "sliding door repair" as a car locksmith service.
    id: "home-services-demo-line",
    from: "התקשרו עכשיו והתנסו בשירות לקוחות יוצא דופן ותיקון דלתות הזזה.",
    // Until 2026-11-04 this wrote "מחיר ברור וזמן הגעה מדויק": a price before the range is known
    // and an exact arrival time nobody can promise. A re-scrape now lands on the confirmed wording
    // directly; HOME_REWRITES `home-services-line-estimate` carries the old text forward.
    to: "התקשרו עכשיו ונמסור לכם טווח מחיר וזמן הגעה משוער, לפני שאנחנו יוצאים אליכם.",
  },

  // --- §h1: the homepage heading and the line under it ---
  {
    id: "home-h1",
    from: "<h1>מנעולן רכב</h1>",
    to: PIVOT.h1,
  },
  {
    id: "home-hero-tagline",
    from: "שירותי מנעולנות רכב מתקדמים לכל סוגי הרכבים, זמינות מהירה וטכנולוגיה חדשנית.",
    to: PIVOT.tagline,
  },

  // --- §8 Hebrew punctuation in scraped labels ---
  // The homepage brand grid's Peugeot card is scraped with an ASCII apostrophe. CLAUDE.md §8
  // requires the geresh, and check-typography.mjs only sees authored modules, not scraped HTML.
  {
    id: "home-brand-card-peugeot",
    from: "שכפול מפתח פיג'ו",
    to: "שכפול מפתח פיג׳ו",
  },

  // --- §a11y English accessible names in the scraped chrome (all 109 pages) ---
  // A screen reader announced the menu buttons and the floating call button in English on a
  // Hebrew site (found by the Phase 2 review, 2026-10-01; the accessibility statement no longer
  // lists it as a limitation because of these rules). The pass runs over the raw JSON text, so
  // an attribute's quotes appear escaped: `\"` in the file, `\\"` in this source.
  { id: "a11y-menu-open", from: "Open Mobile Navigation", to: "פתיחת התפריט" },
  { id: "a11y-menu-close", from: "Close Side Navigation", to: "סגירת התפריט" },
  { id: "a11y-float-call", from: "Call by phone", to: "חיוג אלינו" },
  { id: "a11y-title-phone", from: 'title=\\"Phone\\"', to: 'title=\\"טלפון\\"' },
  { id: "a11y-title-email", from: 'title=\\"Email\\"', to: 'title=\\"דוא״ל\\"' },

  // --- §address: the footer printed the address in Latin letters on a Hebrew page (CLAUDE.md §8).
  // Owner confirmed 2026-10-13 that it is right, in Hebrew, and in זכרון יעקב (business-facts
  // §C.1); the same address is in the LocalBusiness schema via the roster's schema.address.
  // A RegExp `from` (the only one): the lookahead keeps it idempotent — a plain string rule that
  // appends the city would append it again on every run. The lookbehind pins it to the footer's
  // `<div class="caption">` (this pass runs on the raw JSON text, where the markup's quotes and
  // whitespace are escaped), so it never touches the JSON-LD streetAddress enrich.mjs writes.
  {
    id: "footer-address-hebrew",
    from: /(?<=caption\\">(?:\\[nt])*)(?:derech sara|דרך שרה) 25\/2(?!, זכרון יעקב)/g,
    to: "דרך שרה 25/2, זכרון יעקב",
  },
];

/**
 * HOMEPAGE-ONLY copy rewrites (page 7) — the 2026-11-04 "שכפול מפתח לרכב" pivot.
 *
 * Scoped to the front page and applied in DECODED mode (to `bodyHtml` after parsing), so
 * attribute quotes are plain `"` — never the raw-file `\\"` idiom used by REWRITES above. The
 * homepage FAQ and every claim fix live in scripts/claims.mjs, which owns the FAQPage mirror.
 *
 * End state, not match count: page 7 is stateful, so after the first run each `from` is gone.
 * What is checked on every run is that `from` is absent and `to` is present exactly once.
 *
 * Wording rules for this list (check-typography.mjs does not read scripts): ׳ and ״, never ASCII
 * quotes; ₪ after the number with a spaced en dash; no warranty term, no years, no counts, no
 * arrival time; prices only from the sitewide rows (docs/business-facts.md §D.1).
 */
const HOME_REWRITES = [
  // --- hero ---
  {
    id: "home-h1-pivot",
    from: "<h1>מנעולן לרכב ולבית – שכפול מפתחות, קידוד ופתיחת מנעולים</h1>",
    to: PIVOT.h1,
  },
  {
    id: "home-hero-tagline-pivot",
    from: "<p>שכפול וקידוד מפתחות, פתיחת רכב נעול והחלפת מנעולים – הכל בשטח אצלכם, במחיר שנמסר מראש.</p>",
    to: `<p>${PIVOT.tagline}</p>`,
  },
  { id: "home-chip-1", from: "<h4>שכפול מפתח רכב</h4>", to: "<h4>שכפול מפתח לרכב</h4>" },
  {
    id: "home-chip-2",
    from: "<h4>שכפול אימובילייזר</h4>",
    to: "<h4>קידוד שבב אימובילייזר</h4>",
  },

  // --- the about column beside the calculator: an answer block, then the way to page 95 ---
  {
    id: "home-about-heading",
    from: "על שלושה מנעולנים בקצרה",
    to: "שכפול מפתח לרכב בשטח – בקצרה",
  },
  {
    // `from` is what scripts/claims.mjs (`home-intro-25-years`) writes from the WordPress original.
    id: "home-about-answer",
    from: "<p>אנו מתמחים בשירותי מנעולנות רכב ובעלי הבנה עמוקה בכל סוגי המפתחות והמנגנונים.</p>",
    to: "<p>שכפול מפתח לרכב נעשה ליד הרכב: חיתוך להב לפי המפתח הקיים וקידוד השבב למחשב הרכב, בלי גרירה למוסך. מפתח מכני עולה 200 – 350 ₪, מפתח עם שבב או מתקפל עם שלט 350 – 550 ₪ ומפתח חכם 450 – 900 ₪. העבודה נמשכת כ-20 עד 90 דקות, לפי סוג המפתח.</p>",
  },
  {
    // "ומבטיחים שקט נפשי לכל לקוח" was a guarantee phrase; the slot becomes the in-body link to
    // the ranking page, with its exact keyword as the anchor.
    id: "home-about-links",
    from: "<p>אנו מאמינים שדיוק, שירות אנושי וטכנולוגיה מתקדמת הם הבסיס לכל עבודה – ומבטיחים שקט נפשי לכל לקוח.</p>",
    to: `<p>סוגי המפתחות, זמני העבודה ומה להכין מראש – הכול בעמוד <a class="enrich-home-link" href="${pathOf(95)}">שכפול מפתח לרכב</a>. אין בידכם אף מפתח? המסלול הוא <a class="enrich-home-link" href="${pathOf(96)}">שחזור מפתח לרכב</a>.</p>`,
  },

  // --- the calculator: English and ASCII-apostrophe leftovers ---
  {
    id: "home-calc-subtitle",
    from: "<p>קבל הערכת מחיר מהירה .</p>",
    to: "<p>קבלו הערכת מחיר לפי סוג התקלה.</p>",
  },
  { id: "home-calc-send", from: "</svg>Send message</a>", to: "</svg>שליחת הודעה</a>" },
  { id: "home-calc-switch-geresh", from: "החלפת סוויץ' רכב", to: "החלפת סוויץ׳ רכב" },

  // --- the form band: what to check and what to prepare ---
  {
    id: "home-form-heading",
    from: "<h2><span>תמיד</span> הלקוח במרכז.</h2>",
    to: "<h2><span>לפני שמזמינים</span> מנעולן לשכפול מפתח</h2>",
  },
  {
    // Sits under the heading scripts/claims.mjs rewrites to "מה להכין לפני השיחה:".
    id: "home-form-prep",
    from: "<p>אנו מבינים שלקוח שמחפש מנעולן רכב צריך פתרון מיידי, אמין ונגיש – זו בדיוק המחויבות שלנו אליך.</p>",
    to: "<p>מפתח קיים אם יש, רישיון רכב ותעודה מזהה של הבעלים, ויצרן, דגם ושנת ייצור. אין אף מפתח? זה שחזור, ומחירו נקבע לפי הדגם.</p>",
  },

  // --- the services band ---
  {
    id: "home-band-heading",
    from: "<h2>שירותים מתקדמים לרכב שלך</h2>",
    to: "<h2>שכפול מפתח לרכב בשטח – מכני, שבב, שלט ומפתח חכם</h2>",
  },
  {
    id: "home-band-intro",
    from: "<p>אנו מספקים קשת רחבה של שירותי מנעולנות רכב – ממפתחות פשוטים ועד לקידוד חכם ומורכב.</p>",
    to: "<p>חותכים את הלהב ומקודדים את השבב ליד הרכב, באותו ביקור. אותה ניידת גם פותחת רכב נעול ומשכפלת שלטים.</p>",
  },
  {
    // What REWRITES `home-services-demo-line` wrote until 2026-11-04 (it now writes `to` itself).
    id: "home-services-line-estimate",
    from: "התקשרו עכשיו ונמסור לכם מחיר ברור וזמן הגעה מדויק, לפני שאנחנו יוצאים אליכם.",
    to: "התקשרו עכשיו ונמסור לכם טווח מחיר וזמן הגעה משוער, לפני שאנחנו יוצאים אליכם.",
  },
  { id: "home-band-chip-2", from: "שכפול מהיר</li>", to: "מפתח עם שבב</li>" },
  { id: "home-band-chip-3", from: "קידוד מתקדם</li>", to: "מפתח מתקפל עם שלט</li>" },

  // --- the advantages band (scripts/advantage-icons.mjs keys its icons on these headings) ---
  {
    // `from` is what scripts/claims.mjs (`home-card-25-years`) writes from the WordPress original.
    id: "home-adv-1-heading",
    from: "<h3>מומחיות במנעולנות רכב</h3>",
    to: "<h3>קידוד שבב במקום</h3>",
  },
  {
    id: "home-adv-3-heading",
    from: "<h3>התאמה לרכב חכם</h3>",
    to: "<h3>מפתח חכם ושלט</h3>",
  },
  {
    id: "home-adv-3-body",
    from: "<p>ציוד עדכני ומיומנות גבוהה בטיפול במערכות אימובילייזר ומפתחות חכמים.</p>",
    to: "<p>מפתחות חכמים, מתקפלים ושלטים מקודדים מול הרכב ונבדקים בנעילה ובהתנעה לפני המסירה.</p>",
  },
  {
    // The two practices the owner confirmed 2026-11-04 (docs/business-facts.md §D.13), in the
    // approved wording.
    id: "home-adv-6-body",
    from: "<p>הצעות מחיר הוגנות מראש, בלי הפתעות – ובאישור מלא מהלקוח.</p>",
    to: "<p>טווח מחיר נמסר בטלפון לפני היציאה, והמחיר שסוכם אינו משתנה בשטח.</p>",
  },

  // --- the brand grid ---
  {
    id: "home-grid-heading",
    from: "<span>כל שירותי מנעולן הרכב במקום אחד</span>",
    to: "<span>שכפול מפתח לרכב לפי יצרן</span>",
  },
  {
    id: "home-grid-subline",
    from: "<p>שכפול מפתח למגוון רכבים גדול</p>",
    to: `<p>בחרו את יצרן הרכב לפרטים על סוגי המפתחות שלו, או קראו את העמוד המלא על <a class="enrich-home-link" href="${pathOf(95)}">שכפול מפתח לרכב</a>.</p>`,
  },
  {
    // A dead control: scripts.js:293-296 shows `.s-services-list .row > div`, and the grid is
    // `.rows`, so the click did nothing at any width. It becomes a real link to the services hub.
    id: "home-grid-toggle",
    from: '<div class="toggle-serv-wrap">\r\n                <div class="toggle-services">הצג את כל השירותים</div>\r\n            </div>',
    to: `<p class="enrich-grid-more"><a class="enrich-home-link" href="${pathOf(9005)}">לכל שירותי המנעולן</a></p>`,
  },

  // --- the CTA band (the WordPress-original rules above write the same text on a re-scrape) ---
  {
    id: "home-cta-heading-pivot",
    from: "<h2>ננעלתם בחוץ או אבד לכם מפתח? מגיעים אליכם עם ניידת מצוידת</h2>",
    to: `<h2>${PIVOT.ctaHeading}</h2>`,
  },
  {
    id: "home-cta-subheading-pivot",
    from: "<h3>רכב נעול, דלת שלא נפתחת או מפתח שאבד?</h3>",
    to: `<h3>${PIVOT.ctaSubheading}</h3>`,
  },

  // --- the FAQ intro (the accordion itself is scripts/claims.mjs's) ---
  {
    id: "home-faq-heading",
    from: " מידע חיוני ושירותים מקצועיים <span>התשובות לכל מה שרצית לדעת. </span> ",
    to: " מה חשוב לדעת על שכפול מפתח לרכב – <span>מחיר, זמן ומה להכין מראש.</span> ",
  },
  {
    id: "home-faq-intro",
    from: "<p>יש לך עוד שאלות? שלח הודעה לצוות שלנו או התקשר עם מנעולן רכב מומחה</p>",
    to: `<p>המחירון לפי סוג מפתח, זמני העבודה ומה עושים כשאין מפתח מפורטים בעמוד <a class="enrich-home-link" href="${pathOf(95)}">שכפול מפתח לרכב</a> ובמדריך <a class="enrich-home-link" href="${pathOf(9201)}">כמה עולה שכפול מפתח לרכב</a>.</p>`,
  },
];

/**
 * Strings that must not survive the pass. A match here means theme demo content is live on a
 * page again — the exact regression that shipped once already.
 */
const FORBIDDEN = [
  // An English button label on a Hebrew page (CLAUDE.md §8) — the calculator's last step.
  ["english-button-label", /Send message/],
  ["naples-florida", /נאפולי|פלורידה/],
  ["theme-vendor-brand", /של גוגו/],
  // Narrowed 2026-08-26. This rule was `/דלתות הזזה|דלת ההזזה/`, which fired on
  // /services/תיקון-דלתות/ the moment that page gained an honest FAQ about repairing sliding
  // and aluminium doors — work this locksmith actually does. "דלתות הזזה" is an ordinary Hebrew
  // service term, so the guard now matches the demo SENTENCES rather than the noun.
  ["demo-sliding-door-cta", /שירותי תיקון והתקנה של דלתות הזזה/],
  ["demo-sliding-door-headline", /דלת ההזזה שלך תקועה/],
  ["demo-sliding-door-vendor", /תיקון דלתות הזזה של/],
  ["latin-footer-address", /derech sara/i],
  [
    "english-accessible-name",
    /Open Mobile Navigation|Close Side Navigation|Call by phone|title=\\"(?:Phone|Email)\\"/,
  ],
];

const raw = readFileSync(PATH, "utf8");
let out = raw;
const counts = new Map();

for (const r of REWRITES) {
  if (r.from instanceof RegExp) {
    const n = (out.match(r.from) || []).length;
    counts.set(r.id, n);
    if (n) out = out.replace(r.from, r.to);
    continue;
  }
  const n = out.split(r.from).length - 1;
  counts.set(r.id, n);
  if (n) out = out.split(r.from).join(r.to);
}

// --- homepage-only pass (page 7): decoded mode, end-state assertions --------------------------
const site = JSON.parse(out);
const pages = Array.isArray(site) ? site : (site.pages ?? Object.values(site));
const home = pages.find((p) => p.isFront);
if (!home) {
  console.error("scraped-copy: no front page in content/site.json.");
  process.exit(1);
}
const homeFails = [];
let homeApplied = 0;
for (const r of HOME_REWRITES) {
  if (r.to.includes(r.from))
    homeFails.push(`${r.id}: \`to\` contains \`from\` — not idempotent`);
  const hit = home.bodyHtml.split(r.from).length - 1;
  if (hit) {
    home.bodyHtml = home.bodyHtml.split(r.from).join(r.to);
    homeApplied += hit;
  }
}
for (const r of HOME_REWRITES) {
  const left = home.bodyHtml.split(r.from).length - 1;
  const present = home.bodyHtml.split(r.to).length - 1;
  if (left) homeFails.push(`${r.id}: \`from\` still present ×${left}`);
  if (present !== 1) homeFails.push(`${r.id}: \`to\` present ×${present}, expected 1`);
}
// Every link this pass writes must be a plain root-relative href to a page that exists. fix-links
// validates internal links later in the chain, but it skips any href that does not start with "/"
// — which is exactly what an escaping mistake (`href=\"…\"`) produces.
const routes = new Set(pages.map((p) => p.path));
for (const m of home.bodyHtml.matchAll(/class="enrich-home-link" href="([^"]*)"/g)) {
  if (!m[1].startsWith("/") || !routes.has(m[1]))
    homeFails.push(`homepage link to a page that does not exist: ${m[1]}`);
}
if (homeFails.length) {
  console.error(`\nscraped-copy: the homepage pass did not reach its end state:`);
  for (const f of homeFails) console.error("  ! " + f);
  process.exit(1);
}
out = JSON.stringify(site, null, 2);

writeFileSync(PATH, out);

const applied = [...counts].filter(([, n]) => n > 0);
const stale = [...counts].filter(([, n]) => n === 0);
console.log(
  `scraped-copy: rewrote ${applied.reduce((a, [, n]) => a + n, 0)} occurrence(s) across ${applied.length} rule(s).`,
);
for (const [id, n] of applied) console.log(`   ${id.padEnd(26)} ×${n}`);
if (stale.length) {
  console.log(
    `   ${stale.length} rule(s) matched nothing (already clean, or STALE — remove if the source text is gone):`,
  );
  for (const [id] of stale) console.log(`     - ${id}`);
}
console.log(
  `scraped-copy: homepage pass — ${homeApplied} replacement(s) this run, all ${HOME_REWRITES.length} rule(s) at their end state.`,
);

// --- self-verify: no demo content may survive -------------------------------------------
const survivors = [];
for (const p of pages) {
  const hay = [
    String(p.bodyHtml ?? ""),
    p.seo?.title ?? "",
    p.seo?.description ?? "",
    JSON.stringify(p.jsonLd ?? ""),
  ].join(" ");
  for (const [id, re] of FORBIDDEN) {
    const m = hay.match(re);
    if (m) survivors.push(`${id} :: ${decodeURIComponent(p.path ?? p.id)} :: "${m[0]}"`);
  }
}

if (survivors.length) {
  console.error(`\nscraped-copy: ${survivors.length} demo string(s) SURVIVED the pass:`);
  for (const s of survivors.slice(0, 20)) console.error("  ! " + s);
  console.error(
    "\nAdd an explicit rewrite above, or prune the section in scripts/pages.mjs.\n",
  );
  process.exit(1);
}
console.log("scraped-copy: no theme demo content survives ✅");
