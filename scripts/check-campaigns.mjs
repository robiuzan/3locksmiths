/**
 * Validates the live-surface registers before anything is built from them
 * (docs/dynamic-presence-plan.md §4.3; /dynamic-presence; /israeli-calendar).
 *
 *   content/enriched/_campaigns.mjs   the announcement bar's lines and windows
 *   content/enriched/_updates.mjs     the homepage updates strip: { heading, items: [...] }
 *   content/enriched/_calendar.json   generated Israeli calendar (quiet days etc.)
 *   content/enriched/_calendar.overlay.json   the calendar's hand-kept input
 *
 * Runs in npm `prebuild`, so every human deploy runs it (ops/deploy-site.ps1 runs only
 * `npm run build` — a gate that lives only in ci.yml never guards production). It PASSES when
 * no register exists yet.
 *
 * WHY THESE RULES (each one is a way the site has already been wrong, or a way it would be —
 * most of them were found by mutation-testing this gate on 2026-09-30):
 *   - explicit ISO offsets, of the RIGHT SEASON: a date-only string is UTC midnight = 03:00 in
 *     Israel, and `+03:00` on a March date is a valid instant one hour away from the one meant.
 *   - nothing shows on a quiet day: checked on the COMPILED schedule (lib/live/compile.mjs),
 *     which is what ships — no interval may touch a memorial day, fast or civic day, and no
 *     seasonal interval may touch a Shabbat or chag (a safety line may: owner, 2026-10-01).
 *   - nothing is scheduled past the calendar: beyond its last quiet window no Shabbat is known,
 *     so a line there would run straight through every Saturday. Timed windows without a
 *     calendar at all are refused for the same reason.
 *   - the calendar matches its hand-kept input: an overlay day that never went through the
 *     networked sync protects nothing; every Saturday inside the range must be quiet.
 *   - priority ties: two seasonal windows live at once with equal priority means the page
 *     shows whichever sorts first. Say which one you meant.
 *   - shadowed windows: a line that is outranked or silenced for its whole life never shows.
 *   - runway: pre-authored schedules run out silently — measured on the FIXED-date windows,
 *     because the weekly `during` slot reaches the end of the calendar by construction.
 *   - claims: the registers are the one place copy can enter site.json without passing through
 *     an authored page module, so the ⛔ patterns from check-claims are applied here too, plus
 *     the ones a promo bar invites (lib/live/claims.mjs). There are no offers (§D.10).
 *   - length: the bar is one row. A line that wraps on a 360 px phone pushes the page down by
 *     a second row the header reserve (app/enrich.css) does not hold.
 *   - no typed phone number, anywhere a visitor reads: {phone} prints the call line from
 *     site.config.json; a literal one is missed by the next NAP change, and a number typed as
 *     the WhatsApp label would print the CALL number on a link that opens WhatsApp.
 *   - sources: a tip must be something the page it links to actually says. The quote in
 *     `source` is checked against that page's module, so a rewrite there fails here.
 *   - typography: ASCII quotes next to Hebrew (CLAUDE.md §8); check-typography scans only the
 *     numeric page modules, so the registers need their own pass.
 *   - AI character names: docs/business-facts.md §G.1 / §B.5 — never on the site.
 *   - the seasonal card (`dialog`): only on a fixed-date SEASONAL window. A safety window can be
 *     live on Shabbat (decision 11) and live.js knows only the line, not the day — a card on it
 *     could open on Shabbat; the weekly slot would nag every Thursday. Same claim, phone, quote
 *     and length rules as the bar; the call label must print the number through {phone}; the
 *     link must be the page the source quote is from.
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
  HARD_QUIET_KINDS,
  ISO_WITH_OFFSET,
  QUIET_KINDS,
  WINDOW_KINDS,
  boundMs,
  toMs,
} from "../lib/live/resolve.mjs";
import { compile, expand, winners } from "../lib/live/compile.mjs";
import { TOKEN_SOURCE, visibleText } from "../lib/live/topbar.mjs";
import { findClaim } from "../lib/live/claims.mjs";
import { israelOffset } from "../lib/live/israel-time.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENRICHED = join(ROOT, "content", "enriched");
const CAMPAIGNS = join(ENRICHED, "_campaigns.mjs");
const UPDATES = join(ENRICHED, "_updates.mjs");
const CALENDAR = join(ENRICHED, "_calendar.json");
const OVERLAY = join(ENRICHED, "_calendar.overlay.json");
const MANIFEST = join(ENRICHED, "_manifest.json");
const SITE = join(ROOT, "content", "site.json");
const CONFIG = join(ROOT, "site.config.json");

const DAY = 86_400_000;
const RUNWAY_DAYS = 30;
const CALENDAR_WARN_DAYS = 180; // warn below this …
const CALENDAR_FAIL_DAYS = 60; // … fail below this
const EXPIRED_DAYS = 30; // a window that ended this long ago should be removed
const UPDATE_MAX_CHARS = 140;
const DIALOG_MAX = { title: 28, body: 140, call: 24, whatsapp: 16, linkLabel: 18 };
const TOPBAR_MAX_CHARS = 46; // one row at 360 px — see app/enrich.css
const EVERGREEN_MAX_CHARS = 70; // desktop only
const CALENDAR_KINDS = ["quiet", "shabbat", "chag", "pre-shabbat"];
const VARIANT_RE = /^[a-z0-9-]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** A typed Israeli phone number (any separator) or an international prefix. */
const LITERAL_PHONE_RE = /\+972|0\d{1,2}[-.\s]?\d{3}[-.\s]?\d{4}/;
/** ASCII / typographic quotes touching a Hebrew letter — must be גרש ׳ / גרשיים ״. */
const TYPO_RE = /[֐-׿]['"’“”]|['"’“”][֐-׿]/;
/** Any quote character at all — in a one-line bar there is no use for one. */
const ANY_QUOTE_RE = /['"’“”]/;
const LAPSED_OK = process.env.LIVE_GATES === "lapsed-ok";

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

/** The ⛔ patterns and the quote rule, on every string of a register entry. */
function checkCopy(where, value) {
  for (const [path, s] of strings(value, "", [])) {
    if (
      /^(source|id|kind|variant|during|from|until|cta|href|image|date)$/.test(
        path.split(".").pop() || "",
      )
    )
      continue;
    const hit = findClaim(s);
    if (hit) fail(`${where}.${path}`, `⛔ ${hit}: "${s.slice(0, 80)}"`);
    if (TYPO_RE.test(s))
      fail(
        `${where}.${path}`,
        `ASCII quote next to Hebrew — use ׳ / ״: "${s.slice(0, 80)}"`,
      );
  }
}

const safeDecode = (s) => {
  try {
    return decodeURI(s);
  } catch {
    return s;
  }
};
let livePaths = null;
function routeExists(href) {
  if (!livePaths) {
    livePaths = new Set();
    if (existsSync(SITE)) {
      for (const p of JSON.parse(readFileSync(SITE, "utf8")).pages ?? []) {
        livePaths.add(p.path);
        livePaths.add(safeDecode(p.path));
      }
    }
  }
  if (/^https?:\/\//.test(href)) return true; // external links are fix-links' business
  const clean = href.split("#")[0];
  return livePaths.has(clean) || livePaths.has(safeDecode(clean));
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

/** An authored bound must carry Israel's offset for THAT date and hour, not just some offset. */
function wrongSeason(v) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):\d{2}(?::\d{2})?(Z|[+-]\d{2}:\d{2})$/.exec(v);
  if (!m) return null;
  const want = israelOffset(m[1], Number(m[2]));
  return m[3] === want
    ? null
    : `carries ${m[3]} but Israel is on ${want} at that instant (DST switches 25/10/2026, 26/03/2027, 31/10/2027)`;
}

/** Validates one bound string; returns its epoch ms or null. `authored` adds the season rule. */
function checkBound(where, k, v, authored) {
  if (typeof v !== "string" || !ISO_WITH_OFFSET.test(v)) {
    fail(
      where,
      `${k} must be ISO 8601 with an explicit offset (e.g. 2026-12-03T12:00:00+02:00), got ${JSON.stringify(v)}`,
    );
    return null;
  }
  const bad = impossibleDate(v);
  if (bad) {
    fail(where, `${k} ${v} ${bad}`);
    return null;
  }
  if (authored) {
    const season = wrongSeason(v);
    if (season) {
      fail(where, `${k} ${v} ${season}`);
      return null;
    }
  }
  return toMs(v);
}

function checkBounds(where, w, authored) {
  if (w.from === undefined && w.until === undefined) {
    fail(where, "missing from/until");
    return null;
  }
  const from = checkBound(where, "from", w.from, authored);
  const until = checkBound(where, "until", w.until, authored);
  if (from === null || until === null) return null;
  if (until <= from) {
    fail(where, `until (${w.until}) is not after from (${w.from})`);
    return null;
  }
  return { from, until };
}

const overlaps = (a, b) => a.from < b.until && b.from < a.until;
/** The Israel civil date of an instant — what a human means by "ends 2027-09-15". */
const iso10 = (ms) => {
  const utc = new Date(ms);
  const off =
    israelOffset(utc.toISOString().slice(0, 10), utc.getUTCHours()) === "+03:00" ? 3 : 2;
  return new Date(ms + off * 3_600_000).toISOString().slice(0, 10);
};
const addDays = (date, n) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

// ---------------------------------------------------------------------------------------
// calendar
// ---------------------------------------------------------------------------------------

const now = Date.now();
let calendar = [];
let calendarWindows = [];
let calendarEnd = 0; // the last instant a quiet-kind window covers — real protection ends here
if (existsSync(CALENDAR)) {
  const cal = JSON.parse(readFileSync(CALENDAR, "utf8"));
  if (!cal.credit || !/hebcal/i.test(cal.credit))
    fail("_calendar.json", "missing the Hebcal CC BY 4.0 credit line (`credit`)");
  calendar = Array.isArray(cal.windows) ? cal.windows : [];
  const ids = new Set();
  for (const [i, c] of calendar.entries()) {
    const where = `_calendar.json.windows[${i}]`;
    if (!c.id) fail(where, "missing id");
    else if (ids.has(c.id)) fail(where, `duplicate id ${c.id}`);
    ids.add(c.id);
    if (!CALENDAR_KINDS.includes(c.kind))
      fail(
        where,
        `kind must be one of ${CALENDAR_KINDS.join(" | ")}, got ${JSON.stringify(c.kind)}`,
      );
    const b = checkBounds(where, c, false);
    if (b) {
      calendarWindows.push({ ...c, ...b });
      if (QUIET_KINDS.includes(c.kind)) calendarEnd = Math.max(calendarEnd, b.until);
    }
    checkCopy(where, { label: c.label });
  }

  // The calendar must match its hand-kept input and cover every Saturday it claims to cover.
  if (existsSync(OVERLAY)) {
    const overlay = JSON.parse(readFileSync(OVERLAY, "utf8"));
    if (overlay.verifiedThrough !== cal.coversThrough) {
      fail(
        "_calendar.json",
        `coversThrough ${cal.coversThrough} ≠ the overlay's verifiedThrough ${overlay.verifiedThrough} — run \`node scripts/calendar-sync.mjs\``,
      );
    }
    for (const d of overlay.days ?? []) {
      if (
        !DATE_RE.test(d.date ?? "") ||
        d.date < cal.coversFrom ||
        d.date > cal.coversThrough
      )
        continue;
      const w = calendarWindows.find((x) => x.id === d.id && x.kind === "quiet");
      if (
        !w ||
        !(
          w.from <= toMs(`${d.date}T12:00:00${israelOffset(d.date, 12)}`) &&
          toMs(`${d.date}T12:00:00${israelOffset(d.date, 12)}`) < w.until
        )
      ) {
        fail(
          "_calendar.json",
          `overlay day ${d.id} (${d.date}) has no quiet window — the overlay was edited without \`node scripts/calendar-sync.mjs\``,
        );
      }
    }
  }
  if (calendarWindows.length && DATE_RE.test(cal.coversFrom ?? "")) {
    const quietNow = calendarWindows.filter((c) => QUIET_KINDS.includes(c.kind));
    for (
      let d = cal.coversFrom;
      toMs(`${d}T12:00:00${israelOffset(d, 12)}`) < calendarEnd;
      d = addDays(d, 1)
    ) {
      if (new Date(d + "T12:00:00Z").getUTCDay() !== 6) continue;
      const noon = toMs(`${d}T12:00:00${israelOffset(d, 12)}`);
      if (!quietNow.some((c) => c.from <= noon && noon < c.until))
        fail(
          "_calendar.json",
          `Saturday ${d} 12:00 is inside no quiet window — a Shabbat is missing`,
        );
    }
  }

  if (calendarWindows.length) {
    const daysLeft = Math.floor((calendarEnd - now) / DAY);
    const ends = iso10(calendarEnd);
    if (daysLeft < CALENDAR_FAIL_DAYS) {
      clockFail(
        "_calendar.json",
        `calendar ends ${ends} — only ${daysLeft} days left; run scripts/calendar-sync.mjs`,
      );
    } else if (daysLeft < CALENDAR_WARN_DAYS) {
      warnings.push(
        `_calendar.json: calendar ends ${ends} (${daysLeft} days) — regenerate before it drops under ${CALENDAR_FAIL_DAYS} days and blocks the build`,
      );
    }
  }
}
const quietWindows = calendarWindows.filter((c) => QUIET_KINDS.includes(c.kind));
const hardQuiet = calendarWindows.filter((c) => c.kind === "quiet");

// ---------------------------------------------------------------------------------------
// campaigns
// ---------------------------------------------------------------------------------------

const phoneDisplay = existsSync(CONFIG)
  ? (JSON.parse(readFileSync(CONFIG, "utf8")).contact?.phoneDisplay ?? "")
  : "";
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : null;
const modules = new Map(); // id → every string in content/enriched/<id>.mjs

async function moduleStrings(id) {
  if (!modules.has(id)) {
    const file = join(ENRICHED, `${id}.mjs`);
    const data = existsSync(file)
      ? (await import(pathToFileURL(file).href)).default
      : null;
    modules.set(id, data ? strings(data, "", []).map(([, s]) => s) : null);
  }
  return modules.get(id);
}

/** The bar's own rules: tokens, no typed number, one row, no quotes, no promo words. */
function checkTopbar(where, topbar, max) {
  if (!topbar || typeof topbar.text !== "string" || !topbar.text.trim()) {
    fail(where, "missing topbar.text");
    return;
  }
  if (/[\r\n]/.test(topbar.text)) fail(where, "topbar.text contains a line break");
  const literal = topbar.text.replace(new RegExp(TOKEN_SOURCE, "g"), "");
  if (/[{}]/.test(literal))
    fail(
      where,
      `topbar.text has an unknown token — only {phone} and {whatsapp:<label>} exist: "${topbar.text}"`,
    );
  if (/\{phone:/.test(topbar.text))
    fail(where, "{phone} takes no label — it prints the number itself");
  if (/\{whatsapp\}/.test(topbar.text))
    fail(where, "{whatsapp} needs a label — write {whatsapp:וואטסאפ}");
  if (topbar.href !== undefined || topbar.cta !== undefined)
    fail(where, "topbar.href / topbar.cta were replaced by topbar.link: { label, href }");
  if (topbar.link !== undefined) {
    if (
      !topbar.link ||
      typeof topbar.link.label !== "string" ||
      !topbar.link.label.trim() ||
      !topbar.link.href
    )
      fail(where, "topbar.link needs both label and href");
    else {
      if (/[{}]/.test(topbar.link.label))
        fail(where, "topbar.link.label may not contain a token");
      if (!routeExists(topbar.link.href))
        fail(where, `topbar.link.href "${topbar.link.href}" is not a live route`);
    }
  }
  // Everything a visitor reads, with the call line blanked: text, token labels, link label.
  const read = visibleText(topbar, "");
  if (LITERAL_PHONE_RE.test(read))
    fail(
      where,
      "a typed phone number — write {phone} (the call line) or {whatsapp:<label>}; never the number",
    );
  if (ANY_QUOTE_RE.test(read)) fail(where, `a quote character in a bar line: "${read}"`);
  const promo = findClaim(read, true);
  if (promo) fail(where, `⛔ ${promo}: "${read}"`);
  const seen = visibleText(topbar, phoneDisplay);
  const chars = [...seen].length;
  if (chars > max)
    fail(where, `the line is ${chars} characters as read — max ${max}: "${seen}"`);
}

/**
 * `source` must quote the sentence, on the page the line links to, that says what the line
 * says: `content/enriched/<id>.mjs — ״…״`. Pieces around an ellipsis are checked separately.
 */
async function checkSource(where, w) {
  if (!w.source) {
    fail(
      where,
      "missing source — cite the page module and quote the sentence the tip rests on",
    );
    return;
  }
  // The page the tip points at: the line's link, or — when the line has none — the card's.
  const target = w.topbar?.link?.href ?? w.dialog?.link?.href;
  if (!target) return;
  const m = /content\/enriched\/(\d+)\.mjs\s*[—–-]\s*״([^״]+)״/.exec(w.source);
  if (!m) {
    fail(
      where,
      "a line with a link must cite its page: source must start `content/enriched/<id>.mjs — ״<the sentence>״`",
    );
    return;
  }
  const id = Number(m[1]);
  const texts = await moduleStrings(id);
  if (!texts) {
    fail(where, `source cites content/enriched/${id}.mjs, which does not exist`);
    return;
  }
  // Every ״…״ quote in the source is checked — the card's body may rest on a second sentence.
  const quotes = [...w.source.matchAll(/״([^״]+)״/g)].map((q) => q[1]);
  for (const piece of quotes
    .flatMap((q) => q.split("…"))
    .map((p) => p.trim())
    .filter(Boolean)) {
    if (!texts.some((s) => s.includes(piece)))
      fail(
        where,
        `the quoted sentence is not in content/enriched/${id}.mjs any more: ״${piece}״`,
      );
  }
  const path =
    manifest?.lookup?.[id]?.path ?? manifest?.pages?.find((p) => p.id === id)?.path;
  if (path && safeDecode(path) !== safeDecode(target)) {
    fail(
      where,
      `source cites page ${id} (${safeDecode(path)}) but the tip links to ${target}`,
    );
  }
}

/** "2026-02-30" is not a date — V8 would roll it into March. */
const realDate = (d) => {
  const t = new Date(`${d}T12:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
};
/** The rules every short visitor-facing string follows: no promo word, no typed number, no quotes. */
function lineRules(where, v) {
  if (typeof v !== "string") return;
  const hit = findClaim(v, true);
  if (hit) fail(where, `⛔ ${hit}: "${v}"`);
  if (LITERAL_PHONE_RE.test(v)) fail(where, "a typed phone number");
  if (ANY_QUOTE_RE.test(v)) fail(where, `a quote character: "${v}"`);
  if (/[{}]/.test(v)) fail(where, "a token outside the bar's text");
}

/** The seasonal card's own rules (Phase 2, plan §3.2). */
function checkDialog(where, w) {
  const dl = w.dialog;
  if (w.kind !== "seasonal" || w.during !== undefined) {
    fail(
      where,
      "a `dialog` belongs on a fixed-date seasonal window only — never on a safety window (it can be live on Shabbat) or a `during` slot (it would nag every week)",
    );
  }
  if (!dl || typeof dl !== "object") {
    fail(where, "dialog must be an object");
    return;
  }
  const read = {
    title: dl.title,
    body: dl.body,
    call:
      typeof dl.call === "string" ? dl.call.replace(/\{phone\}/g, phoneDisplay) : dl.call,
    whatsapp: dl.whatsapp,
    linkLabel: dl.link?.label,
  };
  for (const [k, max] of Object.entries(DIALOG_MAX)) {
    const v = read[k];
    if (typeof v !== "string" || !v.trim()) {
      fail(where, `dialog.${k === "linkLabel" ? "link.label" : k} is required`);
      continue;
    }
    if (/[\r\n]/.test(v)) fail(where, `dialog.${k} contains a line break`);
    if ([...v].length > max)
      fail(
        where,
        `dialog.${k} is ${[...v].length} characters as read — max ${max}: "${v}"`,
      );
    if (ANY_QUOTE_RE.test(v)) fail(where, `a quote character in dialog.${k}: "${v}"`);
    const hit = findClaim(v, true);
    if (hit) fail(where, `⛔ ${hit} in dialog.${k}: "${v}"`);
  }
  if (typeof dl.call === "string" && !/\{phone\}/.test(dl.call)) {
    fail(where, "dialog.call must print the number through {phone}");
  }
  for (const k of ["title", "body", "whatsapp"]) {
    if (typeof dl[k] === "string" && /[{}]/.test(dl[k]))
      fail(where, `dialog.${k} may not contain a token`);
  }
  const typed = [
    dl.title,
    dl.body,
    typeof dl.call === "string" ? dl.call.replace(/\{phone\}/g, "") : "",
    dl.whatsapp,
    dl.link?.label,
  ].join(" ");
  if (LITERAL_PHONE_RE.test(typed))
    fail(where, "a typed phone number in the card — {phone} only, in dialog.call");
  if (/\d/.test(String(dl.whatsapp ?? "")))
    fail(where, "dialog.whatsapp is a word, never a number");
  if (!dl.link || !dl.link.href)
    fail(
      where,
      "dialog.link { label, href } is required — the card points at the advice it summarises",
    );
  else {
    if (!routeExists(dl.link.href))
      fail(where, `dialog.link.href "${dl.link.href}" is not a live route`);
    if (w.topbar?.link && safeDecode(dl.link.href) !== safeDecode(w.topbar.link.href)) {
      fail(
        where,
        "dialog.link.href must be the page the line links to — the source quote is checked against that page",
      );
    }
  }
  const cap = dl.capDays;
  if (cap !== undefined && !(Number.isInteger(cap) && cap >= 7 && cap <= 60)) {
    fail(
      where,
      `dialog.capDays must be a whole number of days, 7–60 (default 14), got ${JSON.stringify(cap)}`,
    );
  }
  const extra = Object.keys(dl).filter(
    (k) => !["title", "body", "call", "whatsapp", "link", "capDays"].includes(k),
  );
  if (extra.length) fail(where, `unknown dialog field(s): ${extra.join(", ")}`);
}

const campaigns = await loadModule(CAMPAIGNS);
if (existsSync(CAMPAIGNS) && !campaigns)
  fail("_campaigns.mjs", "the file exists but has no default export");
let windowCount = 0;
let intervalCount = 0;
let nextLine = null;
if (campaigns) {
  if (
    !campaigns.evergreen ||
    !campaigns.evergreen.topbar ||
    !campaigns.evergreen.topbar.text
  ) {
    fail("_campaigns.mjs", "missing evergreen.topbar.text — the JS-off state must exist");
  } else {
    checkCopy("_campaigns.mjs.evergreen", campaigns.evergreen);
    checkTopbar(
      "_campaigns.mjs.evergreen",
      campaigns.evergreen.topbar,
      EVERGREEN_MAX_CHARS,
    );
    if (!campaigns.evergreen.source)
      fail("_campaigns.mjs.evergreen", "missing source (business-facts row)");
  }

  const windows = Array.isArray(campaigns.windows) ? campaigns.windows : [];
  if (windows.some((w) => w.dialog)) {
    const close = campaigns.ui?.close;
    if (typeof close !== "string" || !close.trim() || [...close].length > 12) {
      fail(
        "_campaigns.mjs.ui.close",
        "required (the card's ✕ button needs an accessible name, ≤ 12 characters)",
      );
    } else checkCopy("_campaigns.mjs.ui", campaigns.ui);
  }
  const calendarKinds = new Set(calendarWindows.map((c) => c.kind));
  const ids = new Set();
  const lineOf = new Map(); // variant → the topbar it renders, as JSON
  const sound = []; // windows whose bounds parsed — safe to expand and compile

  for (const [i, w] of windows.entries()) {
    const where = `_campaigns.mjs.windows[${i}]`;
    if (!w.id) fail(where, "missing id");
    else if (ids.has(w.id)) fail(where, `duplicate id ${w.id}`);
    ids.add(w.id);
    if (w.id === "evergreen")
      fail(where, "`evergreen` is reserved for the default variant");
    if (!WINDOW_KINDS.includes(w.kind))
      fail(where, `kind must be one of ${WINDOW_KINDS.join(" | ")}, got ${w.kind}`);
    if (w.kind === "reduced")
      fail(
        where,
        "the `reduced` line is Phase 2 — it needs the status.json switch that reveals it",
      );
    if (w.pages !== undefined)
      fail(
        where,
        "`pages` is not read by anything — the pipeline decides the pages (lib/live/pages.mjs)",
      );
    if (w.dialog !== undefined) checkDialog(where, w);
    checkCopy(where, w);
    checkTopbar(where, w.topbar, TOPBAR_MAX_CHARS);
    await checkSource(where, w);

    const variant = w.variant || w.id;
    if (!VARIANT_RE.test(String(variant)))
      fail(
        where,
        `variant "${variant}" must match ${VARIANT_RE} — it becomes a CSS selector`,
      );
    if (variant === "evergreen")
      fail(where, "`evergreen` is reserved for the default variant");
    // app/enrich.css opens the bar on the calm pages for `[data-live^="safety-"]` only.
    if ((w.kind === "safety") !== /^safety-/.test(String(variant))) {
      fail(
        where,
        `a safety window's variant must start with "safety-", and no other kind's may — got kind ${w.kind}, variant "${variant}"`,
      );
    }
    const line = JSON.stringify([w.topbar ?? null, w.dialog ?? null]);
    if (lineOf.has(variant) && lineOf.get(variant) !== line)
      fail(
        where,
        `variant "${variant}" is used by another window with a different topbar or card`,
      );
    lineOf.set(variant, line);

    if (typeof w.priority !== "number") fail(where, "missing numeric priority");

    if (w.during !== undefined) {
      // Repeats inside every calendar window of that kind; from/until only bound the repetition.
      if (QUIET_KINDS.includes(w.during))
        fail(where, `during "${w.during}" is a quiet kind — nothing may show inside it`);
      else if (!calendarKinds.has(w.during))
        fail(where, `during "${w.during}" matches no window kind in _calendar.json`);
      let ok = true;
      for (const k of ["from", "until"]) {
        if (w[k] !== undefined && checkBound(where, k, w[k], true) === null) ok = false;
      }
      if (ok) sound.push(w);
    } else {
      const b = checkBounds(where, w, true);
      if (b) {
        sound.push(w);
        if (b.until < now - EXPIRED_DAYS * DAY) {
          warnings.push(
            `${where}: window ${w.id} ended ${iso10(b.until)} — remove it (its hidden line still ships on every page), or replace it with next year's window using the same variant`,
          );
        }
      }
    }
  }

  if (sound.length && !quietWindows.length) {
    fail(
      "_campaigns.mjs",
      "timed windows but no calendar with quiet windows — every line would run through every Shabbat. Run `node scripts/calendar-sync.mjs`",
    );
  }

  // From here on the rules read the schedule the way the browser will: expanded and compiled.
  const authored = (id) => id.split("@")[0];
  const concrete = expand(sound, calendarWindows);
  const tied = new Set();
  for (let i = 0; i < concrete.length; i += 1) {
    for (let j = i + 1; j < concrete.length; j += 1) {
      const a = concrete[i];
      const b = concrete[j];
      if (authored(a.id) === authored(b.id)) continue; // one window's own repetitions
      if (a.kind !== b.kind || a.priority !== b.priority || !overlaps(a, b)) continue;
      const pair = `${authored(a.id)}|${authored(b.id)}`;
      if (tied.has(pair)) continue; // a weekly window ties 60 times; say it once
      tied.add(pair);
      fail(
        `_campaigns.mjs window ${authored(a.id)}`,
        `overlaps ${authored(b.id)} with the same priority (${a.priority}) — ties are ambiguous`,
      );
    }
  }

  const intervals = compile(sound, calendarWindows);
  const safetyVariants = new Set(
    sound.filter((w) => w.kind === "safety").map((w) => w.variant || w.id),
  );
  for (const iv of intervals) {
    const q = quietWindows.find(
      (c) =>
        overlaps(iv, c) &&
        (HARD_QUIET_KINDS.includes(c.kind) || !safetyVariants.has(iv.variant)),
    );
    if (q)
      fail(
        "_campaigns.mjs",
        `compiled schedule shows "${iv.variant}" inside quiet window ${q.id} (${new Date(q.from).toISOString()} → ${new Date(q.until).toISOString()}) — a compiler bug, do not ship`,
      );
    if (calendarEnd && iv.until > calendarEnd) {
      fail(
        "_campaigns.mjs",
        `"${iv.variant}" is scheduled until ${iso10(iv.until)}, past the calendar's last quiet window (${iso10(calendarEnd)}) — no Shabbat is known there. Extend the overlay's verifiedThrough and run \`node scripts/calendar-sync.mjs\``,
      );
    }
  }

  const shown = winners(sound, calendarWindows);
  for (const w of sound) {
    if (!shown.has(w.id))
      fail(
        `_campaigns.mjs window ${w.id}`,
        "never shows — it is outranked or silenced for its whole life. Remove it or fix its dates/priority",
      );
  }

  windowCount = sound.length;
  intervalCount = intervals.length;
  // Runway on the fixed-date windows: the weekly `during` slot reaches the calendar's end by
  // construction and would hide a register where next season's line was never written.
  const fixed = sound.filter((w) => w.during === undefined);
  const fixedEnd = fixed.reduce((m, w) => Math.max(m, boundMs(w.until)), 0);
  if (fixed.length && fixedEnd < now + RUNWAY_DAYS * DAY) {
    clockFail(
      "_campaigns.mjs",
      `runway: the last fixed-date line ends ${iso10(fixedEnd)} — fewer than ${RUNWAY_DAYS} days ahead; author the next one`,
    );
  }
  if (!windowCount)
    warnings.push(
      "_campaigns.mjs: no timed windows — the bar shows the evergreen line only",
    );
  const fixedVariants = new Set(fixed.map((w) => w.variant || w.id));
  const upcoming = intervals.find((iv) => iv.from > now && fixedVariants.has(iv.variant));
  const current = intervals.find((iv) => iv.from <= now && now < iv.until);
  nextLine = {
    current: current ? current.variant : "evergreen",
    upcoming: upcoming
      ? `${upcoming.variant} from ${iso10(upcoming.from)}`
      : "none authored",
    fixedEnd: fixed.length ? iso10(fixedEnd) : "—",
  };
}

