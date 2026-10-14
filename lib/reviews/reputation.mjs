/**
 * The Google-reviews line — pure rules shared by the pass that renders it
 * (scripts/reputation.mjs) and the gate that checks it (scripts/check-reputation.mjs), so a
 * regression in a rule cannot be hidden by the rule. Plan: docs/dynamic-presence-plan.md §3.4
 * (as built 2026-10-13) and the owner decisions recorded in its §0.
 *
 * Deliberately NOT under lib/live/: fleet/live-kit/sync.mjs copies lib/live/* into the other
 * fleet sites byte-locked, and this surface is 3locksmiths-only.
 *
 * WHAT IT SAYS. "★ 5.0 · 13 ביקורות בגוגל · נכון ל-13/10/2026" plus a link to Google's own
 * reviews page. The rating and count are what the OWNER reads in the Business Profile dashboard on
 * the stated date (owner decision 2026-10-13: show Google's figure). Nothing here fetches, and no
 * review text, author or per-review rating is ever stored (Maps Terms §3.2.3) — only the two
 * numbers the business reads off its own dashboard.
 *
 * WHERE (owner decisions 2026-10-08 and 2026-10-13):
 *   · footer, all 109 pages — the line + "all reviews" link; the "write a review" ask on every
 *     page except the calm ones (a locked-out visitor is not a past customer);
 *   · the homepage hero, under the call button — inside <main>, ordinary content;
 *   · /contact/, after the call button — inside <main>, ordinary content;
 *   · the 76 service + city pages (80 until four twins were merged, 2026-10-14) — a band between </main> and <footer> (outside <main>, so it is
 *     a live region and a weekly count change never re-dates their sitemap entries).
 *
 * Pure: no fs, no clock, no network.
 */
import { isCalm } from "../live/pages.mjs";

/**
 * Core landers that are service pages to a visitor (owner decision 2026-10-13: "all 80"). 113
 * (/שכפול-שלט-לרכב-2/) left on 2026-10-14, merged into its /services/ twin 115.
 */
export const CORE_SERVICE_LANDERS = new Set([77, 78, 189]);
const BAND_KINDS = new Set(["service", "brand-key", "location"]);

/** The 76 pages that get their own band: service, brand-key and location pages that are not calm, plus the 3 landers. */
export function wantsBand(page, kindOf) {
  if (isCalm(page)) return false;
  if (CORE_SERVICE_LANDERS.has(page.id)) return true;
  return BAND_KINDS.has(kindOf(page.id));
}

export const HOME_ID = 7;
export const CONTACT_ID = 9001;
export const MIN_REVIEWS = 5;
export const WARN_DAYS = 8; // a weekly check is due
export const STALE_DAYS = 14; // owner decision 2026-10-13: "do what you think is best"

/** The newest read, or null. */
export function latestRead(register) {
  const reads = Array.isArray(register?.reads) ? register.reads : [];
  return reads.length ? reads[reads.length - 1] : null;
}

/** Problems with the register itself; an empty list means it is well-formed. */
export function validate(register) {
  const problems = [];
  if (!register || typeof register !== "object") return ["the register is not an object"];
  const ui = register.ui ?? {};
  for (const k of ["count", "rating", "asOf", "read", "ask", "newTab"]) {
    if (typeof ui[k] !== "string" || !ui[k].trim()) problems.push(`ui.${k} is missing`);
  }
  if (!Array.isArray(register.reads) || !register.reads.length) {
    problems.push("reads[] is empty");
    return problems;
  }
  let prev = "";
  for (const r of register.reads) {
    const at = `read ${r?.date ?? "?"}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r?.date ?? ""))
      problems.push(`${at}: date must be YYYY-MM-DD`);
    if (r.date <= prev) problems.push(`${at}: reads must be in ascending date order`);
    prev = r.date;
    const d = r.dashboard;
    if (!d || !Number.isInteger(d.total) || d.total < 0)
      problems.push(`${at}: dashboard.total must be a whole number`);
    if (!d || typeof d.rating !== "number" || d.rating < 1 || d.rating > 5)
      problems.push(`${at}: dashboard.rating must be 1–5`);
    if (typeof r.owner !== "string" || !r.owner.trim())
      problems.push(
        `${at}: owner must quote the owner's confirmation (who said it, when)`,
      );
    if (typeof r.source !== "string" || !r.source.trim())
      problems.push(`${at}: source is empty`);
  }
  const live = register.live;
  if (live != null) {
    if (typeof live.enabled !== "boolean")
      problems.push("live.enabled must be true or false");
    if (live.endpoint !== "/api/reviews")
      problems.push('live.endpoint must be "/api/reviews" (the Worker route)');
    if (!Number.isInteger(live.cap) || live.cap < 1 || live.cap > 20)
      problems.push("live.cap must be 1–20");
    if (!Number.isInteger(live.tolerance) || live.tolerance < 0)
      problems.push("live.tolerance must be a whole number ≥ 0");
    if (live.enabled) {
      for (const k of [
        "sliderNotice",
        "sliderLabel",
        "prev",
        "next",
        "position",
        "anonymous",
        "cardRating",
        "edited",
        "ratingOnly",
      ]) {
        if (typeof ui[k] !== "string" || !ui[k].trim())
          problems.push(`ui.${k} is missing (needed in live mode)`);
      }
    }
  }
  return problems;
}

