/**
 * Turns a central-catalog image ref into an <img> tag served through Cloudflare Image
 * Transformations. The ONE place a catalog key becomes markup.
 *
 * WHY THIS EXISTS AT ALL
 *
 *   docs/optimization-backlog.md §10.4: `@ishub/site-kit` ships `SiteImage`, `mediaUrl` and
 *   `srcsetFor`, and the media host is configured — but "the content is injected as raw HTML, so
 *   adopting them means rewriting <img> tags in the pipeline, not swapping a React component."
 *   This is that rewrite. A sibling site (allacrepairhouston.com) already emits exactly these URLs
 *   from the React path; this reproduces them for the injected-HTML path.
 *
 * WHY THE URL BUILDER IS DUPLICATED HERE, WHICH IS NORMALLY A SMELL
 *
 *   `@ishub/site-kit` publishes TypeScript source only — no dist (see its package.json: every
 *   export points at a `.ts`). The app can import it because next.config.ts sets
 *   `transpilePackages`, but this file runs under bare `node` in the enrich chain, which cannot.
 *
 *   So `mediaUrl`/`widthsFor` below are a deliberate reimplementation. To stop it drifting,
 *   scripts/check-catalog-images.mjs pins the output against a REAL srcset that
 *   allacrepairhouston.com serves in production today. If site-kit changes its ladder or option
 *   order, that check is where you find out.
 *
 * EVERYTHING IS ESCAPED. render.mjs escapes text but almost no attributes (only `alt` on the hero);
 * every attribute this module writes goes through esc().
 */

import { readFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { esc } from "./esc.mjs";

const manifest = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "..", "site.config.json"),
    "utf8",
  ),
);

/** The `images` block, synced down from the roster by ops/sync-media.ps1. Never edited here. */
const IMAGES = manifest.images ?? null;

// ---------------------------------------------------------------------------
// URL construction — mirrors @ishub/site-kit/src/media/url.ts. See the header note.
// ---------------------------------------------------------------------------

const LADDER = [320, 480, 640, 768, 960, 1280, 1600, 1920, 2560];
const MAX_WIDTH = 2560;

/** Candidate widths, always capped at the intrinsic width: upscaling wastes bytes and softens. */
export function widthsFor(intrinsic, fixed = false) {
  if (fixed) {
    return Array.from(new Set([intrinsic, intrinsic * 2]))
      .filter((w) => w <= MAX_WIDTH)
      .sort((a, b) => a - b);
  }
  const cap = Math.min(intrinsic, MAX_WIDTH);
  const out = LADDER.filter((w) => w < cap);
  out.push(cap);
  return out;
}

const clamp01 = (n) => Math.min(1, Math.max(0, Math.round(n * 100) / 100));

/** Option order is FIXED so the URL is byte-stable, which keeps the CDN cache key stable. */
export function mediaUrl(host, key, o) {
  const parts = [
    `width=${Math.round(o.width)}`,
    `quality=${o.quality ?? 80}`,
    "format=auto",
    `fit=${o.fit ?? "cover"}`,
  ];
  if (o.focal) parts.push(`gravity=${clamp01(o.focal.x)}x${clamp01(o.focal.y)}`);
  return `https://${host}/cdn-cgi/image/${parts.join(",")}/${String(key).replace(/^\/+/, "")}`;
}

const isVector = (ref) => ref?.kind === "vector" || /\.svgz?$/i.test(ref?.key ?? "");

export function srcsetFor(ref, { fixed = false, fit = "cover", quality } = {}) {
  if (!IMAGES?.mediaHost || !ref || isVector(ref) || !ref.width) return undefined;
  return widthsFor(ref.width, fixed)
    .map(
      (w) =>
        `${mediaUrl(IMAGES.mediaHost, ref.key, {
          width: w,
          quality: quality ?? IMAGES.defaultQuality,
          fit,
          focal: ref.focal,
        })} ${w}w`,
    )
    .join(", ");
}

/** The plain object URL. Used for JSON-LD, where a crawler wants a stable canonical asset. */
export function originalUrl(ref) {
  if (!IMAGES?.mediaHost || !ref?.key) return null;
  return `https://${IMAGES.mediaHost}/${String(ref.key).replace(/^\/+/, "")}`;
}

// ---------------------------------------------------------------------------
// Resolving refs out of the manifest
// ---------------------------------------------------------------------------

/**
 * Look up one image ref by name.
 *   imageRef("hero") | imageRef("og") | imageRef("logo")   -> the fixed slot
 *   imageRef("hero-car")                                   -> a gallery item, matched on its
 *                                                             key basename without extension
 * Returns null when nothing is published under that name — every caller MUST handle null and fall
 * back, because this pipeline has to keep building before a single image has been generated.
 */
export function imageRef(name) {
  if (!IMAGES) return null;
  if (Object.prototype.hasOwnProperty.call(IMAGES, name)) {
    const slot = IMAGES[name];
    return slot && slot.key ? slot : null;
  }
  const items = IMAGES.gallery?.items ?? [];
  return (
    items.find((it) => basename(String(it.key)).replace(/\.[^.]+$/, "") === name) ?? null
  );
}

// ---------------------------------------------------------------------------
// Which hero belongs on which page
// ---------------------------------------------------------------------------

/**
 * The site sells two things through one shared hero, so the split is three buckets, not two.
 * Checked against content/enriched/_manifest.json: 48 car, 9 home, 49 both.
 *
 *   brand-key (32)  -> car     every one is a car-brand key page
 *   locations (32)  -> both    a city page sells the full range; forcing it to car would
 *                              misrepresent half the offer on the highest-traffic pages
 *   guides (12)     -> both
 *
 * DEFAULT IS "both". A page added tomorrow gets the image that is never actively wrong, rather
 * than silently inheriting a car photo onto a lock article.
 */
