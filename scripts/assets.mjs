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

// Collect every referenced upload once, so a file used on 95 pages is encoded a single time.
const referenced = new Set();
for (const p of site.pages) {
  for (const m of (p.bodyHtml || "").matchAll(
    /\/wp-content\/uploads\/[^"'\s)]+?\.(?:png|jpe?g)/gi,
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
      if (d?.width && d?.height)
        next = next.replace(/^<img\b/, `<img width="${d.width}" height="${d.height}"`);
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

writeFileSync(SITE, JSON.stringify(site, null, 2), "utf8");

const srcKb = (fa.length / 1024).toFixed(0);
const outKb = (subset.length / 1024).toFixed(1);
console.log(
  `assets: font-awesome subset → ${rules.length} icons, ${srcKb} KB → ${outKb} KB (${swapped} link(s) repointed)`,
);
console.log(
  dropped.length
    ? `assets: dropped ${dropped.length} unused stylesheet(s): ${dropped.join(", ")} (${before} → ${site.assets.headLinks.length} head links)`
    : `assets: no stylesheets dropped (all still referenced)`,
);
console.log(
  `assets: images → ${converted.size} converted to WebP (${(savedBytes / 1024 / 1024).toFixed(2)} MB smaller), ` +
    `${rewritten} reference(s) repointed, ${lazied} image(s) set to lazy-load`,
);
