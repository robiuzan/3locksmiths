---
name: schema-structured-data
description: Emit and fix the JSON-LD graph — the builders in scripts/enrich.mjs, the rule that every block must parse (scraped ones included), the LocalBusiness node read from the manifest, the homepage's generated WebSite and its FAQPage mirrored from the accordion, region typing through areaKind, BreadcrumbList and ItemList coverage, and the Offer and Review gates. Use when wiring or auditing structured data, or before a Rich Results Test. Triggers "add schema", "JSON-LD", "BreadcrumbList", "structured data", "rich results", "Offer".
---

# Structured data

Target graph: `docs/schema-graph.md`. This skill is how to emit it.

## Two sources — both validated now

```
content/site.json  page.jsonLd[]  ──►  SiteFrame  ──►  <script type="application/ld+json">
        ▲                    ▲
  scraped verbatim     REPLACED WHOLESALE by scripts/enrich.mjs
  (today: only the      for the 98 pages that have a content/enriched/<id>.mjs
   homepage FAQPage)    and the generated pages from scripts/pages.mjs
```

`scripts/enrich.mjs` **overwrites** `page.jsonLd` for authored pages and asserts each generated
block `JSON.parse`s, failing the build otherwise. It also repairs or drops any scraped block that
fails to parse. On the homepage it keeps only the scraped `FAQPage`, which `scripts/claims.mjs`
rewrites and checks against the visible accordion (2026-11-04). All 504 blocks parsed on 2026-11-04.

## The builders

All in `scripts/enrich.mjs`. Do not hand-assemble a node one of these covers.

```js
breadcrumbSchema(data, page); // BreadcrumbList — בית › שירותים|אזורי שירות › keyword
serviceSchema(data, page); // Service + provider @id + areaServed   (skipped for kind:"core")
howToSchema(data); // HowTo from data.process[]              (skipped when absent)
faqSchema(data); // FAQPage from data.faq.items[]          (skipped when absent)
articleSchema(data, page); // Article for kind:"guide" (author only when the module names one)
localBusinessSchema(); // first block on every emitting page; the @id the others point at
webSiteSchema(); // homepage only — publisher is the business @id
```

They are driven **entirely by the authored module**, so the graph cannot drift from the copy. Preserve
that: any new block must derive from the same data `lib/enrich/render.mjs` renders, never be authored
separately.

## Fixed defects — keep them fixed

Three defects this skill used to teach are closed. Each is now a regression check, not a task:

- **Every block parses.** The two scraped blocks that failed with _"Bad control character in string
  literal"_ (the homepage `FAQPage` and one on page 95) are gone. Page 95 has an authored module, and
  `enrich.mjs` repairs or drops any scraped block that fails. **A block that does not parse is a
  stop-ship.**
- **The business node reads the manifest.** `name`, `alternateName`, `telephone`, `email`,
  `priceRange`, `sameAs`, `hasMap` and `address` come from `site.config.json` (synced from the
  roster). The personal Gmail is gone, and CI fails if it returns. Values change in the **roster
  manifest**, then sync down. Never edit `site.config.json` directly.
- **`קריות` is a region.** Its module sets `areaKind: "region"`, and `placeType()` in `enrich.mjs`
  types it `AdministrativeArea` in the page's `Service.areaServed` and in the business node's list
  (2026-11-04). Give any future region the same field; never special-case a string.

Still open: the non-location fallback `{ "@type": "Country", name: "IL" }` puts an ISO code in a
`name` field. `name: "Israel"` would be correct.

## Per route type

The measured table — every route type, what it emits and what is still a target — is
`docs/schema-graph.md` §2 (2026-11-04). In short: the homepage emits the business node, `WebSite`
and `FAQPage`; service, brand and city pages emit `BreadcrumbList` · `Service` · `HowTo` · `FAQPage`;
the `core` landers skip `Service` by design; guides emit `Article`; the `/services/` and `/מדריכים/`
hubs emit a `CollectionPage` with an `ItemList`; only the four `/step/` routes are bare.

