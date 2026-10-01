/**
 * What an announcement line may never say — the ⛔ patterns for the live registers, shared by
 * the gate that applies them (scripts/check-campaigns.mjs) and the test that pins them
 * (scripts/check-schedule.mjs, which feeds a list of wordings that once slipped through).
 *
 * Two lists:
 *   CLAIMS  mirrors scripts/check-claims.mjs BLOCKING — things this site's own data refutes —
 *           plus what any promo surface invites. Applied to every register string.
 *   PROMO   words that have no innocent use in a 46-character locksmith line: a bare "מבצע", a
 *           price in any spelling, an arrival time in any unit, a warranty. Applied only to the
 *           copy of a line (text, labels, dialog), never to calendar labels — an overlay day
 *           could legitimately be called "מבצע חרבות ברזל".
 *
 * No `\b`: JavaScript's word boundary is ASCII-only, so between two Hebrew letters it matches
 * everywhere. Mind the final-letter trap: `זמין` ends in a final nun (ן) while `זמינים` has a
 * regular one (נ) — `[נן]` covers both.
 *
 * The register carries the owner's decision of 2026-09-29 (docs/business-facts.md §D.10): there
 * are no offers. A rule here is the only automated defence of that decision.
 */

export const CLAIMS = [
  {
    id: "years-in-business",
    re: /\d{1,2}\s*\+?\s*שנות ניסיון|ניסיון של\s*\d{1,2}\s*שנ|מעל\s*\d{1,2}\s*שנ|עשרות שנים|\d{1,2}\s*שנ(?:ה|ים)\s+של\s+ניסיון/,
  },
  { id: "average-response-time", re: /זמן מענה ממוצע|זמן הגעה ממוצע/ },
  {
    id: "arrival-minutes",
    re: /תוך\s*\d+\s*דק|ב-?\d+\s*דק|\d+\s*דק(?:ות|׳|')?\s+(?:הגעה|ו|עד)|חצי שעה|רבע שעה|תוך שעה|\d+\s*דקות/,
  },
  { id: "customer-count", re: /אלפי לקוחות|מאות לקוחות|אלפי מפתחות|לקוחות מרוצים/ },
  {
    id: "live-availability",
    re: /טכנא(?:י|ים|ית|יות)\s+זמי[נן]|נציג(?:ים|ה)?\s+זמי[נן]|זמי[נן](?:ים|ה|ות)?\s+באזורך|באזורך עכשיו|\d+\s*צופים|צופים\s+(?:כעת|עכשיו)|טכנאי בדרך/,
  },
  {
    id: "rating",
    re: /aggregateRating|reviewCount|\d(\.\d)?\s*★|★{2,}|דירוג\s*\d|\d\s*כוכבים|חמישה כוכבים|כוכבים בגוגל/,
  },
  {
    id: "discount-or-price",
    re: /\d+\s*%|הנחה|במבצע|מבצע\s*(?:חג|קיץ|חורף|מיוחד)|מחיר מיוחד|במקום\s*\d+|₪\s*\d|\d\s*(?:₪|ש[״"']ח|שקל(?:ים)?)|(?:^|[\s,.!?(])ב?חינם|ללא עלות|במתנה|(?:^|[\s,.!?(])מתנה|חצי מחיר|\d\s*\+\s*\d|(?:מאה|מאתיים|חמישים|עשרה|עשרים|שלושים)\s+(?:שקל|ש[״"']ח)/,
  },
  {
    id: "scarcity-or-countdown",
    re: /רק היום|היום בלבד|רק השבוע|נותרו\s*\d|ספירה לאחור|מהרו|לזמן מוגבל|עד חצות|הזדמנות אחרונה|נגמר בקרוב|מקומות מוגבל|מלאי מוגבל|עד גמר המלאי|עד סוף ה(?:שבוע|חודש|יום)/,
  },
  { id: "ai-character-name", re: /אבי יחזקל|אביעד בן שושן|שרון אליקים/ },
];

/** Line copy only. */
export const PROMO = [
  { id: "offer-word", re: /מבצע/ },
  { id: "warranty", re: /אחריות/ },
  { id: "cheapest", re: /(?:^|[\s,.!?(])ה?זול|מובטח/ },
  // A price without a currency sign is still a price — "100 שח", "מחיר", "עלות", NIS/ILS.
  // Line copy only: body copy talks about prices legitimately.
  { id: "price-word", re: /\d+\s*ש[״"']?ח|מחיר|עלות|\bNIS\b|\bILS\b/ },
];

/** The first rule a string breaks, or null. `promo` adds the line-only list. */
export function findClaim(text, promo = false) {
  const s = String(text ?? "");
  for (const rule of promo ? [...CLAIMS, ...PROMO] : CLAIMS) {
    if (rule.re.test(s)) return rule.id;
  }
  return null;
}
