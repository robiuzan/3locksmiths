/**
 * Fills the theme's own top bar with the announcement variants, on every page
 * (docs/dynamic-presence-plan.md §3.1; /dynamic-presence).
 *
 * THE SLOT ALREADY EXISTS. The scraped header carries
 *   <div class="nav-main__top-bar"><div class="container">שירות מהיר ומיידי</div></div>
 * as the first child of `.nav-main` on all 109 pages, hidden by the vendored theme
 * (`display: none`, main.css:1008). Its one line is an unquantified speed claim, so it is
 * replaced, never revealed. Because the slot sits INSIDE `.nav-main`, the theme's nav.js
 * measures it and it rides the fixed header with no code of ours.
 *
 * WHAT THIS WRITES, AND WHY EVERY VARIANT AT ONCE
 *   The date is chosen in the visitor's browser, because `npm run enrich` must stay
 *   byte-deterministic and deploys are human-run: a line picked at build time would be frozen
 *   until the next deploy. So all variants ship in the page, as real elements, and one is
 *   revealed. Real elements — not JSON in a <script> — is the point: scripts/check-claims.mjs
 *   strips <script> blocks before it matches, so copy stored as data would bypass every ⛔ rule.
 *   Here the claims guards, fix-links (each href is validated against the route set) and
 *   phone.mjs all see every word.
 *
 *   The region root is marked `data-lm-ignore` and `data-nosnippet`:
 *     · scripts/lastmod.mjs cuts `data-lm-ignore` elements out before hashing, so rewording a
 *       line does not re-stamp <lastmod> on every URL in the sitemap;
 *     · `data-nosnippet` keeps a December line from becoming the search snippet in March.
 *   An attribute, not an HTML comment: the passes after this one re-parse the body with
 *   node-html-parser's defaults, which drop comments.
 *
 *   The evergreen line is rendered LAST. The head script reveals variant v with
 *     [data-campaign="v"]{display:flex!important}  [data-campaign="v"] ~ [data-campaign="evergreen"]{display:none}
 *   so on a page that does not carry v, nothing matches and the evergreen line simply stays.
 *
 * CALM PAGES. The emergency cluster (ids 93xx) and the calculator steps (/step/…) are read by
 * someone in the middle of something: locked out, or pricing a job. A seasonal tip there is a
 * distraction and a link away from the call. Those pages get `data-live-calm` on the header,
 * carry only the evergreen line and the safety lines (the hot-car warning belongs on the
 * locked-car page more than anywhere), and app/enrich.css keeps the bar shut on a phone unless a
 * safety line is live.
 *
 * IT ALSO WRITES THE SCHEDULE, twice, from one compile (lib/live/compile.mjs — windows minus
 * quiet days, precedence applied):
 *   · site.assets.liveHead — the finished inline <head> script (lib/live/head-script.mjs), which
 *     app/layout.tsx prints verbatim. It carries ids and minutes, no copy.
 *   · public/assets/live-schedule.json — the same intervals, readable. The reminder routine
 *     fetches it from production to warn before the schedule runs out, and a human can diff it.
 *
 * PIPELINE POSITION:  … footer → **live-surfaces** → form → … → fix-links → phone → lastmod
 *   before fix-links, so a broken href fails the build; before lastmod, which must see the
 *   region to exclude it.
 *
 * Idempotent: the slot's content is replaced wholesale, so repeated `npm run enrich` runs
 * converge. It no-ops while content/enriched/_campaigns.mjs has never existed — but once the
 * bar is in site.json, a missing register FAILS: the lines would otherwise keep shipping with
 * a green gate, unreproducible in CI. The off switch is `windows: []`, never deleting the file.
 * A page whose header the pass cannot find fails too — every page has the slot today, and the
 * desktop CSS would otherwise reveal the scraped speed claim in an unfilled slot.
 *
 *   node scripts/live-surfaces.mjs      (chained into `npm run enrich`)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "node-html-parser";
import { compile } from "../lib/live/compile.mjs";
import { liveHeadScript } from "../lib/live/head-script.mjs";
import { pieces } from "../lib/live/topbar.mjs";
import { isCalm } from "../lib/live/pages.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "content", "site.json");
const CAMPAIGNS = join(ROOT, "content", "enriched", "_campaigns.mjs");
const CALENDAR = join(ROOT, "content", "enriched", "_calendar.json");
const CONFIG = join(ROOT, "site.config.json");
const SCHEDULE_OUT = join(ROOT, "public", "assets", "live-schedule.json");

const fail = (msg) => {
  console.error(`\nLIVE-SURFACES PROBLEM: ${msg}`);
  process.exit(1);
};

if (!existsSync(CAMPAIGNS)) {
  const raw = readFileSync(FILE, "utf8");
  if (raw.includes("data-lm-ignore") || raw.includes('"liveHead"')) {
    fail(
      "content/enriched/_campaigns.mjs is missing but content/site.json already carries the bar. " +
        "Restore the register (the off switch is `windows: []`), or the lines ship unreproducibly.",
    );
  }
  console.log(
    "live-surfaces: no content/enriched/_campaigns.mjs — top bar left as scraped (0 changed).",
  );
  process.exit(0);
}

const campaigns = (await import(pathToFileURL(CAMPAIGNS).href)).default;
if ((campaigns.windows ?? []).length && !existsSync(CALENDAR)) {
  fail(
    "content/enriched/_calendar.json is missing — without it every line would run through every Shabbat. Run node scripts/calendar-sync.mjs first.",
  );
}
const calendar = existsSync(CALENDAR)
  ? JSON.parse(readFileSync(CALENDAR, "utf8")).windows
  : [];
const site = JSON.parse(readFileSync(FILE, "utf8"));
const config = JSON.parse(readFileSync(CONFIG, "utf8"));

if (!campaigns?.evergreen?.topbar?.text)
  fail("_campaigns.mjs has no evergreen.topbar.text.");

// NAP from the manifest, never typed here (CLAUDE.md §6). WhatsApp keeps its own number: the
// 076 line cannot receive it (docs/business-facts.md §C.5).
const PHONE = config.contact.phoneDisplay;
const TEL = config.contact.phoneE164;
const WA = String(config.contact.whatsappE164 ?? TEL).replace(/\D/g, "");

/** Minimal HTML-escape for text we inject as element content or attribute values. */
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const safeDecode = (s) => {
  try {
    return decodeURI(s);
  } catch {
    return s;
  }
};
// Authored hrefs are written in readable Hebrew; the page set stores them percent-encoded. Emit
// the stored spelling so the link is byte-identical to every other link to that page.
const storedPath = new Map(site.pages.map((p) => [safeDecode(p.path), p.path]));
const href = (authored, where) => {
  const hit = storedPath.get(safeDecode(authored));
  if (!hit)
    fail(`${where}: link target ${authored} is not a route in content/site.json.`);
  return hit;
};

