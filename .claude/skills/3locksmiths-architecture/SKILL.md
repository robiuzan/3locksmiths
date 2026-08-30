---
name: 3locksmiths-architecture
description: Start-here orientation for 3locksmiths.co.il — the scrape → enrich → site.json → catch-all route data flow, why page bodies are injected HTML rather than components, the Tailwind and jQuery decisions that look wrong and are not, the file map, static-export constraints, the percent-encoded Hebrew route matcher, the npm pipeline scripts, and the deploy truth. Use at the start of any task in this repo, or when unsure where content, routes, metadata or business facts come from. Triggers "where does X live", "how is this site built", "orient me", "architecture", "why is this not working in production".
---

# 3locksmiths.co.il architecture

שלושה מנעולנים — locksmith for car and home. Hebrew RTL, **111 pages**, Next.js 16 App Router compiled
to static HTML. **Read this before changing anything** — this repo will trip every instinct you have
from a normal React site.

## The one thing to internalise

This is a **1:1 port of a WordPress site**, not a component-based build. The WordPress source was a
custom theme (`gogo`) with a server-side page builder and heavy jQuery — its REST API returns **empty
`content.rendered`** for every inner page, so the design and content could not be fetched as data.

**So the page bodies are scraped live HTML, injected with `dangerouslySetInnerHTML`.**

```
live WordPress HTML ──scrape──► content/site.json ──► SiteFrame ──► dangerouslySetInnerHTML
                                       ▲
                    content/enriched/<id>.mjs ──enrich──┘  (replaces <main> + all JSON-LD)
```

React treats the body as opaque **on purpose**, so the original jQuery can enhance it exactly as it
did on the live site.

## Five things that look like bugs and are not

1. **`dangerouslySetInnerHTML` in `components/SiteFrame.tsx`** — for the ported body and every JSON-LD
   block. Build-time snapshot data, not user input.
2. **Tailwind's preflight and theme layers are not imported.** `app/globals.css` imports only
   `tailwindcss/utilities.css`. Tailwind's theme layer defines `--color-white`, which the gogo theme
   relies on being _undefined_ as an intentional invalid-var fallback — importing it turned the active
   nav item white-on-white. Verified against live computed styles. **Read the comment before touching
   the file.**
3. **`components/ThemeScripts.tsx` creates `<script>` elements at runtime** and appends them to the
   body in document order — jQuery, owl.carousel, magnific-popup, calculator.js, quiz.js, marquee,
   fancybox. This is the script replay. It is load-bearing.
4. **`components/SiteAssets.tsx` relies on React 19 hoisting** `<link rel="stylesheet" precedence>`
   and `<style href precedence>` into `<head>`, preserving order within a precedence group. That
   reproduces the source's CSS cascade.
5. **`.mjs` build scripts outside the TS project** — `scripts/*.mjs`, `lib/enrich/render.mjs`. They run
   under Node at build time.

## The stack, and what it forbids

Next **16.2.9** · React **19.2.4** · TypeScript strict · Tailwind **v4, utilities layer only** ·
`@ishub/site-kit` (vendored tarball) · `he` · `node-html-parser`. Flat layout, alias `@/* -> ./*`.

> ⚠️ **This is not the Next.js you know.** `params` is a **`Promise`** in this major. Read
> `node_modules/next/dist/docs/` before touching routing, metadata or image APIs.

```ts
// next.config.ts
output: "export",   trailingSlash: true,
images: { unoptimized: true },
transpilePackages: ["@ishub/site-kit"],
```

`output: "export"` **forbids** `headers()`, `redirects()`, `rewrites()`, middleware, API routes,
server actions and ISR. Response headers come from `public/_headers` at the Cloudflare edge; redirects
from `public/_redirects`. If a task seems to need a forbidden API, the answer is at the edge.

## Data flow — where to edit

```
Israeli services sites/roster/sites/3locksmiths.json   ← NAP, brand, schema, analytics
        │  (ops sync)
        ▼
site.config.json (SiteManifest)                        ← NEVER edit directly
        ├──► app/layout.tsx          GTM, icons, verification
        └──► lib/enrich/render.mjs   Web3Forms access key

content/enriched/<id>.mjs   ← page copy, pricing, FAQ, process, specs, schema inputs
        │  npm run enrich
        ▼
content/site.json  ← 7 MB GENERATED ARTIFACT, never hand-edit
        │
        ▼
lib/content.ts → app/** → components/SiteFrame → out/
```

| You want to change                   | Edit                                        |
| ------------------------------------ | ------------------------------------------- |
| Page copy, pricing, FAQ, process     | `content/enriched/<id>.mjs`                 |
| How an authored block renders        | `lib/enrich/render.mjs`                     |
| Styling of an authored block         | `app/enrich.css` (scoped `.content-blocks`) |
| JSON-LD                              | `scripts/enrich.mjs` builders               |
| Scraped chrome (header/footer/forms) | `scripts/transform.mjs`                     |
| Document shell, metadata, GTM        | `app/layout.tsx`, `lib/content.ts`          |