## The gating rules — correctness, not preference

1. **Every block must parse.** See Fix 1. Stop-ship.
2. **`Review` / `AggregateRating` ship only with a verifiable public source.** Verified absent from
   all 109 pages today, which is correct. An invented rating is a Google policy violation and a Rich
   Results failure. Do not seed sample data "to test the markup". Blocked on
   `docs/business-facts.md` §B.
3. **`Offer` / `OfferCatalog` only when the prices are owner-sourced.** The owner chose one four-row
   model on 2026-11-04 (`content/enriched/_prices.mjs`), which says which row a key type belongs to —
   not that the ranges are sourced (`docs/business-facts.md` §D.1). Marking them up publishes them as
   commitments.
4. **Schema must match visible content.** Every `FAQPage` question must render on the page. That holds
   today because `faqSchema` and the renderer read the same `data.faq.items`. Note
   `acceptedAnswer.text` wraps answers in `<p>…</p>` — fine, but keep the HTML trivial.
5. **No `LocalBusiness` node per location.** One business, one node. Seventeen would imply seventeen
   premises that do not exist.
6. **`foundingDate` follows `foundedYear`.** The manifest says `null`, so the field is absent — it is
   **never** inferred from a years claim in the copy.
7. **Hours must not contradict the copy.** Resolved: the owner confirmed 24/7 on 2026-08-30, and the
   node ships every day 00:00–23:59 (`docs/business-facts.md` §D.3). Any future hours change starts
   with the fact, then both halves together.

## Missing fields and what blocks each

`geo`, `foundingDate`, `founder`, `logo`, `description`, `aggregateRating` — all blocked on
`docs/business-facts.md` or on an owner asset. **Add the row; don't fill the value.** They belong in
the **roster manifest**, never in `site.config.json` directly. `logo` appears automatically once
`images.logo` is published, and `description` once the roster has a `tagline` or `shortPitch`.

`sameAs` and `hasMap` carry the Google Business Profile URL (since 2026-09-05 and 2026-11-04,
`docs/business-facts.md` §B.4). Further URLs go in the roster manifest's `schema.sameAs`, then sync.
`geo` stays out: the pin Google serves is a service-area centroid, not premises.

(2026-10-13: the address is confirmed but the owner keeps it out of the schema — footer only; roster `schema.address` is absent on purpose, business-facts §C.1.) Historically the manifest's `schema` block had **no `address` field at all**, so adding one is a manifest-schema
change as well as a data question.

## Checklist

- [ ] Every `ld+json` block in `out/` parses.
- [ ] The business node reads NAP from the manifest — no literals, no personal email.
- [ ] Location pages carry `Service` + `areaServed` with the correct `City` / `AdministrativeArea`.
- [ ] Every nested route emits `BreadcrumbList`.
- [ ] Every `FAQPage` question is visible on the page.
- [ ] No `Review`, `AggregateRating`, or `Offer` without a source.
- [ ] `npm run enrich` re-run, then verified in `out/`.

## Verify

```bash
# the gate: every block must parse
node -e '
const fs=require("fs"),path=require("path");const f=[];
(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
e.isDirectory()?w(p):e.name==="index.html"&&f.push(p);}})("out");
let bad=0;for(const x of f){const h=fs.readFileSync(x,"utf8");
for(const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
try{JSON.parse(m[1]);}catch{bad++;console.log("UNPARSEABLE:",x);}}}
console.log("unparseable:",bad);'

grep -rL 'application/ld+json' out --include=index.html
grep -rl 'BreadcrumbList' out --include=index.html | wc -l
grep -rl 'aggregateRating\|"@type": *"Review"' out --include=index.html
grep -o '"email":"[^"]*"' out/index.html
```

Then run Google's Rich Results Test on `/`, one `/services/` page, one `/locations/` page and
`/מחירון/`. Zero errors is the bar.
