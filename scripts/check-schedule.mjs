/**
 * The schedule simulator — runs lib/live/resolve.mjs over every hour of the next 400 days and
 * over fixed scenarios, so precedence bugs surface in `prebuild` rather than on Yom HaZikaron
 * eve (docs/dynamic-presence-plan.md §4.3; /israeli-calendar "Gates").
 *
 * Two layers:
 *   1. FIXTURES — hand-written windows that pin the contract: quiet beats seasonal, safety
 *      beats seasonal, priority ordering and its deterministic tie-break, status modes, page
 *      exclusion, dismissal, the DST nights (2026-10-25 and 2027-03-26) and the 5787 Adar I/II
 *      pair, and the rejection of date-only strings.
 *   2. THE REAL REGISTERS, when they exist — every hour for 400 days must resolve without
 *      throwing, and no seasonal variant may ever win during a calendar quiet window.
 *
 * Pure node:test + node:assert (CLAUDE.md §13: no dependency the platform already provides).
 * Reads the clock only to choose the 400-day span; it never touches content/site.json.
 *
 *   node scripts/check-schedule.mjs        (non-zero exit on any failing test)
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { QUIET_KINDS, resolve, toMs } from "../lib/live/resolve.mjs";

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
    1700000000000,
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

test(`real registers: ${haveReal ? `${real.windows.length} window(s), ${real.calendar.length} calendar window(s)` : "none yet"} — every hour of the next ${DAYS} days`, () => {
  if (!haveReal) return;
  const start = Date.now();
  let promos = 0;
  for (let h = 0; h < DAYS * 24; h += 1) {
    const ms = start + h * HOUR;
    const d = resolve(real, ms);
    const inQuiet = real.calendar.some(
      (c) => QUIET_KINDS.includes(c.kind) && toMs(c.from) <= ms && ms < toMs(c.until),
    );
    if (inQuiet) {
      assert.equal(
        d.variant,
        "evergreen",
        `promo "${d.variant}" during quiet window at ${new Date(ms).toISOString()}`,
      );
      assert.equal(d.dialog, null);
    }
    if (d.variant !== "evergreen") promos += 1;
  }
  console.log(
    `  schedule: ${promos} of ${DAYS * 24} simulated hours show a non-evergreen variant`,
  );
});
