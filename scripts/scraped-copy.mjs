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

/** Enumerated rewrites. `from` must be the exact scraped text. */
const REWRITES = [
  // --- §demo: the Naples, Florida sliding-door CTA band on the homepage ---
  {
    id: "home-cta-demo-heading",
    from: "שירותי תיקון והתקנה של דלתות הזזה באזור נאפולי פלורידה",
    to: "ננעלתם בחוץ או אבד לכם מפתח? מגיעים אליכם עם ניידת מצוידת",
  },
  {
    id: "home-cta-demo-subheading",
    from: "דלת ההזזה שלך תקועה, קשה לפתיחה או פגומה?",
    to: "רכב נעול, דלת שלא נפתחת או מפתח שאבד?",
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
    to: "התקשרו עכשיו ונמסור לכם מחיר ברור וזמן הגעה מדויק, לפני שאנחנו יוצאים אליכם.",
  },

  // --- §h1: the homepage heading and the line under it ---
  {
    id: "home-h1",
    from: "<h1>מנעולן רכב</h1>",
    to: "<h1>מנעולן לרכב ולבית – שכפול מפתחות, קידוד ופתיחת מנעולים</h1>",
  },
  {
    id: "home-hero-tagline",
    from: "שירותי מנעולנות רכב מתקדמים לכל סוגי הרכבים, זמינות מהירה וטכנולוגיה חדשנית.",
    to: "שכפול וקידוד מפתחות, פתיחת רכב נעול והחלפת מנעולים – הכל בשטח אצלכם, במחיר שנמסר מראש.",
  },
];

/**
 * Strings that must not survive the pass. A match here means theme demo content is live on a
 * page again — the exact regression that shipped once already.
 */
const FORBIDDEN = [
  ["naples-florida", /נאפולי|פלורידה/],
  ["theme-vendor-brand", /של גוגו/],
  // Narrowed 2026-08-26. This rule was `/דלתות הזזה|דלת ההזזה/`, which fired on
  // /services/תיקון-דלתות/ the moment that page gained an honest FAQ about repairing sliding
  // and aluminium doors — work this locksmith actually does. "דלתות הזזה" is an ordinary Hebrew
  // service term, so the guard now matches the demo SENTENCES rather than the noun.
  ["demo-sliding-door-cta", /שירותי תיקון והתקנה של דלתות הזזה/],
  ["demo-sliding-door-headline", /דלת ההזזה שלך תקועה/],
  ["demo-sliding-door-vendor", /תיקון דלתות הזזה של/],
];

const raw = readFileSync(PATH, "utf8");
let out = raw;
const counts = new Map();

for (const r of REWRITES) {
  const n = out.split(r.from).length - 1;
  counts.set(r.id, n);
  if (n) out = out.split(r.from).join(r.to);
}

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

// --- self-verify: no demo content may survive -------------------------------------------
const site = JSON.parse(out);
const pages = Array.isArray(site) ? site : (site.pages ?? Object.values(site));
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
