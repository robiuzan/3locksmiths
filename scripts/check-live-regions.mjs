/**
 * Asserts the live regions in the RENDERED site obey the /dynamic-presence rules — the ones
 * that, if broken, fail silently: Google would snippet a Hanukkah line in March, one topbar
 * edit would re-stamp <lastmod> on every URL, or a variant stored as JSON would slip past
 * check-claims (which strips <script> blocks before matching, scripts/check-claims.mjs:27-34).
 *
 * A live region is an element marked `data-lm-ignore` — the marker lib/live/regions.mjs cuts
 * out before scripts/lastmod.mjs hashes. (An attribute, not an HTML comment: the enrich chain
 * re-parses the body with node-html-parser's defaults several times, and those drop comments.)
 *
 * Rules (docs/dynamic-presence-plan.md §2.2 rule 3, §4.3):
 *   1. no live region sits inside <main> — chrome only. The updates strip is deliberately NOT a
 *      live region: a new item is a real content change and should move the homepage lastmod;
 *   2. every region root carries data-nosnippet, in the static HTML (Google: never add it via JS);
 *   3. no <script> inside a region — copy for a variant is HTML the guards can read, never JSON;
 *   4. nothing outside a region carries data-campaign or data-live-* — a variant that is not
 *      excluded from the fingerprint is a variant that re-stamps the sitemap when it is reworded;
 *   5. every region holds exactly one `data-campaign="evergreen"` item that is not `hidden` (the
 *      JavaScript-off state), and every other item IS `hidden` (so a page whose CSS failed to
 *      load never shows an out-of-season line);
 *   6. the evergreen item is LAST — the head script hides it with a following-sibling selector;
 *   7. the calm pages are exactly the ones lib/live/pages.mjs names (the rule the pass uses),
 *      each carries `data-live-calm` on `.template-header` and nowhere else, and no seasonal
 *      line — and there are at least the eight known ones;
 *   8. every page that has the theme's top-bar slot has exactly one region inside it — a page
 *      the pass skipped would show the scraped speed claim on desktop;
 *  10. the card region (`.live-dialogs`, Phase 2): only on pages lib/live/pages.mjs allowsDialog
 *      (never calm, never a page that tells the reader to call 100/101), never on its own link
 *      target, and on every other page that allows one; each <dialog> is closed in the HTML
 *      (no `open`), names its title and body by id, and says exactly what the register says;
 *  12. app/enrich.css keeps a closed card hidden (`.live-dialog:not([open]) { display: none }`) —
 *      the vendored theme's `dialog { display: block }` otherwise shows it on every page;
 *  11. public/assets/live.js carries no copy (not one Hebrew letter), and the URL the layout
 *      loads it from carries the hash of the file that is actually there;
 *   9. what each region SAYS is what the register says: every item's text as read and its link
 *      target equal content/enriched/_campaigns.mjs — content/site.json being newer than the
 *      register (a peer session, a stash, one pass re-run) is not proof it was rendered from it.
 *
 * Runs in npm `prebuild`. Passes when no region exists yet.
 *
 *   node scripts/check-live-regions.mjs        (exit 1 on any violation)
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "node-html-parser";
import { allowsDialog, isCalm } from "../lib/live/pages.mjs";
import { visibleText } from "../lib/live/topbar.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "content", "site.json");
const CAMPAIGNS = join(ROOT, "content", "enriched", "_campaigns.mjs");
const CONFIG = join(ROOT, "site.config.json");
const MIN_CALM = 8; // ids 9301–9304 and the four calculator steps
const LIVE_JS = join(ROOT, "public", "assets", "live.js");

if (!existsSync(SITE)) {
  console.error("live-regions: content/site.json does not exist — run `npm run enrich`.");
  process.exit(1);
}

const site = JSON.parse(readFileSync(SITE, "utf8"));
const campaigns = existsSync(CAMPAIGNS)
  ? (await import(pathToFileURL(CAMPAIGNS).href)).default
  : null;
const contact = existsSync(CONFIG)
  ? (JSON.parse(readFileSync(CONFIG, "utf8")).contact ?? {})
  : {};
const phoneDisplay = contact.phoneDisplay ?? "";
const phoneE164 = contact.phoneE164 ?? "";
const waDigits = String(contact.whatsappE164 ?? phoneE164).replace(/\D/g, "");
const safeDecode = (s) => {
  try {
    return decodeURI(s);
  } catch {
    return s;
  }
};
const squash = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();

/** What the register says each variant reads and links to. */
const expected = new Map();
if (campaigns?.evergreen?.topbar) {
  for (const w of campaigns.windows ?? []) {
    const v = w.variant || w.id;
    if (!expected.has(v)) expected.set(v, { topbar: w.topbar, kind: w.kind });
  }
  expected.set("evergreen", { topbar: campaigns.evergreen.topbar, kind: "evergreen" });
}

