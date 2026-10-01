/**
 * Generates `content/enriched/_calendar.json` — the Israeli calendar the live surfaces are
 * scheduled against (docs/dynamic-presence-plan.md §4.1; /israeli-calendar).
 *
 * ⚠️ NETWORKED AND HUMAN-RUN. NOT in `npm run enrich`, and it must never be: CI re-runs enrich
 * with no network and asserts content/site.json reproduces byte for byte. This is the same split
 * as the image pipeline (CLAUDE.md §6) — fetch and review by hand, commit the result, consume it
 * offline forever. The file it writes is read by scripts/live-surfaces.mjs and the check-* gates.
 *
 *   node scripts/calendar-sync.mjs            fetch, merge the overlay, verify, write the calendar
 *   node scripts/calendar-sync.mjs --check    same, but write nothing; exit 1 if the committed
 *                                             calendar differs from what the sources give today
 *   node scripts/calendar-sync.mjs --force    write even if some kind of window got FEWER
 *
 * SOURCES
 *   · Hebcal REST, Israel schedule (`i=on` — the default is the DIASPORA schedule, which moves
 *     Shmini Atzeret and the last day of Pesach by a day), with candle-lighting and havdalah times
 *     for Tel Aviv. Data is CC BY 4.0: the credit line is written into the output.
 *   · content/enriched/_calendar.overlay.json — hand-kept days Hebcal does not carry: the
 *     24 Tishrei memorial, 7 October, election days. The calendar is TRUNCATED at the overlay's
 *     `verifiedThrough`, so an un-maintained overlay cannot silently leave a memorial day
 *     unprotected — check-campaigns fails when the calendar runs short instead.
 *
 * WHAT IT EMITS — windows with explicit ISO offsets, never date-only strings:
 *   shabbat      candle-lighting − 60 min → havdalah + 30 min                       (quiet)
 *   chag         the same span when a yom-tov day falls inside it                   (quiet)
 *   quiet        Yom Kippur, Tisha B'Av, Yom HaShoah, Yom HaZikaron, Rabin day and the
 *                overlay's memorial days, from 12:00 on the eve; election day, all day (quiet)
 *   pre-shabbat  Thursday 17:00 → Friday 14:00 before each Shabbat                  (NOT quiet —
 *                a slot the weekly advice line can be scheduled `during`). It is emitted even
 *                when that Thursday is a quiet day or a chag: the compiler subtracts the quiet
 *                span, so the slot simply starts when the day ends. A Friday that is a chag
 *                (Shavuot 2027) has no slot at all.
 *   The minor fasts (10 Tevet, Ta'anit Esther, 17 Tammuz, Tzom Gedaliah) are NOT quiet — the
 *   owner's list (2026-09-29) names Yom Kippur and Tisha B'Av only — so `mf=off`.
 *
 * WHAT IT REFUSES TO WRITE. Hebcal has respelled titles before, and a feed that quietly lost a
 * memorial day would ship a green build with no protection. So before writing, the result must
 * hold: every Friday night inside a quiet window; the named days of every year present; no
 * diaspora-only day (proof that `i=on` was honoured); no span implausibly long; and never fewer
 * windows of any kind than the committed calendar has (unless --force).
 *
 * WHY NOT A LIBRARY. @hebcal/core is GPL-2.0 and 3.8 MB; nothing here needs more than the REST
 * data. WHY NOT Intl FOR THE OFFSETS. Israel's DST rule is two lines of arithmetic
 * (lib/live/israel-time.mjs, shared with the gate that checks authored bounds), and the result is
 * asserted against Intl below — two independent answers that must agree.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { isIsraelDst } from "../lib/live/israel-time.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "content", "enriched", "_calendar.json");
const OVERLAY = join(ROOT, "content", "enriched", "_calendar.overlay.json");
const CHECK_ONLY = process.argv.includes("--check");
const FORCE = process.argv.includes("--force");

/** Nothing before this matters to a site whose live surfaces ship in October 2026. A constant,
 *  not "today", so two runs on different days produce the same file from the same sources. */
const START = "2026-09-01";
const GEONAME_TEL_AVIV = 293397;
const MIN = 60_000;
const HOUR = 3_600_000;
const pad = (n) => String(n).padStart(2, "0");

const die = (msg) => {
  console.error(`calendar-sync: ${msg}`);
  process.exit(1);
};

