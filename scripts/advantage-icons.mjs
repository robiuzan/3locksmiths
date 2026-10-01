/**
 * Replaces the six inline SVG drawings in the homepage "למה לבחור בשלושה מנעולנים" band with
 * small inline icons (docs/dynamic-presence-plan.md §3.5, Phase 2 step 5).
 *
 * WHY. The six drawings are Canva-style exports — 500×500 with clip paths, 26–37 KB each,
 * 195,833 bytes together, drawn at 36 px in a 68 px box. They were half of the homepage body,
 * and the body ships twice (the HTML and the RSC payload), so ~395 KB of every homepage load.
 * Two were byte-identical, so the page also carried a duplicate DOM id.
 *
 * HOW. Each icon is the outline of a Font Awesome 5 solid glyph, read from the vendored SVG
 * font (public/wp-content/themes/gogo/assets/fonts/fa-solid-900.svg — read, never edited) and
 * written inline as a few-hundred-byte <svg>. Not an <i class="fas …">: the homepage uses no
 * other icon from that font, so a glyph would have made it download the 123 KB font for six
 * icons (found by the Phase 2 review, 2026-10-01). SVG fonts are y-up with the baseline at 0
 * (ascent 448, descent −64, 512 units per em); `scale(1,-1)` and a viewBox starting at −448
 * turn that into ordinary SVG coordinates.
 *
 * The icons are decorative — the heading beside each one says what it means — so each is
 * aria-hidden and unfocusable. The glyph is chosen by the heading text, not by position; an
 * unknown heading, a missing band, or fewer than six icons FAILS rather than guessing.
 *
 * Idempotent: an icon box that already holds the right inline icon is left alone.
 *
 *   node scripts/advantage-icons.mjs      (chained into `npm run enrich`)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "content", "site.json");
const FONT = join(
  ROOT,
  "public",
  "wp-content",
  "themes",
  "gogo",
  "assets",
  "fonts",
  "fa-solid-900.svg",
);

/** Heading → Font Awesome 5 solid glyph name. Decorative only. */
const ICON = {
  "מומחיות במנעולנות רכב": "car",
  "שירות מהיר בשטח": "tools",
  "התאמה לרכב חכם": "key",
  "זמינות 24/7": "clock",
  "זמן תגובה מהיר": "bolt",
  "שקיפות מלאה": "file-invoice",
};

const fail = (msg) => {
  console.error(`advantage-icons: ${msg}`);
  process.exit(1);
};

const font = readFileSync(FONT, "utf8");
const DEFAULT_ADV = Number(/<font\b[^>]*horiz-adv-x="(\d+)"/.exec(font)?.[1] ?? 512);
/** The inline <svg> for one glyph, from the font's own outline. */
function icon(name) {
  const g = new RegExp(`<glyph glyph-name="${name}"([\\s\\S]*?)/>`).exec(font);
  if (!g) fail(`no glyph "${name}" in fa-solid-900.svg`);
  const d = /\sd="([^"]+)"/.exec(g[1])?.[1];
  if (!d) fail(`glyph "${name}" has no outline`);
  const adv = Number(/horiz-adv-x="(\d+)"/.exec(g[1])?.[1] ?? DEFAULT_ADV);
  // Trim the outline's numbers to two decimals: invisible at 30 px, and a third of the bytes.
  const path = d.replace(/\s+/g, " ").replace(/(\d+\.\d\d)\d+/g, "$1");
  return `<svg class="ls-icon" data-icon="${name}" viewBox="0 -448 ${adv} 512" aria-hidden="true" focusable="false"><path transform="scale(1,-1)" d="${path}"/></svg>`;
}

const site = JSON.parse(readFileSync(FILE, "utf8"));
const home = site.pages.find((p) => p.isFront);
if (!home) fail("no front page in content/site.json.");

const root = parse(home.bodyHtml, {
  blockTextElements: { script: true, style: true, noscript: true, pre: true },
});
const band = root.querySelector("section.section-advantages");
if (!band)
  fail(
    "the homepage has no section.section-advantages — the scrape changed; check the band.",
  );
let replaced = 0;
let kept = 0;
for (const item of band.querySelectorAll(".grid-item")) {
  const box = item.querySelector(".grid-item-top .icon");
  if (!box) continue;
  const heading = (item.querySelector("h3")?.text ?? "").trim();
  const name = ICON[heading];
  if (!name)
    fail(
      `no icon chosen for the heading "${heading}" — add it to ICON in scripts/advantage-icons.mjs.`,
    );
  if (box.querySelector(`svg.ls-icon[data-icon="${name}"]`)) {
    kept++;
    continue;
  }
  box.set_content(icon(name));
  replaced++;
}
if (replaced + kept !== Object.keys(ICON).length) {
  fail(
    `${replaced + kept} icon box(es) in the band, ${Object.keys(ICON).length} expected — the band changed.`,
  );
}

const before = Buffer.byteLength(home.bodyHtml);
home.bodyHtml = root.toString();
const after = Buffer.byteLength(home.bodyHtml);
writeFileSync(FILE, JSON.stringify(site, null, 2), "utf8");
console.log(
  `advantage-icons: ${replaced} drawing(s) replaced, ${kept} already done — homepage body ${before} → ${after} bytes.`,
);
