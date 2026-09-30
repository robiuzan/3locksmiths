/**
 * Trims the global stylesheet set that every page loads.
 *
 * WHY — the 2026-08-26 competitor teardown measured our homepage at ~2.6 MB over 46 requests
 * against the category leader's ~208 KB over 8. A large, fixed share of that is CSS the scraped
 * WordPress head loads on all 90 pages regardless of whether anything on the page uses it.
 *
 * WHAT IT DOES
 *
 *   1. Subsets Font Awesome. The vendored `font-awesome.css` is 153 KB and defines 2,077 icons.
 *      This site renders 38, all of them `fas` (solid). The subset keeps the base/utility rules,
 *      the SOLID @font-face only, and just the `content:` rules for icons actually present in
 *      the rendered HTML — about 5 KB. Dropping the other @font-face blocks also stops browsers
 *      resolving the regular/light/duotone/brands webfonts at all.
 *
 *      The icon list is SCANNED from content/site.json rather than hardcoded, so adding a page
 *      that uses a new icon picks it up automatically on the next build. If a page ever uses a
 *      non-solid prefix (`far`/`fab`/`fal`), this script fails loudly rather than silently
 *      shipping a page with missing glyphs.
 *
 *   2. Drops stylesheets with zero matching markup anywhere on the site:
 *        · line-awesome.min.css        27 KB — 0 `la-*` icons rendered
 *        · collection-front.min.css    19 KB — styled only `.s-feedback`, which is now pruned
 *        · jquery.fancybox.min.css      external CDN request — 0 `fancybox` markup
 *      Each is verified against the rendered HTML before removal, so a sheet that starts being
 *      used again is kept automatically.
 *
 * WHY NOT EDIT THE VENDORED FILES — CLAUDE.md §3 rule 4. `public/wp-content/**` is third-party
 * theme output and is never modified. The subset is written to `public/assets/`, which this repo
 * owns, and the vendored original is left untouched and unreferenced.
 *
 *   3. Optimises raster images and fixes their loading behaviour. The scraped pages referenced
 *      1.9 MB of PNG/JPEG uploads, of which a single 2508×1672 hero JPEG at 986 KB was the LCP
 *      element on 95 pages. `next/image` cannot help here — `next.config.ts` sets
 *      `output: "export"` with `images: { unoptimized: true }`, and the page bodies are injected
 *      HTML rather than components — so the conversion happens at build time instead.
 *
 *      WebP copies are written to `public/assets/img/` (repo-owned) and the references are
 *      repointed; the vendored originals are left in place and untouched. Every `<img>` then
 *      gets explicit `width`/`height` (to reserve space and stop layout shift) plus the right
 *      loading hint: the hero is eager with `fetchpriority="high"`, everything below it is
 *      `loading="lazy"`. Before this, 0 of 23 homepage images were lazy.
 *
 *   4. Derives the site icon set from the brand mark. The scraped head declared two files as
 *      the favicon and Apple touch icon that are not images at all but 391 KB HTML copies of
 *      the old WordPress homepage (docs/business-facts.md §C.5a), so the site shipped with no
 *      working icon. A real .ico plus PNG and apple-touch variants are generated here from the
 *      70×70 WebP upload and declared by app/layout.tsx.
 *
 *   5. Derives main.css. The vendored copy opens with an `@import` to Google Fonts, which
 *      serialises a third-party round trip inside the render-blocking critical path, and paints
 *      the band behind every hero from a 970 KB / 256 KB PNG pair that step 3 cannot see because
 *      they are referenced from CSS rather than from an `<img>`. The derived copy drops the
 *      @import and re-encodes both backgrounds to AVIF + WebP; the Alexandria/Poppins stylesheet
 *      is dropped alongside it, because rtl.css overrides every family either one declares. Same
 *      idiom as the Font Awesome subset: repo-owned output, vendored original untouched.
 *
 *   node scripts/assets.mjs      (runs in the enrich chain, after pages.mjs has pruned sections)
 */
import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "content", "site.json");
const FA_SRC = join(
  ROOT,
  "public",
  "wp-content",
  "themes",
  "gogo",
  "assets",
  "css",
  "font-awesome.css",
);
const FA_OUT_DIR = join(ROOT, "public", "assets");
const FA_OUT = join(FA_OUT_DIR, "fa-subset.css");
const FA_HREF = "/assets/fa-subset.css";

const site = JSON.parse(readFileSync(SITE, "utf8"));
const html = site.pages.map((p) => p.bodyHtml || "").join("\n");

// --- 1. which icons does the site actually render? ---
const used = new Set();
const badPrefix = new Set();
for (const m of html.matchAll(/class="(fa[srbldt]?)\s+fa-([a-z0-9-]+)"/g)) {
  if (m[1] !== "fas") badPrefix.add(`${m[1]} fa-${m[2]}`);
  used.add(m[2]);
}
if (badPrefix.size) {
  console.error(
    `assets: non-solid Font Awesome prefixes are in use, but the subset only ships the solid face:`,
  );
  for (const b of badPrefix) console.error(`  ! ${b}`);
  console.error(`Add the matching @font-face to scripts/assets.mjs before shipping.\n`);
  process.exit(1);
}