/** "YYYY-MM-DD" + hour + minute in Israel local time → "YYYY-MM-DDTHH:MM:00+0X:00". */
function iso(date, hh, mm = 0) {
  const [y, m, d] = date.split("-").map(Number);
  const off = isIsraelDst(y, m, d, hh) ? 3 : 2;
  const s = `${date}T${pad(hh)}:${pad(mm)}:00+0${off}:00`;
  // Cross-check against the platform's tz database. A mismatch means the rule is wrong for this
  // date (a law change), and the calendar must not be written.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(s));
  const get = (t) => parts.find((p) => p.type === t).value;
  const back = `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  if (back !== `${date}T${pad(hh)}:${pad(mm)}`) {
    throw new Error(
      `calendar-sync: offset rule disagrees with Intl for ${s} (Intl says ${back})`,
    );
  }
  return s;
}
const addDays = (date, n) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const weekday = (date) => new Date(date + "T12:00:00Z").getUTCDay(); // 5 = Friday
/** Shift an ISO-with-offset instant by minutes, keeping its own offset. */
function shift(isoString, minutes) {
  const off = isoString.slice(-6);
  const sign = off[0] === "-" ? -1 : 1;
  const offMin = sign * (Number(off.slice(1, 3)) * 60 + Number(off.slice(4, 6)));
  const wall = new Date(Date.parse(isoString) + (minutes + offMin) * MIN);
  return wall.toISOString().slice(0, 19) + off;
}

// --- fetch -----------------------------------------------------------------------------------
if (!existsSync(OVERLAY)) die("content/enriched/_calendar.overlay.json is missing.");
const overlay = JSON.parse(readFileSync(OVERLAY, "utf8"));
const THROUGH = overlay.verifiedThrough;
if (!/^\d{4}-\d{2}-\d{2}$/.test(THROUGH ?? ""))
  die("the overlay needs `verifiedThrough` (YYYY-MM-DD).");

// One year past THROUGH as well: the Shabbat that begins on the last Friday of the range ends
// in the next year, and a candle-lighting without its havdalah is a Shabbat that never closes.
const years = [];
for (let y = Number(START.slice(0, 4)); y <= Number(THROUGH.slice(0, 4)) + 1; y++)
  years.push(y);

const params =
  "v=1&cfg=json&maj=on&min=on&mod=on&nx=off&mf=off&ss=off&s=off&i=on&lg=he&c=on&M=on" +
  `&geonameid=${GEONAME_TEL_AVIV}&month=x`;
const items = [];
for (const y of years) {
  const url = `https://www.hebcal.com/hebcal?${params}&year=${y}`;
  const res = await fetch(url);
  if (!res.ok) die(`Hebcal answered ${res.status} for ${y}.`);
  const json = await res.json();
  if (
    !/Israel|Tel Aviv/.test(json.title ?? "") ||
    json.location?.tzid !== "Asia/Jerusalem"
  ) {
    die(`unexpected Hebcal calendar "${json.title}" — refusing to use it.`);
  }
  if (!Array.isArray(json.items) || json.items.length < 100) {
    die(
      `Hebcal returned ${json.items?.length ?? "no"} items for ${y} — a full year has hundreds.`,
    );
  }
  items.push(...json.items);
}
items.sort(
  (a, b) => Date.parse(a.date) - Date.parse(b.date) || a.date.localeCompare(b.date),
);

// A diaspora-only day in the feed means `i=on` was not honoured, and every chag would be a day off.
const diaspora = items.find((it) =>
  /^(Pesach VIII|Shavuot II)$/.test(it.title_orig ?? ""),
);
if (diaspora)
  die(
    `the feed carries "${diaspora.title_orig}" — that is the diaspora schedule, not Israel's.`,
  );

// --- build -----------------------------------------------------------------------------------
const windows = [];
const day = (it) => it.date.slice(0, 10);
const timed = (it) => it.date.length > 10;
const yomtov = items.filter((it) => it.category === "holiday" && it.yomtov);
const nameOf = (en) => (it) => it.title_orig === en;