// ---------------------------------------------------------------------------------------
// updates
// ---------------------------------------------------------------------------------------

const updates = await loadModule(UPDATES);
if (existsSync(UPDATES) && !updates)
  fail("_updates.mjs", "the file exists but has no default export");
let updateCount = 0;
if (updates) {
  if (Array.isArray(updates) || !Array.isArray(updates.items)) {
    fail("_updates.mjs", "default export must be { heading, items: [...] }");
  } else if (
    updates.items.length &&
    (typeof updates.heading !== "string" || !updates.heading.trim())
  ) {
    fail("_updates.mjs", "heading is required when there are items");
  } else {
    if (updates.heading) {
      checkCopy("_updates.mjs", { heading: updates.heading });
      lineRules("_updates.mjs.heading", updates.heading);
    }
    const items = updates.items;
    updateCount = items.length;
    const seenDates = new Set();
    // Israel's civil date, not UTC: between 00:00 and 03:00 Israel time the UTC date is still
    // yesterday, and the owner's weekly paste tends to happen late. +3 h is Israel's summer
    // offset; in winter it is one hour generous, which can only ever ACCEPT a real same-day item.
    const today = new Date(now + 3 * 3_600_000).toISOString().slice(0, 10);
    for (const [i, u] of items.entries()) {
      const where = `_updates.mjs.items[${i}]`;
      if (seenDates.has(u.date))
        fail(where, `two items on ${u.date} — one a day keeps the strip readable`);
      seenDates.add(u.date);
      if (DATE_RE.test(u.date ?? "") && !realDate(u.date))
        fail(where, `date ${u.date} is not a real date`);
      if (u.linkLabel !== undefined) lineRules(`${where}.linkLabel`, u.linkLabel);
      if (!DATE_RE.test(u.date ?? ""))
        fail(where, `date must be YYYY-MM-DD, got ${JSON.stringify(u.date)}`);
      else if (u.date > today) fail(where, `date ${u.date} is in the future`);
      if (!u.text) fail(where, "missing text");
      else {
        if (u.text.length > UPDATE_MAX_CHARS)
          fail(where, `text is ${u.text.length} chars — max ${UPDATE_MAX_CHARS}`);
        const promo = findClaim(u.text, true);
        if (promo) fail(where, `⛔ ${promo}: "${u.text.slice(0, 80)}"`);
        if (LITERAL_PHONE_RE.test(u.text))
          fail(
            where,
            "a typed phone number in an update — link the page that carries it instead",
          );
      }
      if (!u.source) fail(where, "missing source");
      if (u.href !== undefined) {
        // Cards link only to pages of this site — never off-site (the Business Profile still
        // carries the 12 non-genuine reviews: plan §3.4 State A).
        if (/^https?:\/\//.test(u.href))
          fail(where, "href must be a page of this site, not an external URL");
        else if (!routeExists(u.href))
          fail(where, `href "${u.href}" is not a live route`);
        if (
          typeof u.linkLabel !== "string" ||
          !u.linkLabel.trim() ||
          [...u.linkLabel].length > 18
        )
          fail(where, "linkLabel (≤ 18 characters) is required with href");
      }
      if (u.image !== undefined && u.image !== null)
        fail(
          where,
          "image is not supported yet — owner photos come through Media Studio (plan §3.3)",
        );
      if (ANY_QUOTE_RE.test(u.text ?? "")) fail(where, "a quote character in the text");
      checkCopy(where, u);
    }
  }
}

// ---------------------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------------------

console.log(
  `campaigns: ${campaigns ? `${windowCount} timed window(s) → ${intervalCount} interval(s)` : "no _campaigns.mjs yet"} · ` +
    `${updates ? `${updateCount} update(s)` : "no _updates.mjs yet"} · ` +
    `${calendar.length ? `${calendar.length} calendar window(s), ${hardQuiet.length} hard-quiet, quiet through ${iso10(calendarEnd)}` : "no _calendar.json yet"}`,
);
if (nextLine) {
  console.log(
    `campaigns: showing now: ${nextLine.current} · next fixed-date line: ${nextLine.upcoming} · last fixed-date line ends ${nextLine.fixedEnd}`,
  );
}
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
if (!campaigns && !updates && !calendar.length) {
  console.log("campaigns: nothing to validate yet ✅");
  process.exit(0);
}
console.log(`campaigns: registers valid ✅ (quiet kinds: ${QUIET_KINDS.join(", ")})`);