/** One variant: <p data-campaign="id"> text + its links. Non-evergreen ones are `hidden`, so a
 *  page whose CSS failed to load still shows exactly one line, and never an out-of-season one.
 *  The `-call` / `-whatsapp` suffix on data-cta is what the shared GTM container counts as a
 *  contact_click; `topbar-link` deliberately is not one. `selfPath` is the page being
 *  rendered: a line whose link points at the page it is on keeps its text and drops the link. */
function item(id, topbar, selfPath) {
  const where = `_campaigns.mjs variant "${id}"`;
  if (!/^[a-z0-9-]+$/.test(id)) fail(`${where}: ids must match [a-z0-9-]+.`);
  if (!topbar?.text) fail(`${where}: missing topbar.text.`);
  const text = pieces(topbar.text)
    .map((p) => {
      if (p.text !== undefined) return esc(p.text);
      if (p.token === "phone") {
        return `<a class="live-topbar__link" href="tel:${TEL}" data-cta="topbar-call" dir="ltr">${esc(PHONE)}</a>`;
      }
      if (!p.label)
        fail(`${where}: {whatsapp} needs a label — write {whatsapp:וואטסאפ}.`);
      return `<a class="live-topbar__link" href="https://wa.me/${WA}" target="_blank" rel="noopener" data-cta="topbar-whatsapp">${esc(p.label)}</a>`;
    })
    .join("");
  let inner = `<span class="live-topbar__text">${text}</span>`;
  if (topbar.link) {
    const target = href(topbar.link.href, where);
    // A literal space before the link: the flex gap draws the visible one, but a text-only
    // reader (reader mode, a crawler that ignores `hidden`) would otherwise see גיבוילמדריך.
    if (target !== selfPath) {
      inner += ` <a class="live-topbar__link live-topbar__more" href="${target}" data-cta="topbar-link">${esc(topbar.link.label)}</a>`;
    }
  }
  return `<p class="live-topbar__item" data-campaign="${id}"${id === "evergreen" ? "" : " hidden"}>${inner}</p>`;
}

