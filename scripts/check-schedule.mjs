/**
 * The schedule simulator — runs lib/live/resolve.mjs over every hour of the next 400 days and
 * over fixed scenarios, so precedence bugs surface in `prebuild` rather than on Yom HaZikaron
 * eve (docs/dynamic-presence-plan.md §4.3; /israeli-calendar "Gates").
 *
 * Three layers:
 *   1. FIXTURES — hand-written windows that pin the contract: a hard quiet day beats everything,
 *      Shabbat/chag beat seasonal but not safety, safety beats seasonal, priority ordering and its deterministic tie-break, status modes, page
 *      exclusion, dismissal, the DST nights (2026-10-25 and 2027-03-26) and the 5787 Adar I/II
 *      pair, and the rejection of date-only strings.
 *   2. THREE ANSWERS TO ONE QUESTION. "What shows at instant t" is computed by the resolver
 *      (lib/live/resolve.mjs, from the raw windows), by the compiler (lib/live/compile.mjs, by
 *      cutting the timeline) and by the inline <head> script itself, executed in a VM from the
 *      exact text that ships. They share no selection code, and must agree on every hour and on
 *      both sides of every boundary.
 *   3. THE REAL REGISTERS, when they exist — the same three-way agreement for 400 days, no
 *      line on a hard quiet day and no seasonal line on Shabbat/chag, and content/site.json
 *      carrying the current script.
 *
 * Pure node:test + node:assert (CLAUDE.md §13: no dependency the platform already provides).
 * Reads the clock only to choose the 400-day span; it only ever READS content/site.json.
 *
 *   node scripts/check-schedule.mjs        (non-zero exit on any failing test)
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { HARD_QUIET_KINDS, QUIET_KINDS, resolve, toMs } from "../lib/live/resolve.mjs";
import { compile, expand, winners } from "../lib/live/compile.mjs";
import { withoutLiveRegions } from "../lib/live/regions.mjs";
import { findClaim } from "../lib/live/claims.mjs";
import { allowsDialog, hasEmergencyNumbers } from "../lib/live/pages.mjs";
import {
  liveHeadScript,
  packSchedule,
  unpackSchedule,
} from "../lib/live/head-script.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENRICHED = join(ROOT, "content", "enriched");
const HOUR = 3_600_000;
const DAYS = 400;

// ---------------------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------------------

const F = {
  windows: [
    {
      id: "hanukkah-travel-2026",
      kind: "seasonal",
      priority: 20,
      from: "2026-12-03T12:00:00+02:00",
      until: "2026-12-12T23:59:00+02:00",
      pages: { exclude: ["emergency"] },
      topbar: { text: "x" },
      dialog: { title: "t", body: "b", capDays: 14 },
      source: "fixture",
    },
    {
      id: "winter-battery",
      kind: "seasonal",
      priority: 10,
      from: "2026-11-01T00:00:00+02:00",
      until: "2027-03-31T23:59:00+03:00",
      topbar: { text: "x" },
      source: "fixture",
    },
    {
      id: "safety-summer-2027",
      kind: "safety",
      priority: 50,
      from: "2027-06-15T00:00:00+03:00",
      until: "2027-09-15T23:59:00+03:00",
      topbar: { text: "x" },
      source: "fixture",
    },
    {
      id: "summer-keys-2027",
      kind: "seasonal",
      priority: 30,
      from: "2027-07-01T00:00:00+03:00",
      until: "2027-08-31T23:59:00+03:00",
      topbar: { text: "x" },
      source: "fixture",
    },
    { id: "reduced", kind: "reduced", topbar: { text: "x" }, source: "fixture" },
  ],
  calendar: [
    // Shabbat inside Hanukkah — expected overlap, precedence must silence the promo.
    {
      id: "shabbat-2026-12-05",
      kind: "shabbat",
      from: "2026-12-04T15:00:00+02:00",
      until: "2026-12-05T21:00:00+02:00",
    },
    // Rabin day, a hard-quiet civic window.
    {
      id: "rabin-2026",
      kind: "quiet",
      from: "2026-10-21T12:00:00+03:00",
      until: "2026-10-22T20:30:00+03:00",
    },
    // A summer Shabbat inside the safety window, and Tisha B'Av inside it too.
    {
      id: "shabbat-2027-07-17",
      kind: "shabbat",
      from: "2027-07-16T18:20:00+03:00",
      until: "2027-07-17T21:00:00+03:00",
    },
    {
      id: "tisha-bav-2027",
      kind: "quiet",
      from: "2027-08-11T12:00:00+03:00",
      until: "2027-08-12T20:27:00+03:00",
    },
    // Purim Katan / Purim in the 5787 leap year: two distinct Adar windows.
    {
      id: "purim-katan-5787",
      kind: "chag",
      from: "2027-02-20T15:00:00+02:00",
      until: "2027-02-21T20:00:00+02:00",
    },
    {
      id: "purim-5787",
      kind: "chag",
      from: "2027-03-22T15:00:00+02:00",
      until: "2027-03-23T20:00:00+02:00",
    },
  ],
};

const at = (iso, opts) => resolve(F, iso, opts);

test("empty schedule resolves to evergreen everywhere, never throws", () => {
  const start = Date.now();
  for (let h = 0; h < DAYS * 24; h += 1) {
    const d = resolve({}, start + h * HOUR);
    assert.equal(d.variant, "evergreen");
    assert.equal(d.dialog, null);
  }
});

test("seasonal window wins inside its bounds and yields outside", () => {
  assert.equal(at("2026-12-03T11:59:00+02:00").variant, "winter-battery"); // one minute before
  assert.equal(at("2026-12-03T12:00:00+02:00").variant, "hanukkah-travel-2026"); // half-open start
  assert.equal(at("2026-12-12T23:59:00+02:00").variant, "winter-battery"); // half-open end
  assert.equal(at("2026-10-01T10:00:00+03:00").variant, "evergreen");
});

test("higher priority wins on overlap; safety beats seasonal regardless of priority", () => {
  assert.equal(at("2026-12-06T10:00:00+02:00").variant, "hanukkah-travel-2026"); // 20 > 10
  assert.equal(at("2027-07-15T10:00:00+03:00").variant, "safety-summer-2027"); // safety 50 vs seasonal 30
  assert.equal(at("2027-07-15T10:00:00+03:00").reason, "safety");
  // Owner, 2026-10-01: the safety line stays on through Shabbat and chag …
  const shabbat = at("2027-07-17T10:00:00+03:00");
  assert.equal(shabbat.variant, "safety-summer-2027");
  assert.equal(shabbat.quiet, true, "it is still a quiet window for everything else");
  assert.equal(shabbat.dialog, null, "no card on Shabbat");
  // … but not through a memorial day or a fast.
  assert.equal(at("2027-08-12T10:00:00+03:00").variant, "evergreen");
  assert.equal(at("2027-08-12T10:00:00+03:00").reason, "calendar:tisha-bav-2027");
  // A hard quiet day overlapping a Shabbat silences the safety line whichever window the
  // calendar lists first (a postponed Tisha B'Av starts on the Saturday).
  const overlapCal = [
    {
      id: "shabbat-x",
      kind: "shabbat",
      from: "2029-07-20T18:25:00+03:00",
      until: "2029-07-21T20:58:00+03:00",
    },
    {
      id: "tisha-bav-x",
      kind: "quiet",
      from: "2029-07-21T12:00:00+03:00",
      until: "2029-07-22T20:25:00+03:00",
    },
  ];
  const safetyWin = [
    {
      id: "safety-x",
      kind: "safety",
      priority: 50,
      from: "2029-07-01T00:00:00+03:00",
      until: "2029-08-01T00:00:00+03:00",
      topbar: { text: "x" },
    },
  ];
  for (const cal of [overlapCal, [...overlapCal].reverse()]) {
    const t = "2029-07-21T13:00:00+03:00";
    assert.equal(
      resolve({ windows: safetyWin, calendar: cal }, t).reason,
      "calendar:tisha-bav-x",
    );
    assert.equal(lookup(compile(safetyWin, cal), toMs(t)), "evergreen");
    assert.equal(
      resolve({ windows: safetyWin, calendar: cal }, "2029-07-21T10:00:00+03:00").variant,
      "safety-x",
    );
  }
  // A seasonal line alone on that Shabbat would have been silenced.
  assert.equal(
    resolve(
      { windows: F.windows.filter((w) => w.kind !== "safety"), calendar: F.calendar },
      "2027-07-17T10:00:00+03:00",
    ).variant,
    "evergreen",
  );
  const tie = resolve(
    {
      windows: [
        {
          id: "b",
          kind: "seasonal",
          priority: 1,
          from: "2026-11-01T00:00:00+02:00",
          until: "2026-11-02T00:00:00+02:00",
          topbar: { text: "x" },
        },
        {
          id: "a",
          kind: "seasonal",
          priority: 1,
          from: "2026-11-01T00:00:00+02:00",
          until: "2026-11-02T00:00:00+02:00",
          topbar: { text: "x" },
        },
      ],
    },
    "2026-11-01T12:00:00+02:00",
  );
  assert.equal(
    tie.variant,
    "a",
    "ties are rejected by check-campaigns, but the resolver must still be deterministic",
  );
});

test("calendar quiet windows silence every promo — Shabbat inside Hanukkah, Rabin day, both Adars", () => {
  const shabbat = at("2026-12-05T10:00:00+02:00");
  assert.equal(shabbat.variant, "evergreen");
  assert.equal(shabbat.quiet, true);
  assert.equal(shabbat.dialog, null);
  assert.equal(shabbat.reason, "calendar:shabbat-2026-12-05");
  assert.equal(
    at("2026-12-05T21:00:00+02:00").variant,
    "hanukkah-travel-2026",
    "promo returns the second the window closes",
  );
  assert.equal(at("2026-10-22T09:00:00+03:00").reason, "calendar:rabin-2026");
  assert.equal(at("2027-02-21T10:00:00+02:00").reason, "calendar:purim-katan-5787");
  assert.equal(at("2027-03-23T10:00:00+02:00").reason, "calendar:purim-5787");
  assert.equal(
    at("2027-03-01T10:00:00+02:00").variant,
    "winter-battery",
    "between the two Adars the season shows",
  );
});

test("status.json overrides everything and can only hide or select", () => {
  const iso = "2026-12-06T10:00:00+02:00"; // Hanukkah, not Shabbat
  assert.deepEqual(at(iso, { status: { mode: "off" } }).variant, null);
  assert.equal(at(iso, { status: { mode: "quiet" } }).variant, "evergreen");
  assert.equal(at(iso, { status: { mode: "reduced" } }).variant, "reduced");
  assert.equal(at(iso, { status: { mode: "reduced" } }).dialog, null);
  assert.equal(at(iso, { status: { mode: "normal" } }).variant, "hanukkah-travel-2026");
  assert.equal(at(iso, { status: null }).variant, "hanukkah-travel-2026");
  assert.equal(
    at(iso, { status: { mode: "garbage" } }).variant,
    "hanukkah-travel-2026",
    "unknown modes are ignored, not obeyed",
  );
  assert.equal(
    at("2026-10-01T10:00:00+03:00").variant,
    "evergreen",
    "the reduced variant is never chosen by time",
  );
  // An unreadable switch fails CLOSED: seasonal lines go, a safety line stays, never a card.
  assert.equal(at(iso, { status: { mode: "fail" } }).variant, "evergreen");
  assert.equal(at(iso, { status: { mode: "fail" } }).dialog, null);
  assert.equal(
    at("2027-06-20T10:00:00+03:00", { status: { mode: "fail" } }).variant,
    "safety-summer-2027",
    "a safety line is not a promotion — it survives a failed read",
  );
});

test("page exclusion, no-interstitial pages and dismissal", () => {
  const iso = "2026-12-06T10:00:00+02:00";
  assert.equal(
    at(iso, { pageKind: "emergency" }).variant,
    "winter-battery",
    "excluded window falls through to the next",
  );
  assert.equal(at(iso, { pageKind: "location" }).dialog, "hanukkah-travel-2026");
  assert.equal(at(iso, { pageKind: "location", noInterstitial: true }).dialog, null);
  const d = at(iso, { dismissed: ["hanukkah-travel-2026"] });
  assert.equal(d.variant, "evergreen");
  assert.equal(d.reason, "dismissed:hanukkah-travel-2026");
});

test("offsets, not the visitor's clock: the DST nights compare correctly", () => {
  // Israel leaves DST at 02:00 on 2026-10-25 (+03:00 → +02:00). The same instant written both ways:
  assert.equal(toMs("2026-10-25T01:30:00+03:00"), toMs("2026-10-25T00:30:00+02:00"));
  assert.equal(
    toMs("2026-10-25T02:00:00+03:00") - toMs("2026-10-25T01:00:00+03:00"),
    HOUR,
  );
  // And back into DST on 2027-03-26.
  assert.equal(toMs("2027-03-26T02:00:00+02:00"), toMs("2027-03-26T03:00:00+03:00"));
  // A window straddling the change is exactly its wall-clock length in absolute time.
  const w = { from: "2026-10-24T23:00:00+03:00", until: "2026-10-25T03:00:00+02:00" };
  assert.equal(toMs(w.until) - toMs(w.from), 5 * HOUR);
});

test("date-only, offset-less or out-of-range bounds are rejected, never guessed", () => {
  // Accepted forms, so the negative cases below are tests of the ranges, not of the shape.
  assert.equal(typeof toMs("2026-10-05T12:00+03:00"), "number"); // seconds optional
  assert.equal(typeof toMs("2026-10-05T12:00:00Z"), "number");
  for (const bad of [
    "2026-10-05",
    "2026-10-05T12:00:00",
    "2026-10-05 12:00",
    "2026-13-01T00:00:00+02:00", // month 13 — V8 gives NaN
    "2026-12-03T24:00:00+02:00", // hour 24 — V8 would roll it into the next day
    "2026-12-03T12:60:00+02:00", // minute 60
    "2026-12-03T12:00:00+15:00", // no such offset
    "2026-12-00T12:00:00+02:00", // day 0
    "",
    undefined,
    // (An epoch-ms NUMBER is accepted: that is what lib/live/compile.mjs hands the resolver
    // after expanding a `during` window. An authored number never gets this far —
    // check-campaigns requires every authored bound to be an ISO string.)
  ]) {
    assert.throws(() =>
      resolve(
        {
          windows: [
            {
              id: "x",
              kind: "seasonal",
              priority: 1,
              from: bad,
              until: "2026-10-06T12:00:00+03:00",
              topbar: { text: "x" },
            },
          ],
        },
        "2026-10-05T13:00:00+03:00",
      ),
    );
  }
});

// ---------------------------------------------------------------------------------------
// the compiled schedule and the script that ships
// ---------------------------------------------------------------------------------------

/** Which variant the compiled interval list shows at `ms` — the lookup the head script does. */
function lookup(intervals, ms) {
  for (const iv of intervals) if (iv.from <= ms && ms < iv.until) return iv.variant;
  return "evergreen";
}

