/**
 * Rebuilds the HOMEPAGE's catalog imagery: the four hero-grid tiles, and the contact-form avatar.
 *
 * WHY A PIPELINE PASS AND NOT A RENDERER CHANGE
 *
 *   The homepage is the one page with no authored module. `content/enriched/7.mjs` does not exist,
 *   and scripts/enrich.mjs only rebuilds <main> for pages that have one — so its body is scraped
 *   WordPress markup that no renderer ever touches. content/site.json is a build artifact that must
 *   never be hand-edited (CLAUDE.md §3 rule 2), so the only durable place to change the homepage
 *   hero is here, inside the enrich chain, where the edit is re-applied on every rebuild.
 *
 *   Same class of change as claims.mjs / footer.mjs / form.mjs. This follows footer.mjs's idiom:
 *   parse, find the container, stamp a sentinel, `set_content()` the whole thing so repeated runs
 *   converge instead of appending.
 *
 * IT NO-OPS UNTIL IMAGES ARE PUBLISHED. Until `home-tile-1..4` exist in site.config.json's gallery
 * the scraped tiles are left exactly as they are, and this exits 0. That is deliberate: the whole
 * pipeline has to keep building byte-identically before a single image has been generated, because
 * CI asserts precisely that.
 *
 *   node scripts/hero-gallery.mjs      (chained into `npm run enrich`)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";
import { catalogImg, imageRef, SIZES } from "../lib/enrich/catalog-image.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "content", "site.json");

/** The four tiles, in grid order. Tiles 1 and 4 carry the ±39px stagger in the theme CSS. */
const TILE_NAMES = ["home-tile-1", "home-tile-2", "home-tile-3", "home-tile-4"];

const refs = TILE_NAMES.map((n) => imageRef(n));
const published = refs.filter(Boolean);

if (published.length === 0) {
  console.log(
    "hero-gallery: no home-tile-* images published yet — scraped tiles left untouched (0 changed).",
  );
  process.exit(0);
}

// Partial publication would silently ship a hero that is half real photos and half stock, which is
// worse than either. Refuse rather than produce that.
if (published.length !== TILE_NAMES.length) {
  console.error(
    `hero-gallery: only ${published.length}/${TILE_NAMES.length} tiles are published ` +
      `(${TILE_NAMES.filter((n, i) => !refs[i]).join(", ")} missing).\n` +
      "  Publish all four or none — a half-replaced hero mixes real photos with stock.",
  );
  process.exit(1);
}

const site = JSON.parse(readFileSync(FILE, "utf8"));
const home = site.pages.find((p) => p.isFront);
if (!home) {
  console.error("hero-gallery: no front page in content/site.json");
  process.exit(1);
}

const root = parse(home.bodyHtml, {
  blockTextElements: { script: true, style: true, noscript: true, pre: true },
});

const grid = root.querySelector(".home-hero-right-galley");
if (!grid) {
  console.error(
    "hero-gallery: .home-hero-right-galley not found on the homepage.\n" +
      "  The scraped markup changed shape — re-check the selector before assuming this is safe to skip.",
  );
  process.exit(1);
}

// Tiles are 632x426 (3:2) in a box capped at max-height:213px with object-fit:cover, so the
// composition is cropped vertically — the catalog's focal point is what keeps subjects in frame.
// They sit below the fold of the hero's left column on mobile, so none is the LCP element and all
// four stay lazy.
const html = refs
  .map((ref) => {
    const img = catalogImg(ref, { sizes: SIZES.tile });
    return `<div class="gallery-item">${img}</div>`;
  })
  .join("");

grid.setAttribute("data-hero-rebuilt", "1");
grid.set_content(html);

// --- the contact-form avatar -------------------------------------------------
// renderHero/renderForm swap this on the 111 authored pages, but the homepage's <main> is scraped
// WordPress markup that no renderer touches — so without this pass the homepage alone kept the
// stock photograph of a woman who does not work here, beside its contact form, on the single most
// important page on the site. It appears twice (the hero google-box and the form bar).
let avatarsSwapped = 0;
const avatarRef = imageRef("avatar");
if (avatarRef) {
  const img = catalogImg(avatarRef, { sizes: SIZES.avatar, fixed: true });
  for (const el of root.querySelectorAll("img")) {
    // Match the legacy upload AND an already-swapped catalog avatar. content/site.json is
    // stateful — nothing regenerates the homepage body — so matching only "avatar-1-1" would make
    // this a one-way swap: correct on the first run, but silently unable to follow a later change
    // of avatar key. Matching both makes the pass converge the way the tiles do.
    const src = el.getAttribute("src") || "";
    if (!src.includes("avatar-1-1") && !/gallery\/avatar\./.test(src)) continue;
    el.replaceWith(img);
    avatarsSwapped++;
  }
}

home.bodyHtml = root.toString();

writeFileSync(FILE, JSON.stringify(site, null, 2), "utf8");
console.log(
  `hero-gallery: rebuilt ${refs.length} homepage hero tile(s), ${avatarsSwapped} avatar(s) set from the catalog.`,
);
