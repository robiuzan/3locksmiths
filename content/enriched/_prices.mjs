/**
 * The sitewide price rows and the sentences that frame them — ONE source for every page that
 * states a price for car keys (owner decision 2026-11-04, docs/business-facts.md §D.1).
 *
 * WHY ONE FILE — on 2026-11-03 the same key type sat on different rows on different pages: a chip
 * key was 200 – 350 ₪ on page 95 and the cost guide but 350 – 550 ₪ in 17 brand tables, and
 * Push-Start was 300 – 600 ₪ in 18 legacy rows and 450 – 900 ₪ in the same pages' own spec tables.
 * An answer engine quotes whichever number it lifts, so a contradiction between two of our pages
 * is worse than either number alone (§D.3).
 *
 * STATUS — the ranges are 🔶: authored for the site, not an owner-supplied price list. The owner
 * chose this four-row model on 2026-11-04; that settles which row a key type belongs to, not that
 * the ranges are sourced. Never emit them as schema.org `Offer` (docs/schema-graph.md).
 *
 * The scope line states only practices the owner confirmed for all three locksmiths on every job
 * (§D.13): a price range by phone before dispatch, and an agreed price that does not change on site.
 *
 * Not a page module: scripts/enrich.mjs loads only `<id>.mjs`, so a leading underscore keeps this
 * out of the page set. scripts/check-freshness.mjs still counts it as a source of content/site.json.
 */

/** The four rows, in the formatting every page uses: spaced en dash, ₪ after the number. */
export const PRICE = {
  mechanical: "200 – 350 ₪",
  chipOrFlip: "350 – 550 ₪",
  smart: "450 – 900 ₪",
  remoteOrOpening: "300 – 600 ₪",
  byModel: "לפי דגם",
};

/**
 * Which row a key type belongs to. Labels are normalised before lookup (scripts/check-prices.mjs),
 * so this is the single place a key type is mapped.
 */
export const KEY_TYPE_ROW = {
  "מפתח מכני": "mechanical",
  "מפתח עם שבב": "chipOrFlip",
  "מפתח מתקפל עם שלט": "chipOrFlip",
  "מפתח חכם": "smart",
  "Push-Start": "smart",
  "שלט נפרד": "remoteOrOpening",
  "פתיחת רכב נעול": "remoteOrOpening",
  "מפתח חדש ללא מקור": "byModel",
};

/** Under every family price table (lib/enrich/render.mjs renderPricing). */
export const PRICE_SCOPE =
  "טווח המחיר נמסר בטלפון לפני היציאה, לפי סוג המפתח, היצרן ושנת הייצור – והמחיר שסוכם אינו משתנה בשטח.";