/**
 * The inline <head> script, run for real: the exact text app/layout.tsx prints, inside a VM with
 * just enough of a browser for it. `at(ms)` moves its clock and re-runs it the way a `pageshow`
 * does, returning what it wrote on <html>; `state.css` is what it wrote into its <style>.
 */
function bootHeadScript(intervals, search = "", { storage = null, now = 0 } = {}) {
  const state = {
    now,
    attr: null,
    css: null,
    listeners: {},
    docListeners: {},
    attrs: {},
    resizes: 0,
    timer: null,
  };
  const style = {
    set textContent(v) {
      state.css = v;
    },
  };
  const sandbox = {
    document: {
      documentElement: {
        setAttribute: (k, v) => {
          state.attrs[k] = String(v);
          if (k === "data-live") state.attr = v;
        },
        getAttribute: (k) => (k in state.attrs ? state.attrs[k] : null),
      },
      head: { appendChild() {} },
      createElement: () => style,
      addEventListener: (type, fn) => {
        state.docListeners[type] = fn;
      },
      hidden: false,
    },
    location: { search },
    addEventListener: (type, fn) => {
      state.listeners[type] = fn;
    },
    Date: { now: () => state.now, parse: Date.parse },
    dispatchEvent: (e) => {
      if (e.type === "resize") state.resizes += 1;
    },
    Event: class {
      constructor(type) {
        this.type = type;
      }
    },
    Math,
    setTimeout: (fn, ms) => {
      state.timer = { fn, ms };
      return 1;
    },
    clearTimeout: () => {
      state.timer = null;
    },
    parseInt,
    isNaN,
    decodeURIComponent,
  };
  if (storage) sandbox.localStorage = { getItem: (k) => storage[k] ?? null };
  vm.runInNewContext(liveHeadScript(intervals), sandbox);
  return {
    at(ms) {
      state.now = ms;
      state.listeners.pageshow();
      return state.attr;
    },
    /** What live.js does with the switch's answer: set the mode, fire `live-mode`. */
    mode(m) {
      state.attrs["data-live-mode"] = m;
      state.docListeners["live-mode"]();
      return state.attr;
    },
    /** Let the armed timer fire, as the browser would at that moment. */
    tick() {
      const t = state.timer;
      if (!t) return null;
      state.now += t.ms;
      state.timer = null;
      t.fn();
      return state.attr;
    },
    state,
  };
}

