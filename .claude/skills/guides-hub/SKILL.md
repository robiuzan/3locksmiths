---
name: guides-hub
description: Build the /מדריכים/ editorial hub on 3locksmiths — the topical-authority and AEO surface the site has none of. Covers why this is a routing change rather than another authored module, the two implementation paths and the chrome trade-off each carries, the Hebrew-route-directory bug that breaks the Next 16 exporter, Article schema, and the sitemap step that is easy to forget. Use when adding guides, articles or any editorial content. Triggers "guides hub", "מדריכים", "add a guide", "blog", "editorial", "topical authority".
---

# The guides hub

The site has **no editorial surface at all** — no blog, no guides, no route. That is the entire
topical-authority and AEO gap in one line (backlog §3.6).

## The route mechanism already exists — use it

> ✅ **Corrected 2026-08-25.** An earlier version of this skill said new routes were blocked. They
> are not. **`scripts/pages.mjs` creates routes from nothing** — it already generates 7 that were
> never in the WordPress scrape (`/contact/`, `/privacy-policy/`, `/services/`, …), including two
> `/services/` **shells with synthetic ids (9101, 9102)** that `enrich.mjs` then fills from an
> authored module exactly like a scraped page.

The full recipe for any new content page:

1. **`scripts/pages.mjs`** — add an entry with a synthetic id. `makePage()` clones the chrome from a
   real snapshot page (`CHROME_SOURCE_ID`), swaps `<main>`, and marks it `generated: true`
   (idempotent — rebuilt from scratch each run).
2. **`content/enriched/<id>.mjs`** — the authored content, same `EnrichedPage` contract as any page.
3. **`enrich.mjs`** fills `<main>` and emits the schema.

The page then gets the real theme chrome, styling, jQuery, sitemap entry and footer links for free —
which is why this beats a hand-rolled native route.

**Hebrew paths are fine here.** The catch-all that renders these is `app/[...slug]/` — an **ASCII**
directory with the Hebrew in the _data_. That is completely different from creating
`app/מדריכים/page.tsx`, which would break the exporter (see below). `/מדריכים/<slug>/` via
`pages.mjs` works.

## ⚠️ The bug that will bite you first

**A literal Hebrew route _directory_ breaks the Next 16 static exporter.** `app/תודה/page.tsx` failed
the build with `Error [InvalidCharacterError]: Invalid character` during prerender. It was moved to
`app/thank-you/` and shipped fine.

This does **not** affect the catch-all's Hebrew routes — its directory is ASCII (`[...slug]`) and the
Hebrew lives in the _data_. It affects directories you create.

So `app/מדריכים/` will fail. Your options:

- **ASCII directory with a Hebrew slug in data** — `app/guides/[slug]/page.tsx`, matching how
  `/services/<he-slug>/` already works. **Preferred.**
- **ASCII path throughout** — `/guides/…`, matching `/contact/` and `/privacy-policy/`.

Whichever you pick, **build it and confirm the export before writing content.**

## Two implementation paths

### Path A — a native Next route beside the catch-all _(recommended)_

`app/guides/page.tsx` + `app/guides/[slug]/page.tsx`, with guides as typed data in
`content/guides/<slug>.ts`.

- **Pros:** real TypeScript, no snapshot round-trip, dates are trivial, and schema derives from the
  same data that renders — so it cannot drift.
- **Cons — decide this before writing:** these pages get **no gogo theme chrome**. No scraped header,
  no footer, no nav. You must either extract the chrome into a shared component or accept a
  deliberately simpler shell. **A guide that looks nothing like the rest of the site is worse than no
  guide.**
- The catch-all sets `dynamicParams = false` and matches only snapshot pages, so a sibling route does
  not conflict.
- **Reuse the percent-decoding pattern** from `lib/content.ts:getPageBySegments` — Hebrew params
  arrive encoded, and a route that skips the decode works in dev and 404s in production.

### Path B — inject into the snapshot

Add routes to `content/site.json` via the pipeline and author them as `EnrichedPage` modules with
`kind: "core"`.