const CAR_SERVICES = new Set([
  93, // מנעולן רכב
  95, // שכפול מפתח לרכב
  96, // שחזור מפתח לרכב
  97, // קודן לרכב
  115, // שכפול שלט לרכב
  9301, // פתיחת רכב נעול
  9401,
  9402,
  9403,
  9404,
  9405,
  9406,
  9407, // the קודן לרכב cluster
]);

const HOME_SERVICES = new Set([
  94, // מנעולן לבית
  192, // דלת פלדלת
  193, // דלת ממד
  194, // מנעול רב בריח
  196, // מולטילוק
  9302, // פתיחת דלת נעולה
  9101, // תיקון דלתות
  9102, // החלפת מנעולים
]);

// The core pages duplicate four service pages by design (CLAUDE.md §3 rule 5 — live permalinks
// holding ranking signal). They are classified the same way as their twins.
const CAR_CORE = new Set([77, 113, 189]);
const HOME_CORE = new Set([78]);

/** @returns {"car"|"home"|"both"} */
export function heroBucket(page) {
  if (page?.kind === "brand-key") return "car";
  if (CAR_SERVICES.has(page?.id) || CAR_CORE.has(page?.id)) return "car";
  if (HOME_SERVICES.has(page?.id) || HOME_CORE.has(page?.id)) return "home";
  return "both";
}

/**
 * The hero ref for a page, or null when nothing is published yet.
 * "both" is the `hero` SLOT because it covers the most pages and Media Studio allows exactly one
 * hero key per site; car and home are gallery items.
 */
export function heroRefFor(page) {
  const bucket = heroBucket(page);
  if (bucket === "both") return imageRef("hero");
  return imageRef(`hero-${bucket}`) ?? imageRef("hero");
}

// ---------------------------------------------------------------------------
// Markup
// ---------------------------------------------------------------------------

/** Per-slot `sizes`, derived from the gogo CSS rather than guessed. */
export const SIZES = {
  // .header-banner-right is max-width:587px and sits in a .col-lg-6 that goes full width < 992px
  hero: "(max-width: 991px) 100vw, 587px",
  // .home-hero-right-galley .gallery-item is flex-basis: calc(50% - 10px) of a ~600px column
  tile: "(max-width: 991px) 50vw, 290px",
  // .cta-section .grid-cta is max-width:976px, two columns with a 24px gap -> a 476px cell.
  // It collapses to a single column below 992px (media.css:749).
  cta: "(max-width: 991px) 100vw, 476px",
  avatar: "96px",
  // .enrich-keycard__media is a 1:1 box in a 4/3/2 grid, MINUS its own 16px padding either side —
  // so the picture is 32px narrower than the card. Measured on the built page rather than derived:
  // 262px at a 1425px viewport, 131px at 375px. The earlier 270px/45vw described the card.
  keyModel: "(max-width: 767px) 36vw, (max-width: 1199px) 27vw, 262px",
};

/**
 * Build a complete <img>.
 *
 * `width`/`height` and a loading hint are emitted HERE and not left to scripts/assets.mjs: that
 * script only collects `/wp-content/uploads/**` (assets.mjs:177-183), so it never sees an
 * imgquarry.com URL. Without these the hero would ship with no reserved box and CLS would regress
 * on 106 pages — see optimization-backlog.md §10.7.
 *
 * @param {object|null} ref     an ImageRef from the manifest; null returns null (caller falls back)
 * @param {object} [opts]
 * @param {string} [opts.sizes]  a SIZES value
 * @param {boolean} [opts.eager] true for an LCP element: eager + fetchpriority=high
 * @param {string} [opts.className]
 * @param {string} [opts.alt]    overrides the ref's own alt
 * @param {boolean} [opts.fixed] 1x/2x ladder, for logos and avatars in a fixed CSS box
 * @returns {string|null}
 */
export function catalogImg(ref, opts = {}) {
  if (!ref?.key || !IMAGES?.mediaHost) return null;

  const { sizes, eager = false, className, alt, fixed = false, fit = "cover" } = opts;

  // Hebrew alt first: this is an RTL, Hebrew-language site and the alt is read aloud in Hebrew.
  // An empty string is a legitimate value (decorative), so only fall through on null/undefined.
  const altText = alt ?? ref.altHe ?? ref.alt ?? "";

  const src = mediaUrl(IMAGES.mediaHost, ref.key, {
    width: Math.min(ref.width, MAX_WIDTH),
    quality: IMAGES.defaultQuality,
    fit,
    focal: ref.focal,
  });
  const srcset = srcsetFor(ref, { fixed, fit });

  const attrs = [
    `src="${esc(src)}"`,
    srcset ? `srcset="${esc(srcset)}"` : "",
    srcset && sizes ? `sizes="${esc(sizes)}"` : "",
    `width="${Number(ref.width) || ""}"`,
    `height="${Number(ref.height) || ""}"`,
    `alt="${esc(altText)}"`,
    className ? `class="${esc(className)}"` : "",
    'decoding="async"',
    eager ? 'fetchpriority="high"' : 'loading="lazy"',
  ].filter(Boolean);

  return `<img ${attrs.join(" ")}>`;
}

/** True once anything at all has been published for this site — used by the placeholder report. */
export function hasCatalogImages() {
  if (!IMAGES) return false;
  return Boolean(IMAGES.hero || IMAGES.logo || (IMAGES.gallery?.items ?? []).length);
}

export const _internals = {
  IMAGES,
  LADDER,
  MAX_WIDTH,
  CAR_SERVICES,
  HOME_SERVICES,
  CAR_CORE,
  HOME_CORE,
};