/** Every hour of [start, end) plus one minute either side of every boundary. */
function* probes(intervals, start, end, extra = []) {
  for (let ms = start; ms < end; ms += HOUR) yield ms;
  for (const iv of intervals) {
    for (const edge of [iv.from, iv.until]) yield* [edge - 60_000, edge, edge + 60_000];
  }
  for (const ms of extra) yield* [ms - 60_000, ms, ms + 60_000];
}

test("`during` fans one authored window out over the calendar, inside its bounds only", () => {
  const calendar = [
    {
      id: "pre-1",
      kind: "pre-shabbat",
      from: "2026-10-01T17:00:00+03:00",
      until: "2026-10-02T14:00:00+03:00",
    },
    {
      id: "pre-2",
      kind: "pre-shabbat",
      from: "2026-10-08T17:00:00+03:00",
      until: "2026-10-09T14:00:00+03:00",
    },
    {
      id: "pre-3",
      kind: "pre-shabbat",
      from: "2026-10-15T17:00:00+03:00",
      until: "2026-10-16T14:00:00+03:00",
    },
    {
      id: "shabbat-3",
      kind: "shabbat",
      from: "2026-10-16T13:00:00+03:00",
      until: "2026-10-17T19:00:00+03:00",
    },
  ];
  const windows = [
    {
      id: "weekly",
      kind: "seasonal",
      during: "pre-shabbat",
      from: "2026-10-08T00:00:00+03:00",
      priority: 5,
      topbar: { text: "x" },
    },
  ];
  const concrete = expand(windows, calendar);
  assert.deepEqual(
    concrete.map((w) => w.id),
    ["weekly@pre-2", "weekly@pre-3"],
    "the window before `from` is not expanded",
  );
  assert.ok(concrete.every((w) => w.variant === "weekly"));
  const intervals = compile(windows, calendar);
  assert.equal(intervals.length, 2);
  assert.equal(
    intervals[1].until,
    toMs("2026-10-16T13:00:00+03:00"),
    "a quiet window that starts inside a repetition cuts it short",
  );
  assert.deepEqual([...winners(windows, calendar)], ["weekly"]);
});

