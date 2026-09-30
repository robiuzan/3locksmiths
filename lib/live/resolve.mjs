/**
 * Picks which live variant a page shows at a given instant — the ONE place that precedence lives.
 *
 * Consumed by scripts/check-schedule.mjs (the node:test simulator that runs in `prebuild`) and,
 * from Phase 1 of docs/dynamic-presence-plan.md, serialized into the constant inline <head>
 * resolver in app/layout.tsx. So it must stay:
 *
 *   - PURE: no clock, no network, no DOM, no Intl. The caller passes the instant in. Windows
 *     carry explicit ISO offsets (+02:00 / +03:00), so comparisons are absolute and the
 *     visitor's timezone never enters into it (docs/dynamic-presence-plan.md §4.2).
 *   - BROWSER-SAFE ES2015: no optional chaining, no spread on objects, no Set — it will run
 *     inline before first paint on whatever WebView opened the link.
 *   - TEXT-FREE: it returns ids. Every visible word is pre-rendered by the pipeline into
 *     content/site.json (rule 1 of /dynamic-presence); this only says which one to reveal.
 *
 * Precedence, top wins (§4.2):
 *   status.json override (off | reduced | quiet)
 *     > a calendar quiet window (memorial/fast/civic, Shabbat, chag) → evergreen only
 *       > a safety window (hot-car line — non-commercial, allowed to beat seasonal)
 *         > a seasonal window (highest priority; ties are rejected by check-campaigns, and
 *           broken here by id so the result is still deterministic)
 *           > evergreen — also the JS-off state and the answer to any error.
 */

/** Calendar kinds that silence every promotional / seasonal variant. */
export const QUIET_KINDS = ["quiet", "shabbat", "chag"];

/** Campaign kinds. `reduced` is not time-windowed: status.json reveals it. */
export const WINDOW_KINDS = ["seasonal", "safety", "reduced"];

/**
 * ISO 8601 with an EXPLICIT offset. A date-only string is deliberately rejected: `new
 * Date("2026-10-05")` is UTC midnight = 03:00 in Israel, and a Yom HaZikaron eve that starts
 * three hours late is exactly the bug this format exists to make impossible.
 *
 * Field ranges are checked here because V8 does not: `Date.parse` turns month 13 into NaN but
 * quietly rolls `T24:00` into the next day. What the regex cannot see (30 February, 31 April)
 * check-campaigns catches by re-rendering the parsed instant in the string's own offset.
 */
export const ISO_WITH_OFFSET =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:[+-](?:0\d|1[0-4]):[0-5]\d|Z)$/;

/** Parse an ISO-with-offset string to epoch ms; throws on anything else. */
export function toMs(value) {
  if (typeof value !== "string" || !ISO_WITH_OFFSET.test(value)) {
    throw new Error(
      "resolve: window bound must be ISO 8601 with an explicit offset, got " + value,
    );
  }
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) throw new Error("resolve: unparseable instant " + value);
  return ms;
}

/** [from, until) — half-open, so a window that ends 23:59 and one that starts 23:59 never overlap. */
export function isActive(win, ms) {
  return toMs(win.from) <= ms && ms < toMs(win.until);
}

function instantMs(instant) {
  if (instant instanceof Date) return instant.getTime();
  if (typeof instant === "number") return instant;
  return toMs(instant);
}

function isExcluded(win, pageKind) {
  if (!pageKind || !win.pages || !win.pages.exclude) return false;
  return win.pages.exclude.indexOf(pageKind) !== -1;
}

/** Highest priority wins; equal priorities fall back to the lexically smaller id. */
function pick(wins) {
  let best = null;
  for (let i = 0; i < wins.length; i += 1) {
    const w = wins[i];
    if (
      best === null ||
      (w.priority || 0) > (best.priority || 0) ||
      ((w.priority || 0) === (best.priority || 0) && String(w.id) < String(best.id))
    ) {
      best = w;
    }
  }
  return best;
}

function decision(variant, dialog, quiet, mode, reason) {
  return { variant: variant, dialog: dialog, quiet: quiet, mode: mode, reason: reason };
}

/**
 * @param {{ windows?: Array, calendar?: Array }} schedule  campaign windows + calendar windows
 * @param {Date|number|string} instant                     the moment to resolve for
 * @param {{ status?: {mode?: string}|null, pageKind?: string|null,
 *           noInterstitial?: boolean, dismissed?: string[] }} [options]
 * @returns {{ variant: string|null, dialog: string|null, quiet: boolean, mode: string, reason: string }}
 *   variant: the data-campaign id to reveal ("evergreen" / "reduced" / a window id), or null = hide
 *   dialog:  the window id whose card may open, or null
 */
export function resolve(schedule, instant, options) {
  const ms = instantMs(instant);
  const opts = options || {};
  const mode = opts.status && opts.status.mode ? String(opts.status.mode) : "normal";
  const dismissed = opts.dismissed || [];

  if (mode === "off") return decision(null, null, true, mode, "status:off");
  if (mode === "reduced") return decision("reduced", null, true, mode, "status:reduced");
  if (mode === "quiet") return decision("evergreen", null, true, mode, "status:quiet");

  const calendar = (schedule && schedule.calendar) || [];
  for (let i = 0; i < calendar.length; i += 1) {
    const c = calendar[i];
    if (QUIET_KINDS.indexOf(c.kind) !== -1 && isActive(c, ms)) {
      return decision("evergreen", null, true, mode, "calendar:" + c.id);
    }
  }

  const all = (schedule && schedule.windows) || [];
  const live = [];
  for (let i = 0; i < all.length; i += 1) {
    const w = all[i];
    if (w.kind === "reduced") continue; // revealed by status only, never by time
    if (isActive(w, ms) && !isExcluded(w, opts.pageKind)) live.push(w);
  }

  const safety = pick(live.filter((w) => w.kind === "safety"));
  const seasonal = pick(live.filter((w) => w.kind === "seasonal"));
  const chosen = safety || seasonal;
  if (!chosen) return decision("evergreen", null, false, mode, "evergreen");

  if (dismissed.indexOf(chosen.id) !== -1) {
    return decision("evergreen", null, false, mode, "dismissed:" + chosen.id);
  }
  const dialog = chosen.dialog && !opts.noInterstitial ? chosen.id : null;
  return decision(chosen.id, dialog, false, mode, safety ? "safety" : "seasonal");
}
