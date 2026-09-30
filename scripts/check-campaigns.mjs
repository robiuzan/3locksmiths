/**
 * Validates the live-surface registers before anything is built from them
 * (docs/dynamic-presence-plan.md §4.3; /dynamic-presence; /israeli-calendar).
 *
 *   content/enriched/_campaigns.mjs   topbar / seasonal-card windows + the evergreen line
 *   content/enriched/_updates.mjs     the weekly updates strip
 *   content/enriched/_calendar.json   generated Israeli calendar (quiet days etc.)
 *
 * Runs in npm `prebuild`, so every human deploy runs it (ops/deploy-site.ps1 runs only
 * `npm run build` — a gate that lives only in ci.yml never guards production). It PASSES when
 * no register exists yet: Phase 0 of the plan ships the gate before the data.
 *
 * WHY THESE RULES (each one is a way the site has already been wrong, or a way it would be):
 *   - explicit ISO offsets: a date-only string is UTC midnight = 03:00 in Israel. A memorial
 *     day that starts three hours late is not a rounding error.
 *   - seasonal must not overlap a hard-quiet window: the runtime resolver would suppress it
 *     anyway, but authoring a promo across Yom HaZikaron is an editorial mistake, and belt +
 *     braces is the point. Shabbat/chag overlaps are expected (every 9-day window has a
 *     Shabbat) and are left to precedence.
 *   - priority ties: two seasonal windows live at once with equal priority means the page
 *     shows whichever sorts first. Say which one you meant.
 *   - runway: pre-authored schedules run out silently — the site just goes evergreen forever.
 *   - claims: the registers are the one place copy can enter site.json without passing through
 *     an authored page module, so the ⛔ patterns from check-claims are applied here too, plus
 *     the ones a promo bar invites (arrival minutes, discounts, scarcity, live counts).
 *   - typography: ASCII quotes next to Hebrew letters (CLAUDE.md §8). check-typography scans
 *     only the numeric page modules (/^\d+\.mjs$/), so the registers need their own pass.
 *   - AI character names: docs/business-facts.md §G.1 / §B.5 — never on the site.
 *
 * TWO RULES FAIL BY THE PASSAGE OF TIME ALONE — the runway and the calendar horizon. They must
 * never block an unrelated hotfix (a phone-number change, a security header), so
 * `LIVE_GATES=lapsed-ok` in the environment downgrades ONLY those two to warnings; every
 * correctness rule stays blocking. The nuclear option, `npm_config_ignore_scripts=true`, skips
 * the whole prebuild chain (see /deploy-3locksmiths) — prefer the narrow one.
 *
 *   node scripts/check-campaigns.mjs        (exit 1 on any violation)
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  ISO_WITH_OFFSET,
  QUIET_KINDS,
  WINDOW_KINDS,
  toMs,
} from "../lib/live/resolve.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENRICHED = join(ROOT, "content", "enriched");
const CAMPAIGNS = join(ENRICHED, "_campaigns.mjs");
const UPDATES = join(ENRICHED, "_updates.mjs");
const CALENDAR = join(ENRICHED, "_calendar.json");
const SITE = join(ROOT, "content", "site.json");

const DAY = 86_400_000;
const RUNWAY_DAYS = 30;
const CALENDAR_MIN_MONTHS = 12; // warn below this …
const CALENDAR_FAIL_DAYS = 60; // … fail below this
const UPDATE_MAX_CHARS = 140;
const CTA_RE = /^(topbar|popup|update|review)-(call|whatsapp|link|ask)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LAPSED_OK = process.env.LIVE_GATES === "lapsed-ok";

/**
 * ⛔ — mirrors scripts/check-claims.mjs BLOCKING, plus what a promo surface invites.
 *
 * No `\b`: JavaScript's word boundary is ASCII-only, so between two Hebrew letters it matches
 * everywhere. Note the final-letter trap: `זמין` ends in a final nun (ן) while `זמינים` has a
 * regular one (נ) — `[נן]` covers both, `זמינים?` covers neither singular.
 */