test("the compiled schedule agrees with the resolver — fixtures, every hour and every boundary", () => {
  const intervals = compile(F.windows, F.calendar);
  const concrete = { windows: expand(F.windows, F.calendar), calendar: F.calendar };
  const start = toMs("2026-10-01T00:00:00+03:00");
  const end = toMs("2027-10-01T00:00:00+03:00");
  const quietEdges = F.calendar.flatMap((c) => [toMs(c.from), toMs(c.until)]);
  let n = 0;
  for (const ms of probes(intervals, start, end, quietEdges)) {
    assert.equal(
      lookup(intervals, ms),
      resolve(concrete, ms).variant,
      `compiled ≠ resolved at ${new Date(ms).toISOString()}`,
    );
    n += 1;
  }
  assert.ok(n > 8000);
  // Disjoint, sorted, merged — the shape the packer relies on.
  for (let i = 1; i < intervals.length; i += 1) {
    const prev = intervals[i - 1];
    const next = intervals[i];
    assert.ok(prev.until <= next.from, "intervals overlap or are unsorted");
    assert.ok(
      prev.until < next.from || prev.variant !== next.variant,
      "adjacent intervals of one variant were not merged",
    );
  }
});

test("pack → unpack returns the same schedule", () => {
  const intervals = compile(F.windows, F.calendar);
  assert.deepEqual(unpackSchedule(packSchedule(intervals)), intervals);
  assert.deepEqual(packSchedule([]), { variants: [], base: 0, packed: "" });
  assert.throws(
    () => packSchedule([{ variant: "x", from: 30_000, until: 90_000 }]),
    /minute-aligned/,
    "a bound that is not on a whole minute cannot be packed losslessly",
  );
  assert.throws(
    () => packSchedule([{ variant: 'x"]{}', from: 0, until: 60_000 }]),
    /variant id/,
  );
});

test("the shipped <head> script picks the resolver's variant — run in a VM, fixtures", () => {
  const intervals = compile(F.windows, F.calendar);
  const concrete = { windows: expand(F.windows, F.calendar), calendar: F.calendar };
  const page = bootHeadScript(intervals);
  const start = toMs("2026-10-01T00:00:00+03:00");
  const end = toMs("2027-10-01T00:00:00+03:00");
  for (const ms of probes(intervals, start, end)) {
    assert.equal(
      page.at(ms),
      resolve(concrete, ms).variant,
      `head script ≠ resolver at ${new Date(ms).toISOString()}`,
    );
  }
  // The rule it writes: reveal the variant, hide the evergreen line that follows it.
  page.at(toMs("2026-12-06T10:00:00+02:00"));
  assert.equal(
    page.state.css,
    '.live-topbar__item[data-campaign="hanukkah-travel-2026"]{display:flex!important}' +
      '.live-topbar__item[data-campaign="hanukkah-travel-2026"]~[data-campaign="evergreen"]{display:none}',
  );
  page.at(toMs("2026-10-01T10:00:00+03:00"));
  assert.equal(page.state.css, "", "evergreen needs no rule — it is the static default");
});

test("the status switch outranks the calendar in the shipped <head> script — every hour, every mode", () => {
  const intervals = compile(F.windows, F.calendar);
  const concrete = { windows: expand(F.windows, F.calendar), calendar: F.calendar };
  const start = toMs("2026-10-01T00:00:00+03:00");
  const end = toMs("2027-10-01T00:00:00+03:00");
  for (const mode of ["normal", "quiet", "reduced", "off", "fail"]) {
    const page = bootHeadScript(intervals);
    page.mode(mode);
    for (const ms of probes(intervals, start, end)) {
      const want = resolve(concrete, ms, { status: { mode } }).variant;
      assert.equal(
        page.at(ms),
        want === null ? "off" : want, // the resolver's "hide" is the attribute "off"
        `mode ${mode}: head script ≠ resolver at ${new Date(ms).toISOString()}`,
      );
    }
  }
});

test("the switch's mode: applied before first paint from the cache or ?mode=, and live", () => {
  const intervals = compile(F.windows, F.calendar);
  const hanukkah = toMs("2026-12-06T10:00:00+02:00");
  const boot = (search, storage) =>
    bootHeadScript(intervals, search, { storage, now: hanukkah });
  const future = String(hanukkah + 60_000);
  const past = String(hanukkah - 1);
  const H = "hanukkah-travel-2026";
  assert.equal(boot("", {}).state.attr, H, "no cache: the calendar");
  assert.equal(boot("", { "ls-status": `quiet,${future}` }).state.attr, "evergreen");
  assert.equal(boot("", { "ls-status": `off,${future}` }).state.attr, "off");
  assert.equal(
    boot("", { "ls-status": `off,${future}` }).state.css,
    "",
    "off writes no rule",
  );
  assert.equal(boot("", { "ls-status": `reduced,${future}` }).state.attr, "reduced");
  assert.match(
    boot("", { "ls-status": `reduced,${future}` }).state.css,
    /data-campaign="reduced"/,
  );
  assert.equal(boot("", { "ls-status": `fail,${future}` }).state.attr, "evergreen");
  assert.equal(
    boot("", { "ls-status": `quiet,${past}` }).state.attr,
    H,
    "an expired cache is ignored",
  );
  for (const junk of [
    "normal,9e15",
    "evil,9e15",
    "quiet",
    "quiet,abc",
    "x><y,9e15",
    "",
  ]) {
    assert.equal(
      boot("", { "ls-status": junk }).state.attr,
      H,
      `cache "${junk}" must be ignored`,
    );
  }
  assert.equal(
    boot("?mode=reduced", { "ls-status": `quiet,${future}` }).state.attr,
    "reduced",
    "a preview beats the cache",
  );
  assert.equal(boot("?mode=garbage", {}).state.attr, H, "an unknown preview is ignored");
  assert.equal(boot("?mode=offline", {}).state.attr, H, "a prefix is not a mode");
  // Without localStorage at all (a locked-down WebView), the script still runs.
  assert.equal(bootHeadScript(intervals, "", { now: hanukkah }).state.attr, H);
  // Back/forward cache: a page restored after a later page cached "off" picks it up on pageshow.
  const store = {};
  const restored = boot("", store);
  assert.equal(restored.state.attr, H);
  store["ls-status"] = `off,${future}`;
  assert.equal(
    restored.at(hanukkah),
    "off",
    "a restored page applies the newer cached mode",
  );
  // Live: the switch's answer re-picks, and a changed line asks the theme to re-measure.
  const page = boot("", {});
  const before = page.state.resizes;
  assert.equal(page.mode("off"), "off");
  assert.equal(page.state.resizes, before + 1);
  assert.equal(page.mode("normal"), H);
  assert.equal(page.mode("normal"), H);
  assert.equal(page.state.resizes, before + 2, "no re-measure when nothing changed");
});

