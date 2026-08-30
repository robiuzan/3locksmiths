/**
 * Scans the RENDERED site for business claims that our own data contradicts.
 *
 * WHY THIS EXISTS — a real incident, 2026-08-25. `lib/enrich/render.mjs` had a `DEFAULT_STATS`
 * array that renders on every page which does not author its own `stats`. It asserted
 * "25+ שנות ניסיון במנעולנות", "30–60 ד׳ זמן מענה ממוצע לקריאה", "100% אחריות מלאה" and
 * "פריסה ארצית" — on 60+ pages, none of which had authored any of it. It shipped to production.
 *
 * It was missed because every review pass read the authored **modules** and checked them against
 * docs/business-facts.md. Not one read the **rendered output**. A default in the renderer is
 * invisible to module-level review by construction, and that is exactly the blind spot this
 * script closes: it reads content/site.json, which is what actually reaches the browser.
 *
 * SCOPE — deliberately only ⛔ claims: ones contradicted by data we ourselves publish. It does
 * NOT fail on 🔶 (merely unconfirmed) claims such as the warranty and coverage language carried
 * over from the client's own marketing copy. Those are the owner's to confirm or retract, they
 * number in the hundreds, and failing on them would make this gate permanently red and therefore
 * ignored. They are reported as INFO so the count stays visible.
 *
 *   node scripts/check-claims.mjs        (exit 1 if a ⛔ claim is rendered anywhere)
 */
import { readFileSync } from "node:fs";

const site = JSON.parse(readFileSync("content/site.json", "utf8"));
const pages = Array.isArray(site) ? site : (site.pages ?? Object.values(site));

/** Strip tags/scripts so we test visible copy, not markup or JSON-LD payloads. */
const visible = (html) =>
  String(html ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ");

/**
 * ⛔ — each of these is refuted by something this site itself publishes.
 * Adding a rule here is a claim that we can point at the contradicting source.
 */
const BLOCKING = [
  {
    id: "years-in-business",
    re: /\b\d{1,2}\s*\+?\s*שנות ניסיון|ניסיון של\s*\d{1,2}\s*שנ|מעל\s*\d{1,2}\s*שנות/,
    why: "site.config.json has foundedYear: null — we cannot source any number of years.",
  },
  {
    id: "always-open",
    re: /24\/7|24 שעות ביממה|מסביב לשעון/,
    why: "every page publishes openingHoursSpecification 08:00–18:00 (Sat 08:00–17:00).",
  },
  {
    id: "average-response-time",
    re: /זמן מענה ממוצע|זמן הגעה ממוצע/,
    why: "an averaged response time presented as a metric, with no measurement behind it.",
  },
  {
    id: "customer-count",
    re: /אלפי לקוחות|מאות לקוחות|אלפי מפתחות/,
    why: "no review corpus and an empty sameAs — the count has no source.",
  },
  {
    id: "ratings",
    re: /aggregateRating|reviewCount/,
    why: "zero collected reviews; a fabricated rating is a Google policy violation.",
  },
];

/**
 * ⛔ claims that are NOT visible text — they live in markup, so `visible()` would strip them
 * before any of the rules above could match.
 *
 * The 2026-08-26 incident: the vendored theme's `GoogleRating.png` renders "Google rating 5.0"
 * and five filled stars, and the scraped header put it on all 71 pages while we hold zero
 * reviews. Every rating guard we had looked for `aggregateRating`/`reviewCount` in schema, so a
 * rating baked into a PNG was invisible to all of them. Rules here are tested against raw HTML.
 */
const BLOCKING_RAW = [
  {
    id: "fabricated-rating-badge",
    re: /GoogleRating|aggregateRating|reviewCount/,
    why: "asserts a star rating we cannot source — docs/business-facts.md §B has zero reviews.",
  },
  {
    // The theme's review carousel, pruned in scripts/pages.mjs. It published three invented
    // testimonials with invented customer names on the live homepage until 2026-08-26.
    id: "review-widget-markup",
    re: /saswp-r2-strs|saswp-rc-cnt|s-feedback/,
    why: "review-widget markup on a site with zero collected reviews — it renders fabricated testimonials.",
  },
];

/** 🔶 — unconfirmed, reported but never failing. See docs/business-facts.md. */
const INFO = [
  { id: "warranty", re: /אחריות מלאה|באחריות מלאה|שנת אחריות/g },
  { id: "coverage", re: /פריסה ארצית|בכל הארץ/g },
  { id: "price", re: /\d{2,4}\s*[–-]\s*\d{2,4}\s*₪/g },
];

let failures = 0;
const infoCounts = new Map();

for (const page of pages) {
  const text = visible(page.bodyHtml ?? page.body ?? page.html);
  const meta = `${page.seo?.title ?? ""} ${page.seo?.description ?? ""}`;
  const haystack = `${text} ${meta}`;
  const where = page.path ?? page.slug ?? page.id ?? "?";

  for (const rule of BLOCKING) {
    const m = haystack.match(rule.re);
    if (!m) continue;
    failures++;
    if (failures <= 25) {
      console.error(`  ⛔ [${rule.id}] ${where}`);
      console.error(`       "${m[0].trim()}"  —  ${rule.why}`);
    }
  }
  const raw = `${String(page.bodyHtml ?? page.body ?? page.html ?? "")} ${JSON.stringify(page.jsonLd ?? "")}`;
  for (const rule of BLOCKING_RAW) {
    const m = raw.match(rule.re);
    if (!m) continue;
    failures++;
    if (failures <= 25) {
      console.error(`  ⛔ [${rule.id}] ${where}`);
      console.error(`       "${m[0].trim()}"  —  ${rule.why}`);
    }
  }
  for (const rule of INFO) {
    const n = (haystack.match(rule.re) || []).length;
    if (n) infoCounts.set(rule.id, (infoCounts.get(rule.id) || 0) + n);
  }
}

console.log(`claims: scanned ${pages.length} rendered pages`);
if (infoCounts.size) {
  console.log("\n🔶 unconfirmed (reported, not failing) — docs/business-facts.md:");
  for (const [id, n] of [...infoCounts].sort((a, b) => b[1] - a[1]))
    console.log(`   ${id.padEnd(10)} ${n} mentions`);
}

if (failures === 0) {
  console.log("\nblocking claims: none ✅");
  process.exit(0);
}
console.error(
  `\n${failures} BLOCKING claim(s) rendered. Each is contradicted by our own data.`,
);
console.error(
  "Fix the source (renderer default or authored module), then `npm run enrich`.\n",
);
process.exit(1);
