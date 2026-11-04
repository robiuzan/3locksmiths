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
import { parse } from "node-html-parser";
import { judge } from "./check-ratchet.mjs";

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
    // "שנים של ניסיון" and "ניסיון מוכח" added 2026-11-04: the homepage carried both — a years
    // heading with no number and a "proven experience" card — and the numeric rule saw neither.
    re: /\b\d{1,2}\s*\+?\s*שנות ניסיון|ניסיון של\s*\d{1,2}\s*שנ|מעל\s*\d{1,2}\s*שנות|שנים של ניסיון|ניסיון מוכח/,
    why: "site.config.json has foundedYear: null — we cannot source any number of years.",
  },
  {
    // The homepage FAQ said "אחריות מלאה של עד שנה" — visible and in its FAQPage JSON-LD — until
    // 2026-11-04. The owner confirmed a warranty on the work and the coding with NO term
    // (docs/business-facts.md §D.2), so any duration is invented. Tested against the rendered copy
    // only: "אחריות אלא פריט שמוחלף מדי כמה שנים" (113) must not match, and does not.
    id: "warranty-term",
    // Shapes covered (each mutation-tested 2026-11-04): "אחריות של עד שנה", "אחריות מלאה ל-12
    // חודשים", "אחריות בכתב ל-30 יום", "אחריות למשך שנתיים", "אחריות לחצי שנה", "שנה אחריות",
    // "3 שנים אחריות", "שנת אחריות".
    re: /אחריות(?:\s+(?:מלאה|בכתב))?\s+(?:של\s+|ל-?|למשך\s+)?(?:עד\s+)?(?:\d+\s*|(?:חצי|שלוש|ארבע|חמש|שש|שתי|שני)\s+)?(?:שנה|שנתיים|שנים|חודש|חודשים|חודשיים|יום|ימים)|(?:שנה|שנתיים|חודשיים|\d+\s*(?:שנים|חודשים|ימים|יום))\s+(?:של\s+)?אחריות|(?:שנת|שנות|חודשי)\s+אחריות/,
    why: "the warranty is confirmed with no term (§D.2) — a duration is a promise nobody made.",
  },
  {
    // The gogo theme's US-dollar demo prices sat in the homepage calculator until 2026-11-04.
    id: "foreign-currency-price",
    re: /\$\s?\d/,
    why: "a US-dollar price on an Israeli site — prices are ₪, from the sitewide rows (§D.1).",
  },
  // "always-open" lived here until 2026-08-30, when the owner confirmed 24/7 availability
  // (docs/business-facts.md §D.3). The schema now publishes 00:00–23:59 across all seven days,
  // so the claim and the structured data agree and there is nothing left to block.
  //
  // The rule was never about the wording — it was about the CONTRADICTION. Every page asserted
  // 24/7 in copy while publishing 08:00–18:00 in its own markup, which is machine-detectable and
  // therefore worse than an unsourced claim. If the hours ever change back, this rule and the
  // openingHoursSpecification must move together.
  {
    id: "average-response-time",
    re: /זמן מענה ממוצע|זמן הגעה ממוצע/,
    why: "an averaged response time presented as a metric, with no measurement behind it.",
  },
  {
    id: "customer-count",
    // Widened 2026-11-04: "נותני שירות קבועים לעשרות מוסכים ועסקים" lived in the homepage FAQ and
    // its FAQPage mirror, and "אלפי לקוחות" was the only shape this rule knew.
    re: /אלפי לקוחות|מאות לקוחות|אלפי מפתחות|(?:עשרות|מאות|אלפי)\s+(?:לקוחות|מוסכים|עסקים|סוכנויות|ציי רכב)/,
    why: "no customer, garage or fleet count is sourced (docs/business-facts.md §B.5).",
  },
  {
    id: "ratings",
    re: /aggregateRating|reviewCount/,
    why: "no genuine, ledgered review (docs/business-facts.md §B.5); a fabricated rating is a Google policy violation.",
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
    why: "asserts a star rating we cannot source — docs/business-facts.md §B.5: no genuine review is ledgered.",
  },
  {
    // 2026-08-30: this guard matched on the token `GoogleRating`, so it caught the theme's badge
    // and missed TWO more copies of the same fabricated rating that were live the whole time:
    //
    //   · logo-11.png        — a "Google 5.0 ★★★★★" badge, 5th tile in the homepage hero
    //   · admin-ajax-2-1     — the same badge composited INTO a 4-photo collage raster
    //
    // Neither filename says "rating", so no text-level rule could ever have seen them. The lesson
    // is that a rating badge is identified by what it depicts, not by what it is called — so this
    // pins the specific files by name. Any NEW badge image still needs a human to notice it, which
    // is why docs/optimization-backlog.md §7.7 (imagery provenance) exists.
    id: "fabricated-rating-image-by-filename",
    re: /logo-11\.png|admin-ajax-2-1/,
    why: "a fabricated Google 5.0 rating badge, baked into an image so no text guard can see it.",
  },
  {
    // A US phone number (Houston area code) shipped in the homepage CTA text for months, while the
    // href beside it dialled the correct Israeli number — so every link test passed and a human
    // reading the page still saw the wrong number. NAP integrity is checked on what is DISPLAYED.
    id: "foreign-phone-number",
    re: /\(\d{3}\)\s*\d{3}-\d{4}/,
    why: "a US-format phone number on an Israeli site — NAP must match site.config.json (CLAUDE.md §6).",
  },
  {
    // The theme's review carousel, pruned in scripts/pages.mjs. It published three invented
    // testimonials with invented customer names on the live homepage until 2026-08-26.
    id: "review-widget-markup",
    re: /saswp-r2-strs|saswp-rc-cnt|s-feedback/,
    why: "review-widget markup with no genuine, ledgered review (docs/business-facts.md §B.5) — it renders fabricated testimonials.",
  },
];