test("?at= overrides the clock; garbage falls back to the clock; an empty schedule is evergreen", () => {
  const intervals = compile(F.windows, F.calendar);
  const hanukkah = bootHeadScript(intervals, "?at=2026-12-06T10:00:00%2B02:00");
  assert.equal(hanukkah.at(toMs("2026-10-01T10:00:00+03:00")), "hanukkah-travel-2026");
  const plain = bootHeadScript(intervals, "?utm_source=x&at=2026-12-06T10:00:00+02:00");
  assert.equal(
    plain.at(0),
    "hanukkah-travel-2026",
    "an unencoded + is a plus, not a space",
  );
  const shabbat = bootHeadScript(intervals, "?at=2026-12-05T10:00:00%2B02:00");
  assert.equal(shabbat.at(toMs("2026-12-06T10:00:00+02:00")), "evergreen");
  const garbage = bootHeadScript(intervals, "?at=%E0%A4%A");
  assert.equal(garbage.at(toMs("2026-12-06T10:00:00+02:00")), "hanukkah-travel-2026");
  const nonsense = bootHeadScript(intervals, "?at=tomorrow");
  assert.equal(nonsense.at(toMs("2026-10-01T10:00:00+03:00")), "evergreen");
  assert.equal(bootHeadScript([]).at(Date.now()), "evergreen");
});

test("a line that changes while the page is open asks the theme to re-measure the header", () => {
  // nav.js writes the header's padding once, at load, and again only on `resize`. A bar that
  // opens on a phone mid-visit would otherwise sit on top of the first 34px of the page.
  const page = bootHeadScript(compile(F.windows, F.calendar));
  page.at(toMs("2026-10-01T10:00:00+03:00")); // evergreen
  page.at(toMs("2026-10-01T11:00:00+03:00")); // still evergreen
  assert.equal(page.state.resizes, 0, "no change, no resize — including the first run");
  page.at(toMs("2026-12-06T10:00:00+02:00")); // Hanukkah opens
  assert.equal(page.state.resizes, 1);
  page.at(toMs("2026-12-06T11:00:00+02:00")); // same line
  assert.equal(page.state.resizes, 1);
  page.at(toMs("2026-12-05T10:00:00+02:00")); // Shabbat — back to evergreen
  assert.equal(page.state.resizes, 2);
});

test("a visible tab re-checks at the next boundary on its own — one timer, re-armed each run", () => {
  const intervals = compile(F.windows, F.calendar);
  const page = bootHeadScript(intervals);
  // Shabbat inside Hanukkah: evergreen now, the Hanukkah line returns when havdalah ends.
  const havdalah = toMs("2026-12-05T21:00:00+02:00");
  page.at(havdalah - 2 * HOUR);
  assert.equal(page.state.attr, "evergreen");
  assert.ok(page.state.timer, "a timer is armed");
  assert.equal(
    page.state.now + page.state.timer.ms,
    havdalah + 1000,
    "it fires one second past the boundary",
  );
  assert.equal(page.tick(), "hanukkah-travel-2026");
  assert.equal(page.state.resizes, 1, "and nudges nav.js");
  assert.ok(page.state.timer, "the next boundary is armed in turn");
  // No timer under ?at= (a preview is a frozen instant), none after the last interval.
  const frozen = bootHeadScript(intervals, "?at=2026-12-06T10:00:00%2B02:00");
  frozen.at(0);
  assert.equal(frozen.state.timer, null);
  const late = bootHeadScript(intervals);
  late.at(toMs("2028-01-01T10:00:00+02:00"));
  assert.equal(late.state.timer, null);
  // Forty days before the first interval the delay is clamped to what setTimeout can hold.
  const early = bootHeadScript(intervals);
  early.at(toMs("2026-01-01T10:00:00+02:00"));
  assert.equal(early.state.timer.ms, 2147483647);
});

test("live regions are cut from the raw body — nested once, siblings both; edits outside still count", () => {
  const nested =
    "<header><div data-lm-ignore data-nosnippet>OUT1<span data-lm-ignore>INNER</span>OUT2</div>AFTER-0123456789-AFTER</header><main>body</main>";
  assert.equal(
    withoutLiveRegions(nested),
    "<header>AFTER-0123456789-AFTER</header><main>body</main>",
    "a region inside a region is cut once, with its parent — never the bytes after it",
  );
  const siblings = "<p data-lm-ignore>a</p><p>keep</p><p data-lm-ignore>b</p>";
  assert.equal(withoutLiveRegions(siblings), "<p>keep</p>");
  assert.equal(withoutLiveRegions("<p>no regions</p>"), "<p>no regions</p>");
  const SITE = join(ROOT, "content", "site.json");
  if (!existsSync(SITE)) return;
  const home = JSON.parse(readFileSync(SITE, "utf8")).pages.find((p) => p.isFront);
  const before = withoutLiveRegions(home.bodyHtml);
  assert.ok(!before.includes("data-campaign"), "no line survives the cut");
  assert.ok(before.includes("nav-main__top-bar"), "the slot around the region survives");
  const reworded = home.bodyHtml.replace(
    /live-topbar__text">[^<]*/,
    'live-topbar__text">REWORDED',
  );
  assert.notEqual(reworded, home.bodyHtml);
  assert.equal(
    withoutLiveRegions(reworded),
    before,
    "rewording a line leaves the fingerprint alone",
  );
  const edited = home.bodyHtml.replace("<main", "<main data-edited");
  assert.notEqual(
    withoutLiveRegions(edited),
    before,
    "an edit outside the region still moves it",
  );
});

test("the claim patterns catch the wordings that once slipped through", () => {
  // Found by mutation-testing the gate on 2026-09-30. Every one of these must stay ⛔.
  for (const bad of [
    "מבצע: שכפול מפתח שני",
    "מבצע חנוכה על צילינדרים",
    "מבצעי החורף כבר כאן",
    "שכפול מפתח ₪250",
    "סוללה לשלט ב-5 ₪",
    "עד 30 דקות ואנחנו אצלכם",
    "אצלכם תוך חצי שעה",
    "הגעה ב-20 דק׳ לכל מקום",
    "20 דקות וטכנאי בדרך",
    "המחיר הזול בעיר, מובטח",
    "1+1 על שכפול מפתחות",
    "מפתח שני בחצי מחיר",
    "רק מאה שקלים למפתח",
    "עד סוף השבוע בלבד",
    "אחריות לשנה על כל צילינדר",
    "20% הנחה",
    "תוך 20 דקות",
    "250 ₪",
    "טכנאי זמין באזורך",
    "אלפי לקוחות מרוצים",
  ]) {
    assert.ok(findClaim(bad, true), `not caught: "${bad}"`);
  }
  // And the lines that ship must not be.
  for (const good of [
    "שני מפתחות הרכב בצרור אחד? זה לא גיבוי למדריך",
    "השלט מגיב לאט בקור? סימן לסוללה חלשה למדריך",
    "נוסעים בחנוכה? השאירו מפתח אצל אדם אמין למדריך",
    "ניקיון לפסח? לצילינדר גרפיט, לא שמן מזון פרטים",
    "ילד או בעל חיים ברכב נעול? חייגו 100/101 פרטים",
    "מעדיפים לכתוב ולא להתקשר? שלחו לנו הודעת וואטסאפ",
  ]) {
    assert.equal(findClaim(good, true), null, `false positive: "${good}"`);
  }
  // Calendar labels see the base list only: an overlay day may be named after an operation.
  assert.equal(findClaim("מבצע חרבות ברזל"), null);
});