// One element per VARIANT, not per window: the weekly slot is ~60 windows and one sentence.
const variants = new Map();
for (const w of campaigns.windows ?? []) {
  const v = w.variant || w.id;
  if (v === "evergreen")
    fail(`window "${w.id}" may not use the reserved variant "evergreen".`);
  if (!variants.has(v)) variants.set(v, { topbar: w.topbar, kind: w.kind });
}
/** The region's items for one page: every line, or only the safety lines on a calm page. */
const itemsFor = (page, calm) =>
  [...variants]
    .filter(([, v]) => !calm || v.kind === "safety")
    .map(([id, v]) => item(id, v.topbar, page.path))
    .join("") + item("evergreen", campaigns.evergreen.topbar, page.path);

let filled = 0;
let calm = 0;
for (const page of site.pages) {
  const root = parse(page.bodyHtml, {
    blockTextElements: { script: true, style: true, noscript: true, pre: true },
  });
  const header = root.querySelector(".template-header");
  const bar = root.querySelector(".nav-main .nav-main__top-bar");
  if (!header || !bar) {
    fail(
      `${safeDecode(page.path)} has no ${header ? ".nav-main .nav-main__top-bar" : ".template-header"} — every page carries the theme header; an unfilled slot would show the scraped claim.`,
    );
  }
  const quietPage = isCalm(page);
  if (quietPage) {
    header.setAttribute("data-live-calm", "");
    calm++;
  } else if (header.hasAttribute("data-live-calm")) {
    header.removeAttribute("data-live-calm"); // (guarded: removing a missing attribute re-prints the tag)
  }
  // The marker class is what app/enrich.css keys the bar's display on — never the bare slot, so
  // a slot this pass did not fill stays hidden.
  bar.setAttribute("class", "nav-main__top-bar nav-main__top-bar--live");
  bar.set_content(
    `<div class="container live-topbar" data-lm-ignore data-nosnippet>${itemsFor(page, quietPage)}</div>`,
  );
  page.bodyHtml = root.toString();
  filled++;
}

// --- the compiled schedule -----------------------------------------------------------------
const intervals = compile(campaigns.windows ?? [], calendar);
for (const iv of intervals) {
  if (!variants.has(iv.variant))
    fail(`the schedule names variant "${iv.variant}" but no such line was rendered.`);
}
const schedule = {
  about:
    "Generated by scripts/live-surfaces.mjs from content/enriched/_campaigns.mjs and _calendar.json — do not edit. " +
    "Each interval is a stretch where a line OTHER than the evergreen one shows; quiet days are already subtracted. " +
    "Shabbat and holiday times: Hebcal.com (CC BY 4.0).",
  variants: [...variants.keys(), "evergreen"],
  intervals: intervals.map((iv) => ({
    variant: iv.variant,
    from: new Date(iv.from).toISOString(),
    until: new Date(iv.until).toISOString(),
  })),
};
site.assets.liveHead = liveHeadScript(intervals);
mkdirSync(dirname(SCHEDULE_OUT), { recursive: true });
writeFileSync(SCHEDULE_OUT, JSON.stringify(schedule, null, 2) + "\n", "utf8");
writeFileSync(FILE, JSON.stringify(site, null, 2), "utf8");

const last = intervals[intervals.length - 1];
console.log(
  `live-surfaces: top bar filled on ${filled} page(s), ${calm} of them calm — ` +
    `${variants.size + 1} variant(s): ${[...variants.keys(), "evergreen"].join(", ")}`,
);
console.log(
  `live-surfaces: schedule → ${intervals.length} interval(s)` +
    (last
      ? `, last one ends ${new Date(last.until).toISOString().slice(0, 10)}; head script ${site.assets.liveHead.length} B`
      : ` (evergreen only)`),
);
