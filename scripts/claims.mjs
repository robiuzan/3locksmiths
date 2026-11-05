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
 * on ALL 71 pages. docs/business-facts.md §B recorded no collected reviews, no Business Profile
 * and an empty `sameAs` — so the badge asserted a rating that did not exist. A profile arrived
 * 2026-09-05 (§B.4) and `sameAs` now points at it, but it holds 0 reviews (owner-confirmed), so the
 * rewrite stands unchanged.
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
import { parse } from "node-html-parser";

const PATH = "content/site.json";

// The display phone comes from the manifest. CLAUDE.md §6: a phone number typed anywhere but the
// roster is a bug — which is exactly the defect the `us-phone-number-in-cta` rule below cleans up.
const manifest = JSON.parse(readFileSync("site.config.json", "utf8"));
const PHONE = manifest.contact?.phoneDisplay ?? "076-599-1266";

// Link targets come from the build manifest (scripts/build-manifest.mjs runs earlier in the
// chain), never typed here: a hand-typed percent-encoded href is the easiest dead link to ship.
const PAGE_MANIFEST = JSON.parse(readFileSync("content/enriched/_manifest.json", "utf8"));
function pathOf(id) {
  const p = PAGE_MANIFEST.lookup?.[id]?.path;
  if (!p) {
    console.error(`claims: no manifest path for page ${id} — the link target is gone.`);
    process.exit(1);
  }
  return p;
}

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
  // The `from` below deliberately still names the RETIRED 055-6601006 line: it describes text
  // that already sits in content/site.json (or that the un-migrated WordPress origin still
  // serves), so it must match history, not the current manifest. scripts/phone.mjs is what
  // carries the retired number forward to the live one, and it runs after this pass.
  // They are reversed rather than deleted because content/site.json PERSISTS: the earlier pass
  // already overwrote the original scraped wording, so simply removing the rules would leave the
  // hedged 08:00–18:00 copy frozen on the homepage forever. `from` is therefore the text this
  // script itself wrote, not the WordPress original.
  // `home-card-247-heading` lived here until 2026-11-04 and rewrote "מענה לקריאות דחופות" in the
  // WHOLE file — 245 times a run, in 54 authored modules and the renderer's default card — which
  // left sentences like "אנחנו נותנים זמינות 24/7" on about 30 pages. It now lives in
  // HOME_CLAIM_REWRITES, matched on the homepage card's own <h3>.
  {
    id: "home-card-247-body",
    from: "קריאות דחופות מטופלות בעדיפות. התקשרו ונעדכן זמן הגעה מדויק.",
    to: "אין שעות עבודה – השירות שלנו פועל גם בשעות חירום ובלילות.",
  },
  {
    id: "home-faq-247",
    from: "שעות הפעילות המפורסמות שלנו הן א׳–ו׳ 08:00–18:00 ושבת 08:00–17:00. לקריאה דחופה מחוץ לשעות אלה התקשרו ל-055-6601006 ונאמר לכם מיד אם יש ניידת פנויה באזורכם.",
    // "זמן הגעה משוער" since 2026-11-04 (was "מדויק" — an exact time nobody can promise; §D.3
    // confirms 24/7, never a response time). HOME_CLAIM_REWRITES `home-faq-247-estimate` carries
    // the old wording forward, so a re-scrape and the stored page converge on the same text.
    to: `כן. אנחנו זמינים 24/7, כולל לילות, שבתות וחגים. התקשרו ל-${PHONE} ונמסור לכם זמן הגעה משוער.`,
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
    // §rating — the SECOND fabricated "Google 5.0 ★★★★★" badge, and the one the guards could not
    // see. It is `logo-11.png`, the 5th .gallery-item in the homepage hero, absolutely positioned
    // as a centred overlay on the photo grid.
    //
    // Neither the rule above nor check-claims.mjs caught it: both match on the token
    // `GoogleRating`, and a badge named `logo-11.png` matches nothing. The guard has been widened
    // (check-claims.mjs §fabricated-rating-badge) so a rating hiding behind an innocuous filename
    // cannot pass again.
    //
    // ⚠️ Removing this ALSO needs the CSS override in app/enrich.css: the theme styles
    // `.home-hero-right-galley .gallery-item:last-child` as an absolutely-centred overlay
    // (main.css:1788). Drop the 5th tile and the 4th inherits that rule and jumps into the middle
    // of the grid. The override pins the tiles back into normal flow.
    id: "fabricated-google-rating-badge-hero",
    from: '<div class="gallery-item"><img loading="lazy" decoding="async" width="480" height="258" src="/wp-content/uploads/2025/05/logo-11.png" alt></div>',
    to: "",
  },
  {
    // §rating — the THIRD copy, baked into a raster so no text-level guard could ever see it:
    // `admin-ajax-2-1` is a 4-photo collage with a "Google 5.0 ★★★★★" card composited into the
    // middle of the image. The photos underneath are stock electricians and builders, so nothing
    // is lost by removing it.
    //
    // The whole `.img-serv` wrapper goes, not just the <img>: main.css:2981 gives that div a fixed
    // 652×485 box, so removing only the image would leave a large empty hole in the section.
    id: "fabricated-google-rating-badge-collage",
    from: '<div class="img-serv">\r\n\t\t\t\t<img loading="lazy" decoding="async" width="600" height="446" src="/assets/img/admin-ajax-2-1.webp" alt>\r\n\t\t\t</div>',
    to: "",
  },
  {
    // §nap — a HOUSTON, TEXAS phone number printed on the homepage of an Israeli locksmith.
    // `(281) 843-8447` is leftover from the gogo theme's US origin and it is live right now.
    //
    // fix-links.mjs already normalised the href to the manifest E.164, so the button DIALS
    // correctly — which is precisely why this survived: the link works, only the text a human
    // reads is wrong. Anyone on a desktop reads a US number off the page, and a US area code on
    // an Israeli service site is an instant trust failure.
    id: "us-phone-number-in-cta",
    from: "</svg>(281) 843-8447\t\t\t\t\t\t</a>",
    to: `</svg>${PHONE}\t\t\t\t\t\t</a>`,
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

/**
 * HOMEPAGE-ONLY rewrites (page 7), added 2026-11-04 with the "שכפול מפתח לרכב" pivot.
 *
 * WHY A THIRD LIST — the two lists above act on every page. That is fine for strings that only
 * ever existed on the homepage, and it bit once: `home-card-247-heading` (moved here 2026-11-04)
 * rewrote the renderer's default feature card and running text in 54 modules, because the same
 * words appear there. These rules are scoped to the front page by construction, so a phrase that
 * also lives in an authored module can never be rewritten by accident.
 *
 * DECODED MODE — applied to `bodyHtml` and to each `jsonLd` string after parsing, never to the raw
 * file text, so attribute quotes are written as plain `"`. (The raw-file idiom writes them `\\"`;
 * mixing the two puts a literal backslash into an href that no link checker sees.)
 *
 * END STATE, NOT MATCH COUNT — page 7's HTML is stateful: after the first run the `from` strings
 * are gone, so "matched once" can only ever be true on one run. What is checked instead holds on
 * every run and after a re-scrape: `from` is absent and `to` is present (twice for FAQ strings,
 * which the accordion and its FAQPage mirror both carry — `mirror: true`).
 *
 * The FAQ answers state the four sitewide price rows (owner, 2026-11-04 — docs/business-facts.md
 * §D.1, still 🔶 as ranges) and the four confirmed practices (§D.13). No warranty term (§D.2), no
 * customer count, no "all makes" claim.
 */
const HOME_CLAIM_REWRITES = [
  // --- the FAQ accordion + its FAQPage JSON-LD mirror ------------------------------------
  {
    // "כל מותגי הרכב הקיימים בישראל, כולל רכבים יוקרתיים" is an absolute claim nobody can back;
    // the question is replaced with the one buyers actually ask.
    id: "home-faq-all-brands-q",
    from: "האם אתם עובדים עם כל סוגי הרכב?",
    to: "איך מתבצע שכפול מפתח ליד הרכב?",
    mirror: true,
  },
  {
    id: "home-faq-all-brands-a",
    from: "כן. אנו מתמחים בכל מותגי הרכב הקיימים בישראל, כולל רכבים יוקרתיים.",
    to: "מזהים בטלפון את הרכב ואת סוג המפתח ונותנים טווח מחיר, מגיעים עם ניידת, חותכים להב לפי המפתח הקיים ומקודדים את השבב למחשב הרכב. בסיום בודקים נעילה והתנעה, ורק אז משלמים – עם אחריות על העבודה ועל הקידוד.",
    mirror: true,
  },
  {
    // §D.2 — the only warranty TERM the site ever stated ("עד שנה"). The owner confirmed a
    // warranty on the work and the coding with no term (2026-11-04), so the scope lives in the
    // process answer above and this slot answers what to prepare instead.
    id: "home-faq-warranty-q",
    from: "האם יש אחריות על המפתח?",
    to: "מה צריך להכין לפני שמזמינים שכפול מפתח?",
    mirror: true,
  },
  {
    id: "home-faq-warranty-a",
    from: "בוודאי. כל מפתח משוכפל מגיע עם אחריות מלאה של עד שנה",
    to: "את המפתח הקיים, רישיון רכב ותעודה מזהה של הבעלים, ואת היצרן, הדגם ושנת הייצור. בלי אף מפתח מקורי מדובר בשחזור ולא בשכפול.",
    mirror: true,
  },
  {
    // §B.5 — "regular service to dozens of garages" is unsourced social proof.
    id: "home-faq-garages-q",
    from: "האם אתם עובדים עם מוסכים וסוכנויות?",
    to: "מה ההבדל בין שכפול לשחזור מפתח?",
    mirror: true,
  },
  {
    id: "home-faq-garages-a",
    from: "בהחלט. אנו נותני שירות קבועים לעשרות מוסכים ועסקים בענף הרכב.",
    to: "שכפול מעתיק מפתח קיים שעובד. שחזור מפיק מפתח חדש כשאין אף מפתח, לפי קוד הצילינדר או מספר השלדה, ולרוב גם מוחק ממחשב הרכב את המפתח שאבד.",
    mirror: true,
  },
  {
    id: "home-faq-smart-key-a",
    from: "בהחלט. אנו מצוידים בטכנולוגיה לקידוד ושכפול מפתחות חכמים כולל אימובילייזר.",
    to: "כן, לרוב יצרני הרכב הנפוצים. מפתח חכם עם התנעת לחצן מקודד מול מחשב הרכב, ליד הרכב, ועולה בדרך כלל 450 – 900 ₪ לפי הדגם.",
    mirror: true,
  },
  {
    id: "home-faq-duration-q",
    from: "כמה זמן לוקח השירות?",
    to: "כמה זמן אורך שכפול מפתח בשטח?",
    mirror: true,
  },
  {
    // Work time at the car — never an arrival time (§D.11). Since 2026-11-05 the owner's times:
    // the shorter of the hub and brand-page values (docs/business-facts.md, "Job durations").
    id: "home-faq-duration-a",
    from: "לרוב, שכפול מפתח רגיל לוקח עד 30 דקות. למפתח חכם – עד שעה",
    to: "מפתח מכני כ-10–20 דקות, מפתח עם שבב כ-30–45 דקות, מפתח מתקפל עם שלט כ-30–45 דקות ומפתח חכם כ-45–60 דקות, לפי הדגם.",
    mirror: true,
  },
  {
    // `from` is what `home-faq-duration-a` wrote until 2026-11-05; that rule now writes `to`
    // itself, so the stored page and a re-scrape converge on the same text.
    id: "home-faq-duration-shorter",
    from: "מפתח מכני כ-20–30 דקות, מפתח עם שבב כ-30–45 דקות, מפתח מתקפל עם שלט כ-40–60 דקות ומפתח חכם כ-45–90 דקות, לפי הדגם.",
    to: "מפתח מכני כ-10–20 דקות, מפתח עם שבב כ-30–45 דקות, מפתח מתקפל עם שלט כ-30–45 דקות ומפתח חכם כ-45–60 דקות, לפי הדגם.",
    mirror: true,
  },
  {
    id: "home-faq-cost-q",
    from: "כמה עולה מפתח חדש לרכב?",
    to: "מה טווח המחירים לשכפול מפתח לרכב?",
    mirror: true,
  },
  {
    // A non-answer that sent visitors to /מחירון/, whose car rows contradict the rest of the
    // site (80.mjs — flagged to the owner). The four sitewide rows instead.
    id: "home-faq-cost-a",
    from: "המחירים משתנים לפי סוג המפתח והרכב. הכנס לעמוד המחירון שלנו לעיון מפורט.",
    to: "מפתח מכני 200 – 350 ₪, מפתח עם שבב או מתקפל עם שלט 350 – 550 ₪, מפתח חכם 450 – 900 ₪ ושלט נפרד 300 – 600 ₪. כשאין אף מפתח מקורי, המחיר נקבע לפי הדגם.",
    mirror: true,
  },
  {
    // The homepage's 24/7 feature card (24/7 confirmed by the owner 2026-08-30, §D.3). Scoped to
    // this card's <h3>: as a whole-file rule it also rewrote the same three words inside running
    // text on other pages ("אנחנו נותנים מענה לקריאות דחופות" → "…נותנים זמינות 24/7").
    id: "home-card-247-heading",
    from: "<h3>מענה לקריאות דחופות</h3>",
    to: "<h3>זמינות 24/7</h3>",
  },
  {
    // The 24/7 answer promised "זמן הגעה מדויק"; what a call gives is an estimate. `from` is what
    // REWRITES `home-faq-247` wrote until 2026-11-04 — that rule now writes `to` itself.
    id: "home-faq-247-estimate",
    from: `התקשרו ל-${PHONE} ונמסור לכם זמן הגעה מדויק.`,
    to: `התקשרו ל-${PHONE} ונמסור לכם זמן הגעה משוער.`,
    mirror: true,
  },

  // --- body-only claims -----------------------------------------------------------------
  {
    // §B.5 — garages, dealerships and fleets, plus a superlative ("החדשני ביותר… מקסימלית").
    id: "home-about-b2b",
    from: "<p>השירות שלנו כולל שכפול מפתחות לרכב חכם, אימובילייזר, מפתחות רגילים ושירותים נוספים למוסכים, סוכנויות וציי רכב. אנו עובדים עם הציוד החדשני ביותר כדי להבטיח דיוק, מהירות ובטיחות מקסימלית.</p>",
    to: "<p>המחיר מכסה את העבודה כולה – חיתוך הלהב, קידוד השבב, סנכרון השלט ובדיקת ההתנעה. המפתחות הקיימים ממשיכים לעבוד כשהם נוכחים בקידוד, ואם אין בידכם אף מפתח, זה כבר שחזור ומחירו נקבע לפי הדגם.</p>",
  },
  {
    // "בזמן שיא" is a superlative speed claim and "כל נציג עובר הכשרה" is unsourced. Replaced by
    // the three checks a buyer should make — practices the owner confirmed (§D.13), so the business
    // passes its own test. The guide link is safe because 9204's receipt row was reworded the same
    // day (each partner invoices under his own business, §A.3).
    id: "home-form-paragraph",
    from: "<p>אנו בשלושה מנעולנים מאמינים כי כל קריאה היא קריאה דחופה, ולכן פועלים במהירות ובמקצועיות להגיע לכל לקוח בזמן שיא. כל נציג אצלנו עובר הכשרה אישית ומתחייב לתת מענה אדיב, סבלני ומדויק. אנו זמינים לכל שאלה, מספקים ייעוץ טלפוני חינם ונותנים שירות מלא גם בשטח.</p>",
    to: `<p>שלושה דברים שכדאי לוודא מול כל מנעולן: שקיבלתם טווח מחיר בטלפון לפני היציאה, שהמחיר שסוכם לא משתנה בשטח, ושאתם משלמים רק אחרי שהמפתח קודד ונבדק בהתנעה. אצלנו שלושתם הם הנוהל בכל עבודה. עוד בדיקות במדריך <a class="enrich-home-link" href="${pathOf(9204)}">איך לבחור מנעולן אמין</a>.</p>`,
  },
  {
    // §A.1 — a years-of-experience heading with no number behind it (foundedYear: null).
    id: "home-form-years",
    from: "<h5>שנים של ניסיון:</h5>",
    to: "<h5>מה להכין לפני השיחה:</h5>",
  },
  {
    // §A.1 — "ניסיון מוכח" restates the years claim the site cannot source.
    id: "home-adv-1-body",
    from: "<p>כל עבודה מבוססת על ניסיון מוכח והתמודדות עם כל סוגי הרכבים והמפתחות.</p>",
    to: "<p>השבב מקודד למחשב הרכב ליד הרכב, והמפתחות הקיימים ממשיכים לעבוד כשהם נוכחים בקידוד.</p>",
  },
  {
    // An unquantified speed promise ("במהירות… פתרון מיידי"), 🔶 under §D.
    id: "home-adv-2-body",
    from: "<p>אנו מגיעים במהירות לאתר הלקוח עם כל הציוד הדרוש לפתרון מיידי.</p>",
    to: "<p>הניידת מגיעה עם מכונת חיתוך וציוד קידוד, והרכב נשאר במקום – בלי גרירה למוסך.</p>",
  },
  {
    // A response-time card with nothing measured behind it (§D, §D.11). The slot now carries the
    // home side of the business, which the pivot must not drop. scripts/advantage-icons.mjs keys
    // its icon on this heading.
    id: "home-adv-5-heading",
    from: "<h3>זמן תגובה מהיר</h3>",
    to: "<h3>גם מנעולן לבית</h3>",
  },
  {
    id: "home-adv-5-body",
    from: "<p>אנו מכבדים את זמנכם ומספקים שירותים מהירים ויעילים מבלי לוותר על האיכות.</p>",
    to: "<p>פתיחת דלת נעולה, החלפת צילינדר ושדרוג מנעולים – באותה זמינות, גם בבית ובעסק.</p>",
  },
  {
    // An absolute all-vehicles expertise claim.
    id: "home-serv-all-vehicles",
    from: "<h3>מומחים לכל סוגי הרכב דברו איתנו עכשיו</h3>",
    to: "<h3>מסרו יצרן, דגם ושנת ייצור – ונגיד לכם איזה מפתח צריך</h3>",
  },

  // --- the calculator's prices: US DOLLARS on an Israeli site --------------------------------
  // The gogo theme's demo prices, shown as the calculator's result (quiz.js reads the text only).
  // Car options take the sitewide rows (§D.1); options with no sitewide row say what sets the
  // price. Home-side rows contradict each other across pages (a standard cylinder is 150–400,
  // 300–600 or 350–550 ₪ depending on the page), so only the row those pages agree on is quoted.
  {
    id: "home-calc-car-opening",
    from: '<span class="price">$200 - $400</span>',
    to: '<span class="price">300 – 600 ₪</span>',
    group: true,
  },
  {
    id: "home-calc-car-no-key",
    from: '<span class="price">$450 - $700</span>',
    to: '<span class="price">לפי דגם</span>',
    group: true,
  },
  {
    id: "home-calc-car-remote-key",
    from: '<span class="price">$300 - $600</span>',
    to: '<span class="price">350 – 550 ₪</span>',
    group: true,
  },
  {
    id: "home-calc-car-remote-repair-switch",
    from: '<span class="price">$500 - $800</span>',
    to: '<span class="price">לפי דגם</span>',
    group: true,
  },
  {
    id: "home-calc-car-immobiliser",
    from: '<span class="price">$600 - $1,000</span>',
    to: '<span class="price">לפי דגם</span>',
    group: true,
  },
  {
    id: "home-calc-home-stuck-key",
    from: '<span class="price">$150 - $250</span>',
    to: '<span class="price">לפי בדיקת המנעול</span>',
    group: true,
  },
  {
    id: "home-calc-home-cylinder",
    from: '<span class="price">$200 - $350</span>',
    to: '<span class="price">לפי סוג הצילינדר</span>',
    group: true,
  },
  {
    id: "home-calc-home-multipoint-cylinder",
    from: '<span class="price">$300 - $500</span>',
    to: '<span class="price">450 – 900 ₪</span>',
    group: true,
  },
  {
    id: "home-calc-home-latch",
    from: '<span class="price"> $250 - $450</span>',
    to: '<span class="price">לפי בדיקה במקום</span>',
    group: true,
  },
  {
    id: "home-calc-home-security-door",
    from: '<span class="price"> $500 - $850</span>',
    to: '<span class="price">450 – 900 ₪</span>',
    group: true,
  },
];

/** ⛔ patterns that must not survive. Mirrors scripts/check-claims.mjs. */
const FORBIDDEN = [
  [
    "years-in-business",
    /\d{1,2}\s*\+?\s*שנות ניסיון|ניסיון של\s*\d{1,2}\s*שנ|שנים של ניסיון|ניסיון מוכח/,
  ],
  // §D.2 — the warranty is confirmed with NO term (owner, 2026-11-04). Any duration is invented.
  [
    "warranty-term",
    /אחריות(?:\s+(?:מלאה|בכתב))?\s+(?:של\s+|ל-?|למשך\s+)?(?:עד\s+)?(?:\d+\s*|(?:חצי|שלוש|ארבע|חמש|שש|שתי|שני)\s+)?(?:שנה|שנתיים|שנים|חודש|חודשים|חודשיים|יום|ימים)|(?:שנה|שנתיים|חודשיים|\d+\s*(?:שנים|חודשים|ימים|יום))\s+(?:של\s+)?אחריות|(?:שנת|שנות|חודשי)\s+אחריות/,
  ],
  // §B.5 — no customer, garage or fleet count is sourced.
  ["customer-count", /(?:עשרות|מאות|אלפי)\s+(?:לקוחות|מוסכים|עסקים|סוכנויות|ציי רכב)/],
  // The theme's US-dollar demo prices. Anchored on the calculator's span: `$` + digit also occurs
  // legitimately in inline script (regex back-references), which is not a price.
  ["usd-price", /class="price">\s*\$/],
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

// --- homepage-only pass (page 7): decoded mode, end-state assertions --------------------------
const home = docPages.find((p) => p.isFront);
if (!home) {
  console.error("claims: no front page in content/site.json.");
  process.exit(1);
}
const homeFails = [];
let homeApplied = 0;
for (const r of HOME_CLAIM_REWRITES) {
  // A rule whose output contains its own input would re-apply on every run.
  if (r.to.includes(r.from))
    homeFails.push(`${r.id}: \`to\` contains \`from\` — not idempotent`);
  const hit = home.bodyHtml.split(r.from).length - 1;
  if (hit) {
    home.bodyHtml = home.bodyHtml.split(r.from).join(r.to);
    homeApplied += hit;
  }
  if (r.mirror && Array.isArray(home.jsonLd)) {
    home.jsonLd = home.jsonLd.map((s) => {
      if (typeof s !== "string" || !s.includes(r.from)) return s;
      homeApplied++;
      return s.split(r.from).join(r.to);
    });
  }
}
const homeHay = () =>
  [home.bodyHtml, ...(Array.isArray(home.jsonLd) ? home.jsonLd : [])].join("\n");
for (const r of HOME_CLAIM_REWRITES) {
  const hay = homeHay();
  const left = hay.split(r.from).length - 1;
  const present = hay.split(r.to).length - 1;
  if (left) homeFails.push(`${r.id}: \`from\` still present ×${left}`);
  // Grouped calculator rows share their output text, so only presence is meaningful there.
  const want = r.mirror ? 2 : 1;
  if (r.group ? present < 1 : present !== want)
    homeFails.push(
      `${r.id}: \`to\` present ×${present}, expected ${r.group ? "≥1" : want}`,
    );
}

// The accordion and its FAQPage block must say the same thing, question for question. Google reads
// the JSON-LD; a visitor reads the accordion; a mismatch is the self-contradiction §D.3 warns about.
const faqRoot = parse(home.bodyHtml, {
  blockTextElements: { script: true, style: true },
});
const accordion = faqRoot.querySelectorAll(".section-faq .acc-item").map((it) => ({
  q: (it.querySelector(".acc-item__header__title")?.text ?? "").trim(),
  a: (it.querySelector(".acc-item__body p")?.innerHTML ?? "").trim(),
}));
let faqBlock = null;
for (const s of home.jsonLd ?? []) {
  try {
    const o = JSON.parse(s);
    if (o?.["@type"] === "FAQPage") faqBlock = o;
  } catch {
    homeFails.push("a homepage JSON-LD block no longer parses");
  }
}
if (!faqBlock) homeFails.push("the homepage FAQPage block is missing");
else {
  const schema = (faqBlock.mainEntity ?? []).map((e) => ({
    q: String(e.name ?? "").trim(),
    a: String(e.acceptedAnswer?.text ?? "")
      .replace(/^\s*<p>/, "")
      .replace(/<\/p>\s*$/, "")
      .trim(),
  }));
  if (schema.length !== accordion.length)
    homeFails.push(
      `FAQPage has ${schema.length} questions, the accordion ${accordion.length}`,
    );
  schema.forEach((e, i) => {
    const v = accordion[i];
    if (!v || v.q !== e.q || v.a !== e.a)
      homeFails.push(`FAQ #${i + 1} differs between the accordion and FAQPage: "${e.q}"`);
  });
}
if (homeFails.length) {
  console.error(`\nclaims: the homepage pass did not reach its end state:`);
  for (const f of homeFails) console.error("  ! " + f);
  process.exit(1);
}

out = JSON.stringify(doc, null, 2);

writeFileSync(PATH, out);

const applied = [...counts].filter(([, n]) => n > 0);
const stale = [...counts].filter(([, n]) => n === 0);
console.log(
  `claims: rewrote ${applied.reduce((a, [, n]) => a + n, 0)} occurrence(s) across ${applied.length} rule(s).`,
);
for (const [id, n] of applied) console.log(`   ${id.padEnd(24)} ×${n}`);
console.log(
  `claims: homepage pass — ${homeApplied} replacement(s) this run, all ${HOME_CLAIM_REWRITES.length} rule(s) at their end state; FAQPage matches the accordion.`,
);
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
