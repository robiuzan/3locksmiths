/**
 * The Google-reviews line — what it says and the dashboard reads it rests on.
 * Rendered by scripts/reputation.mjs (in `npm run enrich`); checked by
 * scripts/check-reputation.mjs (in `prebuild`). Rules: lib/reviews/reputation.mjs.
 *
 * HOW TO UPDATE IT (weekly — owner decision 2026-10-08)
 *   1. The owner reads the review count and the average in the Business Profile dashboard.
 *   2. A session appends ONE row below with that date, those two numbers, and the owner's words
 *      in `owner` — and the same row in docs/local-presence.md §3.
 *   3. format → enrich → check → build → human deploy. The line shows the newest row.
 *   A row older than 14 days fails the build (LIVE_GATES=lapsed-ok downgrades it to a warning).
 *
 * WHAT MAY NEVER GO HERE: review text, reviewer names, per-review ratings, or any number not read
 * off the owner's dashboard (Maps Terms §3.2.3; docs/business-facts.md §B). Never a count from
 * the public /maps/preview/place read — it is non-deterministic (§B.5).
 *
 * Owner decision 2026-10-13: the reviews on the profile are NOT to be treated as fake, and the
 * site shows Google's own figure (docs/business-facts.md §B.6). That reverses the 2026-09-29
 * position; both are recorded there.
 */
export default {
  ui: {
    rating: "דירוג ממוצע {rating} מתוך 5,",
    count: "{count} ביקורות בגוגל",
    asOf: "נכון ל-{date}",
    read: "לכל הביקורות בגוגל",
    ask: "עבדנו אצלכם? כתבו לנו ביקורת בגוגל",
    newTab: " (נפתח בחלון חדש)",
    bandLabel: "ביקורות בגוגל",
    // The review slider (live mode only). Every word ships here — public/assets/reviews.js carries none.
    sliderNotice:
      "הביקורות שנכתבו או עודכנו לאחרונה בגוגל, מהחדשה לישנה. אנחנו לא מסננים ולא בוחרים אילו ביקורות יוצגו.",
    sliderLabel: "ביקורות מגוגל",
    prev: "הביקורת הקודמת",
    next: "הביקורת הבאה",
    position: "{n} מתוך {total}",
    anonymous: "ביקורת אנונימית",
    cardRating: "דירוג {n} מתוך 5",
    edited: "עודכנה",
    ratingOnly: "דירוג בלבד",
  },
  // The "write a review" link (Google's own "Get more reviews" link, roster schema.reviewsWriteUri).
  ask: { enabled: true },
  // Live mode (State C): the slider + numbers refreshed from the Business Profile API through the
  // Worker in workers/reviews/. Switch ON only after Google approves API access (case
  // 9-8690000041019) AND the Worker answers on https://3locksmiths.co.il/api/reviews — see
  // workers/reviews/README.md. Owner 2026-10-13: every review shown, low ratings included; at most
  // 10 reviews newer than the newest confirmed read; no review schema.
  live: { enabled: false, endpoint: "/api/reviews", cap: 10, tolerance: 10 },
  reads: [
    {
      date: "2026-10-13",
      dashboard: { total: 13, rating: 5 },
      owner: "owner, in session 2026-10-13: the dashboard shows 13 reviews, average 5",
      source: "Business Profile dashboard, read by the owner — docs/local-presence.md §3",
    },
  ],
};
