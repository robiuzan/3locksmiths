---
name: new-service
description: Add or deepen a service page the data-driven way — author content/enriched/<id>.mjs against the EnrichedPage contract so the copy, the rendered blocks, the JSON-LD and the metadata all follow automatically. Covers the highest-value task on the site: page id 95 (/services/שכפול-מפתח-לרכב/), a Tier-1 term with no authored module. Use when adding a service or retrofitting a thin one. Triggers "add a service", "new service page", "deepen the service copy", "per-service FAQ", "service page is thin", "author 95".
---

# Add or deepen a service page

**The site has 30 service pages and 29 of them are already deep** (median ~1,500 words, with process
steps, specs tables, scenarios and FAQs). This is not a climb-to-the-bar exercise. Read
`docs/content-standards.md` §1 before assuming a page needs work.

> ✅ **Page 95 was authored 2026-08-24** (763 → 1,702 words, full schema). The section below is
> kept as the worked example of what "deepen a thin service page" looks like on this site.

## The worked example: page 95

`/services/שכפול-מפתח-לרכב/` — **763 words, no meta description, no `BreadcrumbList`, no `Service`
node, no `HowTo`, no `FAQPage`, and it ships one of the site's two malformed JSON-LD blocks.**

Why: it is page id **95**, recorded in `content/enriched/_manifest.json` as the `referenceId` — the
structural reference every other module was authored against — so `95.mjs` was deliberately never
written. The result is a **Tier-1 head term** sitting on the weakest page on the site.

Authoring `content/enriched/95.mjs` closes backlog §2.3, §3.2, §4.1 and §4.8 in one change. **Do this
before adding a 31st service.**

## The data model

One module per page, at `content/enriched/<id>.mjs`, `export default` an object matching
`lib/enrich/types.ts` → `EnrichedPage`. The `id` is the WordPress post id — find it in
`content/enriched/_manifest.json` → `lookup`.

```js
export default {
  id: 95,
  kind: "service", // "service" | "brand-key" | "location" | "core"
  keyword: "שכפול מפתח לרכב", // primary keyword == the page's subject

  seo: { title: "…", description: "…" },
  hero: { h1: "…", tagline: "…" },
  intro: { heading: "…", paragraphs: ["…"], outro: ["…"] },
  pricing: [{ service: "…", price: "200 – 350 ₪" }],
  faq: { subtitle: "…", items: [{ q: "…", a: "…" }] },
  related: { services: [{ label, href }], locations: [{ label, href }] },
  cta: { heading: "…", body: "…" },

  // optional — the renderer skips each when absent
  process: [{ title, text, time }],
  specsTable: { caption, intro, columns: [], rows: [[]] },
  scenarios: [{ title, text, icon }],
  guides: [{ heading, paragraphs, bullets, subsections, box, columns }],
  stats: [{ value, label, icon }],
  areas: [{ label, href }],
};
```

> ⚠️ **The contract is documented, not enforced.** `lib/enrich/types.ts` is TypeScript for humans; the
> modules are plain `.mjs` consumed at build time. **A typo'd field name fails silently by rendering
> nothing.** Diff your field names against the interface by hand.

`icon` values are Font Awesome 5 names **without** the `fa-` prefix (`"key"`, `"wrench"`).

## Render order — fixed by `renderContentBlocks()`

```
hero → intro + pricing → process → specsTable → scenarios → guides →
advantages → stats → faq → related services → areas → marquee → form
```

You choose which blocks exist, not where they go. If a section needs to move, that is a change to
`lib/enrich/render.mjs`, and it moves for every page.

## The depth bar

900 unique words (`docs/content-standards.md` §1), and the substitution test applies: **swap the
service name — does the page still read correctly?** If yes, it isn't a service page, it's a template.

What actually creates depth on a locksmith service page, and what competitors usually lack:

- **Key and lock types, and the systems behind them** — mechanical cut, transponder/immobiliser chip,
  smart key with push-button start; cylinder types, rav-briach, multilock.
