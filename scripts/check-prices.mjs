/**
 * Every car-key price on the site must sit on the row the owner chose for its key type.
 *
 * WHY THIS EXISTS — on 2026-11-03 the same key type was priced on different rows on different
 * pages: a chip key was 200 – 350 ₪ on page 95 and the cost guide but 350 – 550 ₪ in 17 brand
 * tables, and Push-Start was 300 – 600 ₪ in 18 legacy rows but 450 – 900 ₪ in the same pages'
 * spec tables. An answer engine quotes whichever number it lifts, so two of our pages disagreeing
 * is worse than either number alone. On 2026-11-04 the owner chose one model of four rows
 * (content/enriched/_prices.mjs, docs/business-facts.md §D.1).
 *
 * TWO RULES, read from the RENDERED content/site.json (the homepage is scraped markup, not a
 * module, so a module-level check could not see it):
 *
 *   price-whitelist  BLOCKING everywhere. On car pages (the "שכפול מפתח" family, the car
 *                    services and landers, the homepage) every "N – M ₪" range must be one of the
 *                    four rows. A fifth number is a price nobody chose.
 *   price-row        RATCHETED (scripts/check-ratchet.mjs). A price whose label names a key type —
 *                    a table row, or the words next to a price in prose — must equal that key
 *                    type's row. Full rule on pages in content/geo-ratchet.json `done`; elsewhere
 *                    the count may only fall.
 *
 * The classifier is deliberately literal. A label it cannot place (a generic "שכפול מפתח רכב
 * בגבעתיים", a cylinder, a keypad) is skipped, never guessed. Mutation-tested 2026-11-04.
 *
 *   node scripts/check-prices.mjs [--verbose] [--ratchet] [--init]
 */
import { readFileSync } from "node:fs";
import { parse } from "node-html-parser";
import { PRICE } from "../content/enriched/_prices.mjs";
import { _internals as CATALOG } from "../lib/enrich/catalog-image.mjs";
import { judge } from "./check-ratchet.mjs";

const RANGE = /(\d[\d,]*)\s*[–—-]\s*(\d[\d,]*)\s*₪/g;
const ROWS = new Map(
  Object.entries(PRICE)
    .filter(([k]) => k !== "byModel")
    .map(([k, v]) => [v, k]),
);

// ---------------------------------------------------------------------------------------------
// The classifier: label text → a key of PRICE, or null when the label is not a car-key price.
// Order matters; each step is the reason the next one is safe.
// ---------------------------------------------------------------------------------------------
const NO_KEY = /ללא מקור|מאפס|שחזור|All Keys Lost|איבוד כל|אובדן כל|אבדו כל|אין אף מפתח/i;
// "שכפול ולא שחזור" / "ולא בשחזור מלא" say the opposite of a no-key job — drop them first.
const NEGATED_NO_KEY = /(?:ו?לא|ללא צורך)\s*(?:ב|ל)?שחזור/g;
const CAR_OPENING = /פתיחת (?:דלתות |דלת )?(?:ה)?רכב|פריצה וחילוץ|חילוץ (?:מ)?רכב/;
// Coding-only and programming services ("קידוד מפתח קיים", "תכנות יחידת אימובילייזר") price a job
// the four rows do not model — no blade is cut — so they are skipped, not forced onto a row.
const PROGRAMMING = /^(?:קידוד|תכנות|רישום|סנכרון)/;
const NOT_CAR_KEY =
  /צילינדר|מנעול|דלת בית|דלת נעולה|דלת פלדלת|דלתות|קודן|לוח מקשים|בריח|מולטילוק|פלדלת|ממ״ד|ממד|כספת|מתג|סוללה|מעטפת/;
