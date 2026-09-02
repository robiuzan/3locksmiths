---
name: schema-structured-data
description: Emit and fix the JSON-LD graph — the builders in scripts/enrich.mjs, why two scraped blocks currently fail to parse and how to close that gap, reading the LocalBusiness node from the manifest instead of hardcoded literals (it publishes a personal Gmail today), the region-typed-as-City fix, BreadcrumbList coverage, and the Offer and Review gates. Use when wiring or auditing structured data, or before a Rich Results Test. Triggers "add schema", "JSON-LD", "BreadcrumbList", "structured data", "rich results", "Offer".
---

# Structured data

Target graph: `docs/schema-graph.md`. This skill is how to emit it.

## Two sources — and only one is validated

```
content/site.json  page.jsonLd[]  ──►  SiteFrame  ──►  <script type="application/ld+json">
        ▲                    ▲
  scraped verbatim     REPLACED WHOLESALE by scripts/enrich.mjs
  (11 un-enriched       for the 53 pages that have a content/enriched/<id>.mjs
   pages + homepage
   extras)
```

`scripts/enrich.mjs` **overwrites** `page.jsonLd` for enriched pages and asserts each generated block
`JSON.parse`s, failing the build otherwise. Scraped blocks on the other pages — and the homepage's
extra blocks, which are kept alongside the generated `LocalBusiness` — **pass through unvalidated**.

**That gap is the most important defect on this site.** Two blocks currently ship broken.

## The builders

All in `scripts/enrich.mjs`. Do not hand-assemble a node one of these covers.

```js
breadcrumbSchema(data, page); // BreadcrumbList — בית › שירותים|אזורי שירות › keyword
serviceSchema(data, page); // Service + provider @id + areaServed   (skipped for kind:"core")
howToSchema(data); // HowTo from data.process[]              (skipped when absent)
faqSchema(data); // FAQPage from data.faq.items[]          (skipped when absent)
localBusinessSchema(); // homepage only, prepended
```

They are driven **entirely by the authored module**, so the graph cannot drift from the copy. Preserve
that: any new block must derive from the same data `lib/enrich/render.mjs` renders, never be authored
separately.

## Fix 1 — make every block parse

Two pages ship an unparseable block, both inherited from the scrape, both failing with _"Bad control
character in string literal"_ (a raw newline inside a JSON string):

- `out/index.html` — the homepage `FAQPage`. **The homepage FAQ rich result is dead.**
- `out/services/שכפול-מפתח-לרכב/index.html`

Two ways to close it, ideally both:

```js
// scripts/enrich.mjs — validate EVERYTHING, not just what we generated
for (const p of site.pages) {
  p.jsonLd = (p.jsonLd || []).filter((s) => {
    try {
      JSON.parse(s);
      return true;
    } catch {
      problems.push(`id ${p.id}: dropping unparseable scraped JSON-LD`);
      return false;
    }
  });
}
```

A malformed block is worth strictly less than no block, so dropping it is a strict improvement. The
better fix is to make those pages generate their own: author `content/enriched/95.mjs` (see
`/new-service`) and give the homepage a real `faq` block.

**A block that does not parse is a stop-ship.**

## Fix 2 — the business node must read from the manifest

`localBusinessSchema()` hardcodes every field. Three are wrong:

```js
// scripts/enrich.mjs — CURRENT (wrong)
name: "שלושה מנעולנים",
telephone: "+972-55-6601006",        // manifest: +972765991266
email: "robiuzan@gmail.com",         // 🔴 a personal Gmail, LIVE on the homepage
```

`lib/enrich/render.mjs:20` already reads `site.config.json` for `contact.formAccessKey` — **copy that
pattern**:

```js
const manifest = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf8"));
// ...
name: manifest.brandName,
telephone: manifest.contact.phoneE164,
email: manifest.contact.email,
priceRange: manifest.schema.priceRange,
```

Values themselves change in the **roster manifest**, then sync down. Never edit `site.config.json`
directly.

`email` is **Critical** — ship it ahead of anything cosmetic.

## Fix 3 — קריות is a region, not a city

```js
// CURRENT
areaServed: data.kind === "location" && data.city
  ? { "@type": "City", name: data.city }
  : { "@type": "Country", name: "IL" };
```

Add an explicit field to the authored module rather than special-casing a string:

```js
// content/enriched/<id>.mjs
city: "קריות",
areaKind: "region",   // "city" | "region"

// scripts/enrich.mjs
{ "@type": data.areaKind === "region" ? "AdministrativeArea" : "City", name: data.city }
```

Also fix `{ "@type": "Country", name: "IL" }` → `name: "Israel"`. An ISO code in a `name` field is
wrong.

## Per route type

| Route                    | Emit                                                            |
| ------------------------ | --------------------------------------------------------------- |
| `/`                      | `LocalBusiness`+`Locksmith` · `WebSite` · a **valid** `FAQPage` |
| `/services/<slug>/`      | `BreadcrumbList` · `Service` · `HowTo` · `FAQPage`              |
| `/locations/<slug>/`     | the same + `areaServed` with the right area type                |
| Top-level landers        | `BreadcrumbList` · `Service` · `HowTo` · `FAQPage`              |
| `/services/` (hub)       | `CollectionPage` + `BreadcrumbList` — **emits nothing today**   |
| `/contact/`              | `ContactPage` + `BreadcrumbList` — **emits nothing today**      |
| `/אודותינו/`             | `AboutPage` + `BreadcrumbList`                                  |
| `/מחירון/`               | + `OfferCatalog` — **gated, see below**                         |
| legal pages, `/sitemap/` | `BreadcrumbList` only                                           |
| `/step/<slug>/`          | **nothing** — funnel fragments, correctly bare                  |

Current coverage: `BreadcrumbList` 53, `FAQPage` 55, `HowTo` 53, `Service` 46. Nine real pages emit
nothing at all (backlog §4.8).

## The gating rules — correctness, not preference

1. **Every block must parse.** See Fix 1. Stop-ship.
2. **`Review` / `AggregateRating` ship only with a verifiable public source.** Verified absent from
   all 66 pages today, which is correct. An invented rating is a Google policy violation and a Rich
   Results failure. Do not seed sample data "to test the markup". Blocked on
   `docs/business-facts.md` §B.
3. **`Offer` / `OfferCatalog` only when the prices are owner-sourced.** Every `pricing[]` row was
   authored during enrichment, not supplied by the owner (`docs/business-facts.md` §D.1). Marking them
   up publishes them as commitments.
4. **Schema must match visible content.** Every `FAQPage` question must render on the page. That holds
   today because `faqSchema` and the renderer read the same `data.faq.items`. Note
   `acceptedAnswer.text` wraps answers in `<p>…</p>` — fine, but keep the HTML trivial.
5. **No `LocalBusiness` node per location.** One business, one node. Seventeen would imply seventeen
   premises that do not exist.
6. **`foundingDate` follows `foundedYear`.** The manifest says `null`, so the field is absent — it is
   **never** inferred from "מעל 25 שנות ניסיון" in the copy.
7. **Hours must not contradict the copy.** The node claims Sun–Fri 08:00–18:00 while the homepage
   title claims `מנעולן 24/7`. Resolve the fact before adjusting either.

## Missing fields and what blocks each

`address`, `geo`, `hasMap`, `sameAs`, `foundingDate`, `founder`, `aggregateRating` — all blocked on
`docs/business-facts.md`. **Add the row; don't fill the value.** And they belong in the **roster
manifest**, never in `site.config.json` directly.

Note the manifest's `schema` block has **no `address` field at all**, so adding one is a manifest-schema
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
