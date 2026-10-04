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
 * THE SEASONAL CARD (Phase 2, plan §3.2). A window with a `dialog` gets a closed
 * <dialog data-dialog="<variant>"> in a second region — `.live-dialogs`, data-lm-ignore +
 * data-nosnippet, at the end of the body — on every page that allows one
 * (lib/live/pages.mjs allowsDialog: not calm, no 100/101 sentence, not the card's own link
 * target). public/assets/live.js opens it when <html data-live> names that variant and the visit
 * rules allow; that file carries no copy. Its URL is versioned with a content hash
 * (site.assets.liveJs) because nothing in public/_headers sets caching for /assets/.
 *
 * THE UPDATES STRIP (Phase 2, plan §3.3). When content/enriched/_updates.mjs has items, the
 * homepage gets a `.live-updates` section after `.section-advantages` — deliberately NOT a live
 * region: a new item is a real content change and should move the homepage <lastmod>.
 * `data-newest` lets live.js hide it once the newest item is 45 days old.
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
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "node-html-parser";
import { compile } from "../lib/live/compile.mjs";
import { liveHeadScript } from "../lib/live/head-script.mjs";
import { pieces } from "../lib/live/topbar.mjs";
import { allowsDialog, isCalm } from "../lib/live/pages.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "content", "site.json");
const CAMPAIGNS = join(ROOT, "content", "enriched", "_campaigns.mjs");
const CALENDAR = join(ROOT, "content", "enriched", "_calendar.json");
const CONFIG = join(ROOT, "site.config.json");
const SCHEDULE_OUT = join(ROOT, "public", "assets", "live-schedule.json");
const UPDATES = join(ROOT, "content", "enriched", "_updates.mjs");
const LIVE_JS = join(ROOT, "public", "assets", "live.js");

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
// `reduced` and `off` are the status switch's states (lib/live/head-script.mjs), never a window's.
const RESERVED = ["evergreen", "reduced", "off"];
const variants = new Map();
for (const w of campaigns.windows ?? []) {
  const v = w.variant || w.id;
  if (RESERVED.includes(v))
    fail(`window "${w.id}" may not use the reserved variant "${v}".`);
  if (!variants.has(v)) variants.set(v, { topbar: w.topbar, kind: w.kind });
}
// The wartime line: no window, never in the schedule — only the status switch reveals it
// (live.js → html[data-live-mode="reduced"] → the head script picks it). Every page carries it,
// the calm ones included: it is about whether we work, not a tip.
if (campaigns.reduced) {
  if (campaigns.reduced.topbar?.link)
    fail("_campaigns.mjs reduced: the wartime line carries no link.");
  variants.set("reduced", { topbar: campaigns.reduced.topbar, kind: "reduced" });
}
/** The region's items for one page: every line, or only the safety + wartime lines on a calm page. */
const itemsFor = (page, calm) =>
  [...variants]
    .filter(([, v]) => !calm || v.kind === "safety" || v.kind === "reduced")
    .map(([id, v]) => item(id, v.topbar, page.path))
    .join("") + item("evergreen", campaigns.evergreen.topbar, page.path);

/** Text with the {phone} token: the number as an LTR island inside the label. */
const withPhone = (text) =>
  pieces(text)
    .map((p) =>
      p.text !== undefined
        ? esc(p.text)
        : p.token === "phone"
          ? `<span dir="ltr">${esc(PHONE)}</span>`
          : esc(p.label),
    )
    .join("");

/** The cards: one closed <dialog> per variant whose window carries a `dialog`. */
const cards = new Map();
for (const w of campaigns.windows ?? []) {
  if (!w.dialog) continue;
  const v = w.variant || w.id;
  if (!cards.has(v)) cards.set(v, w.dialog);
}
const CLOSE_LABEL = campaigns.ui?.close;
if (cards.size && !CLOSE_LABEL)
  fail("_campaigns.mjs needs ui.close (the ✕ button's accessible name).");

function card(v, dialog, selfPath) {
  const where = `_campaigns.mjs dialog "${v}"`;
  for (const k of ["title", "body", "call", "whatsapp"]) {
    if (!dialog[k]) fail(`${where}: missing ${k}.`);
  }
  const id = `live-dialog-${v}`;
  let html =
    `<dialog class="live-dialog" data-dialog="${v}" data-cap-days="${Number(dialog.capDays) || 14}" aria-labelledby="${id}-title" aria-describedby="${id}-body">` +
    // Focus lands on the title (tabindex=-1 + autofocus), not on the call link — a stray Enter on
    // open must not start a phone call. Tab reaches the call button next.
    `<p class="live-dialog__title" id="${id}-title" tabindex="-1" autofocus>${esc(dialog.title)}</p>` +
    `<p class="live-dialog__body" id="${id}-body">${esc(dialog.body)}</p>` +
    `<div class="live-dialog__actions">` +
    `<a class="live-dialog__btn live-dialog__btn--call" href="tel:${TEL}" data-cta="popup-call"><span>${withPhone(dialog.call)}</span></a>` +
    ` <a class="live-dialog__btn live-dialog__btn--wa" href="https://wa.me/${WA}" target="_blank" rel="noopener" data-cta="popup-whatsapp">${esc(dialog.whatsapp)}</a>` +
    `</div>`;
  if (dialog.link) {
    const target = href(dialog.link.href, where);
    if (target !== selfPath) {
      html += `<a class="live-dialog__more" href="${target}" data-cta="popup-link">${esc(dialog.link.label)}</a>`;
    }
  }
  // Last in the DOM so the first focus lands on the call button, drawn top-corner by the CSS.
  html += `<button type="button" class="live-dialog__close" aria-label="${esc(CLOSE_LABEL)}"><span aria-hidden="true">×</span></button></dialog>`;
  return html;
}