// The emergency blade inside a smart key or a key card is a mechanical blade, not the smart key —
// but only when the row IS the blade. "מפתח קרבה … עם להב חירום" is the smart key itself.
const EMERGENCY_BLADE = /^(?:שכפול )?(?:להב חירום|מפתח חירום)/;
// "ללא שבב" is a mechanical key, "ללא להב" a remote: drop the negated term before matching it —
// whole, so "ללא שבב אימובילייזר" does not leave "אימובילייזר" behind to look like a chip key.
const NEGATED = /(?:ללא|בלי)\s+(?:שבב(?:\s+אימובילייזר)?|אימובילייזר|להב|שלט|קידוד)/g;
const SMART = /חכם|קרבה|ללא מגע|Push[\s-]?Start|התנעת לחצן|Keyless|כרטיס/i;
const FLIP = /מתקפל|Flip/i;
const CHIP = /שבב|אימובילייזר|Transponder|טרנספונדר|צ׳יפ/i;
// A key with its remote built in is the chip / flip row, not the remote-only row:
// "מפתח עם שלט", "מפתח נשלף עם שלט", "מפתח-שלט", "מפתח עם ראש שלט", "שלט מובנה".
const INTEGRATED =
  /מפתח(?:[-\s]\S+){0,2}\s+עם (?:ראש )?שלט|מפתח[-\s]שלט|מפתח ושלט|ראש שלט|שלט משולב|שלט מובנה/;
const REMOTE = /שלט/;
// Narrow on purpose: a bare "רגיל" or "להב" turns up in keypad and lock rows too.
const MECHANICAL = /מכני|סטנדרטי|מפתח רגיל|להב בלבד|חיתוך בלבד/;

