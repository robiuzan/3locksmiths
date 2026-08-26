---
name: performance-web-vitals
description: Core Web Vitals for a snapshot-ported static export on Cloudflare Pages — the 57.9 MB export and its ~8 MB of legacy icon-font SVGs, the 780 KB homepage HTML, the unoptimized hero JPEG and why next/image cannot help, the deliberately load-bearing jQuery replay, font loading, and CLS reserves for authored blocks. Use before shipping or when LCP, CLS or INP regress. Triggers "perf pass", "Core Web Vitals", "LCP slow", "image optimization", "bundle size", "srcset".
---

# Core Web Vitals

Static HTML on Cloudflare's edge — TTFB and caching are already good. The problems are **inherited
weight**, not application code.

## The constraint that shapes every fix

The page bodies are scraped WordPress HTML, styled by vendored theme CSS in `public/wp-content/` and
enhanced by the original jQuery. **You do not edit `public/wp-content/` or `public/wp-includes/`.**

So a fix is only actionable if it lands in one of:

- `scripts/*.mjs` — the scrape/transform/fix-links pipeline (rewrites markup at build time)
- `lib/enrich/render.mjs` — the authored-block renderer
- `app/enrich.css` — the one stylesheet this project owns
- `next.config.ts` / `app/layout.tsx` — the shell
- an owner/infra change at the Cloudflare edge

"Remove this stylesheet" or "drop jQuery" is not a recommendation unless you can show the site renders
identically.

## Where the 57.9 MB goes

Measure before recommending. Current distribution of everything over 500 KB:

| File                                                     | Size    |
| -------------------------------------------------------- | ------- |
| `wp-content/themes/gogo/assets/fonts/fa-duotone-900.svg` | 2.17 MB |
| `…/fa-light-300.svg`                                     | 1.98 MB |
| `…/fa-regular-400.svg`                                   | 1.78 MB |
| `…/fa-solid-900.svg`                                     | 1.45 MB |
| `…/fa-brands-400.svg`                                    | 0.66 MB |
| `wp-content/uploads/2025/04/157336036_m.jpg`             | 0.96 MB |
| `wp-content/themes/gogo/assets/img/Group1948753244-…png` | 0.93 MB |
| `out/index.html`                                         | 0.78 MB |

## The ~8 MB of icon-font SVGs — the biggest single win, with a caveat

The five Font Awesome `.svg` files total ~8 MB and upload on every deploy. The `.svg` variants are the
**legacy fallback format** for very old browsers; `.woff2` is what anything modern loads.

**Root-cause before deleting** (backlog §10.2). Grep the vendored CSS for how they are referenced:

```bash
grep -rn 'fa-solid-900\|\.svg#' public/wp-content/themes/gogo/assets/css/ | head
```

A `src:` list in `@font-face` fetches only the **first format the browser supports**, so a modern
browser never downloads the SVG — meaning these cost deploy bandwidth and storage, not user
bandwidth. That changes the priority: it is a build-hygiene win, not an LCP win. **Say which it is.**

If they are genuinely unreferenced by any format a real browser takes, excluding them belongs in the
asset-vendoring step of the pipeline, not a manual `rm` from `out/`.

## `out/index.html` is 780 KB

The homepage is one enormous scraped document. Inherent to the snapshot approach — but quantify what
fraction is inline `<script>` / `<style>` versus actual content before concluding anything:

```bash
node -e 'const h=require("fs").readFileSync("out/index.html","utf8");
const s=(h.match(/<script[\s\S]*?<\/script>/g)||[]).join("").length;
const c=(h.match(/<style[\s\S]*?<\/style>/g)||[]).join("").length;
console.log("total",h.length,"script",s,"style",c,"rest",h.length-s-c);'
```

If inline scripts dominate, the win is in `scripts/transform.mjs` — moving repeated inline blocks to
a shared external file that caches across pages, without changing execution order. That is delicate:
`ThemeScripts` replays in document order and the order is load-bearing.

