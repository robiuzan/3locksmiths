---
name: seo-metadata
description: Per-route metadata for 3locksmiths — where titles and descriptions actually come from (the authored module, not a generateMetadata body), why there is no layout template and therefore no doubled-suffix bug, the one title that doubles the brand anyway, the five over-length titles, the five missing descriptions, canonicals inherited from the WordPress scrape, and the forced index/follow override. Use when writing or fixing metadata for a route or auditing on-page SEO. Triggers "set the metadata", "titles and descriptions", "canonical", "one H1", "sitemap".
---

# Per-route SEO metadata

Formulas live in `docs/keyword-map.md` §3–§5. This skill is the mechanics — and the mechanics here are
not what you expect.

## Where metadata comes from

There is **no per-route `generateMetadata` body to edit**. Both routes call one mapper:

```ts
// app/[...slug]/page.tsx  and  app/page.tsx
return buildMetadata(page.seo);
```

`lib/content.ts:buildMetadata()` maps the scraped RankMath fields on each page in `content/site.json`.
Those fields come from:

| Page                | `seo.title` / `seo.description` set by                      |
| ------------------- | ----------------------------------------------------------- |
| 53 authored pages   | `content/enriched/<id>.mjs` → `seo: { title, description }` |
| The homepage (id 7) | `HOME_SEO` in `scripts/enrich.mjs`                          |
| The other 10 pages  | whatever the WordPress scrape captured                      |

**So to change a title you edit the authored module (or `HOME_SEO`) and run `npm run enrich`.** Never
edit `content/site.json`; it is regenerated.

## There is no template — and that is why titles work differently here

```ts
// lib/content.ts
if (title) md.title = { absolute: title };
```

`app/layout.tsx` defines **no `title.template`**, and every page sets `absolute`. So:

- There is **no layout-level brand suffix**, and none of the doubled-suffix bugs that affect sibling
  fleet sites.
- The brand must be written **into** each title, exactly once.

```
✅  שכפול מפתח בתל אביב – מנעולן זמין בעיר | שלושה מנעולנים
❌  אודותינו – שלושה מנעולנים, מעל 25 שנות ניסיון | שלושה מנעולנים
```

The second is the one live violation (`/אודותינו/`, backlog §2.1) — it repeats the brand **and** the
⛔ 25-years claim. Fix both in the same edit.

## Titles

| Route type | Formula                                          |
| ---------- | ------------------------------------------------ |
| Service    | `<שירות> – <בידול קצר> \| שלושה מנעולנים`        |
| Brand-key  | `שכפול מפתח ל<מותג> – <בידול> \| שלושה מנעולנים` |
| Location   | `שכפול מפתח ב<עיר> – <בידול> \| שלושה מנעולנים`  |
| Top-level  | `<נושא> – <בידול> \| שלושה מנעולנים`             |
| Guide      | the question verbatim + ` \| שלושה מנעולנים`     |

Keep the rendered title **under ~60 characters**. Five currently run 62–69 (backlog §2.2): `/`,
`/services/החלפת-מנעולים/`, `/services/תיקון-דלתות/`, `/אודותינו/`, `/מנעולן-לבית/`.

The differentiator must be **true**. Only claim what `docs/business-facts.md` confirms — "25+ שנים"
and "24/7" are both gated.

## Descriptions

150–160 chars, unique per route, following `docs/keyword-map.md` §5: service + place, one true
differentiator, then an action with the phone in display format.

Currently **unique across all 108 pages with zero duplicates** — hold that line. Missing on five real
pages (backlog §2.3): `/services/שכפול-מפתח-לרכב/` and the four `/step/` routes. The `/step/` pages
are funnel fragments and may legitimately stay bare; the service page may not.

The homepage description lives in `scripts/enrich.mjs:HOME_SEO` and currently states
"מעל 25 שנות ניסיון" (⛔ — `foundedYear` is `null`). Fix it there.

## Canonicals