/** What the register says each card reads and links to. */
const cardsWanted = new Map();
for (const w of campaigns?.windows ?? []) {
  const v = w.variant || w.id;
  if (w.dialog && !cardsWanted.has(v)) cardsWanted.set(v, w.dialog);
}
const cardText = (dl) =>
  squash(
    [
      dl.title,
      dl.body,
      String(dl.call ?? "").replace(/\{phone\}/g, phoneDisplay),
      dl.whatsapp,
    ].join(" "),
  );
const storedOf = new Map((site.pages ?? []).map((p) => [safeDecode(p.path), p.path]));

const problems = [];
let regions = 0;
let dialogPages = 0;
let pagesWithRegions = 0;
let calmPages = 0;
const LIVE_ATTR = /\sdata-(?:campaign|live-[a-z]+|lm-ignore)[\s=>"]/;

for (const page of site.pages ?? []) {
  const html = String(page.bodyHtml ?? "");
  const hasSlot = html.includes("nav-main__top-bar");
  // Cheap exit for the common case before paying for a parse of up to 400 KB.
  if (!LIVE_ATTR.test(html)) {
    if (hasSlot && campaigns) {
      problems.push(
        `${page.path}: has the top-bar slot but no live region — the pass skipped it`,
      );
    }
    continue;
  }

  const root = parse(html, {
    blockTextElements: { script: true, style: true, noscript: true, pre: true },
  });
  const roots = root.querySelectorAll("[data-lm-ignore]");
  if (roots.length) pagesWithRegions += 1;
  const shouldBeCalm = isCalm(page);
  const header = root.querySelector(".template-header");
  const calm = Boolean(header?.hasAttribute("data-live-calm"));
  if (calm !== shouldBeCalm) {
    problems.push(
      `${page.path}: ${shouldBeCalm ? "must carry" : "must not carry"} data-live-calm (lib/live/pages.mjs says ${shouldBeCalm ? "calm" : "not calm"})`,
    );
  }
  if (calm) calmPages += 1;

  if (hasSlot) {
    const inSlot = root.querySelectorAll(".nav-main__top-bar [data-lm-ignore]").length;
    if (inSlot !== 1)
      problems.push(
        `${page.path}: ${inSlot} live region(s) inside the top-bar slot — expected exactly one`,
      );
  }

  for (const el of roots) {
    regions += 1;
    const label = `${page.path} region@${el.range?.[0] ?? "?"}`;
    // closest() walks OUT from the region, so a nested <main> (the homepage's calculator has its
    // own) cannot hide an enclosing one the way a first-</main> text search did.
    if (el.closest("main"))
      problems.push(`${label}: live region inside <main> — live regions are chrome only`);
    if (!el.hasAttribute("data-nosnippet"))
      problems.push(`${label}: region root lacks data-nosnippet in the static HTML`);
    if (el.querySelector("script"))
      problems.push(
        `${label}: <script> inside a live region — variants are HTML, never JSON`,
      );
    if (el.querySelector("[data-lm-ignore]"))
      problems.push(
        `${label}: a live region inside a live region — one marker per region`,
      );
    if ((el.getAttribute("class") ?? "").split(/\s+/).includes("live-dialogs")) continue; // rule 10, below

    const items = el.querySelectorAll("[data-campaign]");
    const evergreen = items.filter(
      (i) => i.getAttribute("data-campaign") === "evergreen",
    );
    if (evergreen.length !== 1 || evergreen[0].hasAttribute("hidden")) {
      problems.push(
        `${label}: needs exactly one visible data-campaign="evergreen" item (the JS-off state)`,
      );
    }
    const seen = new Set();
    for (const i of items) {
      const id = i.getAttribute("data-campaign");
      seen.add(id);
      if (id !== "evergreen" && !i.hasAttribute("hidden")) {
        problems.push(
          `${label}: variant "${id}" is not \`hidden\` — it would show without CSS`,
        );
      }
      if (calm && id !== "evergreen" && !/^safety-/.test(id)) {
        problems.push(
          `${label}: seasonal variant "${id}" on a calm page — only evergreen and safety lines belong there`,
        );
      }
      // Rule 9 — the words and the link, against the register.
      const want = expected.get(id);
      if (!want) {
        if (campaigns) problems.push(`${label}: variant "${id}" is not in the register`);
        continue;
      }
      const link = i.querySelector(".live-topbar__more");
      const selfLink =
        want.topbar.link && safeDecode(want.topbar.link.href) === safeDecode(page.path);
      const wantText = visibleText(
        selfLink ? { ...want.topbar, link: undefined } : want.topbar,
        phoneDisplay,
      );
      if (squash(i.text) !== squash(wantText)) {
        problems.push(
          `${label}: variant "${id}" reads "${squash(i.text)}" but the register says "${squash(wantText)}" — run \`npm run enrich\``,
        );
      }
      if (want.topbar.link && !selfLink) {
        if (!link)
          problems.push(
            `${label}: variant "${id}" has no link but the register gives one`,
          );
        else if (
          safeDecode(link.getAttribute("href") ?? "") !==
          safeDecode(want.topbar.link.href)
        ) {
          problems.push(
            `${label}: variant "${id}" links to ${safeDecode(link.getAttribute("href") ?? "")}, the register says ${want.topbar.link.href}`,
          );
        }
      } else if (link) {
        problems.push(
          `${label}: variant "${id}" carries a link the register does not give (or a link to the page itself)`,
        );
      }
    }
    if (campaigns) {
      for (const [id, want] of expected) {
        const belongs = !calm || want.kind === "safety" || id === "evergreen";
        if (belongs && !seen.has(id))
          problems.push(`${label}: variant "${id}" from the register is missing`);
      }
    }
    // The head script hides evergreen with `[data-campaign="v"] ~ [data-campaign="evergreen"]`,
    // a FOLLOWING-sibling selector: evergreen anywhere but last would stay visible beside v.
    if (
      items.length &&
      items[items.length - 1].getAttribute("data-campaign") !== "evergreen"
    ) {
      problems.push(`${label}: the evergreen item must be the last one in the region`);
    }
  }

  // Rule 10 — the cards.
  const dialogRegions = root.querySelectorAll(".live-dialogs");
  const allowed = allowsDialog(page);
  const due = [...cardsWanted].filter(
    ([, dl]) => !dl.link || storedOf.get(safeDecode(dl.link.href)) !== page.path,
  );
  if (dialogRegions.length > 1)
    problems.push(
      `${page.path}: ${dialogRegions.length} card regions — expected at most one`,
    );
  if (!allowed && dialogRegions.length)
    problems.push(
      `${page.path}: a card region on a page that may never open one (calm, or it tells the reader to call 100/101)`,
    );
  if (allowed && due.length && !dialogRegions.length)
    problems.push(
      `${page.path}: no card region, but the register has ${due.length} card(s) for it — run \`npm run enrich\``,
    );
  for (const region of dialogRegions) {
    dialogPages += 1;
    if (!region.hasAttribute("data-lm-ignore") || !region.hasAttribute("data-nosnippet"))
      problems.push(
        `${page.path}: the card region needs data-lm-ignore and data-nosnippet`,
      );
    if (region.closest("main"))
      problems.push(`${page.path}: the card region is inside <main>`);
    const dialogs = region.querySelectorAll("dialog");
    const seenCards = new Set();
    for (const dlg of dialogs) {
      const v = dlg.getAttribute("data-dialog");
      seenCards.add(v);
      const where = `${page.path} card "${v}"`;
      if (dlg.hasAttribute("open"))
        problems.push(
          `${where}: \`open\` in the static HTML — it would show with JavaScript off`,
        );
      if (!(dlg.getAttribute("class") ?? "").split(/\s+/).includes("live-dialog"))
        problems.push(`${where}: missing class live-dialog (live.js looks it up by it)`);
      for (const attr of ["aria-labelledby", "aria-describedby"]) {
        const id = dlg.getAttribute(attr);
        if (!id || !dlg.querySelector(`#${id}`))
          problems.push(`${where}: ${attr} does not name an element inside the card`);
      }
      if (dlg.querySelector("h1, h2, h3, h4, h5, h6"))
        problems.push(
          `${where}: a heading inside the card — the title is a <p> (one <h1> per page)`,
        );
      if (!dlg.querySelector("button.live-dialog__close[aria-label]"))
        problems.push(`${where}: no labelled close button`);
      const want = cardsWanted.get(v);
      if (!want) {
        problems.push(`${where}: not in the register`);
        continue;
      }
      if (want.link && storedOf.get(safeDecode(want.link.href)) === page.path)
        problems.push(
          `${where}: the card is on its own link target — it would send the reader to the page they are on`,
        );
      const shown = squash(
        dlg
          .querySelectorAll(".live-dialog__title, .live-dialog__body, .live-dialog__btn")
          .map((n) => n.text)
          .join(" "),
      );
      if (shown !== cardText(want))
        problems.push(
          `${where}: reads "${shown}" but the register says "${cardText(want)}" — run \`npm run enrich\``,
        );
      const more = dlg.querySelector(".live-dialog__more");
      if (want.link) {
        if (!more) problems.push(`${where}: no guide link, but the register gives one`);
        else {
          if (squash(more.text) !== squash(want.link.label))
            problems.push(
              `${where}: link label "${squash(more.text)}" ≠ the register's "${want.link.label}"`,
            );
          if (safeDecode(more.getAttribute("href") ?? "") !== safeDecode(want.link.href))
            problems.push(
              `${where}: links to ${safeDecode(more.getAttribute("href") ?? "")}, the register says ${want.link.href}`,
            );
        }
      }
      const ctas = dlg
        .querySelectorAll("a[data-cta]")
        .map((a) => a.getAttribute("data-cta"));
      for (const c of ["popup-call", "popup-whatsapp"])
        if (!ctas.includes(c)) problems.push(`${where}: missing the ${c} link`);
      const hrefOf = (c) => dlg.querySelector(`a[data-cta="${c}"]`)?.getAttribute("href");
      if (hrefOf("popup-call") && hrefOf("popup-call") !== `tel:${phoneE164}`)
        problems.push(
          `${where}: the call button dials ${hrefOf("popup-call")}, not tel:${phoneE164}`,
        );
      if (
        hrefOf("popup-whatsapp") &&
        hrefOf("popup-whatsapp") !== `https://wa.me/${waDigits}`
      )
        problems.push(
          `${where}: the WhatsApp button opens ${hrefOf("popup-whatsapp")}, not https://wa.me/${waDigits}`,
        );
    }
    for (const [v] of due)
      if (!seenCards.has(v))
        problems.push(`${page.path}: card "${v}" from the register is missing`);
  }

  // No dialog may sit open in the HTML, and no card may live outside its region.
  for (const dlg of root.querySelectorAll("dialog")) {
    if (dlg.hasAttribute("open"))
      problems.push(`${page.path}: a <dialog open> in the static HTML`);
    if (
      (dlg.getAttribute("class") ?? "").split(/\s+/).includes("live-dialog") &&
      !dlg.closest(".live-dialogs")
    )
      problems.push(`${page.path}: a .live-dialog outside the .live-dialogs region`);
  }

  for (const el of root.querySelectorAll("[data-campaign], [data-live-slot]")) {
    if (!el.closest("[data-lm-ignore]")) {
      problems.push(
        `${page.path}: <${el.rawTagName}> carries a live attribute outside any data-lm-ignore region`,
      );
    }
  }
  // `data-live-calm` is the one live attribute that lives OUTSIDE a region, on purpose: it is a
  // fixed property of the page, not rotating copy, and the header reserve in app/enrich.css
  // needs it on an ancestor of the bar.
  for (const el of root.querySelectorAll("[data-live-calm]")) {
    if (!(el.getAttribute("class") ?? "").split(/\s+/).includes("template-header")) {
      problems.push(
        `${page.path}: data-live-calm on <${el.rawTagName}> — it belongs on .template-header only`,
      );
    }
  }
}

// Rule 12 — a CLOSED card must not show. The vendored bootstrap-grid.css ships normalize's
// `dialog { display: block }`, which beats the browser's own `dialog:not([open]) { display:none }`;
// without the override in app/enrich.css every closed card sat visible under the footer of 95
// pages, and every browser probe missed it because they all opened the card first.
if (cardsWanted.size) {
  const css = readFileSync(join(ROOT, "app", "enrich.css"), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  if (!/\.live-dialog:not\(\[open\]\)\s*\{[^}]*display\s*:\s*none/.test(css))
    problems.push(
      "app/enrich.css has no `.live-dialog:not([open]) { display: none }` — the closed cards would show on every page",
    );
}

// Rule 11 — the behaviour file carries no copy, and the page loads the file that is there.
if (existsSync(LIVE_JS)) {
  const js = readFileSync(LIVE_JS);
  if (/[\u0590-\u05FF]/.test(js.toString("utf8")))
    problems.push(
      "public/assets/live.js contains Hebrew — copy belongs in the page HTML, where the guards read it",
    );
  const hash = createHash("sha256").update(js).digest("hex").slice(0, 12);
  if (campaigns && site.assets?.liveJs !== `/assets/live.js?v=${hash}`)
    problems.push(
      `content/site.json loads ${site.assets?.liveJs ?? "no live.js"} but the file's hash is ${hash} — run \`npm run enrich\``,
    );
}

if (regions && calmPages < MIN_CALM) {
  problems.push(
    `only ${calmPages} calm page(s) — the emergency cluster and the calculator steps make at least ${MIN_CALM}`,
  );
}
if (campaigns && regions === 0) {
  problems.push(
    "content/enriched/_campaigns.mjs exists but no page carries a live region — run `npm run enrich`",
  );
}

if (regions === 0 && problems.length === 0) {
  console.log(
    "live-regions: no data-lm-ignore regions in content/site.json yet — nothing to check ✅",
  );
  process.exit(0);
}
if (problems.length) {
  console.error(`\nlive-regions: ${problems.length} problem(s):`);
  for (const p of problems.slice(0, 40)) console.error(`  ! ${p}`);
  if (problems.length > 40) console.error(`  … and ${problems.length - 40} more`);
  process.exit(1);
}
console.log(
  `live-regions: ${regions} region(s) on ${pagesWithRegions} page(s), ${calmPages} calm, cards on ${dialogPages} — all chrome, all data-nosnippet, every line and link as the register says, evergreen last ✅`,
);