- **Pros:** free chrome, styling, schema and sitemap plumbing — everything already works.
- **Cons:** you are hand-authoring into a generated artifact's source, and the block model
  (`hero`/`intro`/`process`/`specsTable`/`faq`) is shaped for service pages, not long-form editorial.
  `guides[]` with `subsections` is the closest fit and is genuinely usable.

**Recommendation:** Path B for the first two or three guides — ships fast, looks native, proves the
topics earn traffic. Move to Path A only if the format outgrows the block model.

## ⚠️ The sitemap step everyone forgets

`app/sitemap.ts` derives **entirely** from `getSite().pages` — the snapshot. A Path A route is
therefore **invisible to the sitemap** unless you add it explicitly. That is a code change, and
without it the guides ship unlisted.

Path B routes are picked up automatically.

## Structure of a guide

1. `<h1>` = the question, verbatim.
2. **A 40–60 word answer block in the first paragraph** — complete in the first sentence, before any
   preamble (`docs/content-standards.md` §5).
3. Question-form `<h2>`s; each section answerable on its own.
4. **At least one table worth screenshotting** — cost by key type, chip vs smart key, a decision
   table. This is what makes the page citable rather than merely correct, and it maps onto the
   existing `specsTable` block.
5. A FAQ block, 3–5 questions → `FAQPage`.
6. Byline, `datePublished`, `dateModified`.
7. 2–3 links to services, 1–2 to locations.
8. A CTA.

**900-word floor.** A guide that repeats the service page cannibalises it.

## Schema

`Article` with `headline`, `description`, `image`, `datePublished`, `dateModified`, `author` (a
`Person` with a **real** name), `publisher` (`@id` → `https://3locksmiths.co.il/#LocalBusiness`), and
`mainEntityOfPage`. Plus `BreadcrumbList` and a `FAQPage` derived from the FAQ block.

**The author must be a real named person** — blocked on `docs/business-facts.md` §A, which records
that **nobody is named anywhere on this site**. **Never invent a byline.** Publish with no `author`
rather than a fabricated one, and record the gap.

## Topic order

From `docs/content-calendar.md` Batch 2, which is ordered by what each guide unlocks:

1. כמה עולה שכפול מפתח לרכב 🔶 (prices are owner-unsourced — write around the published ranges)
2. אבד לי המפתח היחיד לרכב — מה עושים
3. מה ההבדל בין מפתח עם שבב למפתח חכם
4. אפשר לשכפל מפתח רכב בלי המקור
5. מתי צריך להחליף צילינדר ומתי מנעול שלם

## Steps

1. **Decide the path and the chrome question. Say which and why.**
2. Build the route with an **ASCII directory**; confirm `npm run build` emits it before writing copy.
3. Add it to `app/sitemap.ts` (Path A) — or confirm the snapshot picks it up (Path B).
4. Write to the structure above; every claim free or 🔶.
5. Wire `Article` + `BreadcrumbList` + `FAQPage`, derived from the rendered data.
6. Add inbound links from the related service and location pages, and the footer Guides column
   (`/site-navigation`).
7. `npm run enrich` (Path B) · `npm run lint && npm run typecheck && npm run build`.
8. Verify the route in `out/`, its sitemap entry, and that its JSON-LD parses.

## Checklist

- [ ] Route directory is ASCII; export confirmed before content was written.
- [ ] Chrome question answered explicitly.
- [ ] Present in `out/` **and** `out/sitemap.xml`.
- [ ] ≥900 unique words; answers better than any existing page.
- [ ] Answer block in the first 60 words.
- [ ] At least one table worth citing.
- [ ] Real dates; real author or **no** author.
- [ ] `Article` + `BreadcrumbList` + `FAQPage` emitted and parsing.
- [ ] Inbound links added from related pages and the footer.

## Gotchas

- Hebrew route **directories** break the exporter. Hebrew **slugs in data** are fine.
- `lib/content.ts:99` forces `index: true` on every snapshot page — a Path A route sets its own
  metadata and is unaffected, but don't assume the snapshot mapper applies.
- `paras()` escapes HTML, so in-copy `<a>` in a Path B guide renders as literal markup
  (`docs/information-architecture.md` §4).
- Never invent dates, authors or data to look authoritative.