// ---------------------------------------------------------------------------------------
// public/assets/live.js — the card's visit rules and the strip's 45-day decay
// ---------------------------------------------------------------------------------------

/** The shipped file, run in a VM with its test hook, so the rules tested are the rules served. */
function liveJsRules() {
  const hook = {};
  const window = { __liveTest: hook };
  vm.runInNewContext(readFileSync(join(ROOT, "public", "assets", "live.js"), "utf8"), {
    window,
    document: {},
    Date,
    isNaN,
    parseInt,
  });
  return hook;
}

test("live.js: when the card may open — and every case where it must not", () => {
  const { rules } = liveJsRules();
  const DAY = 86_400_000;
  const base = {
    hasDialog: true,
    storageOk: true,
    lastShown: 0,
    capDays: 14,
    now: 1_800_000_000_000,
    pageviews: 1,
    fromSearch: false,
  };
  assert.equal(rules(base), "engaged", "first page, not from search: 20 s and a scroll");
  assert.equal(rules({ ...base, pageviews: 2 }), "soon", "second page of a visit");
  assert.equal(
    rules({ ...base, fromSearch: true }),
    "none",
    "never the first page from a search engine",
  );
  assert.equal(
    rules({ ...base, fromSearch: true, pageviews: 2 }),
    "none",
    "a search landing at ANY page view — back to the results and in again, or a reload",
  );
  assert.equal(
    rules({ ...base, storageOk: false, pageviews: 3 }),
    "none",
    "no storage, no card — the cap could not hold",
  );
  assert.equal(rules({ ...base, hasDialog: false, pageviews: 3 }), "none");
  assert.equal(
    rules({ ...base, pageviews: 3, lastShown: base.now - 13 * DAY }),
    "none",
    "inside the 14-day cap",
  );
  assert.equal(
    rules({ ...base, pageviews: 3, lastShown: base.now - 15 * DAY }),
    "soon",
    "after the cap",
  );
  assert.equal(
    rules({ ...base, pageviews: 3, capDays: 30, lastShown: base.now - 15 * DAY }),
    "none",
    "data-cap-days is honoured",
  );
});

test("live.js: the updates strip hides when its newest item is 45 days old (Israel date)", () => {
  const { stale } = liveJsRules();
  const at = (iso) => Date.parse(iso);
  assert.equal(
    stale("2026-09-02", at("2026-10-17T00:00:00+03:00")),
    false,
    "45 days exactly: still shown",
  );
  assert.equal(
    stale("2026-09-02", at("2026-10-17T00:00:01+03:00")),
    true,
    "past 45 days: hidden",
  );
  assert.equal(
    stale("not-a-date", at("2026-10-01T00:00:00+03:00")),
    true,
    "a broken date hides, never shows forever",
  );
});

test("live.js: which referrers count as a search engine", () => {
  const { fromSearch } = liveJsRules();
  for (const ref of [
    "https://www.google.com/",
    "https://www.google.co.il/",
    "http://www.google.com/",
    "https://www.bing.com/search?q=x",
    "https://duckduckgo.com/",
    "android-app://com.google.android.googlequicksearchbox/",
    "android-app://com.google.android.gm/",
  ]) {
    assert.equal(fromSearch(ref), true, `not treated as search: ${ref}`);
  }
  for (const ref of [
    "",
    "https://3locksmiths.co.il/services/",
    "https://www.facebook.com/",
    "https://googleblog.example/",
  ]) {
    assert.equal(fromSearch(ref), false, `treated as search: ${ref}`);
  }
});

test("pages that tell the reader to call 100/101 never carry a card — detected from the text", () => {
  const page = (t) => ({ id: 1, path: "/x/", bodyHtml: `<p>${t}</p>` });
  for (const t of [
    "חייגו ל-100 או ל-101 מיד",
    "100 / 101",
    "100/101",
    "התקשרו קודם כול ל-100 או ל-101",
    "למשטרה במספר 100",
    "100 או לכבאות והצלה 102",
  ]) {
    assert.equal(hasEmergencyNumbers(page(t)), true, `missed: ${t}`);
    assert.equal(allowsDialog(page(t)), false);
  }
  for (const t of [
    "מחיר: 100 ₪ עד 101 ₪",
    "100 ש״ח או 101 ש״ח",
    "שנת 2010 ו-2011",
    "דגם 1001",
  ]) {
    assert.equal(hasEmergencyNumbers(page(t)), false, `false positive: ${t}`);
  }
  assert.equal(
    allowsDialog({ id: 9301, path: "/services/x/", bodyHtml: "" }),
    false,
    "calm",
  );
  assert.equal(
    allowsDialog({ id: 9003, path: "/accessibility-statement/", bodyHtml: "" }),
    false,
    "legal",
  );
  assert.equal(allowsDialog({ id: 1, path: "/x/", bodyHtml: "<p>שלום</p>" }), true);
});