**Never edit:** `content/site.json`, `public/wp-content/**`, `public/wp-includes/**`,
`site.config.json`, `out/`, `.next/`.

Find a page's `id` in `content/enriched/_manifest.json` → `lookup` (id → path + title).

## Routes

| Route                        | Source                        | Count |
| ---------------------------- | ----------------------------- | ----- |
| `/`                          | `app/page.tsx` (WP page id 7) | 1     |
| everything else              | `app/[...slug]/page.tsx`      | 63    |
| `/sitemap.xml` `/robots.txt` | `app/sitemap.ts` `robots.ts`  | —     |

The catch-all sets `dynamicParams = false` and generates from `getContentPages()`, so the emitted
route set cannot drift from `content/site.json`. Breakdown: 30 services + 1 service hub, 17 locations,
7 top-level Hebrew landers, 4 `/step/` calculator fragments, 4 legal/utility, 1 homepage. **104 appear
in `sitemap.xml`** — the `/step/` pages are excluded deliberately.

## The percent-encoded Hebrew route trap

Slugs live percent-encoded in `content/site.json` (`/%d7%9e%d7%97%d7%99%d7%a8%d7%95%d7%9f/`). Route
params also arrive encoded. `lib/content.ts` decodes **both sides** before matching:

```ts
const key = segments.map(decodeSeg).join("/");
return site.pages.find((p) => !p.isFront && p.segments.map(decodeSeg).join("/") === key);
```

A new matcher that skips the decode **works in dev and 404s in production**. Reuse
`getPageBySegments()` rather than writing a second one.

## Metadata

`lib/content.ts:buildMetadata()` maps the scraped RankMath fields to a Next `Metadata` object. Two
things to know:

- It sets `title: { absolute: … }`, and `app/layout.tsx` defines **no `template`** — so there is no
  layout-level brand suffix. The brand is written into each title, and must appear exactly once.
- It **forces `robots: { index: true, follow: true }`** on every page, overriding the source
  WordPress `noindex` per the owner's decision (`lib/content.ts:99`). Per-page robots values in the
  snapshot are inert.

## The pipeline

```bash
npm run snapshot   # scrape → transform → pages → build-manifest → enrich → fix-links   (RE-SCRAPES LIVE WP)
npm run enrich     # pages → build-manifest → enrich → fix-links                        (no network)
npm run build      # next build → out/
```

**Use `npm run enrich`** after editing an authored module. Use `snapshot` only when the upstream
WordPress site genuinely changed — it rewrites everything from whatever that origin serves today.

`scripts/enrich.mjs` is also a gate: it asserts each enriched page has exactly one `<h1>` and that
every JSON-LD block it generates parses, exiting non-zero otherwise. It does **not** validate scraped
blocks that pass through — which is why two malformed blocks currently ship (backlog §4.1).

Build gate: `npm run lint && npm run typecheck && npm run format:check && npm run build`.

## What `@ishub/site-kit` gives you

| Subpath        | Symbols                                          | Used here                                         |
| -------------- | ------------------------------------------------ | ------------------------------------------------- |
| `./analytics`  | `gtmHeadSnippet`, `gtmNoScriptSrc`, `trackEvent` | yes — `app/layout.tsx`                            |
| `./types`      | `SiteManifest`                                   | yes                                               |
| `./contact`    | `telHref`, `whatsappHref`, `phoneDisplay`        | **no** — contact links are static scraped content |
| `./seo`        | JSON-LD builders                                 | **no** — `scripts/enrich.mjs` has its own         |
| `./media`      | `mediaUrl`, `srcsetFor`, `preloadPropsFor`       | **no** — see `/performance-web-vitals`            |
| `./components` | `SiteImage`                                      | **no** — bodies are raw HTML                      |

The kit was installed for future convergence; most of it is deliberately unused because adopting it
would change the ported output.

## Deploy

**Cloudflare Pages (project `3locksmiths`), via `ops/deploy-site.ps1`. Pushing to `main` does not
deploy production** — but `.github/workflows/deploy.yml` publishes a **second, stale origin that is
currently live** at `robiuzan.github.io` (backlog §12.1). See `/deploy-3locksmiths`.

## Where to go next

`/seo-metadata` · `/schema-structured-data` · `/hebrew-rtl` · `/local-seo-il` · `/new-service` ·
`/new-city` · `/new-article` · `/conversion-cro` · `/tracking-analytics` · `/qa-build-gate` ·
`/deploy-3locksmiths`. The acceptance bars live in `docs/`: `optimization-backlog.md`,
`content-standards.md`, `keyword-map.md`, `schema-graph.md`, `business-facts.md`.
