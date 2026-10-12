/**
 * FLEET LIVE-KIT — check-live-out.mjs. Runs AFTER `next build` (npm postbuild) on a component
 * site and proves the built pages carry exactly what the registers say. Canonical in
 * 3locksmiths.co.il/fleet/live-kit/scripts/, hash-locked into each site. Do not edit a site copy.
 *
 * The markup is produced by lib/live/render.mjs, so this gate rebuilds the expected strings from
 * the registers and demands them VERBATIM — a page built before a register edit, a hand-patched
 * region, a component that stopped printing one of them: all fail here. On every exported page:
 *   1. the calm script, then the head script, both in <head>, calm first (it must run first);
 *   2. the announcement bar region, exactly once (every line hidden but the evergreen one, last);
 *   3. the cards region exactly once when a window carries a card, never an open <dialog>;
 *   4. /assets/live.js?v=<hash of the shipped file> loaded once, and that file is the locked one;
 * plus: the updates strip exactly once, on the homepage only; every link target in a register
 * exists in out/ and SHOWS every sentence its line quotes; the not-found page renders its calm
 * marker; the built CSS keeps a closed card
 * hidden (`.live-dialog:not([open])`). It writes out/.live-draft while either register lacks the
 * owner's `approved` stamp (or under LIVE_DRAFT=1), and removes it only once both carry one.
 *
 *   node scripts/live/check-live-out.mjs        (exit 1 on any violation)
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  calmScript,
  dialogsHtml,
  headScript,
  newestUpdate,
  topbarHtml,
  updatesHtml,
} from "../../lib/live/render.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CFG = (await import(pathToFileURL(join(ROOT, "live.config.mjs")).href)).default;
const OUT = join(ROOT, CFG.outDir ?? "out");
const DIR = join(ROOT, CFG.dir ?? "content/live");
const problems = [];
const fail = (m) => problems.push(m);

if (!existsSync(OUT)) {
  console.error("live-out: no out/ — run the build first");
  process.exit(1);
}
const load = async (f) =>
  existsSync(f) ? (await import(pathToFileURL(f).href)).default : null;
const campaigns = await load(join(DIR, "_campaigns.mjs"));
const updates = await load(join(DIR, "_updates.mjs"));
const calendar = JSON.parse(readFileSync(join(DIR, "_calendar.json"), "utf8"));
// NAP: live.config.mjs → contact (a site without site.config.json, e.g. thermoleak), else the
// synced manifest. The same source the site's Live.tsx renders from.
const contact =
  CFG.contact ??
  JSON.parse(readFileSync(join(ROOT, CFG.siteConfig ?? "site.config.json"), "utf8"))
    .contact;
if (!campaigns) {
  console.error("live-out: no _campaigns.mjs — nothing would be on the page");
  process.exit(1);
}

const want = {
  calm: calmScript({
    calm: CFG.calm ?? [],
    noDialog: CFG.noDialog ?? [],
    campaigns,
    newest: newestUpdate(updates),
  }),
  head: headScript({ campaigns, calendar }),
  bar: topbarHtml({ campaigns, contact }),
  cards: dialogsHtml({ campaigns, contact }),
  strip: updatesHtml({ updates, containerClass: CFG.updatesContainerClass ?? "" }),
};

// --- live.js: the shipped file is the locked one, and pages load it by its own hash ------------
const liveJs = join(OUT, "assets", "live.js");
let liveSrc = null;
if (!existsSync(liveJs)) fail("out/assets/live.js is missing");
else {
  const bytes = readFileSync(liveJs);
  const hash = createHash("sha256").update(bytes).digest("hex");
  liveSrc = `/assets/live.js?v=${hash.slice(0, 12)}`;
  const lock = join(ROOT, "live-kit.lock.json");
  if (existsSync(lock)) {
    const locked = JSON.parse(readFileSync(lock, "utf8")).files?.[
      "public/assets/live.js"
    ];
    if (locked && locked !== hash)
      fail("out/assets/live.js is not the locked live-kit copy — re-sync, never edit it");
  }
}

// --- every exported page --------------------------------------------------------------------
function pages(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "_next") continue;
    if (statSync(p).isDirectory()) pages(p, acc);
    else if (name.endsWith(".html")) acc.push(p);
  }
  return acc;
}
const count = (hay, needle) => (needle ? hay.split(needle).length - 1 : 0);
/** Only pages Next rendered carry the layout — a static .html copied from public/ (a search-console
 *  verification file) does not, and is not a page of the site. */