test("live.js: the status switch's answer can only pick one of five ids", () => {
  const { parseStatus } = liveJsRules();
  const now = Date.parse("2026-10-04T12:00:00+03:00");
  const MIN = 60_000;
  const p = (o) => ({
    ...parseStatus(typeof o === "string" ? o : JSON.stringify(o), now),
  });
  assert.deepEqual(p({ mode: "normal" }), { mode: "normal", hold: 0 });
  for (const mode of ["quiet", "reduced", "off"]) {
    assert.deepEqual(p({ mode }), { mode, hold: 30 * MIN });
    assert.deepEqual(p({ mode, until: null, note: "x" }), { mode, hold: 30 * MIN });
  }
  assert.deepEqual(
    p({ mode: "quiet", until: "2026-10-04T12:10:00+03:00" }),
    { mode: "quiet", hold: 10 * MIN },
    "the cache never outlives the switch's own until",
  );
  assert.deepEqual(
    p({ mode: "off", until: "2026-10-04T11:59:00+03:00" }),
    { mode: "normal", hold: 0 },
    "a lapsed override is normal again",
  );
  for (const bad of [
    "",
    "not json",
    "null",
    "[]",
    '"quiet"',
    { mode: "QUIET" },
    { mode: "evergreen" },
    { mode: "fail" },
    { mode: "<b>x</b>" },
    { mode: ["quiet"] },
    { mode: "toString" },
    { mode: "__proto__" },
    { mode: "quiet", until: "2026-10-05" },
    { mode: "quiet", until: "2026-10-05T10:00:00" },
    { mode: "quiet", until: 1791000000000 },
    { mode: "quiet", until: "2026-13-45T10:00:00+03:00" },
  ]) {
    assert.deepEqual(
      p(bad),
      { mode: "fail", hold: 5 * MIN },
      `must fail closed: ${JSON.stringify(bad)}`,
    );
  }
});

/**
 * The shipped live.js, run for real (no test hook) against a fake browser: a scripted fetch, a
 * clock, storage, timers and — optionally — a card. Returns the page's state and a way to fire
 * the timers it armed, so the fail-closed wiring is tested, not just parseStatus.
 */
function bootLiveJs({
  fetch,
  cache = null,
  search = "",
  dialog = null,
  pv = 0,
  now = 1_000_000,
}) {
  const attrs = { "data-live": dialog ? dialog.variant : "evergreen" };
  const store = cache ? { "ls-status": cache } : {};
  const session = { "ls-pv": String(pv) };
  const timers = [];
  const events = [];
  let fetched = 0;
  let shown = 0;
  const dlg = dialog && {
    open: false,
    returnValue: "",
    getAttribute: (k) => (k === "data-cap-days" ? "14" : null),
    addEventListener() {},
    showModal() {
      shown += 1;
      this.open = true;
    },
    close() {
      this.open = false;
    },
  };
  const document = {
    documentElement: {
      getAttribute: (k) => (k in attrs ? attrs[k] : null),
      setAttribute: (k, v) => {
        attrs[k] = String(v);
      },
    },
    querySelector: (sel) => (dlg && sel.indexOf("dialog.live-dialog") === 0 ? dlg : null),
    dispatchEvent: (e) => events.push(e.type),
    addEventListener() {},
    hidden: false,
    activeElement: null,
    referrer: "",
  };
  const mkStorage = (o) => ({
    getItem: (k) => (k in o ? o[k] : null),
    setItem: (k, v) => {
      o[k] = String(v);
    },
    removeItem: (k) => {
      delete o[k];
    },
  });
  const window = {
    localStorage: mkStorage(store),
    sessionStorage: mkStorage(session),
    fetch:
      fetch &&
      ((...a) => {
        fetched += 1;
        return fetch(...a);
      }),
    addEventListener() {},
    innerHeight: 800,
    pageYOffset: 0,
  };
  vm.runInNewContext(readFileSync(join(ROOT, "public", "assets", "live.js"), "utf8"), {
    window,
    document,
    location: { search },
    Date: { now: () => now, parse: Date.parse },
    Event: class {
      constructor(type) {
        this.type = type;
      }
    },
    setTimeout: (fn, ms) => timers.push({ fn, ms }) && timers.length,
    clearTimeout: (i) => {
      if (timers[i - 1]) timers[i - 1].fn = () => {};
    },
    JSON,
    Object,
    Number,
    Math,
    Error,
    parseInt,
    isNaN,
  });
  return {
    attrs,
    store,
    events,
    get fetched() {
      return fetched;
    },
    get shown() {
      return shown;
    },
    fire(ms) {
      for (const t of timers.splice(0))
        if (t.ms === ms) t.fn();
        else timers.push(t);
    },
  };
}
const flush = () => new Promise((r) => setImmediate(r));
const ok = (body) => () =>
  Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(body) });

test("live.js: the switch's wiring fails closed — slow, broken, missing — and keeps a valid cached mode", async () => {
  const later = String(1_000_000 + 600_000);
  // a good answer: applied, cached (or uncached for normal), and the head script told
  for (const [body, mode, cached] of [
    ['{"mode":"off"}', "off", true],
    ['{"mode":"quiet","until":null}', "quiet", true],
    ['{"mode":"normal"}', "normal", false],
    ["<html>404 page</html>", "fail", true],
  ]) {
    const p = bootLiveJs({ fetch: ok(body), cache: `reduced,${later}` });
    await flush();
    await flush();
    assert.equal(p.attrs["data-live-mode"], mode, body);
    assert.equal("ls-status" in p.store, cached, `cache after ${body}`);
    if (cached) assert.match(p.store["ls-status"], new RegExp(`^${mode},\\d+$`));
    assert.ok(p.events.includes("live-mode"));
  }
  const never = () => new Promise(() => {});
  const reject = () => Promise.reject(new TypeError("Failed to fetch"));
  const notOk = () =>
    Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve("") });
  // no answer, nothing cached: fail closed (a timeout is not carried to the next page)
  let p = bootLiveJs({ fetch: never });
  p.fire(1500);
  assert.equal(p.attrs["data-live-mode"], "fail");
  assert.equal("ls-status" in p.store, false, "a slow read is not remembered");
  for (const bad of [reject, notOk]) {
    p = bootLiveJs({ fetch: bad });
    await flush();
    await flush();
    assert.equal(p.attrs["data-live-mode"], "fail");
    assert.match(
      p.store["ls-status"] ?? "",
      /^fail,\d+$/,
      "a broken read is remembered briefly",
    );
  }
  p = bootLiveJs({ fetch: undefined });
  assert.equal(p.attrs["data-live-mode"], "fail", "no fetch at all");
  // no answer, but the switch said off / reduced / quiet a few minutes ago: keep it
  for (const mode of ["off", "reduced", "quiet"]) {
    for (const bad of [never, reject, notOk, undefined]) {
      p = bootLiveJs({ fetch: bad, cache: `${mode},${later}` });
      p.fire(1500);
      await flush();
      await flush();
      assert.equal(
        p.attrs["data-live-mode"],
        mode,
        `cached ${mode} must survive a failed read`,
      );
      assert.match(p.store["ls-status"] ?? "", new RegExp(`^${mode},`));
    }
  }
  // …unless it has expired, or it is a cached "fail"
  p = bootLiveJs({ fetch: never, cache: "off,999999" });
  p.fire(1500);
  assert.equal(p.attrs["data-live-mode"], "fail", "an expired cache is not a guess");
  // a late answer still counts
  let release;
  p = bootLiveJs({
    fetch: () =>
      new Promise((r) => {
        release = () =>
          r({ ok: true, status: 200, text: () => Promise.resolve('{"mode":"normal"}') });
      }),
  });
  p.fire(1500);
  assert.equal(p.attrs["data-live-mode"], "fail");
  release();
  await flush();
  await flush();
  assert.equal(p.attrs["data-live-mode"], "normal", "the answer after the timeout wins");
  // a preview never reads the switch
  p = bootLiveJs({ fetch: ok('{"mode":"off"}'), search: "?mode=quiet" });
  assert.equal(p.fetched, 0);
});