// 1. Shabbat and chag — every candle-lighting opens a span that the next havdalah closes. A chag
//    that runs into Shabbat (candles, candles, havdalah) is therefore one window, as it should be.
let open = null;
for (const it of items) {
  if (it.category === "candles" && timed(it) && !open) open = it;
  else if (it.category === "havdalah" && timed(it) && open) {
    const first = day(open);
    const last = day(it);
    const inside = yomtov.filter((h) => h.date >= first && h.date <= last);
    const isKippur = inside.some(nameOf("Yom Kippur"));
    const label = inside.length
      ? [...new Set(inside.map((h) => h.hebrew))].join(" · ")
      : "שבת";
    windows.push({
      id: `${isKippur ? "yom-kippur" : inside.length ? "chag" : "shabbat"}-${last}`,
      // Yom Kippur is a fast: hard-quiet from noon on the eve, like the memorial days.
      kind: isKippur ? "quiet" : inside.length ? "chag" : "shabbat",
      from: isKippur ? iso(first, 12) : shift(open.date, -60),
      until: shift(it.date, 30),
      label,
      source: "hebcal-il",
    });
    // The weekly advice slot: Thursday 17:00 → Friday 14:00, only when candles are on a Friday.
    if (weekday(first) === 5) {
      windows.push({
        id: `pre-shabbat-${first}`,
        kind: "pre-shabbat",
        from: iso(addDays(first, -1), 17),
        until: iso(first, 14),
        label: "לפני שבת",
        source: "derived",
      });
    }
    open = null;
  }
}
if (open && day(open) <= THROUGH) {
  die(
    `a candle-lighting on ${open.date} has no havdalah in the fetched range — refusing to write a Shabbat that never ends.`,
  );
}

// 2. Tisha B'Av — Hebcal gives the fast's own start and end; quiet from noon on the eve.
let fastStart = null;
for (const it of items) {
  if (it.category !== "zmanim" || it.subcat !== "fast") continue;
  if (/begins/i.test(it.title_orig)) fastStart = it;
  else if (/ends/i.test(it.title_orig) && fastStart) {
    // The pair is titled "Fast begins" / "Fast ends"; the holiday item on the closing day names it.
    const named = items.some(
      (h) =>
        h.category === "holiday" &&
        h.date === day(it) &&
        /Tish.a B.Av/i.test(h.title_orig ?? ""),
    );
    if (!named)
      die(
        `a fast ending ${it.date} is not Tisha B'Av — only that fast is expected with mf=off.`,
      );
    windows.push({
      id: `tisha-bav-${day(it)}`,
      kind: "quiet",
      from: iso(day(fastStart), 12),
      until: shift(it.date, 30),
      label: "תשעה באב",
      source: "hebcal-il",
    });
    fastStart = null;
  }
}

// 3. Memorial days — from noon on the eve (Yom HaZikaron begins at sunset on the eve, and the
//    afternoon before is already sombre) to 20:30 on the day (nightfall, when Yom HaAtzmaut
//    begins). The legal date moves are Hebcal's, not arithmetic done here.
const MEMORIAL = {
  "Yom HaShoah": ["yom-hashoah", "יום הזיכרון לשואה ולגבורה"],
  "Yom HaZikaron": ["yom-hazikaron", "יום הזיכרון לחללי מערכות ישראל"],
  "Yitzhak Rabin Memorial Day": ["rabin-memorial", "יום הזיכרון ליצחק רבין"],
};
const memorialShape = (date) => ({
  from: iso(addDays(date, -1), 12),
  until: iso(date, 20, 30),
});
for (const it of items) {
  const hit = it.category === "holiday" && MEMORIAL[it.title_orig];
  if (!hit) continue;
  windows.push({
    id: `${hit[0]}-${it.date}`,
    kind: "quiet",
    ...memorialShape(it.date),
    label: hit[1],
    source: "hebcal-il",
  });
}

// 4. The overlay.
for (const d of overlay.days ?? []) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date ?? "") || !d.id || !d.label || !d.source) {
    die(`overlay entry ${JSON.stringify(d.id)} needs id, date, label and source.`);
  }
  const span =
    d.shape === "day"
      ? { from: iso(d.date, 0), until: iso(addDays(d.date, 1), 0) }
      : memorialShape(d.date);
  windows.push({ id: d.id, kind: "quiet", ...span, label: d.label, source: "overlay" });
}

// --- trim, sort, verify ----------------------------------------------------------------------
const lo = Date.parse(iso(START, 0));
const hi = Date.parse(iso(addDays(THROUGH, 1), 0));
const kept = windows
  .filter((w) => Date.parse(w.until) > lo && Date.parse(w.from) < hi)
  .sort((a, b) => Date.parse(a.from) - Date.parse(b.from) || a.id.localeCompare(b.id));

const ids = new Set();
for (const w of kept) {
  if (ids.has(w.id)) die(`duplicate window id ${w.id}`);
  ids.add(w.id);
  if (Date.parse(w.until) <= Date.parse(w.from)) die(`${w.id} ends before it starts`);
}