const all = pages(OUT).filter((f) => {
  const t = readFileSync(f, "utf8");
  return t.includes("self.__next_f") || t.includes("__NEXT_DATA__");
});
/** The site's routes, exactly as exported (case-sensitive), decoded: "/", "/blog/x/", … */
const ROUTES = new Set();
for (const f of all) {
  const rel = relative(OUT, f).split(sep).join("/");
  if (rel === "index.html") ROUTES.add("/");
  else if (rel.endsWith("/index.html"))
    ROUTES.add("/" + rel.slice(0, -"index.html".length));
}
const decode = (p) => {
  try {
    return decodeURI(p);
  } catch {
    return p;
  }
};
let checked = 0;
for (const file of all) {
  const html = readFileSync(file, "utf8");
  const rel = relative(OUT, file).split(sep).join("/");
  const head = html.slice(0, Math.max(html.indexOf("</head>"), 0));
  checked += 1;
  const ci = head.indexOf(want.calm);
  const hi = head.indexOf(want.head);
  if (ci < 0) fail(`${rel}: the calm script is missing from <head> (or stale — rebuild)`);
  if (hi < 0)
    fail(`${rel}: the live head script is missing from <head> (or stale — rebuild)`);
  if (ci >= 0 && hi >= 0 && ci > hi)
    fail(`${rel}: the calm script must come BEFORE the head script`);
  const bars = count(html, want.bar);
  if (bars !== 1)
    fail(
      `${rel}: the announcement bar must appear exactly once, as rendered from the register (found ${bars})`,
    );
  if (count(html, 'data-live-region="topbar"') !== 1)
    fail(`${rel}: exactly one bar region expected`);
  if (want.cards) {
    const n = count(html, want.cards);
    if (n !== 1) fail(`${rel}: the cards region must appear exactly once (found ${n})`);
  } else if (html.includes('data-live-region="dialogs"'))
    fail(`${rel}: a cards region but no window carries a card`);
  if (/<dialog\b[^>]*\bopen\b/i.test(html)) fail(`${rel}: a <dialog> ships open`);
  if (html.includes('id="live-reveal"'))
    fail(
      `${rel}: a React-owned <style id="live-reveal"> — the head script must append its own (a client-side navigation empties a React-owned one)`,
    );
  if (liveSrc) {
    const n = count(html, `src="${liveSrc}"`);
    if (n !== 1)
      fail(
        `${rel}: must load ${liveSrc} exactly once (found ${n}) — rebuild after re-syncing`,
      );
  }
  const isHome = rel === "index.html";
  const strips = count(html, 'class="live-updates"');
  if (want.strip) {
    if (isHome && count(html, want.strip) !== 1)
      fail(
        "index.html: the updates strip must appear exactly once, as rendered from _updates.mjs",
      );
    if (!isHome && strips) fail(`${rel}: the updates strip belongs on the homepage only`);
  } else if (strips) fail(`${rel}: an updates strip but _updates.mjs has no items`);
}
if (!checked) fail("out/ holds no pages");

// --- the not-found page marks itself calm (README step 5a) ------------------------------------
// It answers every unknown URL, so no path can mark it. Matched as an ELEMENT: the bare attribute
// name is in every page's RSC payload too (Next serialises the root not-found tree into each), so
// a text search would pass on a site that never added the marker (review, 2026-10-12).
for (const name of ["404.html", "404/index.html", "_not-found/index.html"]) {
  const f = join(OUT, ...name.split("/"));
  if (
    existsSync(f) &&
    !/<div\b[^>]*\sdata-live-calm-page(?=[\s=>/])/.test(readFileSync(f, "utf8"))
  )
    fail(
      `${name}: the not-found page must render <div data-live-calm-page hidden /> (README step 5a) — without it every unknown URL shows the seasonal line and can open the card`,
    );
}