/** The pages with a band: the 80 service + city pages, plus the homepage and /contact/ in live mode. */
export function hasBand(register, page, kindOf) {
  if (wantsBand(page, kindOf)) return true;
  return liveOn(register) && (page.id === HOME_ID || page.id === CONTACT_ID);
}

/** Is the line shown? Only from a well-formed register whose newest read clears the floor. */
export function isOpen(register) {
  const r = latestRead(register);
  return Boolean(
    r &&
    validate(register).length === 0 &&
    r.dashboard.total >= MIN_REVIEWS &&
    r.dashboard.rating >= 1,
  );
}

/** Minimal HTML-escape for text we inject as element content or attribute values. */
export const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const ddmmyyyy = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
/** One decimal, the way the dashboard shows it: 5 → "5.0", 4.75 → "4.8". */
export const oneDecimal = (n) => (Math.round(n * 10) / 10).toFixed(1);

// Material Symbols paths (Apache-2.0). Decorative: the rating is real text beside them.
const STAR =
  '<svg class="live-reviews__star" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>';
const EXT =
  '<svg class="live-reviews__ext" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>';

const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);

/** Live mode (State C): the Worker at live.endpoint feeds the slider and refreshes the numbers. */
export const liveOn = (register) => register?.live?.enabled === true;

/**
 * Fills a ui template with HTML-escaped text, wrapping each value in a span that public/assets/
 * reviews.js can update in live mode (`data-k`): numbers only — the words stay in the HTML.
 */
function fillHtml(tpl, vars, wrap) {
  const MARK = (k) => `\u0000${k}\u0001`;
  let out = esc(
    fill(tpl, Object.fromEntries(Object.keys(vars).map((k) => [k, MARK(k)]))),
  );
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(
      MARK(k),
      wrap ? `<span class="live-reviews__n" data-k="${k}">${v}</span>` : v,
    );
  }
  return out;
}

/** The rating line: star, "5.0" (with a spoken form), count, as-of date. */
function line(register) {
  const r = latestRead(register);
  const ui = register.ui;
  const live = liveOn(register);
  const rating = oneDecimal(r.dashboard.rating);
  const sep = '<span class="live-reviews__sep" aria-hidden="true">·</span>';
  const date = `<time datetime="${r.date}"${live ? ' data-k="date"' : ""}>${ddmmyyyy(r.date)}</time>`;
  return (
    `<span class="live-reviews__line">${STAR}` +
    `<span class="live-reviews__rating" aria-hidden="true"${live ? ' data-k="rating"' : ""}>${rating}</span>` +
    `<span class="live-reviews__sr">${fillHtml(ui.rating, { rating }, live)}</span>${sep}` +
    `<span class="live-reviews__count">${fillHtml(ui.count, { count: String(r.dashboard.total) }, live)}</span>${sep}` +
    `<span class="live-reviews__asof">${fillHtml(ui.asOf, { date }, false)}</span>` +
    `</span>`
  );
}

/**
 * The review slider's static shell (State C). Every word is here, in content/site.json, where
 * check-claims can read it; public/assets/reviews.js carries no copy — it only clones the
 * <template> and sets textContent and a few validated attributes. Hidden until a valid response
 * arrives; with JS off, or while the Worker withholds, the band shows only its static line.
 * No reviewer photos: the visitor's browser never contacts Google.
 */