export function classify(label) {
  const t = String(label ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (NO_KEY.test(t.replace(NEGATED_NO_KEY, " "))) return "byModel";
  if (CAR_OPENING.test(t)) return "remoteOrOpening";
  if (PROGRAMMING.test(t)) return null;
  if (NOT_CAR_KEY.test(t)) return null;
  if (EMERGENCY_BLADE.test(t)) return "mechanical";
  const s = t.replace(NEGATED, " ");
  if (SMART.test(s)) return "smart";
  if (FLIP.test(s)) return "chipOrFlip";
  if (CHIP.test(s)) return "chipOrFlip";
  if (INTEGRATED.test(s)) return "chipOrFlip";
  if (REMOTE.test(s)) return "remoteOrOpening";
  if (MECHANICAL.test(s)) return "mechanical";
  return null;
}

/** "200-350 ₪" / "200 – 350 ₪" → "200 – 350 ₪"; "לפי דגם…" → "לפי דגם"; anything else → raw. */
export function normalisePrice(text) {
  const t = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  RANGE.lastIndex = 0;
  const m = RANGE.exec(t);
  if (m) return `${m[1]} – ${m[2]} ₪`;
  if (t.startsWith("לפי דגם")) return PRICE.byModel;
  return t;
}

export function expected(key) {
  return PRICE[key];
}

/** Is `found` acceptable for key type `key`? byModel accepts "לפי דגם" and its hedged forms. */
export function fits(key, found) {
  if (key === "byModel") return found === PRICE.byModel;
  return found === PRICE[key];
}

// ---------------------------------------------------------------------------------------------
// Prose: classify the words next to each price. "עולה 200 – 350 ₪ למפתח מכני" names the key
// after the price; "מפתח עם שבב נע בטווח 350 – 550 ₪" names it before. Windows never cross a
// clause boundary or another price.
// ---------------------------------------------------------------------------------------------
const BOUNDARY = /[.;:!?,()\n]/;
const AFTER_KEY = /^\s*(?:ו)?ל(?:מפתח|שלט|פתיחת|שכפול|שחזור|קידוד)/;

export function prosePrices(text) {
  const out = [];
  const t = String(text ?? "");
  const hits = [...t.matchAll(RANGE)];
  hits.forEach((m, i) => {
    const start = m.index;
    const end = m.index + m[0].length;
    const prevEnd = i > 0 ? hits[i - 1].index + hits[i - 1][0].length : 0;
    const nextStart = i + 1 < hits.length ? hits[i + 1].index : t.length;
    let before = t.slice(prevEnd, start);
    const cut = Math.max(...[...before].map((c, j) => (BOUNDARY.test(c) ? j : -1)));
    if (cut >= 0) before = before.slice(cut + 1);
    let after = t.slice(end, nextStart);
    const stop = [...after].findIndex((c) => BOUNDARY.test(c));
    if (stop >= 0) after = after.slice(0, stop);
    // After a price a spaced dash opens a new clause ("… 350 – 550 ₪ למפתח עם שבב – לעומת שחזור
    // מלא"), so it ends the window there. Not before a price: "מפתח חכם – 450 – 900 ₪" names the
    // key before the dash, and the price's own dash is never inside either window.
    const dash = after.indexOf(" – ");
    if (dash >= 0) after = after.slice(0, dash);
    const window = AFTER_KEY.test(after) ? after : before;
    out.push({
      found: `${m[1]} – ${m[2]} ₪`,
      key: classify(window),
      context: window.trim().slice(-70),
    });
  });
  return out;
}

// ---------------------------------------------------------------------------------------------
// The scan.
// ---------------------------------------------------------------------------------------------
function carScope(manifest) {
  const ids = new Set([7, ...CATALOG.CAR_SERVICES, ...CATALOG.CAR_CORE]);
  for (const p of manifest.pages) if (p.inFamily || p.kind === "brand-key") ids.add(p.id);
  return ids;
}

export function scanSite(site, manifest) {
  const scope = carScope(manifest);
  const rowViolations = [];
  const whitelistViolations = [];
  for (const page of site.pages) {
    const root = parse(page.bodyHtml || "", {
      blockTextElements: { script: false, style: false },
    });
    const main =
      root.querySelector("main.page-template-builder") ||
      root.querySelector("main") ||
      root;

    // Tables: the label is every non-price cell of the row.
    for (const tr of main.querySelectorAll("tr")) {
      const cells = tr
        .querySelectorAll("td,th")
        .map((c) => c.text.replace(/\s+/g, " ").trim());
      cells.forEach((cell, i) => {
        const found = normalisePrice(cell);
        const isPrice = found === PRICE.byModel || /₪$/.test(found);
        if (!isPrice || !/\d|לפי/.test(cell)) return;
        const label = cells.filter((_, j) => j !== i).join(" | ");
        const key = classify(label);
        if (key && !fits(key, found)) {
          rowViolations.push({
            id: page.id,
            path: page.path,
            where: "table",
            label,
            found,
            want: expected(key),
          });
        }
      });
      tr.remove(); // keep table text out of the prose pass below
    }

    // Prose: what is left of <main>, plus the title and description that SERPs show.
    // structuredText puts a newline between block elements, so a window never runs from one
    // heading or card into the next ("…ארוכה יותר" + "שלט נעילה" read as one clause otherwise).
    const text = [main.structuredText, page.seo?.title, page.seo?.description].join("\n");
    for (const hit of prosePrices(text)) {
      if (scope.has(page.id) && !ROWS.has(hit.found)) {
        whitelistViolations.push({
          id: page.id,
          path: page.path,
          found: hit.found,
          context: hit.context,
        });
      }
      if (hit.key && !fits(hit.key, hit.found)) {
        rowViolations.push({
          id: page.id,
          path: page.path,
          where: "prose",
          label: hit.context,
          found: hit.found,
          want: expected(hit.key),
        });
      }
    }
  }
  return { rowViolations, whitelistViolations };
}

// ---------------------------------------------------------------------------------------------
if (process.argv[1] && process.argv[1].endsWith("check-prices.mjs")) {
  const site = JSON.parse(readFileSync("content/site.json", "utf8"));
  const manifest = JSON.parse(readFileSync("content/enriched/_manifest.json", "utf8"));
  const { rowViolations, whitelistViolations } = scanSite(site, manifest);
  const path = (v) => {
    try {
      return decodeURIComponent(v.path);
    } catch {
      return v.path;
    }
  };
  let failed = false;

  if (whitelistViolations.length) {
    failed = true;
    console.error(
      `✗ price-whitelist: ${whitelistViolations.length} range(s) on car pages outside the four rows:`,
    );
    for (const v of whitelistViolations)
      console.error(`    id ${v.id} ${path(v)} — ${v.found} after "${v.context}"`);
  } else {
    console.log(
      "• price-whitelist: every range on a car page is one of the four rows ✅",
    );
  }

  const verdict = judge("price-row", rowViolations, {
    verbose: process.argv.includes("--verbose"),
    describe: (v) =>
      `id ${v.id} ${path(v)} [${v.where}] "${v.label.slice(0, 80)}" → ${v.found}, want ${v.want}`,
  });
  for (const l of verdict.lines) (verdict.failed ? console.error : console.log)(l);
  failed ||= verdict.failed;

  console.log(
    failed ? "prices: FAILED" : "prices: no price contradicts its key type's row ✅",
  );
  process.exit(failed ? 1 : 0);
}
