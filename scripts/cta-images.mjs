/**
 * Rebuilds the three photographs in the HOMEPAGE's "ננעלתם בחוץ" call-to-action band.
 *
 * WHY A SEPARATE PASS FROM hero-gallery.mjs
 *
 *   These are NOT the four hero tiles. `.cta-section .grid-cta` is a different 2x2 grid further
 *   down the same page: one green `.cta-box` and three `.img-block-cta` photographs. It arrived
 *   from WordPress with three hard-coded `/wp-content/uploads/2025/05/Rectangle-*.png` files —
 *   rewritten to `/assets/img/*.webp` by assets.mjs — showing a garden fence being drilled, a
 *   steel frame being welded and a gate intercom. None of them is locksmithing, none of them
 *   illustrates the heading above them, and all three shipped with an EMPTY alt attribute.
 *
 *   Same reasoning as hero-gallery.mjs otherwise: `content/enriched/7.mjs` does not exist, so the
 *   homepage body is scraped WordPress markup that no renderer touches, and content/site.json is a
 *   build artifact that must never be hand-edited (CLAUDE.md §3 rule 2). The only durable place to
 *   change it is here, inside the enrich chain, where the edit re-applies on every rebuild.
 *
 * IT NO-OPS UNTIL IMAGES ARE PUBLISHED, exactly like hero-gallery.mjs — CI asserts the pipeline
 * builds byte-identically with an empty catalog, so a missing image must degrade, never fail.
 *
 * CONVERGENCE. Page 7's HTML is stateful: nothing regenerates it, so each run mutates the previous
 * run's output. This replaces the CONTENTS of each `.img-block-cta` by index rather than matching
 * on the current `src`, so it converges whether it is looking at the original WordPress markup,
 * an assets.mjs-rewritten path, or its own previous output.
 *
 *   node scripts/cta-images.mjs      (chained into `npm run enrich`)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";
import { catalogImg, imageRef, SIZES } from "../lib/enrich/catalog-image.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "content", "site.json");

/**
 * The three photographs, in DOM order. The grid is `dir="rtl"`, two columns, and the green
 * `.cta-box` is the first child — so on screen these land top-LEFT, bottom-RIGHT, bottom-LEFT.
 * `.grid-cta > div:nth-child(2n+1)` lifts children 1 and 3 by 35px, i.e. the green box and
 * home-cta-2.
 */
const CTA_NAMES = ["home-cta-1", "home-cta-2", "home-cta-3"];

const refs = CTA_NAMES.map((n) => imageRef(n));
const published = refs.filter(Boolean);

if (published.length === 0) {
  console.log(
    "cta-images: no home-cta-* images published yet — scraped photographs left untouched (0 changed).",
  );
  process.exit(0);
}

// Partial publication would ship a band that is part real locksmith work and part stock fencing,
// which is worse than either. Refuse rather than produce that. (Same rule as hero-gallery.mjs.)
if (published.length !== CTA_NAMES.length) {
  console.error(
    `cta-images: only ${published.length}/${CTA_NAMES.length} images are published ` +
      `(${CTA_NAMES.filter((n, i) => !refs[i]).join(", ")} missing).\n` +
      "  Publish all three or none — a half-replaced band mixes real photographs with stock.",
  );
  process.exit(1);
}

const site = JSON.parse(readFileSync(FILE, "utf8"));
const home = site.pages.find((p) => p.isFront);
if (!home) {
  console.error("cta-images: no front page in content/site.json");
  process.exit(1);
}

const root = parse(home.bodyHtml, {
  blockTextElements: { script: true, style: true, noscript: true, pre: true },
});

const grid = root.querySelector(".cta-section .grid-cta");
if (!grid) {
  console.error(
    "cta-images: .cta-section .grid-cta not found on the homepage.\n" +
      "  The scraped markup changed shape — re-check the selector before assuming this is safe to skip.",
  );
  process.exit(1);
}

const blocks = grid.querySelectorAll(".img-block-cta");
if (blocks.length !== CTA_NAMES.length) {
  console.error(
    `cta-images: expected ${CTA_NAMES.length} .img-block-cta children, found ${blocks.length}.\n` +
      "  Refusing to guess which photograph is which — fix the selector or the markup first.",
  );
  process.exit(1);
}

// No `eager` on any of these: the band sits well below the fold on every breakpoint, so none of
// them is ever the LCP element. The rendered box is 476x276 css px (see SIZES.cta), and
// app/enrich.css gives it object-fit:cover — so a 16:9 source loses a few per cent top and bottom.
blocks.forEach((block, i) => {
  const img = catalogImg(refs[i], { sizes: SIZES.cta });
  block.set_content(img);
});

grid.setAttribute("data-cta-images-rebuilt", "1");

home.bodyHtml = root.toString();

writeFileSync(FILE, JSON.stringify(site, null, 2), "utf8");
console.log(
  `cta-images: rebuilt ${blocks.length} homepage CTA photograph(s) from the catalog.`,
);
