/**
 * Pure logic for the reviews Worker (workers/reviews/worker.mjs): turn a Business Profile API
 * `reviews.list` response into the small, validated shape public/assets/reviews.js renders, and
 * decide whether to show it at all. No network, no storage — unit-tested by shape.test.mjs.
 *
 * Owner decisions (2026-10-13, docs/business-facts.md §B.6, docs/dynamic-presence-plan.md §0):
 *   · every review the API returns, in its order (newest update first) — never filtered by stars,
 *     text or author; low ratings included;
 *   · at most `tolerance` (10) reviews newer than the owner's latest confirmed read may be shown —
 *     above that, the whole slider is withheld until the next confirmed read;
 *   · only the original text — Google's machine translation is cut, never shown;
 *   · no reviewer photos (the visitor's browser never contacts Google), no review schema.
 */

const STARS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
const MAX_TEXT = 5000;
const MAX_NAME = 120;

const ISRAEL = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jerusalem",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The Israel calendar date of an instant: { text: "dd/mm/yyyy", iso: "yyyy-mm-dd" }, or null. */
export function israelDate(instant) {
  const d = new Date(instant);
  if (Number.isNaN(d.getTime())) return null;
  const p = Object.fromEntries(ISRAEL.formatToParts(d).map((x) => [x.type, x.value]));
  return { text: `${p.day}/${p.month}/${p.year}`, iso: `${p.year}-${p.month}-${p.day}` };
}

// Google appends or prepends a machine translation to `comment`, with markers in English or in the
// Accept-Language (Hebrew here). Both orders occur.
const TRANSLATED =
  /\((?:Translated by Google|תורגם על ידי Google|תורגם ע״י Google|תורגם ע"י Google)\)/;
const ORIGINAL = /\((?:Original|המקור|מקור)\)/;

/**
 * The reviewer's own words. Returns { text } (text may be null for a rating-only review), or
 * { error } when a translation marker is present but the original cannot be isolated — the caller
 * then withholds everything rather than show Google's translation as the customer's words.
 */
export function originalText(comment) {
  if (typeof comment !== "string" || !comment.trim()) return { text: null };
  const t = comment.search(TRANSLATED);
  if (t === -1) return { text: comment.trim() };
  const o = comment.search(ORIGINAL);
  if (o > t) {
    // "(Translated by Google) <translation>\n\n(Original)\n<original>"
    const rest = comment.slice(o).replace(ORIGINAL, "").trim();
    return rest ? { text: rest } : { error: "empty original" };
  }
  if (o === -1 && t > 0) {
    // "<original>\n\n(Translated by Google)\n<translation>"
    const head = comment.slice(0, t).trim();
    return head ? { text: head } : { error: "empty original" };
  }
  return { error: "unparseable translation markers" };
}

/** "rtl" unless Latin/Cyrillic letters outnumber Hebrew/Arabic ones — so "BMW …" in Hebrew stays rtl. */
export function textDir(s) {
  const rtl = (String(s).match(/[֐-׿؀-ۿ]/g) || []).length;
  const ltr = (String(s).match(/[A-Za-zÀ-ɏЀ-ӿ]/g) || []).length;
  return ltr > rtl ? "ltr" : "rtl";
}

/**
 * Shape a merged reviews.list response ({ reviews, averageRating, totalReviewCount }).
 * Returns { ok: true, data } or { ok: false, reason }. `data.reviews` keeps every review (newest
 * update first); each carries `created` (Israel ISO date) for the unconfirmed-count rule.
 */
export function shapeReviews(raw) {
  if (!raw || !Array.isArray(raw.reviews))
    return { ok: false, reason: "no reviews array" };
  const total = Number(raw.totalReviewCount);
  const average = Number(raw.averageRating);
  if (!Number.isInteger(total) || total < 1)
    return { ok: false, reason: "bad totalReviewCount" };
  if (!(average >= 1 && average <= 5)) return { ok: false, reason: "bad averageRating" };

  const reviews = [];
  for (const r of raw.reviews) {
    const stars = STARS[r?.starRating];
    if (!stars) return { ok: false, reason: `unrated review (${r?.starRating})` };
    const created = israelDate(r.createTime);
    const updated = israelDate(r.updateTime ?? r.createTime);
    if (!created || !updated) return { ok: false, reason: "bad review dates" };
    const own = originalText(r.comment);
    if (own.error) return { ok: false, reason: own.error };
    const display = String(r.reviewer?.displayName ?? "").trim();
    const anon = r.reviewer?.isAnonymous === true || !display;
    const text = own.text ? own.text.slice(0, MAX_TEXT) : null;
    reviews.push({
      anon,
      name: anon ? null : display.slice(0, MAX_NAME),
      stars,
      date: updated.text,
      datetime: updated.iso,
      edited: updated.iso !== created.iso,
      text,
      dir: text ? textDir(text) : "rtl",
      created: created.iso,
      updateTime: String(r.updateTime ?? r.createTime),
    });
  }
  // Newest update first — the order the notice promises, whatever order the pages arrived in.
  reviews.sort((a, b) =>
    a.updateTime < b.updateTime ? 1 : a.updateTime > b.updateTime ? -1 : 0,
  );
  for (const r of reviews) delete r.updateTime;
  return { ok: true, data: { total, average, reviews } };
}

/**
 * What /api/reviews answers. `stored` is the KV entry the cron wrote ({ fetchedAt, total, average,
 * reviews }); `ledger` is production's /assets/reputation.json; `mode` the KV switch ("on" shows;
 * anything else, or missing, withholds — fail closed).
 */
export function decide({ stored, ledger, mode, now }) {
  if (mode !== "on") return { v: 1, state: "withheld", reason: "mode" };
  if (!ledger || ledger.open !== true || ledger.live !== true)
    return { v: 1, state: "withheld", reason: "ledger" };
  if (!stored || !Array.isArray(stored.reviews) || !stored.reviews.length)
    return { v: 1, state: "unavailable", reason: "empty" };
  const age = now - Date.parse(stored.fetchedAt);
  if (!(age >= 0 && age <= 24 * 3600 * 1000))
    return { v: 1, state: "unavailable", reason: "stale" };
  const asOf = String(ledger.asOf ?? "");
  const unconfirmed = stored.reviews.filter((r) => r.created > asOf).length;
  if (unconfirmed > Number(ledger.tolerance ?? 0))
    return { v: 1, state: "withheld", reason: "unconfirmed" };
  const fetched = israelDate(stored.fetchedAt);
  const cap = Math.max(1, Math.min(20, Number(ledger.cap) || 10));
  return {
    v: 1,
    state: "ok",
    total: stored.total,
    average: stored.average,
    asOf: fetched.iso,
    asOfText: fetched.text,
    // An explicit allowlist: nothing else stored with a review can reach the page.
    reviews: stored.reviews.slice(0, cap).map((r) => ({
      anon: r.anon,
      name: r.name,
      stars: r.stars,
      date: r.date,
      datetime: r.datetime,
      edited: r.edited,
      text: r.text,
      dir: r.dir,
    })),
  };
}