const CLAIMS = [
  {
    id: "years-in-business",
    re: /\d{1,2}\s*\+?\s*שנות ניסיון|ניסיון של\s*\d{1,2}\s*שנ|מעל\s*\d{1,2}\s*שנ|עשרות שנים|\d{1,2}\s*שנ(?:ה|ים)\s+של\s+ניסיון/,
  },
  { id: "average-response-time", re: /זמן מענה ממוצע|זמן הגעה ממוצע/ },
  { id: "arrival-minutes", re: /תוך\s*\d+\s*דק|ב-?\d+\s*דקות|\d+\s*דקות הגעה/ },
  { id: "customer-count", re: /אלפי לקוחות|מאות לקוחות|אלפי מפתחות|לקוחות מרוצים/ },
  {
    id: "live-availability",
    re: /טכנא(?:י|ים|ית|יות)\s+זמי[נן]|נציג(?:ים|ה)?\s+זמי[נן]|זמי[נן](?:ים|ה|ות)?\s+באזורך|באזורך עכשיו|\d+\s*צופים|צופים\s+(?:כעת|עכשיו)/,
  },
  {
    id: "rating",
    re: /aggregateRating|reviewCount|\d(\.\d)?\s*★|★{2,}|דירוג\s*\d|\d\s*כוכבים|חמישה כוכבים|כוכבים בגוגל/,
  },
  {
    id: "discount-or-price",
    re: /\d+\s*%|הנחה|במבצע|מבצע\s*(חג|קיץ|חורף|מיוחד)|מחיר מיוחד|במקום\s*\d+|\d{2,4}\s*(?:₪|ש[״"']ח|שקל(?:ים)?)|(?:^|[\s,.!?(])ב?חינם|ללא עלות|במתנה|(?:^|[\s,.!?(])מתנה/,
  },
  {
    id: "scarcity-or-countdown",
    re: /רק היום|היום בלבד|רק השבוע|נותרו\s*\d|ספירה לאחור|מהרו|לזמן מוגבל|עד חצות|הזדמנות אחרונה|נגמר בקרוב|מקומות מוגבל|מלאי מוגבל|עד גמר המלאי/,
  },
  { id: "ai-character-name", re: /אבי יחזקל|אביעד בן שושן|שרון אליקים/ },
];

/** ASCII / typographic quotes touching a Hebrew letter — must be גרש ׳ / גרשיים ״. */
const TYPO_RE = /[֐-׿]['"’“”]|['"’“”][֐-׿]/;

const problems = [];
const warnings = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);
/** The two clock-driven rules: blocking normally, a warning under LIVE_GATES=lapsed-ok. */
const clockFail = (where, msg) =>
  (LAPSED_OK ? warnings : problems).push(`${where}: ${msg}`);

// ---------------------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------------------

async function loadModule(file) {
  if (!existsSync(file)) return null;
  const mod = await import(pathToFileURL(file).href);
  return mod.default;
}

/** Every string value inside a plain data structure, with a path for the report. */
function strings(value, path, out) {
  if (typeof value === "string") out.push([path, value]);
  else if (Array.isArray(value))
    value.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value))
      strings(v, path ? `${path}.${k}` : k, out);
  }
  return out;
}

function checkCopy(where, value) {
  for (const [path, s] of strings(value, "", [])) {
    if (/^(source|id|kind|from|until|cta|image|date)$/.test(path.split(".").pop() || ""))
      continue;
    for (const rule of CLAIMS) {
      if (rule.re.test(s)) fail(`${where}.${path}`, `⛔ ${rule.id}: "${s.slice(0, 80)}"`);
    }
    if (TYPO_RE.test(s))
      fail(
        `${where}.${path}`,
        `ASCII quote next to Hebrew — use ׳ / ״: "${s.slice(0, 80)}"`,
      );
  }
}

