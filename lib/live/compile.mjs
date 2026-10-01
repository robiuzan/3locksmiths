/**
 * Turns the authored schedule into what a page actually needs at runtime: a short, sorted list of
 * "show variant X from A to B" intervals. Everything else — the Israeli calendar, quiet days,
 * priorities — is resolved HERE, at build time, so none of it ships to the browser.
 *
 *   expand()   authored windows → concrete timed windows. A window with `during: "<kind>"` fans
 *              out over every calendar window of that kind (the weekly pre-Shabbat slot is one
 *              authored entry and ~60 concrete windows); `from`/`until` then act as bounds.
 *   compile()  concrete windows MINUS the quiet calendar windows (all of them for a seasonal
 *              line, only the hard ones for a safety line), precedence applied, adjacent
 *              pieces merged → [{ variant, from, until }] in epoch ms, disjoint and sorted.
 *   winners()  which authored windows ever show — the rest are shadowed.
 *
 * WHY TWO IMPLEMENTATIONS OF THE SAME PRECEDENCE. lib/live/resolve.mjs answers "what shows at
 * instant t" by looking at the raw windows; this file answers it by cutting the timeline into
 * segments. They share no selection code on purpose: scripts/check-schedule.mjs evaluates both
 * for every hour of the schedule and at every boundary, and fails the build if they ever
 * disagree. A bug has to be made twice, the same way, to get through.
 *
 * Pure: no clock, no network, no Intl, no DOM.
 */
import { HARD_QUIET_KINDS, QUIET_KINDS, boundMs } from "./resolve.mjs";

/** Authored campaign windows → concrete timed windows (epoch-ms bounds). */
export function expand(campaignWindows, calendar) {
  const out = [];
  for (const w of campaignWindows || []) {
    if (w.kind === "reduced") continue; // revealed by status.json, never by time
    const base = {
      variant: w.variant || w.id,
      kind: w.kind,
      priority: w.priority || 0,
      pages: w.pages,
      dialog: w.dialog,
    };
    if (w.during) {
      const lo = w.from === undefined ? -Infinity : boundMs(w.from);
      const hi = w.until === undefined ? Infinity : boundMs(w.until);
      for (const c of calendar || []) {
        if (c.kind !== w.during) continue;
        const from = Math.max(boundMs(c.from), lo);
        const until = Math.min(boundMs(c.until), hi);
        if (until > from) out.push({ id: w.id + "@" + c.id, from, until, ...base });
      }
    } else {
      out.push({ id: w.id, from: boundMs(w.from), until: boundMs(w.until), ...base });
    }
  }
  return out;
}

/**
 * The timeline cut at every window and quiet-day boundary, with the winner of each piece.
 * @returns {{ from: number, until: number, best: object }[]} only the pieces something wins
 */
function sweep(campaignWindows, calendar) {
  const wins = expand(campaignWindows, calendar);
  // Two grades of quiet: a memorial day or fast silences everything; Shabbat and chag silence
  // the seasonal lines only (owner, 2026-10-01: the hot-car safety line stays on).
  const quiet = (calendar || [])
    .filter((c) => QUIET_KINDS.includes(c.kind))
    .map((c) => ({
      from: boundMs(c.from),
      until: boundMs(c.until),
      hard: HARD_QUIET_KINDS.includes(c.kind),
    }));

  const cuts = new Set();
  for (const w of wins) cuts.add(w.from).add(w.until);
  for (const q of quiet) cuts.add(q.from).add(q.until);
  const points = [...cuts].sort((a, b) => a - b);

  const out = [];
  for (let i = 0; i + 1 < points.length; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    // Nothing starts or ends inside (a, b), so whatever holds at `a` holds for the whole segment.
    const active = quiet.filter((q) => q.from <= a && a < q.until);
    if (active.some((q) => q.hard)) continue;
    const live = wins.filter((w) => w.from <= a && a < w.until);
    const safety = live.filter((w) => w.kind === "safety");
    const pool = safety.length
      ? safety
      : active.length
        ? []
        : live.filter((w) => w.kind === "seasonal");
    if (!pool.length) continue;
    let best = pool[0];
    for (const w of pool) {
      if (w.priority > best.priority || (w.priority === best.priority && w.id < best.id))
        best = w;
    }
    out.push({ from: a, until: b, best });
  }
  return out;
}

/**
 * @returns {{ variant: string, from: number, until: number }[]} disjoint, sorted, merged —
 *   only the stretches where something OTHER than the evergreen line shows.
 */
export function compile(campaignWindows, calendar) {
  const out = [];
  for (const seg of sweep(campaignWindows, calendar)) {
    const last = out[out.length - 1];
    if (last && last.variant === seg.best.variant && last.until === seg.from)
      last.until = seg.until;
    else out.push({ variant: seg.best.variant, from: seg.from, until: seg.until });
  }
  return out;
}

/**
 * The AUTHORED window ids that win at least one moment. A window missing from this set is
 * authored but never shown — outranked or silenced for its whole life — which check-campaigns
 * reports, because a line nobody ever sees is an editing mistake, not a schedule.
 * @returns {Set<string>}
 */
export function winners(campaignWindows, calendar) {
  const ids = new Set();
  // A `during` window expands to "<id>@<calendar id>"; report the authored id.
  for (const seg of sweep(campaignWindows, calendar)) ids.add(seg.best.id.split("@")[0]);
  return ids;
}