// --- every link target in a register exists -------------------------------------------------
const hrefs = new Set();
for (const w of campaigns.windows ?? []) {
  if (w.topbar?.link?.href) hrefs.add(w.topbar.link.href);
  if (w.dialog?.link?.href) hrefs.add(w.dialog.link.href);
}
for (const u of updates?.items ?? []) if (u.href) hrefs.add(u.href);
for (const h of hrefs) {
  if (/^https?:\/\//.test(h)) {
    fail(`register link ${h}: links point at pages of this site only`);
    continue;
  }
  if (!h.startsWith("/") || h.startsWith("//")) {
    fail(`register link ${h}: internal links start with "/"`);
    continue;
  }
  const p = decode(h.split("#")[0].split("?")[0]);
  if (!p.endsWith("/"))
    fail(`register link ${h}: internal links end in "/" (trailingSlash)`);
  else if (!ROUTES.has(p))
    fail(`register link ${h}: no such page in out/ (routes are case-sensitive)`);
}

// --- every quote of a linked line is ON the page it links to -----------------------------------
// check-live-register asks live.config.mjs pageOfSource(), which answers null for a shared module
// (lib/content.ts renders on many pages) — so a line could link to a guide while resting on a
// homepage sentence the guide never shows (2026-10-12 critic: one skyshade line, four galbath).
// This reads the BUILT page instead: scripts, styles and both live regions removed (a line must not
// match its own copy), tags dropped, entities decoded, whitespace folded; each piece of each quote
// (around "…") must be there.
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const pageText = (html) =>
  html
    .replace(/<script\b[\s\S]*?<\/script>/g, " ")
    .replace(/<style\b[\s\S]*?<\/style>/g, " ")
    .replace(/<div class="live-topbar"[\s\S]*?<\/div><\/div>/g, " ")
    .replace(/<div class="live-dialogs"[\s\S]*?<\/dialog><\/div>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) =>
      e[0] === "#"
        ? String.fromCodePoint(
            e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1)),
          )
        : (ENT[e] ?? m),
    )
    .replace(/\s+/g, " ");