let livePaths = null;
function routeExists(href) {
  if (!livePaths) {
    livePaths = new Set();
    if (existsSync(SITE)) {
      const site = JSON.parse(readFileSync(SITE, "utf8"));
      for (const p of site.pages ?? []) {
        livePaths.add(p.path);
        try {
          livePaths.add(decodeURI(p.path));
        } catch {
          /* leave the encoded form only */
        }
      }
    }
  }
  if (/^https?:\/\//.test(href)) return true; // external links are fix-links' business
  const clean = href.split("#")[0];
  let decoded = clean;
  try {
    decoded = decodeURI(clean);
  } catch {
    /* keep as-is */
  }
  return livePaths.has(clean) || livePaths.has(decoded);
}

/**
 * V8 normalises impossible calendar fields silently: `2026-02-30T12:00:00+02:00` parses as
 * 2 March. The regex rejects hour 24 and month 13, but not a 30 February or a 31 April, so the
 * parsed instant is re-rendered in the string's own offset and its wall-clock fields compared.
 * Returns null when the string means what it says, otherwise a reason.
 */
function impossibleDate(v) {
  const m =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?(Z|[+-]\d{2}:\d{2})$/.exec(v);
  if (!m) return "is not parseable";
  const ms = Date.parse(v);
  if (Number.isNaN(ms)) return "is not parseable";
  const tz = m[6];
  const offMin =
    tz === "Z" ? 0 : (tz[0] === "-" ? -1 : 1) * (+tz.slice(1, 3) * 60 + +tz.slice(4, 6));
  const wall = new Date(ms + offMin * 60_000);
  const same =
    wall.getUTCFullYear() === +m[1] &&
    wall.getUTCMonth() + 1 === +m[2] &&
    wall.getUTCDate() === +m[3] &&
    wall.getUTCHours() === +m[4] &&
    wall.getUTCMinutes() === +m[5];
  return same
    ? null
    : `is not a real date — it rolls over to ${wall.toISOString().slice(0, 16)} in its own offset`;
}

function checkBounds(where, w, requireWindow) {
  const hasBounds = w.from !== undefined || w.until !== undefined;
  if (!hasBounds) {
    if (requireWindow) fail(where, "missing from/until");
    return null;
  }
  for (const k of ["from", "until"]) {
    if (typeof w[k] !== "string" || !ISO_WITH_OFFSET.test(w[k])) {
      fail(
        where,
        `${k} must be ISO 8601 with an explicit offset (e.g. 2026-12-03T12:00:00+02:00), got ${JSON.stringify(w[k])}`,
      );
      return null;
    }
    const bad = impossibleDate(w[k]);
    if (bad) {
      fail(where, `${k} ${w[k]} ${bad}`);
      return null;
    }
  }
  let from;
  let until;
  try {
    from = toMs(w.from);
    until = toMs(w.until);
  } catch (e) {
    fail(where, e instanceof Error ? e.message : String(e));
    return null;
  }
  if (until <= from) fail(where, `until (${w.until}) is not after from (${w.from})`);
  return { from, until };
}

const overlaps = (a, b) => a.from < b.until && b.from < a.until;

// ---------------------------------------------------------------------------------------
// calendar
// ---------------------------------------------------------------------------------------

const now = Date.now();
let calendar = [];
let calendarWindows = [];
if (existsSync(CALENDAR)) {
  const cal = JSON.parse(readFileSync(CALENDAR, "utf8"));
  if (!cal.credit || !/hebcal/i.test(cal.credit)) {
    fail("_calendar.json", "missing the Hebcal CC BY 4.0 credit line (`credit`)");
  }
  calendar = Array.isArray(cal.windows) ? cal.windows : [];
  const ids = new Set();
  let last = 0;
  for (const [i, c] of calendar.entries()) {
    const where = `_calendar.json.windows[${i}]`;
    if (!c.id) fail(where, "missing id");
    else if (ids.has(c.id)) fail(where, `duplicate id ${c.id}`);
    ids.add(c.id);
    if (!c.kind) fail(where, "missing kind");
    const b = checkBounds(where, c, true);
    if (b) {
      calendarWindows.push({ ...c, ...b });
      last = Math.max(last, b.until);
    }
    if (c.labelDate && !/^\d{2}\/\d{2}\/\d{4}$/.test(c.labelDate)) {
      fail(where, `labelDate must be pre-rendered dd/mm/yyyy, got ${c.labelDate}`);
    }
    checkCopy(where, { label: c.label });
  }
  if (calendar.length) {
    const daysLeft = Math.floor((last - now) / DAY);
    const ends = new Date(last).toISOString().slice(0, 10);
    if (daysLeft < CALENDAR_FAIL_DAYS) {
      clockFail(
        "_calendar.json",
        `calendar ends ${ends} — only ${daysLeft} days left; run scripts/calendar-sync.mjs`,
      );
    } else if (daysLeft < CALENDAR_MIN_MONTHS * 30) {
      warnings.push(
        `_calendar.json: calendar ends ${ends} (${daysLeft} days) — regenerate before it drops under ${CALENDAR_FAIL_DAYS} days and blocks the build`,
      );
    }
  }
}
const hardQuiet = calendarWindows.filter((c) => c.kind === "quiet");

// ---------------------------------------------------------------------------------------
// campaigns
// ---------------------------------------------------------------------------------------

const campaigns = await loadModule(CAMPAIGNS);
if (existsSync(CAMPAIGNS) && !campaigns)
  fail("_campaigns.mjs", "the file exists but has no default export");
let windowCount = 0;
if (campaigns) {
  if (
    !campaigns.evergreen ||
    !campaigns.evergreen.topbar ||
    !campaigns.evergreen.topbar.text
  ) {
    fail("_campaigns.mjs", "missing evergreen.topbar.text — the JS-off state must exist");
  } else {
    checkCopy("_campaigns.mjs.evergreen", campaigns.evergreen);
    if (!campaigns.evergreen.source)
      fail("_campaigns.mjs.evergreen", "missing source (business-facts row)");
  }

  const windows = Array.isArray(campaigns.windows) ? campaigns.windows : [];
  const ids = new Set();
  const timed = [];
  let reducedCount = 0;
  let lastUntil = 0;

  for (const [i, w] of windows.entries()) {
    const where = `_campaigns.mjs.windows[${i}]`;
    if (!w.id) fail(where, "missing id");
    else if (ids.has(w.id)) fail(where, `duplicate id ${w.id}`);
    ids.add(w.id);
    if (w.id === "evergreen")
      fail(where, "`evergreen` is reserved for the default variant");

    if (!WINDOW_KINDS.includes(w.kind))
      fail(where, `kind must be one of ${WINDOW_KINDS.join(" | ")}, got ${w.kind}`);
    if (!w.source)
      fail(
        where,
        "missing source — cite the docs/business-facts.md row or the owner's dated message",
      );
    if (!w.topbar || !w.topbar.text) fail(where, "missing topbar.text");
    checkCopy(where, w);

    for (const [k, v] of Object.entries({
      "topbar.cta": w.topbar?.cta,
      "dialog.cta": w.dialog?.cta,
    })) {
      if (v !== undefined && !CTA_RE.test(v))
        fail(where, `${k} "${v}" must match ${CTA_RE}`);
    }
    for (const [k, href] of Object.entries({
      "topbar.href": w.topbar?.href,
      "dialog.href": w.dialog?.href,
    })) {
      if (href !== undefined && !routeExists(href))
        fail(where, `${k} "${href}" is not a live route`);
    }
    if (w.dialog) {
      if (!w.dialog.title || !w.dialog.body) fail(where, "dialog needs title and body");
      if (!(w.dialog.capDays >= 1))
        fail(where, "dialog.capDays must be ≥ 1 (frequency cap per campaign)");
      const excl = w.pages?.exclude ?? [];
      if (!excl.includes("emergency"))
        fail(
          where,
          'a dialog window must exclude the emergency pages: pages.exclude must contain "emergency"',
        );
    }

    if (w.kind === "reduced") {
      reducedCount += 1;
      if (w.id !== "reduced")
        fail(where, 'the reduced-availability variant must have id "reduced"');
      if (w.from !== undefined || w.until !== undefined)
        fail(
          where,
          "reduced is revealed by status.json, never by time — drop from/until",
        );
      continue;
    }

    const b = checkBounds(where, w, true);
    if (!b) continue;
    if (typeof w.priority !== "number") fail(where, "missing numeric priority");
    timed.push({ ...w, ...b, where });
    lastUntil = Math.max(lastUntil, b.until);

    if (w.kind === "seasonal") {
      for (const q of hardQuiet) {
        if (overlaps(b, q))
          fail(
            where,
            `seasonal window overlaps hard-quiet calendar window ${q.id} (${q.from} → ${q.until}) — split the window around it`,
          );
      }
    }
  }
  if (reducedCount > 1) fail("_campaigns.mjs", "more than one reduced variant");

  for (let i = 0; i < timed.length; i += 1) {
    for (let j = i + 1; j < timed.length; j += 1) {
      const a = timed[i];
      const b = timed[j];
      if (a.kind === b.kind && a.priority === b.priority && overlaps(a, b)) {
        fail(
          a.where,
          `overlaps ${b.id} with the same priority (${a.priority}) — ties are ambiguous`,
        );
      }
    }
  }

  windowCount = timed.length;
  if (windowCount && lastUntil < now + RUNWAY_DAYS * DAY) {
    clockFail(
      "_campaigns.mjs",
      `runway: the last authored window ends ${new Date(lastUntil).toISOString().slice(0, 10)} — fewer than ${RUNWAY_DAYS} days ahead; author the next one`,
    );
  }
}

// ---------------------------------------------------------------------------------------
// updates
// ---------------------------------------------------------------------------------------

const updates = await loadModule(UPDATES);
if (existsSync(UPDATES) && !updates)
  fail("_updates.mjs", "the file exists but has no default export");
let updateCount = 0;
if (updates) {
  if (!Array.isArray(updates)) fail("_updates.mjs", "default export must be an array");
  else {
    updateCount = updates.length;
    // Israel's civil date, not UTC: between 00:00 and 03:00 Israel time the UTC date is still
    // yesterday, and the owner's weekly paste tends to happen late. +3 h is Israel's summer
    // offset; in winter it is one hour generous, which can only ever ACCEPT a real same-day item.
    const today = new Date(now + 3 * 3_600_000).toISOString().slice(0, 10);
    for (const [i, u] of updates.entries()) {
      const where = `_updates.mjs[${i}]`;
      if (!DATE_RE.test(u.date ?? ""))
        fail(where, `date must be YYYY-MM-DD, got ${JSON.stringify(u.date)}`);
      else if (u.date > today) fail(where, `date ${u.date} is in the future`);
      if (!u.text) fail(where, "missing text");
      else if (u.text.length > UPDATE_MAX_CHARS)
        fail(where, `text is ${u.text.length} chars — max ${UPDATE_MAX_CHARS}`);
      if (!u.source) fail(where, "missing source");
      if (u.href !== undefined && !routeExists(u.href))
        fail(where, `href "${u.href}" is not a live route`);
      checkCopy(where, u);
    }
  }
}

// ---------------------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------------------

console.log(
  `campaigns: ${campaigns ? `${windowCount} timed window(s)` : "no _campaigns.mjs yet"} · ` +
    `${updates ? `${updateCount} update(s)` : "no _updates.mjs yet"} · ` +
    `${calendar.length ? `${calendar.length} calendar window(s), ${hardQuiet.length} hard-quiet` : "no _calendar.json yet"}`,
);
if (LAPSED_OK) {
  console.warn(
    "campaigns: ⚠ LIVE_GATES=lapsed-ok — the runway and calendar-horizon rules are warnings for this run; every correctness rule still blocks",
  );
}
for (const w of warnings) console.warn(`  ⚠ ${w}`);
// Problems first: a register that exists but is broken (no export, no credit) must never be
// mistaken for "no register yet".
if (problems.length) {
  console.error(`\ncampaigns: ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ! ${p}`);
  process.exit(1);
}
if (!existsSync(CAMPAIGNS) && !existsSync(UPDATES) && !existsSync(CALENDAR)) {
  console.log("campaigns: nothing to validate — the registers do not exist yet ✅");
  process.exit(0);
}
console.log(`campaigns: registers valid ✅ (quiet kinds: ${QUIET_KINDS.join(", ")})`);