// --- 2. build the subset ---
const fa = readFileSync(FA_SRC, "utf8");
const firstContent = fa.search(/\.fa-[a-z0-9-]+:before\{content/);
if (firstContent < 0)
  throw new Error("assets: could not locate icon rules in font-awesome.css");

// Everything before the first icon rule is the base + sizing/rotation utilities.
const base = fa.slice(0, firstContent);
const solidFace = fa.match(
  /@font-face\{font-family:"Font Awesome 5 Pro";font-style:normal;font-weight:900;[^}]*\}/,
);
if (!solidFace) throw new Error("assets: could not locate the solid @font-face");

const missing = [];
const rules = [];
for (const name of [...used].sort()) {
  const re = new RegExp(
    `\\.fa-${name.replace(/[-]/g, "\\-")}:before\\{content:"[^"]+"\\}`,
  );
  const m = fa.match(re);
  if (m) rules.push(m[0]);
  else missing.push(name);
}
if (missing.length) {
  console.error(
    `assets: ${missing.length} icon(s) used in markup but absent from the source CSS:`,
  );
  for (const n of missing) console.error(`  ! fa-${n}`);
  process.exit(1);
}

// The vendored file resolves fonts as ../fonts/… relative to its own directory. The subset lives
// at /assets/, so the URLs are rewritten to absolute paths against the same vendored font files.
const face = solidFace[0].replace(
  /\.\.\/fonts\//g,
  "/wp-content/themes/gogo/assets/fonts/",
);

const subset = [
  `/* Generated by scripts/assets.mjs — do not edit. Source: font-awesome.css (Font Awesome Pro 5.10.2).`,
  ` * Subset to the ${rules.length} solid icons this site renders. Regenerate with \`npm run enrich\`. */`,
  base.trim(),
  face,
  `.fa,.fas{font-family:"Font Awesome 5 Pro";font-weight:900}`,
  rules.join(""),
  "",
].join("\n");

mkdirSync(FA_OUT_DIR, { recursive: true });
writeFileSync(FA_OUT, subset, "utf8");

// --- 3. rewrite the global stylesheet list ---
// Each candidate is dropped only if nothing in the rendered HTML matches its `usedWhen` probe.
const DROPPABLE = [
  {
    match: /line-awesome/,
    usedWhen: /class="la[srbl]?\s+la-/,
    label: "line-awesome.min.css",
  },
  { match: /collection-front/, usedWhen: /saswp-/, label: "collection-front.min.css" },
  { match: /fancybox/, usedWhen: /fancybox/, label: "jquery.fancybox.min.css" },
];

const before = site.assets.headLinks.length;
const dropped = [];
site.assets.headLinks = site.assets.headLinks.filter((l) => {
  const href = l.href || "";
  for (const d of DROPPABLE) {
    if (d.match.test(href)) {
      if (d.usedWhen.test(html)) return true; // still used — keep it
      dropped.push(d.label);
      return false;
    }
  }
  return true;
});

// Snapshot the count HERE, not at log time. Step 5 below removes the two dead icon links from
// the same array, and the log line for this step runs after it — reading the live length would
// bill those two removals to the stylesheet pruner and report a range that never happened.
const afterStylesheets = site.assets.headLinks.length;

let swapped = 0;
for (const l of site.assets.headLinks) {
  if (l.href && /themes\/gogo\/assets\/css\/font-awesome\.css/.test(l.href)) {
    l.href = FA_HREF;
    swapped++;
  }
}

// --- 4. images: convert heavy rasters to WebP, then fix dimensions and loading hints ---
const IMG_OUT_DIR = join(ROOT, "public", "assets", "img");
const CONVERT_OVER = 20 * 1024; // below this a WebP round-trip is not worth an extra file
const MAX_W = 1600;