/** 🔶 — unconfirmed, reported but never failing. See docs/business-facts.md. */
const INFO = [
  // "שנת אחריות" moved to BLOCKING (warranty-term) 2026-11-04. The scope itself is confirmed
  // (§D.2); "אחריות מלאה" stays counted because "מלאה" can be read as a promise wider than the
  // approved "אחריות על העבודה ועל הקידוד".
  { id: "warranty", re: /אחריות מלאה|באחריות מלאה/g },
  { id: "coverage", re: /פריסה ארצית|פריסה רחבה|בכל הארץ/g },
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

/**
 * THE GOOGLE-REVIEWS LINE (2026-10-13, docs/dynamic-presence-plan.md §3.4). A rating, a review
 * count and links to Google's review pages are allowed ONLY inside the blocks that
 * scripts/reputation.mjs renders from the owner's dashboard reads (content/enriched/_reputation.mjs,
 * proven by scripts/check-reputation.mjs). Anywhere else they are unsourced, so the vocabulary is
 * tested with those blocks cut out. Phrase-level on purpose: Hebrew "ביקורת" also means an
 * inspection, and the site uses it that way (ביקורת נגישות, ביקורת כניסה).
 */
const OWN_BLOCKS = ".live-reviews, .live-reviews-band";
const REVIEW_TEXT = [
  {
    id: "review-rating-outside-the-line",
    re: /★\s*\d(?:[.,]\d)?|\d(?:[.,]\d)?\s*★|⭐/,
  },
  {
    id: "review-count-outside-the-line",
    re: /\d+\s*(?:ביקורות|חוות דעת)|ביקורות\s*[(:]\s*\d|(?:עשרות|מאות|אלפי)\s+(?:ביקורות|חוות דעת|המלצות)/,
  },
  {
    id: "verified-reviewer-claim",
    re: /(?:לקוח(?:ה|ות)?|ביקורת|רכישה)\s+מאומת(?:ת|ים|ות)?/,
  },
];
const REVIEW_LINK = /search\.google\.com\/local|g\.page\/r\/|writereview|query_place_id/;
/** Third-party review widgets inject schema and copy at runtime that no gate here can read. */
const WIDGET_HOST =
  /elfsight|elfsightcdn|trustindex|embedsocial|sociablekit|featurable|widget\.trustpilot|reviewsonmywebsite/i;
const REVIEW_TYPES = new Set(["Review", "AggregateRating", "Product"]);

/** Every @type in a parsed JSON-LD value, string or array, at any depth. */
function* types(node) {
  if (Array.isArray(node)) {
    for (const n of node) yield* types(n);
  } else if (node && typeof node === "object") {
    const t = node["@type"];
    if (typeof t === "string") yield t;
    else if (Array.isArray(t)) yield* t.filter((x) => typeof x === "string");
    for (const v of Object.values(node)) yield* types(v);
  }
}

const report = (id, where, found, why) => {
  failures++;
  if (failures <= 25) {
    console.error(`  ⛔ [${id}] ${where}`);
    console.error(`       "${String(found).trim().slice(0, 80)}"  —  ${why}`);
  }
};

const assetsRaw = JSON.stringify(site.assets ?? {});
const assetHit = assetsRaw.match(WIDGET_HOST);
if (assetHit)
  report(
    "third-party-review-widget",
    "site.assets",
    assetHit[0],
    "a third-party review widget is loaded sitewide.",
  );

for (const page of pages) {
  const where = page.path ?? page.slug ?? page.id ?? "?";
  const root = parse(String(page.bodyHtml ?? ""), { comment: false });
  for (const el of root.querySelectorAll(OWN_BLOCKS)) el.remove();
  const outside = root.toString();
  const text = visible(outside);
  for (const rule of REVIEW_TEXT) {
    const m = text.match(rule.re);
    if (m)
      report(
        rule.id,
        where,
        m[0],
        "a rating/count/verified claim outside the sourced reviews line (content/enriched/_reputation.mjs).",
      );
  }
  const link = outside.match(REVIEW_LINK);
  if (link)
    report(
      "google-review-link-outside-the-line",
      where,
      link[0],
      "links to Google reviews belong only in the reviews line.",
    );
  const widget = `${page.bodyHtml ?? ""} ${JSON.stringify(page.scripts ?? "")}`.match(
    WIDGET_HOST,
  );
  if (widget)
    report(
      "third-party-review-widget",
      where,
      widget[0],
      "a third-party review widget (rejected, docs/dynamic-presence-plan.md §2.4).",
    );
  for (const block of Array.isArray(page.jsonLd) ? page.jsonLd : []) {
    let parsed;
    try {
      parsed = typeof block === "string" ? JSON.parse(block) : block;
    } catch {
      continue; // unparseable blocks are enrich.mjs's to fail on
    }
    for (const t of types(parsed)) {
      if (REVIEW_TYPES.has(t))
        report(
          "review-schema-type",
          where,
          `@type ${t}`,
          "no Review/AggregateRating/Product markup, ever — Google gives no stars for self-serving reviews.",
        );
    }
  }
}

/**
 * ARRIVAL TIMES IN MINUTES (2026-11-04, Phase 3). The owner confirmed 24/7 availability — never a
 * response time — yet 18 city pages carried a numeric window on their arrival step ("הגעה אליכם
 * בתל אביב · כ-20–40 דקות"). An arrival step states the rule, not minutes: "לפי המרחק – נמסור
 * זמן משוער בטלפון". RATCHETED (scripts/check-ratchet.mjs), unlike every rule above: full rule on
 * pages marked done, and elsewhere the count may only fall, so the city batches retire the windows
 * page by page instead of all at once.
 *
 * An arrival step is one whose TITLE starts with the arrival — "הגעה …", "הגעת הניידת …",
 * "מגיעים …". Titles that only mention it ("בהגעה – זיהוי הדדי", "תיאום הגעה", "לפני כל נגיעה",
 * where נגיעה means touching) are other steps. The prose rule catches "נגיע תוך 30 דקות" anywhere
 * in the visible copy; "כלי הגעה" (a reach tool, 9301) is not about arrival at all.
 */
const ARRIVAL_TITLE = /^(?:הגעה|הגעת|מגיעים|מגיעה|נגיע|יציאה|הניידת יוצאת)/;
const ARRIVAL_PROSE =
  /(?:נגיע|מגיעים|הניידת מגיעה|זמן ההגעה|זמן הגעה|ההגעה אליכם)(?:\s+\S+){0,3}?\s+(?:תוך|בתוך|בעוד|כעבור)\s*(?:כ-|כ־)?\d+/;
const arrivalViolations = [];
for (const page of pages) {
  const root = parse(String(page.bodyHtml ?? ""), { comment: false });
  for (const step of root.querySelectorAll(".enrich-step")) {
    const title = (step.querySelector("h3")?.text ?? "").trim();
    const time = (step.querySelector(".step-time")?.text ?? "").trim();
    if (ARRIVAL_TITLE.test(title) && /\d/.test(time)) {
      arrivalViolations.push({ id: page.id, path: page.path, found: `${title} ${time}` });
    }
  }
  const m = visible(page.bodyHtml ?? "")
    .replace(/כלי הגעה/g, " ")
    .match(ARRIVAL_PROSE);
  if (m) arrivalViolations.push({ id: page.id, path: page.path, found: m[0] });
}
const arrival = judge("arrival-minutes", arrivalViolations, {
  verbose: process.argv.includes("--verbose"),
  describe: (v) => `id ${v.id} ${decodeURIComponent(v.path ?? "")} — "${v.found}"`,
});
for (const l of arrival.lines) (arrival.failed ? console.error : console.log)(l);
if (arrival.failed) failures++;

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
