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
    // מתנה as a word only: a bare prefix matched מתנהלת / מתנהג (review, 2026-10-12)
    re: /\d+\s*%|הנחה|במבצע|מבצע\s*(?:חג|קיץ|חורף|מיוחד)|מחיר מיוחד|במקום\s*\d+|₪\s*\d|\d\s*(?:₪|ש[״"']ח|שקל(?:ים)?)|(?:^|[\s,.!?(])ב?חינם|ללא עלות|במתנה|(?:^|[\s,.!?(])מתנ(?:ה|ות)(?![א-ת])|חצי מחיר|\d\s*\+\s*\d|(?:מאה|מאתיים|חמישים|עשרה|עשרים|שלושים)\s+(?:שקל|ש[״"']ח)/,
  },
  {
    id: "scarcity-or-countdown",
    re: /רק היום|היום בלבד|רק השבוע|נותרו\s*\d|ספירה לאחור|מהרו|לזמן מוגבל|עד חצות|הזדמנות אחרונה|נגמר בקרוב|מקומות מוגבל|מלאי מוגבל|עד גמר המלאי|עד סוף ה(?:שבוע|חודש|יום)/,
  },
  { id: "ai-character-name", re: /אבי יחזקל|אביעד בן שושן|שרון אליקים/ },
  // Trade-neutral additions for the fleet (review of 2026-10-11): the generic list was written for
  // a locksmith, and these wordings passed on every other trade.
  {
    id: "arrival-hours-or-days",
    re: /תוך\s*(?:\d+\s*)?(?:שעות|שעתיים|שעה|יום|יומיים|ימים)|עוד היום|באותו (?:ה)?יום|מהיום להיום/,
  },
  {
    id: "free-or-financing",
    // ו / ב / ל prefixes too: "אפשר לפרוס לתשלומים" passed (review, 2026-10-12)
    re: /(?:ללא|בלי)\s+(?:תשלום|חיוב)|חינמי|(?:^|[\s,.!?(])ו?[בל]?תשלומים|ללא ריבית|הטבה|קופון|סייל/,
  },
  { id: "guarantee", re: /ערבות|מובטחת|הבטחת (?:שביעות|תוצאה)/ },
  {
    id: "rank-or-score",
    // "leading" only as a market claim: a bare מוביל is also the verb (a pipe that carries water)
    re: /מספר\s*1|מס[׳']\s*1|\d[.,]\d\s*ב?גוגל|ציון\s*\d|הכי (?:טוב|מומל[צץ]|זול)|(?:^|[\s,.!?(])(?:ה|מה)?מוביל(?:ים|ה|ות)?\s+(?:בתחום|בישראל|בארץ|באזור|בשוק|בענף)|מהמובילים|החברה המובילה/,
  },
  {
    id: "reviews-or-volume",
    re: /לקוחות ממליצים|ממליצים עלינו|המלצות לקוחות|(?:מאות|אלפי|רבבות)\s+\S+|עשרות שנות|מאות לקוחות/,
  },
  {
    id: "credentials",
    re: /מוסמ[כך]|מורש[הית]|רי?שיון|מבוטח|ביטוח|קבלן רשום|תו תקן|מכון התקנים/,
  },
];

/** Line copy only. */
export const PROMO = [
  { id: "offer-word", re: /מבצע/ },
  { id: "warranty", re: /אחריות/ },
  { id: "cheapest", re: /(?:^|[\s,.!?(])ה?זול|מובטח/ },
  // A price without a currency sign is still a price — "100 שח", "מחיר", "עלות", NIS/ILS.
  // Line copy only: body copy talks about prices legitimately.
  // עלויות too: the plural slipped through every rule ("בלי עלויות נוספות", review 2026-10-12).
  // Not after מ / ת: מעלות (degrees — every temperature tip on an AC site) and תעלות (channels).
  { id: "price-word", re: /\d+\s*ש[״"']?ח|מחיר|(?<![מת])עלו(?:ת|יות)|\bNIS\b|\bILS\b/ },
];

/**
 * The first rule a string breaks, or null. `promo` adds the line-only list. The fleet live-kit
 * (fleet/live-kit) passes `extra` — a site's own ⛔ rules ({ id, re }) — and `allow` — ids of
 * generic rules that site's own data confirms. The pilot passes neither.
 */
export function findClaim(text, promo = false, extra = [], allow = []) {
  const s = String(text ?? "");
  const rules = [...CLAIMS, ...(promo ? PROMO : []), ...extra].filter(
    (r) => !allow.includes(r.id),
  );
  for (const rule of rules) {
    if (rule.re.test(s)) return rule.id;
  }
  return null;
}