## Images — and why `next/image` cannot help here

`images: { unoptimized: true }` is correct for a static export. But the content images are **plain
`<img>` tags inside scraped HTML** — there is no `next/image` component to configure, and no `sizes`
prop to fix. Nothing in this repo generates a `srcset` today.

`uploads/2025/04/157336036_m.jpg` (0.96 MB) is both the hero and the `LocalBusiness` node's `image`.
On a phone it is the LCP-blocking download.

Three routes — pick one deliberately:

1. **Rewrite `<img>` tags in the pipeline** to add `srcset`/`sizes` pointing at Cloudflare
   `/cdn-cgi/image` transforms. The zone is proxied, so the transform path is available, and
   `@ishub/site-kit`'s `mediaUrl`/`srcsetFor` give you the URL shape. Most faithful to the port —
   the markup stays raw HTML.
2. **Pre-generate width variants** into `public/wp-content/uploads/` and write a static `srcset`.
   No host dependency, more files to manage.
3. **Add `loading="lazy"` and `decoding="async"`** to below-the-fold images in the pipeline. Cheapest
   by far, and worth doing regardless of 1 or 2.

Whatever you choose, **do not add `sizes` without a `srcset`** — it looks correct in review and does
nothing.

## JS budget (INP)

`components/ThemeScripts.tsx` replays jQuery, owl.carousel, magnific-popup, calculator.js, quiz.js,
marquee and fancybox **in document order on every page**. **This is deliberate and load-bearing** —
it is what makes the port faithful. Do not recommend removing it.

The available win is **per-page conditional loading**: the calculator only matters on `/step/` and
`/מחירון/`, fancybox only where there's a gallery. That requires knowing which libraries each page
actually uses, which means analysing the scraped script list per page in `scripts/pages.mjs`. Scope it
honestly before proposing it (backlog §10.5).

A genuine strength worth noting: **exactly one client component exists** in the whole app.

## Fonts

Google Fonts (Alexandria, Rubik, Poppins) load via the original `<link>` to Google's CDN, matching the
source. No `rel="preload"`, so they FOUT on first paint. Adding a preconnect/preload in
`app/layout.tsx` is safe and does not change the ported markup (backlog §10.6).

## CLS

The theme CSS reserves most boxes. The risk is **new** blocks from `lib/enrich/render.mjs` — every
image, table and grid it emits needs its box reserved in `app/enrich.css`. The existing rules do this
(fixed `width`/`height` on the step badge, explicit grid templates); match them.

## Measuring

You are reading the artifact, not measuring a browser. For real numbers run Lighthouse or PSI against
the **live** URL on a mobile profile, and check field data in Search Console. Test a service page and
a location page, not just the homepage — they have different LCP elements and very different HTML
sizes.

## Checklist

- [ ] The icon-font SVG question is root-caused (referenced or not) before anything is removed.
- [ ] The LCP element per route type is identified and sized for the viewport.
- [ ] Below-the-fold images carry `loading="lazy"` — added in the pipeline.
- [ ] No `sizes` without a `srcset`.
- [ ] Fonts preconnected or preloaded.
- [ ] The jQuery replay is intact and still runs in document order.
- [ ] CLS reserves present for every block `render.mjs` emits.
- [ ] `npm run enrich && npm run build`, then re-measure.

```bash
find out -type f -size +500k -exec ls -lh {} \; | sort -k5 -h -r | head -15
du -sh out
grep -c 'srcset' out/index.html
grep -c 'loading="lazy"' out/index.html
```

## Gotchas

- Never delete from `out/` — it is regenerated. Fix the pipeline or the vendoring step.
- Never edit `public/wp-content/`.
- `rm -rf .next out` before a measurement build; a polluted `.next` can carry stale chunks into the
  export.
- Don't optimise the homepage in isolation. It is the outlier at 780 KB; the median page is far
  smaller and has a different bottleneck.