const QUOTE_RE = /״(.+?)״(?=\s*(?:$|[·—([]|״))/g;
const SOURCE_FILE_RE =
  /([\p{L}\p{M}\p{N}_./@[\]-]+\.(?:tsx?|mjs|js|json|mdx?))\s*[—–-]\s*/gu;
let quotePieces = 0;
for (const [id, w] of [
  ...(campaigns.windows ?? []).map((x) => [x.id, x]),
  ["evergreen", campaigns.evergreen],
  ["reduced", campaigns.reduced],
]) {
  const target = w?.topbar?.link?.href ?? w?.dialog?.link?.href;
  if (!target || !w.source || /^https?:\/\//.test(target)) continue;
  const route = decode(target.split("#")[0].split("?")[0]);
  const file = join(OUT, ...route.split("/").filter(Boolean), "index.html");
  if (!existsSync(file)) continue; // reported above as a missing link target
  const text = pageText(readFileSync(file, "utf8"));
  const hits = [...w.source.matchAll(SOURCE_FILE_RE)];
  hits.forEach((h, i) => {
    const chunk = w.source.slice(h.index + h[0].length, hits[i + 1]?.index);
    for (const q of [...chunk.matchAll(QUOTE_RE)].map((m) => m[1]))
      for (const piece of q
        .split("…")
        .map((x) => x.replace(/\s+/g, " ").trim())
        .filter(Boolean)) {
        quotePieces += 1;
        if (!text.includes(piece))
          fail(
            `${id}: links to ${route} but quotes ${h[1]} ״${piece.length > 60 ? piece.slice(0, 60) + "…" : piece}״, which that page does not show — cite the sentence the linked page shows`,
          );
      }
  });
}

// --- calm / no-card entries name real routes -------------------------------------------------
for (const [key, list] of [
  ["calm", CFG.calm ?? []],
  ["noDialog", CFG.noDialog ?? []],
]) {
  for (const entry of list) {
    if (typeof entry !== "string" || !entry.startsWith("/")) {
      fail(`live.config.mjs ${key}: "${entry}" must start with "/"`);
      continue;
    }
    const e = decode(entry);
    if (e.endsWith("*")) {
      const prefix = e.slice(0, -1);
      if (![...ROUTES].some((r) => r.startsWith(prefix)))
        fail(`live.config.mjs ${key}: "${entry}" matches no page in out/`);
    } else if (!ROUTES.has(e.endsWith("/") ? e : e + "/"))
      fail(`live.config.mjs ${key}: "${entry}" is not a page in out/ (case-sensitive)`);
  }
}

// --- the built CSS keeps a closed card hidden -----------------------------------------------
/** Every built stylesheet: Next 14 writes _next/static/css/, Next 16 _next/static/chunks/. */
function cssFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) cssFiles(p, acc);
    else if (name.endsWith(".css")) acc.push(p);
  }
  return acc;
}
const cssList = cssFiles(join(OUT, "_next", "static"));
if (!cssList.length) fail("no built CSS found under out/_next/static");
const css = cssList.map((f) => readFileSync(f, "utf8")).join("\n");
if (want.cards && !/\.live-dialog:not\(\[open\]\)\s*\{\s*display:\s*none/.test(css))
  fail(
    "the built CSS has no `.live-dialog:not([open]){display:none}` — import live-core.css",
  );
if (!/html\[data-live=(?:"|)off(?:"|)\]\s+\.live-topbar\s*\{\s*display:\s*none/.test(css))
  fail(
    "the built CSS has no `html[data-live=off] .live-topbar{display:none}` — import live-core.css",
  );

// Unapproved wording marks out/ so ops/deploy-site.ps1 refuses it (-DeployOnly included). The
// mark follows the REGISTERS, not only the environment: a standalone re-run of this gate without
// LIVE_DRAFT=1 used to delete it from a draft out/ (review, 2026-10-12). It stays while either
// register lacks the owner's stamp (the same "YYYY-MM-DD — who, how" check-live-register demands)
// or the build ran with LIVE_DRAFT=1, and goes only when both are stamped.
const DRAFT_MARK = join(OUT, ".live-draft");
const todayIL = new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
const stamped = (reg) => {
  const a = reg && reg.approved;
  if (typeof a !== "string" || !/^\d{4}-\d{2}-\d{2}\s*[—–-]\s*\S/.test(a)) return false;
  const d = a.slice(0, 10);
  const t = new Date(`${d}T12:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d && d <= todayIL;
};
const unapproved = [
  ...(stamped(campaigns) ? [] : ["_campaigns.mjs"]),
  ...(updates?.items?.length && !stamped(updates) ? ["_updates.mjs"] : []),
];
if (process.env.LIVE_DRAFT === "1" || unapproved.length)
  writeFileSync(
    DRAFT_MARK,
    `This out/ carries unapproved live-surface wording (${unapproved.length ? `${unapproved.join(", ")} not approved` : "built with LIVE_DRAFT=1"}). Never deploy it.\n`,
  );
else if (existsSync(DRAFT_MARK)) rmSync(DRAFT_MARK);

if (problems.length) {
  console.error(`\nlive-out: ${problems.length} problem(s):`);
  for (const p of problems.slice(0, 60)) console.error(`  ! ${p}`);
  if (problems.length > 60) console.error(`  … and ${problems.length - 60} more`);
  process.exit(1);
}
console.log(
  `live-out: ${checked} page(s) carry the bar, the card${want.cards ? "" : " (none authored)"}, the calm + head scripts and ${liveSrc} exactly as the registers say; ${hrefs.size} link target(s) exist and show all ${quotePieces} quoted piece(s) their lines rest on ✅`,
);