/** The cards one page may carry: none on calm / 100-101 pages, none on a card's own target. */
function cardsFor(page) {
  if (!cards.size || !allowsDialog(page)) return "";
  const html = [...cards]
    .filter(
      ([, dialog]) =>
        !dialog.link || storedPath.get(safeDecode(dialog.link.href)) !== page.path,
    )
    .map(([v, dialog]) => card(v, dialog, page.path))
    .join("");
  return html
    ? `<div class="live-dialogs" data-lm-ignore data-nosnippet>${html}</div>`
    : "";
}

// --- the updates strip --------------------------------------------------------------------
const updates = existsSync(UPDATES)
  ? (await import(pathToFileURL(UPDATES).href)).default
  : null;
const updateItems = Array.isArray(updates?.items) ? updates.items : [];
/** "2026-09-02" → "02/09/2026" — pre-rendered, never Intl (CLAUDE.md §8). */
const ddmmyyyy = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
function strip() {
  if (!updateItems.length) return "";
  if (!updates.heading) fail("_updates.mjs needs a heading.");
  const newest = [...updateItems].sort((a, b) => b.date.localeCompare(a.date));
  const shown = newest.slice(0, 3);
  const cardsHtml = shown
    .map((u) => {
      const where = `_updates.mjs item ${u.date}`;
      const link = u.href
        ? ` <a class="live-updates__link" href="${href(u.href, where)}" data-cta="update-link">${esc(u.linkLabel)}</a>`
        : "";
      return `<li class="live-updates__item"><time class="live-updates__date" datetime="${u.date}">${ddmmyyyy(u.date)}</time><p class="live-updates__text">${esc(u.text)}</p>${link}</li>`;
    })
    .join("");
  return (
    `<section class="live-updates" data-newest="${newest[0].date}" aria-labelledby="live-updates-title">` +
    `<div class="container"><h2 class="live-updates__title" id="live-updates-title">${esc(updates.heading)}</h2>` +
    `<ul class="live-updates__list">${cardsHtml}</ul></div></section>`
  );
}
const stripHtml = strip();

let filled = 0;
let calm = 0;
let carded = 0;
let stripped = 0;
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
  // Idempotent: whatever a previous run added is removed and rebuilt.
  for (const old of root.querySelectorAll(".live-dialogs, .live-updates")) old.remove();
  if (page.isFront && stripHtml) {
    const after = root.querySelector("section.section-advantages");
    if (!after)
      fail("the homepage has no .section-advantages to put the updates strip after.");
    after.insertAdjacentHTML("afterend", stripHtml);
    stripped++;
  }
  const cardsHtml = cardsFor(page);
  page.bodyHtml = root.toString() + cardsHtml;
  if (cardsHtml) carded++;
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
  status:
    "https://imgquarry.com/status/fleet.json overrides all of this in the browser: quiet → evergreen, reduced → the wartime line, off → no bar; unreadable → seasonal lines off, safety lines stay.",
  intervals: intervals.map((iv) => ({
    variant: iv.variant,
    from: new Date(iv.from).toISOString(),
    until: new Date(iv.until).toISOString(),
  })),
};
site.assets.liveHead = liveHeadScript(intervals);
// The behaviour file, versioned by content so a returning visitor never runs a stale copy.
if (!existsSync(LIVE_JS)) fail("public/assets/live.js is missing.");
const liveJsHash = createHash("sha256")
  .update(readFileSync(LIVE_JS))
  .digest("hex")
  .slice(0, 12);
site.assets.liveJs = `/assets/live.js?v=${liveJsHash}`;
mkdirSync(dirname(SCHEDULE_OUT), { recursive: true });
writeFileSync(SCHEDULE_OUT, JSON.stringify(schedule, null, 2) + "\n", "utf8");
writeFileSync(FILE, JSON.stringify(site, null, 2), "utf8");

const last = intervals[intervals.length - 1];
console.log(
  `live-surfaces: top bar filled on ${filled} page(s), ${calm} of them calm — ` +
    `${variants.size + 1} variant(s): ${[...variants.keys(), "evergreen"].join(", ")}`,
);
console.log(
  `live-surfaces: ${cards.size} card(s) [${[...cards.keys()].join(", ")}] on ${carded} page(s); ` +
    `updates strip: ${stripped ? `${Math.min(updateItems.length, 3)} item(s) on the homepage` : "none (no _updates.mjs items)"}`,
);
console.log(
  `live-surfaces: schedule → ${intervals.length} interval(s)` +
    (last
      ? `, last one ends ${new Date(last.until).toISOString().slice(0, 10)}; head script ${site.assets.liveHead.length} B`
      : ` (evergreen only)`),
);