function sliderHtml(register) {
  const ui = register.ui;
  const { endpoint, cap, tolerance } = register.live;
  const r = latestRead(register);
  const stars = '<span aria-hidden="true">★</span>'.repeat(5);
  return (
    `<div class="live-reviews-slider" hidden data-endpoint="${esc(endpoint)}" data-cap="${cap}" data-tolerance="${tolerance}" data-genuine="${r.dashboard.total}" data-asof="${r.date}">` +
    `<p class="live-reviews-slider__notice">${esc(ui.sliderNotice)}</p>` +
    `<ol class="live-reviews-slider__track" tabindex="0" aria-label="${esc(ui.sliderLabel)}"></ol>` +
    // ‹ and › are Bidi_Mirrored: in this RTL page the browser draws prev as › (pointing right, the
    // start) and next as ‹ (pointing left, where the next card comes from).
    `<div class="live-reviews-slider__nav">` +
    `<button type="button" class="live-reviews-slider__btn live-reviews-slider__btn--prev" aria-label="${esc(ui.prev)}"><span aria-hidden="true">‹</span></button>` +
    `<span class="live-reviews-slider__pos" aria-live="polite">${fillHtml(ui.position, { n: "", total: "" }, true)}</span>` +
    `<button type="button" class="live-reviews-slider__btn live-reviews-slider__btn--next" aria-label="${esc(ui.next)}"><span aria-hidden="true">›</span></button>` +
    `</div>` +
    `<template class="live-reviews-slider__tpl"><li class="live-reviews-card">` +
    `<p class="live-reviews-card__head"><bdi class="live-reviews-card__name"></bdi><span class="live-reviews-card__anon" hidden>${esc(ui.anonymous)}</span></p>` +
    `<p class="live-reviews-card__meta"><span class="live-reviews-card__stars" data-stars="5">${stars}</span>` +
    `<span class="live-reviews__sr">${fillHtml(ui.cardRating, { n: "" }, true)}</span>` +
    `<span class="live-reviews__sep" aria-hidden="true">·</span><time class="live-reviews-card__date"></time>` +
    `<span class="live-reviews-card__edited" hidden>${esc(ui.edited)}</span></p>` +
    `<p class="live-reviews-card__text" dir="rtl"></p>` +
    `<p class="live-reviews-card__only" hidden>${esc(ui.ratingOnly)}</p>` +
    `</li></template></div>`
  );
}

function link(label, href, cta, ui, extraClass = "") {
  return (
    `<a class="live-reviews__link${extraClass}" href="${esc(href)}" target="_blank" rel="noopener" data-cta="${cta}">` +
    `${esc(label)}<span class="live-reviews__sr">${esc(ui.newTab)}</span>${EXT}</a>`
  );
}

/**
 * The markup for one surface. `where` is footer | hero | contact | band.
 * Footer and band are live regions (data-lm-ignore — outside <main>); hero and contact are
 * ordinary content inside <main> and carry data-nosnippet only.
 */
export function blockHtml(register, links, where, { ask = false } = {}) {
  const ui = register.ui;
  const read = link(ui.read, links.read, `${where}-review-link`, ui);
  const askLink =
    ask && links.write
      ? link(ui.ask, links.write, `${where}-review-ask`, ui, " live-reviews__link--ask")
      : "";
  const inner = `${line(register)}<span class="live-reviews__links">${read}${askLink}</span>`;
  if (where === "footer")
    return `<div class="live-reviews live-reviews--footer" data-lm-ignore data-nosnippet>${inner}</div>`;
  if (where === "band")
    return `<section class="live-reviews-band" data-lm-ignore data-nosnippet aria-label="${esc(ui.bandLabel ?? "ביקורות בגוגל")}"><div class="container"><div class="live-reviews live-reviews--band">${inner}</div>${liveOn(register) ? sliderHtml(register) : ""}</div></section>`;
  return `<div class="live-reviews live-reviews--${where}" data-nosnippet>${inner}</div>`;
}

/** The footer when the line is closed but the ask is on: just the ask link. */
export function askOnlyHtml(register, links) {
  const ui = register.ui;
  return `<div class="live-reviews live-reviews--footer" data-lm-ignore data-nosnippet><span class="live-reviews__links">${link(ui.ask, links.write, "footer-review-ask", ui, " live-reviews__link--ask")}</span></div>`;
}

/** Every element this surface writes — what the pass strips before re-rendering. */
export const OWN_SELECTOR = ".live-reviews, .live-reviews-band";