// The content assertions — what a respelled or truncated feed would break.
const QUIET = new Set(["quiet", "shabbat", "chag"]);
const covers = (ms) =>
  kept.some(
    (w) => QUIET.has(w.kind) && Date.parse(w.from) <= ms && ms < Date.parse(w.until),
  );
for (let d = START; d <= THROUGH; d = addDays(d, 1)) {
  if (weekday(d) === 5 && !covers(Date.parse(iso(d, 20))))
    die(`Friday ${d} 20:00 is inside no Shabbat, chag or quiet window.`);
}
for (const w of kept) {
  const hours = (Date.parse(w.until) - Date.parse(w.from)) / HOUR;
  if ((w.kind === "shabbat" || w.kind === "chag") && hours > 80) {
    die(
      `${w.id} spans ${hours.toFixed(1)} h — a merged span this long means a havdalah went missing.`,
    );
  }
}
const has = (prefix, year) => kept.some((w) => w.id.startsWith(`${prefix}-${year}`));
for (const y of years) {
  if (y > Number(THROUGH.slice(0, 4))) continue;
  const full = y > Number(START.slice(0, 4)) && `${y}-12-31` <= THROUGH;
  const need = full
    ? ["yom-kippur", "yom-hashoah", "yom-hazikaron", "tisha-bav", "rabin-memorial"]
    : y === Number(START.slice(0, 4))
      ? ["yom-kippur", "rabin-memorial"] // the range opens in September
      : [];
  for (const p of need)
    if (!has(p, y))
      die(`${p} ${y} is missing — Hebcal renamed it, or the feed is incomplete.`);
  const chagim = kept.filter(
    (w) => w.kind === "chag" && w.id.startsWith(`chag-${y}`),
  ).length;
  const minChag = full ? 6 : y === Number(START.slice(0, 4)) ? 3 : 0;
  if (chagim < minChag)
    die(`only ${chagim} chag window(s) in ${y}; at least ${minChag} expected.`);
}
for (const d of overlay.days ?? []) {
  if (
    d.date >= START &&
    d.date <= THROUGH &&
    !kept.some((w) => w.id === d.id && w.kind === "quiet")
  ) {
    die(`overlay day ${d.id} did not survive the trim.`);
  }
}

const count = (list, k) => list.filter((w) => w.kind === k).length;
const before = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
if (before && !FORCE) {
  const committed = JSON.parse(before).windows ?? [];
  for (const k of ["shabbat", "chag", "quiet", "pre-shabbat"]) {
    if (count(kept, k) < count(committed, k)) {
      die(
        `${k}: ${count(kept, k)} window(s) now, ${count(committed, k)} committed — a kind got FEWER. Re-run with --force only after checking why.`,
      );
    }
  }
}

const calendar = {
  credit:
    "Jewish calendar data from Hebcal.com (CC BY 4.0), merged with a hand-kept Israeli overlay. Generated by scripts/calendar-sync.mjs — do not edit.",
  source: {
    hebcal: `https://www.hebcal.com/hebcal?${params}&year=<Y>`,
    years,
    overlay: "content/enriched/_calendar.overlay.json",
  },
  coversFrom: START,
  coversThrough: THROUGH,
  windows: kept,
};
const text = JSON.stringify(calendar, null, 2) + "\n";

console.log(
  `calendar-sync: ${kept.length} windows ${START} → ${THROUGH} — ` +
    `${count(kept, "shabbat")} shabbat, ${count(kept, "chag")} chag, ${count(kept, "quiet")} hard-quiet, ${count(kept, "pre-shabbat")} pre-shabbat`,
);
for (const w of kept.filter((w) => w.kind === "quiet"))
  console.log(`   quiet  ${w.from} → ${w.until}  ${w.id}`);

if (CHECK_ONLY) {
  if (before === text) {
    console.log("calendar-sync: no change against the committed calendar.");
  } else {
    console.error(
      "calendar-sync: the committed calendar DIFFERS from what the sources produce now — run without --check and review the diff.",
    );
    process.exit(1);
  }
} else {
  writeFileSync(OUT, text, "utf8");
  console.log(
    before === text
      ? "calendar-sync: written (unchanged)."
      : `calendar-sync: wrote ${OUT.replace(ROOT, "").replace(/\\/g, "/")} — review the diff, then \`npm run enrich\`.`,
  );
}