Every page's canonical comes straight from the scraped `seo.canonical`, so it is byte-identical to the
WordPress original — self-referencing, trailing slash, percent-escaped, and matching the
`sitemap.xml` `<loc>`. Present on all 64 real pages (backlog §1.2).

```ts
if (seo.canonical) md.alternates = { canonical: seo.canonical };
```

**Do not "normalise" a canonical.** If it looks odd, it is the live WordPress URL and it is holding
ranking signal. Changing it needs a `_redirects` 301 plan (`docs/keyword-map.md` §8).

## Robots — the override you must know about

```ts
// lib/content.ts:99
md.robots = { index: true, follow: true };
```

Applied to **every page unconditionally**, deliberately overriding the source WordPress
`noindex, nofollow` per the owner's decision. Consequences:

- Per-page `seo.robots` values in the snapshot are **inert**. Never report one as the live directive.
- There is currently **no way to `noindex` a single route** without changing this mapper. If the four
  `/step/` fragments should be non-indexable (backlog §1.5), that is the code change required.

And separately: `app/robots.ts` is **not what serves**. Cloudflare prepends a managed block at the
edge blocking every major AI crawler. See `/aeo-answer-content`.

## Sitemap

`app/sitemap.ts` derives entirely from `getSite().pages` — filtering on `seo.canonical` and excluding
`/step/`. **No hand-maintained array anywhere**, which is better than most of the fleet. 104 URLs
against 108 pages is exactly right.

It emits `changeFrequency` and `priority` (1 front, 0.8 services/locations, 0.6 other) but **no
`lastModified`**. Leave it that way unless a real per-page date source appears — **never stamp build
time**; a date that changes on every deploy is worth less than no date (backlog §1.4).

## OG, Twitter and verification

- OG and Twitter tags are mapped 1:1 from the scraped fields by `buildMetadata`. `metadataBase` is set
  once in `app/layout.tsx` from `site.wpUrl`.
- Icons come from the scraped `headLinks`.
- **Search Console verification is hardcoded** at `app/layout.tsx:33` while the manifest carries
  `googleSiteVerification: null`. Move it to the roster manifest and read it from
  `manifest.analytics.googleSiteVerification` (backlog §13.5). Never edit `site.config.json` directly.

## One H1 per page

Exactly one `<h1>`, matching the title's intent — currently true on **all 66 emitted pages**.
`scripts/enrich.mjs` asserts `h1count === 1` per enriched page and **fails the build** otherwise. That
guard covers 97 of 108 pages; the rest are correct but unguarded, so check them by hand after any
change to the scrape or transform steps.

The H1 is `hero.h1` in the authored module and should restate the keyword naturally rather than
duplicating the title verbatim.

## Checklist

- [ ] Title written in the authored module (or `HOME_SEO`), brand exactly once, under ~60 chars.
- [ ] Description unique, 150–160 chars, claims nothing gated by `docs/business-facts.md`.
- [ ] Canonical untouched — inherited from the scrape.
- [ ] Exactly one `<h1>`; heading order unbroken.
- [ ] `npm run enrich`, then `npm run build`, then verify in `out/`.
- [ ] Route present in `out/sitemap.xml` (unless it is a `/step/` fragment).

## Verify

```bash
grep -rho '<title>[^<]*</title>' out --include=index.html | sort | uniq -c | sort -rn | head
# brand must appear exactly once per title
grep -rho '<title>[^<]*</title>' out --include=index.html | grep -c 'שלושה מנעולנים.*שלושה מנעולנים'
grep -rL 'rel="canonical"' out --include=index.html
grep -rL '<meta name="description"' out --include=index.html
```

## Gotchas

- Editing `content/site.json` is always wrong — it is regenerated by `npm run enrich`.
- Forgetting to run `npm run enrich` after editing a module means the build ships the old metadata
  with no error anywhere.
- Don't add a `title.template` to `app/layout.tsx` to "tidy" the brand suffix — every page sets
  `absolute`, so the template would be ignored, and switching to it would require rewriting all 64
  titles.