test("live.js: the card opens only after the switch said normal on this page view", async () => {
  const dialog = { variant: "hanukkah" };
  for (const [fetch, wantOpen] of [
    [ok('{"mode":"normal"}'), 1],
    [ok('{"mode":"quiet"}'), 0],
    [ok("garbage"), 0],
    [() => Promise.reject(new TypeError("x")), 0],
    [() => new Promise(() => {}), 0],
  ]) {
    const p = bootLiveJs({ fetch, dialog, pv: 1 }); // this is the 2nd page view → "soon", 4 s
    await flush();
    await flush();
    p.fire(1500);
    p.fire(4000);
    assert.equal(p.shown, wantOpen, `card with switch answer ${fetch}`);
  }
});

test("live.js carries no copy, and its one network read is the status switch", () => {
  const src = readFileSync(join(ROOT, "public", "assets", "live.js"), "utf8");
  assert.doesNotMatch(
    src,
    /[֐-׿]|\\u05[89a-f]/i,
    "a Hebrew letter (or its escape) in live.js — copy belongs in the page HTML",
  );
  assert.doesNotMatch(
    src,
    /XMLHttpRequest|sendBeacon|innerHTML|outerHTML|insertAdjacentHTML|insertAdjacentText|textContent|innerText|createTextNode|document\.write|new Image|\.src\s*=|import\(|\beval\b|Function\(|postMessage|WebSocket|EventSource/,
    "live.js may only select and open what the page already holds",
  );
  assert.equal((src.match(/fetch\(/g) || []).length, 1, "exactly one fetch");
  assert.match(src, /w\.fetch\(STATUS_URL,/, "…and it reads the status switch");
  assert.deepEqual(
    [...src.matchAll(/"(https?:\/\/[^"]*)"/g)].map((m) => m[1]),
    ["https://imgquarry.com/status/fleet.json"],
    "the only URL in live.js is the switch",
  );
  assert.match(src, /credentials: "omit"/, "no cookies to the bucket");
});

// ---------------------------------------------------------------------------------------
// the real registers, if they exist
// ---------------------------------------------------------------------------------------

async function loadReal() {
  const schedule = { windows: [], calendar: [] };
  const camp = join(ENRICHED, "_campaigns.mjs");
  const cal = join(ENRICHED, "_calendar.json");
  if (existsSync(camp))
    schedule.windows = (await import(pathToFileURL(camp).href)).default?.windows ?? [];
  if (existsSync(cal))
    schedule.calendar = JSON.parse(readFileSync(cal, "utf8")).windows ?? [];
  return schedule;
}

const real = await loadReal();
const haveReal = real.windows.length > 0 || real.calendar.length > 0;

test(`real registers: ${haveReal ? `${real.windows.length} window(s), ${real.calendar.length} calendar window(s)` : "none yet"} — resolver, compiled schedule and head script agree on every hour of the next ${DAYS} days`, () => {
  if (!haveReal) return;
  const intervals = compile(real.windows, real.calendar);
  const concrete = {
    windows: expand(real.windows, real.calendar),
    calendar: real.calendar,
  };
  const page = bootHeadScript(intervals);
  const start = Date.now();
  const quietEdges = real.calendar
    .filter((c) => QUIET_KINDS.includes(c.kind))
    .flatMap((c) => [toMs(c.from), toMs(c.until)]);
  let promos = 0;
  let instants = 0;
  for (const ms of probes(intervals, start, start + DAYS * 24 * HOUR, quietEdges)) {
    const d = resolve(concrete, ms);
    const when = new Date(ms).toISOString();
    const inHard = real.calendar.some(
      (c) =>
        HARD_QUIET_KINDS.includes(c.kind) && toMs(c.from) <= ms && ms < toMs(c.until),
    );
    const inQuiet = real.calendar.some(
      (c) => QUIET_KINDS.includes(c.kind) && toMs(c.from) <= ms && ms < toMs(c.until),
    );
    if (inHard) {
      assert.equal(d.variant, "evergreen", `"${d.variant}" on a quiet day at ${when}`);
    }
    if (inQuiet) {
      assert.ok(
        d.variant === "evergreen" || d.variant.startsWith("safety-"),
        `seasonal "${d.variant}" during Shabbat/chag at ${when}`,
      );
      assert.equal(d.dialog, null);
    }
    assert.equal(lookup(intervals, ms), d.variant, `compiled ≠ resolved at ${when}`);
    assert.equal(page.at(ms), d.variant, `head script ≠ resolver at ${when}`);
    instants += 1;
    if (d.variant !== "evergreen") promos += 1;
  }
  console.log(
    `  schedule: ${intervals.length} interval(s); ${promos} of ${instants} probed instants show a non-evergreen line`,
  );
});

test("what ships is what the registers compile to — the head script and the readable schedule", () => {
  const SITE = join(ROOT, "content", "site.json");
  const SCHEDULE = join(ROOT, "public", "assets", "live-schedule.json");
  if (!existsSync(SITE) || !existsSync(join(ENRICHED, "_campaigns.mjs"))) return;
  const intervals = compile(real.windows, real.calendar);
  const shipped = JSON.parse(readFileSync(SITE, "utf8")).assets?.liveHead;
  assert.equal(
    shipped,
    liveHeadScript(intervals),
    "content/site.json carries a stale head script — run `npm run enrich`",
  );
  assert.ok(
    existsSync(SCHEDULE),
    "public/assets/live-schedule.json is missing — run `npm run enrich`",
  );
  const readable = JSON.parse(readFileSync(SCHEDULE, "utf8"));
  assert.deepEqual(
    readable.intervals,
    intervals.map((iv) => ({
      variant: iv.variant,
      from: new Date(iv.from).toISOString(),
      until: new Date(iv.until).toISOString(),
    })),
    "public/assets/live-schedule.json is stale — run `npm run enrich`",
  );
  assert.match(
    readable.about,
    /Hebcal/,
    "the served schedule must carry the Hebcal credit",
  );
});