- **What is done on the spot versus what needs the vehicle or the door present.**
- **What's included and excluded** — the most-asked pre-purchase question.
- **Failure modes** — what goes wrong, what causes it, what the fix costs.
- **When this service is the wrong answer** and something else is right. Counter-intuitive honesty is
  disproportionately citable and disproportionately trusted.
- **Realistic timing**, per key or lock type, not one blanket number.

The `specsTable` is the single most valuable block — it is the site's best citable asset
(`/aeo-answer-content`). Every brand-key page should have one.

## Steps

1. **Find the id** in `content/enriched/_manifest.json`. For a brand-new page, the route must already
   exist in `content/site.json` — this pipeline enriches existing WordPress pages, it does not invent
   routes. A genuinely new URL is a different, larger task (see Gotchas).
2. **Read two sibling modules of the same `kind`.** They are the style guide.
3. Author the module. Open `intro.paragraphs[0]` with a **40–60 word answer block**, complete in the
   first sentence (`docs/content-standards.md` §5).
4. Write `faq.items` **specific to this service** — these become the `FAQPage`, so every question must
   be one a real customer asks and every answer must render on the page.
5. Set `related` by **relevance, not array order** (`/internal-linking` §2).
6. Keep `pricing[]` consistent with sibling pages. The site currently has **zero** price
   contradictions — a real asset. Don't introduce the first one. Prices are 🔶 unsourced
   (`docs/business-facts.md` §D.1), so don't invent a new range either.
7. Title and description per `docs/keyword-map.md` §3 and §5 — brand **exactly once**, under ~60 chars.
8. `npm run enrich` — **not** `npm run snapshot`, which re-scrapes the live origin.
9. `npm run lint && npm run typecheck && npm run build`.
10. Verify the route in `out/`, its entry in `out/sitemap.xml`, and that its JSON-LD parses.

## What follows automatically

`generateStaticParams` (the route already exists) · the `Service` + `HowTo` + `FAQPage` +
`BreadcrumbList` schema · `seo.title` / `seo.description` in the metadata · the sitemap entry · the
one-`<h1>` build assertion.

## Checklist

- [ ] `id` matches `_manifest.json`; field names diffed against `lib/enrich/types.ts`.
- [ ] ≥900 unique words; passes the service-name substitution test.
- [ ] Opens with a 40–60 word answer block.
- [ ] `specsTable` present and genuinely informative.
- [ ] 4–6 service-specific FAQs, all rendered on the page.
- [ ] `process[]` times are realistic and not copied from a sibling.
- [ ] Pricing consistent with sibling pages; nothing invented.
- [ ] Title has the brand exactly once, under ~60 chars; description 150–160 chars.
- [ ] `related` chosen by relevance; location links added.
- [ ] `npm run enrich` run; page verified in `out/` and `out/sitemap.xml`; JSON-LD parses.

## Gotchas

- **The pipeline enriches existing routes.** It cannot create a URL that isn't in `content/site.json`.
  Adding a genuinely new page means adding it to the snapshot — a larger task than authoring a module,
  and one that needs a deliberate decision about the live WordPress source.
- Never edit `content/site.json` — regenerated by `npm run enrich`.
- Never run `npm run snapshot` to "refresh" — it re-scrapes the live origin and rewrites everything.
- Never invent materials, durations, warranty terms or prices. Unverified → `// 🔶 confirm` +
  `docs/business-facts.md`.
- `DEFAULT_FEATURES` in `lib/enrich/render.mjs` supplies the "why choose us" cards when
  `advantages` is absent. Its unverified 25-years claim was removed 2026-08-17; keep it claim-free.
- **`paras()` escapes HTML.** An `<a href>` or `**bold**` written into an authored paragraph renders
  as visible literal markup. Contextual in-copy links are not possible without a renderer change
  (backlog §9.4) — name the target page in prose and let `related` carry the link.
- Thirty services with genuine depth beat thirty-five that paraphrase each other. Several of the
  brand-key pages already overlap heavily and need differentiating, not company.