// Collect every referenced image once, so a file used on 95 pages is encoded a single time.
//
// `themes/` and `.svg` are in the net for their INTRINSIC SIZE, not for conversion. Until
// 2026-09-05 this only matched `uploads/**` rasters, which left five images on the homepage with
// no width/height at all — four vector icons plus the theme's own star.png — and an unreserved
// box for each is a layout shift. They are filtered back out before the encode loop below.
const referenced = new Set();
for (const p of site.pages) {
  for (const m of (p.bodyHtml || "").matchAll(
    // GREEDY on purpose. Three uploads are named `<brand>.svg.webp` — a WordPress import of an
    // SVG logo that was then re-encoded — and a lazy quantifier stops at the FIRST extension it
    // sees, yielding `Mercedes-Logo.svg`, a path that does not exist. The file was skipped and
    // the <img> shipped with no reserved box. The character class already excludes quotes,
    // whitespace and `)`, so greedy runs to the end of the URL token and backtracks to the last
    // real extension.
    /\/wp-content\/(?:uploads|themes)\/[^"'\s)]+\.(?:png|jpe?g|svg|webp)/gi,
  ))
    referenced.add(m[0]);
}

mkdirSync(IMG_OUT_DIR, { recursive: true });
/** original URL -> { url, width, height } of the emitted WebP */
const converted = new Map();
/** URL -> { width, height } for everything, converted or not, so <img> can be sized */
const dims = new Map();
let savedBytes = 0;

for (const url of referenced) {
  const abs = join(ROOT, "public", decodeURIComponent(url));
  if (!existsSync(abs)) continue;
  const size = statSync(abs).size;
  let meta;
  try {
    meta = await sharp(abs).metadata();
  } catch {
    continue; // unreadable or not a real raster — leave the reference alone
  }
  const outW = Math.min(meta.width || MAX_W, MAX_W);
  const outH = Math.round(((meta.height || 0) * outW) / (meta.width || outW));
  dims.set(url, { width: outW, height: outH });

  // Everything above is size bookkeeping and applies to every image. Conversion does not.
  // An SVG must never be rasterised — sharp would happily do it, and freeze vector art at one
  // resolution — and a `.webp` is already in the target format, so re-encoding it would only
  // lose a generation. The theme's own `themes/**` sprites are all under the threshold anyway;
  // keeping the encoder pointed exclusively at `uploads/**` rasters preserves the pre-2026-09-05
  // output byte for byte, so widening the scan above cannot change which files get written.
  if (/\.(?:svg|webp)$/i.test(url) || !url.startsWith("/wp-content/uploads/")) continue;
  if (size < CONVERT_OVER) continue;

  const name =
    basename(decodeURIComponent(url), extname(decodeURIComponent(url))) + ".webp";
  const outAbs = join(IMG_OUT_DIR, name);
  const buf = await sharp(abs)
    .resize({ width: MAX_W, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  // Only adopt the WebP if it is actually smaller — for small flat PNGs it sometimes is not.
  if (buf.length >= size) continue;
  writeFileSync(outAbs, buf);
  savedBytes += size - buf.length;
  converted.set(url, { url: `/assets/img/${name}`, width: outW, height: outH });
}

const HERO_SRC = "/wp-content/uploads/2025/04/157336036_m.jpg";
let rewritten = 0;
let lazied = 0;
let sized = 0;
let emptySrc = 0;

for (const p of site.pages) {
  if (typeof p.bodyHtml !== "string") continue;
  let out = p.bodyHtml;

  // 4a. repoint converted images (covers src, href and srcset occurrences alike)
  for (const [orig, to] of converted) {
    if (!out.includes(orig)) continue;
    rewritten += out.split(orig).length - 1;
    out = out.split(orig).join(to.url);
  }

  // 4b. per-<img> sizing and loading hints.
  // The hero is the LCP element and must stay eager and prioritised; the header logo sits above
  // the fold too. Everything from the hero onwards is lazy.
  // ABOVE_FOLD is the fallback for pages with no hero <img> at all. The homepage is the one that
  // matters: its <main> is scraped WordPress markup, not `renderHero` output, so the hero URL
  // never appears and a "lazy everything after the hero" rule alone left all 23 of its images
  // eager — on the single most important page on the site. Counting instead means every page
  // gets a sensible split whether or not it has a hero.
  const ABOVE_FOLD = 3; // the two logo copies plus the first content image
  const heroUrl = converted.get(HERO_SRC)?.url ?? HERO_SRC;
  let seenHero = false;
  let imgIndex = 0;
  out = out.replace(/<img\b[^>]*>/g, (tag) => {
    // `<img src="">` — two of these sit in the scraped services mega-menu, in a `.pre-icon`
    // span whose icon was never filled in. An empty src is not a no-op: the HTML spec makes a
    // browser resolve it against the document's base URL, so some engines re-request the page
    // itself as an image. Dropping the tag leaves the empty span, which is what the theme CSS
    // already lays out.
    if (/\bsrc=""/.test(tag)) {
      emptySrc++;
      return "";
    }
    const srcM = tag.match(/\bsrc="([^"]+)"/);
    if (!srcM) return tag;
    const src = srcM[1];
    const isHero = src === heroUrl && !seenHero;
    if (isHero) seenHero = true;
    const index = imgIndex++;

    let next = tag;

    // explicit dimensions — reserves layout space, so no CLS while the image decodes
    if (!/\bwidth=/.test(next)) {
      const d =
        [...converted.entries()].find(([, v]) => v.url === src)?.[1] ??
        dims.get(src) ??
        dims.get([...dims.keys()].find((k) => k === src));
      if (d?.width && d?.height) {
        next = next.replace(/^<img\b/, `<img width="${d.width}" height="${d.height}"`);
        sized++;
      }
    }

    if (!/\bdecoding=/.test(next))
      next = next.replace(/^<img\b/, `<img decoding="async"`);

    if (isHero) {
      if (!/\bfetchpriority=/.test(next))
        next = next.replace(/^<img\b/, `<img fetchpriority="high"`);
      next = next.replace(/\s+loading="lazy"/, "");
    } else if (
      (seenHero || index >= ABOVE_FOLD) &&
      !/\bloading=/.test(next) &&
      !/fetchpriority="high"/.test(next)
    ) {
      next = next.replace(/^<img\b/, `<img loading="lazy"`);
      lazied++;
    }
    return next;
  });

  p.bodyHtml = out;
}

// The scraped head preloads the theme's own hero PNG, which is no longer the LCP element.
// Repoint it at the real one so the preload is doing useful work instead of wasting a request.
for (const l of site.assets.headLinks) {
  if (l.rel === "preload" && l.as === "image") {
    l.href = converted.get(HERO_SRC)?.url ?? HERO_SRC;
    l.type = "image/webp";
  }
}

// --- 5. site icons: derive a real favicon set from the brand mark ---------------------------
// WHY — the scraped head pointed `icons.icon` and `icons.apple` at
// `public/wp-content/themes/gogo/img/icons/favicon.ico` and `touch.png`, which are NOT images.
// Each is a 391 KB HTML copy of the old WordPress homepage: the scraper requested those icon
// paths, WordPress answered with a page, and the response was saved under the icon's name
// (docs/business-facts.md §C.5a). Every browser that asked this site for an icon got HTML back,
// so the site has shipped with no working favicon at all.
//
// The brand mark is a 70×70 WebP upload on a transparent ground. WebP favicons are not accepted
// everywhere and iOS does not accept one for `apple-touch-icon` at all, so the shipped set is
// derived here instead of referenced directly:
//
//   public/favicon.ico                        16/32/48 PNG-in-ICO — a bare GET /favicon.ico
//                                             resolves, which browsers and crawlers request
//                                             unconditionally whether or not a <link> exists
//   public/assets/icons/apple-touch-icon.png  180×180, opaque, inset
//
// Those two are the whole set ON PURPOSE. A standalone icon-32.png / icon-48.png was tried and
// removed: each was byte-identical to a payload already inside the .ico, so the extra <link>
// carried no pixels the .ico does not already have — three rel="icon" tags on 112 routes for
// one icon's worth of information. Every browser in use reads PNG-in-ICO and picks the right
// entry itself. The set to ADD, if the mark is ever redrawn as a vector, is an SVG icon plus a
// web app manifest with 192/512 PNGs — not more raster sizes of the same thing.
//
// `app/layout.tsx` declares this set directly rather than reading it back out of the scrape. The
// site's own identity should not be a function of what the old WordPress origin happened to
// serve — that indirection is exactly how the broken pair became the declared favicon.
//
// ⚠️ The source is only 70×70 (64×60 of actual mark), so `apple-touch-icon` is a 2.6× upscale.
// It is flat art and lanczos3 holds up, but a ≥512 px master or an SVG would be sharper and
// would unlock the manifest icons above. Note the tracked logo
// `uploads/2025/11/3-מנעולנים-לוגו.webp` carries a 153×144 crop of the same three-figure mark —
// higher resolution, but visibly DIFFERENT artwork (wider gaps, slimmer limbs), so swapping to
// it is a brand decision for the owner, not a free quality win. See docs/business-facts.md §C.5a.
const ICON_SRC = join(
  ROOT,
  "public",
  "wp-content",
  "uploads",
  "2025",
  "11",
  "3locksmiths_favicon.webp",
);
const ICON_DIR = join(ROOT, "public", "assets", "icons");
const ICO_OUT = join(ROOT, "public", "favicon.ico");
const ICO_SIZES = [16, 32, 48];
const APPLE_PX = 180;
// iOS masks the tile to a rounded rect and clips the corners, so the mark is inset rather than
// bled to the edge. 0.82 keeps the whole pictogram inside the mask on every iOS corner radius.
const APPLE_INSET = 0.82;
// iOS composites a transparent apple-touch-icon onto BLACK, so the ground has to be chosen here.
// White is not a placeholder — it is the only ground this mark reads on. The lightest opaque
// pixel in the source has a luminance of 146/255 (channel maxima 255/145/173: no light pixel
// exists anywhere), and the gutters BETWEEN the three figures are transparent. So any dark
// ground — brand navy #13263B included — swallows the navy figure and erases the separations.
// Do not "make it on-brand" without re-checking those two facts.
const APPLE_BG = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

if (!existsSync(ICON_SRC)) {
  console.error(`assets: brand icon source missing — expected ${ICON_SRC}`);
  console.error(`Place the square brand mark there, then re-run \`npm run enrich\`.`);
  process.exit(1);
}

/** Square PNG of the mark at `px`, alpha preserved, aspect kept by padding. */
const iconPng = (px) =>
  sharp(ICON_SRC)
    .resize(px, px, { fit: "contain", kernel: "lanczos3", background: TRANSPARENT })
    .png({ compressionLevel: 9 })
    .toBuffer();

/**
 * Packs PNGs into a multi-resolution .ico. sharp has no ICO encoder, and the container is
 * small enough to build directly:
 *
 *   ICONDIR         6 bytes   reserved=0, type=1 (icon), image count
 *   ICONDIRENTRY   16 bytes   per image, immediately after the ICONDIR
 *   payloads                  the PNG bytes, in entry order
 *
 * All multi-byte fields are little-endian. Width and height are ONE byte each, so 0 encodes
 * 256 — irrelevant at these sizes but wrong to hardcode. PNG-in-ICO (rather than a BMP
 * DIB) has been read by every browser since IE11 and keeps the alpha channel intact.
 */
function packIco(images) {
  const DIR = 6;
  const ENTRY = 16;
  const header = Buffer.alloc(DIR + ENTRY * images.length);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon (2 would be a cursor)
  header.writeUInt16LE(images.length, 4);

  let offset = header.length;
  images.forEach(({ size, png }, i) => {
    const at = DIR + ENTRY * i;
    header.writeUInt8(size >= 256 ? 0 : size, at); // width  — 0 means 256
    header.writeUInt8(size >= 256 ? 0 : size, at + 1); // height — 0 means 256
    header.writeUInt8(0, at + 2); // palette entries — 0 for truecolour
    header.writeUInt8(0, at + 3); // reserved
    header.writeUInt16LE(1, at + 4); // colour planes
    header.writeUInt16LE(32, at + 6); // bits per pixel
    header.writeUInt32LE(png.length, at + 8); // bytes in this image
    header.writeUInt32LE(offset, at + 12); // absolute offset of this image
    offset += png.length;
  });

  return Buffer.concat([header, ...images.map((i) => i.png)]);
}

mkdirSync(ICON_DIR, { recursive: true });

const icoParts = [];
for (const px of ICO_SIZES) icoParts.push({ size: px, png: await iconPng(px) });
writeFileSync(ICO_OUT, packIco(icoParts));

const markPx = Math.round(APPLE_PX * APPLE_INSET);
const mark = await sharp(ICON_SRC)
  .resize(markPx, markPx, { fit: "contain", kernel: "lanczos3", background: TRANSPARENT })
  .png()
  .toBuffer();
// `palette` is applied HERE ONLY, and the numbers are measured, not assumed. Against the same
// image encoded truecolour: max channel delta 14, mean 0.26, 19.4 KB → 7.8 KB (−60%). It
// quantises this well because it is flat art on an opaque ground. The .ico payloads above are
// the opposite case — they carry alpha, and quantising an alpha channel costs a max delta of
// 113–181; at 16px the palette file is also LARGER than the truecolour one. Do not generalise
// this flag to them.
const appleIcon = await sharp({
  create: { width: APPLE_PX, height: APPLE_PX, channels: 4, background: APPLE_BG },
})
  .composite([{ input: mark, gravity: "center" }])
  .flatten({ background: APPLE_BG })
  .removeAlpha()
  .png({ compressionLevel: 9, palette: true })
  .toBuffer();
writeFileSync(join(ICON_DIR, "apple-touch-icon.png"), appleIcon);

// The two scraped icon links are now dead weight: they name files that are not images, and
// app/layout.tsx no longer reads them. Dropping them here stops anything downstream — or a
// future reader of `assets.headLinks` — resurrecting a 391 KB HTML "icon".
const staleIcons = [];
site.assets.headLinks = site.assets.headLinks.filter((l) => {
  if (!/icon/.test(l.rel ?? "")) return true;
  staleIcons.push(`${l.rel} → ${l.href}`);
  return false;
});

// --- 6. main.css: the two defects on the critical path that no other pass can reach ----------
//
// main.css is the largest render-blocking stylesheet on every route, and it carries two problems
// that only a derived copy can fix — `public/wp-content/**` is vendored and never edited (§3
// rule 4), and neither problem is visible from the HTML, so steps 3 and 4 above cannot see them.
//
//   a. LINE 1 IS AN `@import` TO GOOGLE FONTS. An `@import` at the top of a render-blocking
//      sheet serialises a third-party round trip INSIDE the critical path: the browser cannot
//      apply main.css until fonts.googleapis.com answers, and it cannot even start that request
//      until main.css itself arrives. Measured on the live homepage that is four sequential hops
//      before first paint — HTML → main.css → googleapis → gstatic — with no preconnect for
//      either font origin. It pulls Inter, Lato and Manrope.
//
//   b. THE LCP ELEMENT IS A CSS BACKGROUND IMAGE. `.page-template-builder` (105 of 109 pages)
//      paints the dark band behind the hero at `background-size: 100% 760px`, from:
//        desktop  Group1948753244-ezgif.com-crop-1.png   970,349 B
//        mobile   Group-1948753239-1-ezgif.com-crop.png  256,778 B  (@media max-width: 768px)
//      Step 4 collects images referenced from `<img>` tags, so it has never seen either. They
//      re-encode to roughly 28 KB and 8.6 KB — the largest single paint on the site, at 3% of
//      its bytes.
//
// Same idiom as the Font Awesome subset above: derive into public/assets/, repoint the <link>,
// leave the vendored original untouched and unreferenced. The derived copy is listed in
// .prettierignore for the same reason fa-subset.css is.
const THEME_CSS_DIR = join(
  ROOT,
  "public",
  "wp-content",
  "themes",
  "gogo",
  "assets",
  "css",
);
const THEME_IMG_DIR = join(
  ROOT,
  "public",
  "wp-content",
  "themes",
  "gogo",
  "assets",
  "img",
);
const THEME_IMG_OUT = join(IMG_OUT_DIR, "theme");
const MAIN_OUT = join(FA_OUT_DIR, "main.css");
const MAIN_HREF = "/assets/main.css";
const BG_CONVERT_OVER = 8 * 1024;

// WHICH FONT FAMILIES ACTUALLY RENDER — the analysis behind dropping the Alexandria/Poppins
// stylesheet below, recorded because it is not obvious and is worth re-checking if the theme CSS
// is ever re-scraped.
//
// rtl.css loads AFTER main.css and re-declares both `body` and `h1–h6` in Rubik, the heading rule
// with `!important`. Every competing declaration on this site is therefore dead:
//   Manrope  11 rules — `body` (lost to rtl.css's body rule), seven on h3/h4 elements (lost to
//            the !important heading rule, `.quiz-step .step-title` included: it is an <h4>), and
//            three on `.s-latest-posts` / `.widget-posts` markup that exists on 0 pages
//   Lato      1 rule  — `h6`, lost to the same !important rule
//   Poppins   1 rule  — `.feedback-widget-sd .saswp-*`, and `saswp-` appears on 0 pages
//   Inter     0 rules — requested by the @import and never named by any declaration
//   Alexandria 0 rules — requested by the <link> and never named by any declaration
// Leaving Rubik as the only family that paints a pixel. Three Google Fonts stylesheet requests
// across two extra origins collapse to one.
//
// That conclusion rests entirely on the two rtl.css rules, so they are asserted rather than
// assumed. If a re-scrape ever drops them, this fails here instead of silently shipping Hebrew
// body text in a fallback face.
const rtlCss = readFileSync(join(THEME_CSS_DIR, "rtl.css"), "utf8");
const RTL_OVERRIDES = [
  {
    re: /h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*\{\s*font-family:\s*'Rubik',\s*serif\s*!important;?\s*\}/,
    what: "the h1–h6 `font-family: 'Rubik' !important` rule",
  },
  {
    re: /body\s*\{[^}]*font-family:\s*'Rubik'/,
    what: "the `body { font-family: 'Rubik' }` rule",
  },
];
for (const g of RTL_OVERRIDES) {
  if (g.re.test(rtlCss)) continue;
  console.error(
    `assets: rtl.css no longer contains ${g.what}.\n` +
      "  Dropping the Alexandria/Poppins stylesheet is only safe while rtl.css overrides every\n" +
      "  other font-family on the site. Re-run the analysis in scripts/assets.mjs step 6 before\n" +
      "  shipping — see the comment above this check.",
  );
  process.exit(1);
}

let mainCss = readFileSync(join(THEME_CSS_DIR, "main.css"), "utf8");

// 6a. the @import. Absence is not an error — a re-scrape may simply not have it — but it is
// worth reporting, because "0 removed" and "1 removed" mean very different things here.
const FONT_IMPORT =
  /^@import\s+url\((['"])https:\/\/fonts\.googleapis\.com[^)]*\1\);?[ \t]*\r?\n?/m;
const hadImport = FONT_IMPORT.test(mainCss);
if (hadImport) mainCss = mainCss.replace(FONT_IMPORT, "");

// 6b. the background rasters. Encode first, then rewrite — a file referenced by both the desktop
// rule and a media query is encoded once.
mkdirSync(THEME_IMG_OUT, { recursive: true });
/** '../img/x.png' -> { webp, avif, from, to } — absolute URLs, ready to substitute */
const bgImages = new Map();
let bgSaved = 0;
for (const m of mainCss.matchAll(
  /url\((['"]?)(\.\.\/img\/([^)'"]+?\.(?:png|jpe?g)))\1\)/gi,
)) {
  const rel = m[2];
  if (bgImages.has(rel)) continue;
  const file = decodeURIComponent(m[3]);
  const abs = join(THEME_IMG_DIR, file);
  if (!existsSync(abs)) continue;
  const size = statSync(abs).size;
  // Below the threshold an extra file and an extra `image-set()` declaration cost more than the
  // bytes they save; those references only need their relative path made absolute.
  if (size < BG_CONVERT_OVER) {
    bgImages.set(rel, { absolute: `/wp-content/themes/gogo/assets/img/${file}` });
    continue;
  }
  const stem = basename(file, extname(file));
  const webp = await sharp(abs).webp({ quality: 82 }).toBuffer();
  const avif = await sharp(abs).avif({ quality: 55 }).toBuffer();
  if (webp.length >= size) continue; // never adopt a "conversion" that grew
  writeFileSync(join(THEME_IMG_OUT, `${stem}.webp`), webp);
  writeFileSync(join(THEME_IMG_OUT, `${stem}.avif`), avif);
  bgSaved += size - Math.min(webp.length, avif.length);
  bgImages.set(rel, {
    webp: `/assets/img/theme/${stem}.webp`,
    avif: `/assets/img/theme/${stem}.avif`,
  });
}

// `background-image:` declarations get the two-declaration pattern: a plain WebP url() that every
// browser understands, then an image-set() that only browsers supporting it will apply. A browser
// that does not know image-set() discards the second declaration as invalid and keeps the WebP.
let bgRules = 0;
mainCss = mainCss.replace(
  /(background-image:\s*)url\((['"]?)(\.\.\/img\/[^)'"]+?\.(?:png|jpe?g))\2\)(\s*;)/gi,
  (all, prop, _q, rel, tail) => {
    const img = bgImages.get(rel);
    if (!img?.webp) return all;
    bgRules++;
    return (
      `${prop}url('${img.webp}')${tail}\n\t${prop}image-set(` +
      `url('${img.avif}') type('image/avif'), url('${img.webp}') type('image/webp'))${tail}`
    );
  },
);

// Anything still relative would 404: the derived copy lives at /assets/main.css, so `../img/…`
// and `../fonts/…` no longer resolve against the theme directory.
mainCss = mainCss.replace(/url\((['"]?)\.\.\/([^)'"]+?)\1\)/g, (all, _q, rest) => {
  const img = bgImages.get(`../${rest}`);
  if (img) return `url('${img.absolute ?? img.webp}')`;
  return `url('/wp-content/themes/gogo/assets/${rest}')`;
});

mainCss =
  `/* Generated by scripts/assets.mjs — do not edit. Source: themes/gogo/assets/css/main.css.\n` +
  ` * The Google Fonts @import is removed and the background rasters are re-encoded; everything\n` +
  ` * else is byte-identical to the vendored original. Regenerate with \`npm run enrich\`. */\n` +
  mainCss;

mkdirSync(FA_OUT_DIR, { recursive: true });
writeFileSync(MAIN_OUT, mainCss, "utf8");

// 6b′. what the LCP element needs preloaded — recorded as DATA, read by components/SiteFrame.
//
// The hero band is a CSS background on `.page-template-builder`, and it is the LCP element on
// every page that paints it (measured 2026-09-30 on the homepage, a service page, a location
// page and the guides hub — docs/optimization-backlog.md §10.8). A background is discovered only
// after THIS stylesheet downloads and parses: 1.9 s of "resource load delay" on a throttled
// phone, for an 8.6 KB file, requested at Low priority. A <link rel="preload"> in the HTML moves
// discovery to the first bytes of the document.
//
// A preload must name EXACTLY the URL the rule requests, under EXACTLY its media condition — a
// mismatch downloads the image twice and logs "preloaded but not used". So the URLs, the media
// query and the classes are read back out of the CSS written two lines above, never typed into a
// component: if the theme's image or breakpoint ever changes, the preload follows, or this fails.
//
// AVIF only — and what that costs on browsers that do not take the image-set() branch:
//   · no AVIF at all (Safari ≤ 15, Chrome < 85): `type="image/avif"` makes the browser skip the
//     preload, and it finds the WebP through the plain `url()` declaration exactly as before.
//   · AVIF yes, `type()` inside image-set() no (iOS/macOS Safari 16.x, Chromium 85–112 — about
//     1.7% of global traffic on 2026-09-30, mostly Chrome 109 and iOS 16): the preload's type
//     check passes, so the AVIF downloads (8.6 KB mobile / 28 KB desktop) and is never used; the
//     WebP then loads as late as it always did. A wasted request and a "preloaded but not used"
//     console warning, never a wrong image. No markup can close this — a <link> cannot test for
//     image-set type() — and preloading WebP instead would make every current browser fetch
//     both formats. So a warning from Safari 16 or Chrome 109 is this, not a URL mismatch.
const BAND_SELECTOR = ".page-template-builder";

/** Every rule whose selector list names the band and whose body carries an AVIF image-set(). */
function bandRules(css) {
  const found = [];
  const scan = (text, media) => {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf("{", i);
      if (open === -1) break;
      let depth = 1;
      let j = open + 1;
      while (j < text.length && depth) {
        if (text[j] === "{") depth++;
        else if (text[j] === "}") depth--;
        j++;
      }
      const prelude = text.slice(i, open).trim();
      const body = text.slice(open + 1, j - 1);
      if (/^@media\b/i.test(prelude)) {
        scan(body, prelude.replace(/^@media\s*/i, "").trim());
      } else if (!prelude.startsWith("@")) {
        const selectors = prelude.split(",").map((s) => s.trim());
        const avif = /image-set\(\s*url\('([^']+\.avif)'\)\s*type\('image\/avif'\)/.exec(
          body,
        );
        if (avif && selectors.includes(BAND_SELECTOR)) {
          found.push({ media, avif: avif[1], selectors });
        }
      }
      i = j;
    }
  };
  scan(css.replace(/\/\*[\s\S]*?\*\//g, ""), null);
  return found;
}

const band = bandRules(mainCss);
const bandBase = band.filter((b) => b.media === null);
const bandAlt = band.filter((b) => b.media !== null);
const bandClasses = bandBase[0]?.selectors ?? [];
const bandFiles = band.map((b) => join(ROOT, "public", b.avif));
if (
  bandBase.length !== 1 ||
  bandAlt.length !== 1 ||
  !bandClasses.every((s) => /^\.[\w-]+$/.test(s)) ||
  !bandFiles.every((f) => existsSync(f))
) {
  console.error(
    "assets: cannot derive the hero-band preload. Expected exactly one base rule and one\n" +
      `  @media rule for ${BAND_SELECTOR}, each with an AVIF image-set() whose file exists, and a\n` +
      "  selector list of plain classes. Found: " +
      JSON.stringify(
        band.map((b) => ({ media: b.media, avif: b.avif, selectors: b.selectors })),
      ) +
      "\n  A second breakpoint needs the base rule's media negation rewritten — see 6b′.",
  );
  process.exit(1);
}
// The variant under the media query first, then the base under its exact negation, so exactly
// one of the two ever applies — `not all and (…)` is the standard complement of a media query,
// with no fractional-pixel gap the way `min-width: 769px` would leave one.
site.assets.band = {
  classes: bandClasses.map((s) => s.slice(1)),
  preloads: [
    { href: bandAlt[0].avif, type: "image/avif", media: bandAlt[0].media },
    {
      href: bandBase[0].avif,
      type: "image/avif",
      media: `not all and ${bandAlt[0].media}`,
    },
  ],
};

// content/site.json is stateful — nothing regenerates the scraped head between runs — so this
// has to converge, not fire once. Matching the vendored path ALONE made the second `npm run
// enrich` a hard failure: run 1 rewrote the href, run 2 found nothing left to rewrite and could
// not tell that from main.css having vanished. Counting an href that is ALREADY the derived copy
// as a hit is what makes repeated runs idempotent, the same way hero-gallery.mjs matches both
// spellings of the avatar. The check below is still worth keeping: zero hits now genuinely means
// the stylesheet is absent from the head.
let mainSwapped = 0;
for (const l of site.assets.headLinks) {
  if (!l.href) continue;
  if (l.href === MAIN_HREF) {
    mainSwapped++;
  } else if (/themes\/gogo\/assets\/css\/main\.css/.test(l.href)) {
    l.href = MAIN_HREF;
    mainSwapped++;
  }
}
if (mainSwapped === 0) {
  console.error(
    "assets: main.css is in neither its vendored nor its derived position in\n" +
      "  site.assets.headLinks — the theme's largest stylesheet would never load. Re-scrape, or\n" +
      "  check whether an earlier pass dropped it.",
  );
  process.exit(1);
}

// 6c. the Alexandria + Poppins stylesheet. Neither family is named by a single declaration that
// survives rtl.css (see the analysis above), and the request costs a full round trip to a third
// origin — Poppins alone is asked for in 18 static weights.
const droppedFonts = [];
site.assets.headLinks = site.assets.headLinks.filter((l) => {
  if (!/fonts\.googleapis\.com\/css2\?family=Alexandria/.test(l.href || "")) return true;
  droppedFonts.push(l.href);
  return false;
});

writeFileSync(SITE, JSON.stringify(site, null, 2), "utf8");

const srcKb = (fa.length / 1024).toFixed(0);
const outKb = (subset.length / 1024).toFixed(1);
console.log(
  `assets: font-awesome subset → ${rules.length} icons, ${srcKb} KB → ${outKb} KB (${swapped} link(s) repointed)`,
);
console.log(
  dropped.length
    ? `assets: dropped ${dropped.length} unused stylesheet(s): ${dropped.join(", ")} (${before} → ${afterStylesheets} head links)`
    : `assets: no stylesheets dropped (all still referenced)`,
);
console.log(
  `assets: images → ${converted.size} converted to WebP (${(savedBytes / 1024 / 1024).toFixed(2)} MB smaller), ` +
    `${rewritten} reference(s) repointed, ${lazied} image(s) set to lazy-load, ` +
    `${sized} given explicit width/height` +
    (emptySrc ? `, ${emptySrc} empty-src tag(s) removed` : ``),
);
console.log(
  `assets: main.css → ${MAIN_HREF} (${hadImport ? "Google Fonts @import removed" : "no @import found"}, ` +
    `${bgRules} background rule(s) re-encoded, ${(bgSaved / 1024).toFixed(0)} KB smaller)` +
    (droppedFonts.length ? `; dropped the Alexandria/Poppins stylesheet` : ``),
);
console.log(
  `assets: hero band → preload recorded for .${site.assets.band.classes.join(" / .")}: ` +
    site.assets.band.preloads.map((p) => `${basename(p.href)} [${p.media}]`).join(", "),
);
console.log(
  `assets: icons → favicon.ico (${ICO_SIZES.join("/")}) + apple-touch ${APPLE_PX}px, ` +
    `both from ${basename(ICON_SRC)}` +
    (staleIcons.length
      ? `; dropped ${staleIcons.length} broken scraped icon link(s)`
      : ``),
);
for (const link of staleIcons) console.log(`   icon link dropped: ${link}`);
