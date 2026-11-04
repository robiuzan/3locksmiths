# Schema graph — the target

What JSON-LD each route type must emit, where it comes from, and the rules that gate it. Cited by
`schema-auditor`, `/schema-structured-data`, `/qa-build-gate` and `aeo-geo-strategist`.

**Where schema comes from on this site is unusual — read §1 before changing anything.**

---

## 1. Two sources, one output

Unlike the data-driven sites in this fleet, JSON-LD here has **two origins**:

```
content/site.json  page.jsonLd[]  ──►  components/SiteFrame.tsx  ──►  <script type="application/ld+json">
        ▲                    ▲
        │                    │
  scraped verbatim      REPLACED WHOLESALE by scripts/enrich.mjs
  from the live WP        for every page with a content/enriched/<id>.mjs module
  (today: only the homepage FAQPage survives)
```

State on 2026-11-04 (measured on `content/site.json`):

- For the **98 authored pages**, `scripts/enrich.mjs` **overwrites** `page.jsonLd` entirely with
  `[localBusinessSchema, breadcrumbSchema, serviceSchema or articleSchema, howToSchema, faqSchema]`.
  `serviceSchema` returns nothing for `kind: "core"`. Whatever WordPress emitted is discarded. It
  then asserts each block `JSON.parse`s and that the page has exactly one `<h1>`, failing the build
  if not.
- For the **homepage (id 7)**, `enrich.mjs` emits `localBusinessSchema()` and `webSiteSchema()` and
  keeps only the scraped `FAQPage`. The scraped business, `WebSite` and `Organization` blocks are
  dropped. `scripts/claims.mjs` rewrites that FAQ and fails the build unless every question and
  answer equals the visible accordion.
- The **generated pages** from `scripts/pages.mjs` (`/services/`, `/מדריכים/`, `/sitemap/`,
  `/contact/` and the two legal pages) carry `BreadcrumbList` plus a page node, and `enrich.mjs`
  prepends the business node they point at.
- The four `/step/` fragments emit nothing, correctly.
- Any unparseable scraped block is repaired or dropped by `enrich.mjs`. The artifact holds 504 blocks
  and all of them parse.

**That asymmetry is the root cause of §4.1.** The generator is sound; the pass-through path has no
gate.

`SiteFrame` injects each string with `dangerouslySetInnerHTML` — no parsing, no escaping, no
validation at render time.

---

## 2. Node per route type

"Business node" below is the `LocalBusiness`+`Locksmith` node, which every emitting page carries.

| Route                                            | Emits today (2026-11-04)                                                         | Target                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `/`                                              | business node · `WebSite` · `FAQPage` (7 items, equal to the accordion)          | met                                                                       |
| `/services/<slug>/` ×55 (23 services, 32 brands) | business node · `BreadcrumbList` · `Service` · `HowTo` · `FAQPage`               | met — includes page 95                                                    |
| `/locations/<slug>/` ×25                         | business node · `BreadcrumbList` · `Service`+`areaServed` · `HowTo` · `FAQPage`  | met — `קריות` is `AdministrativeArea` since 2026-11-04 (§5)               |
| Top-level landers ×7 (`kind: "core"`)            | business node · `BreadcrumbList` · `HowTo` · `FAQPage` — no `Service`, by design | `/אודותינו/` → `AboutPage`; `/מחירון/` → `OfferCatalog` **gated on §4.3** |
| Guides ×11                                       | business node · `BreadcrumbList` · `Article` · `HowTo` · `FAQPage`               | met — `author` blocked on business-facts §A                               |
| `/services/` and `/מדריכים/` (hubs)              | business node · `BreadcrumbList` · `CollectionPage` → `ItemList` (55 / 11)       | met                                                                       |
| `/contact/`                                      | business node · `BreadcrumbList` · `ContactPage`                                 | met                                                                       |
| `/privacy-policy/` `/accessibility-statement/`   | business node · `BreadcrumbList` · `WebPage`                                     | met                                                                       |
| `/sitemap/`                                      | business node · `BreadcrumbList` · `CollectionPage`                              | met — no `ItemList`, skipped on purpose                                   |
| `/step/<slug>/` ×4                               | nothing                                                                          | nothing — funnel fragments, correctly bare                                |
| `/404`                                           | none                                                                             | none                                                                      |

Measured 2026-11-04 on `content/site.json`: 504 blocks, 0 unparseable. Business node on 105 pages;
`BreadcrumbList` 104; `FAQPage` 99; `HowTo` 98; `Service` 80; `Article` 11. On 2026-08-02 it was 207
blocks with 2 unparseable.

---

## 3. The business node

Built by `localBusinessSchema()` in `scripts/enrich.mjs`, `@id` = `https://3locksmiths.co.il/#LocalBusiness`.

```json
{
  "@type": ["LocalBusiness", "Locksmith"],
  "@id": "https://3locksmiths.co.il/#LocalBusiness"
}
```

The dual type is correct — `Locksmith` matches `schema.type` in the manifest, and pairing it with
`LocalBusiness` is valid and widely understood.

**Since 2026-08 every field is read from the manifest** (`site.config.json`, synced from the roster),
never typed in `enrich.mjs`. Measured on the homepage node, 2026-11-04:

| Field                       | Emitted                                               | Verdict                                            |
| --------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| `name` / `alternateName`    | `שלושה מנעולנים` / `3 Locksmiths`                     | ✅ manifest                                        |
| `telephone`                 | `+972765991266`                                       | ✅ the 076 line — business-facts §C.5              |
| `email`                     | `info@3locksmiths.co.il`                              | ✅ the personal Gmail is gone (§4.2)               |
| `priceRange`                | `₪₪`                                                  | ✅ manifest                                        |
| `address`                   | `addressCountry: "IL"` only                           | ✅ the owner's choice, 2026-10-13 — facts §C.1     |
| `areaServed`                | 22 `City` + 1 `AdministrativeArea` (`קריות`), derived | ✅ tracks the location routes (§5)                 |
| `openingHoursSpecification` | every day 00:00–23:59                                 | ✅ owner-confirmed 24/7 — facts §D.3               |
| `sameAs` / `hasMap`         | the Business Profile URL                              | ✅ live 2026-09-05 — facts §B.4                    |
| `knowsLanguage`             | `he`                                                  | ✅ added 2026-11-04                                |
| `knowsAbout`                | 23 service names from the build manifest              | ✅ added 2026-11-04                                |
| `image`                     | the catalog hero                                      | 🟡 an AI-generated scene; the logo would be better |
| `logo` / `description`      | absent until `images.logo` / a roster tagline exists  | 🔶 owner                                           |
| `foundingDate`              | absent                                                | ✅ correct — `foundedYear: null`, never infer it   |

Values change in the **roster manifest**, then sync down. Never edit `site.config.json` directly.

---

## 4. Gating rules — correctness, not preference

### 4.1 Every block must parse — including the ones we didn't generate

✅ **Fixed.** Both broken blocks are gone: page 95 has an authored module, and the homepage `FAQPage`
is rewritten and validated by `scripts/claims.mjs`. `enrich.mjs` also repairs or drops any scraped
block that fails to parse. The rule stays:

**A block that does not `JSON.parse` is a stop-ship.**

### 4.2 The business node must not carry a personal address

`email: "robiuzan@gmail.com"` is **live on the homepage** (verified 2026-08-16). It is the developer's
personal Gmail published as the business's contact address in structured data. It is wrong for the
business, it leaks a personal address, and it contradicts the manifest.

✅ **Fixed** — `email` is read from `manifest.contact.email` and is `info@3locksmiths.co.il`. A
personal address in the business node is still a stop-ship.

### 4.3 `Offer` / `PriceSpecification` only when the prices are owner-sourced

The `pricing[]` rows in every authored module were written during enrichment, not supplied by the
owner (`docs/business-facts.md` §D.1). Marking them up as `Offer` publishes them as commitments.
**Do not emit `Offer` or `OfferCatalog` until the ranges are confirmed.**

### 4.4 `Review` / `AggregateRating` — sourced only

Currently **absent from all 109 pages**, which is correct. Either shipping without a verifiable public
source URL is a Google policy violation and a Rich Results failure. Do not seed sample data "to test
the markup". Blocked on `docs/business-facts.md` §B.

### 4.5 Schema must match visible content

Every `FAQPage` question must be rendered on the page. `enrich.mjs` derives `faqSchema` from the same
`data.faq.items` that `render.mjs` renders, so the graph cannot drift from the copy — **preserve that
property**. Any new schema block must be derived from the same data the renderer uses, never authored
separately.

Note `acceptedAnswer.text` wraps the answer in `<p>…</p>`. That is acceptable to Google, but the HTML
must stay simple — no scripts, no attributes.

### 4.6 No `LocalBusiness` node per location

One business, one node. The 25 location pages emit `Service` with `areaServed`, which is right.
Seventeen `LocalBusiness` nodes would imply seventeen premises that do not exist and is a recognised
local-spam pattern.

### 4.7 No dangling `@id`

`serviceSchema` wires `provider: { "@id": LB_ID }` to the business node. That `@id` only resolves on
the homepage, which is normal and fine — but never invent a new `@id` that nothing defines.

---

## 5. Location pages and `areaServed`

```js
areaServed: data.kind === "location" && data.city
  ? { "@type": "City", name: data.city }
  : { "@type": "Country", name: "IL" };
```

Two corrections:

- ✅ **`קריות` is a region, not a city** — fixed 2026-11-04. Its module sets `areaKind: "region"`,
  and `placeType()` in `scripts/enrich.mjs` types it `AdministrativeArea` in both the page's
  `Service.areaServed` and the business node's list. Set the same field on any future region.
- **`{ "@type": "Country", name: "IL" }`** should carry the country name (`"Israel"`) or use a proper
  identifier. `"IL"` is an ISO code in a `name` field.

The business node's own `areaServed` **is** now derived from the location set — `scripts/enrich.mjs`
builds `CITIES` from `content/enriched/_manifest.json`, so it tracks the routes automatically and
cannot go stale the way the old hardcoded 15-city array did. It currently emits 23 unique places
(25 location pages, minus the נתניה and חולון duplicate-slug pairs): 22 `City` and one
`AdministrativeArea`.

⚠️ This means the schema makes a **machine-readable coverage claim on ~100 pages** even though
`schema.areaServed` is `null` in the roster manifest. `docs/business-facts.md` §E asserted the
opposite until 2026-09-02, which is why a coverage change was planned twice from the wrong premise.

---

## 6. Guides (live since 2026-08-26)

`Article` with `headline`, `description`, `image`, `datePublished`, `dateModified`, `author` (a
`Person` with a **real** name), `publisher` → the business `@id`, and `mainEntityOfPage`. Plus
`BreadcrumbList` and a `FAQPage` derived from the guide's own FAQ block.

**The author must be a real named person** — blocked on `docs/business-facts.md` §A. Never invent a
byline; a fabricated author is a worse trust signal than an absent one.

---

## 7. Verify

```bash
# every block on every page must parse — this is the gate
node -e '
const fs=require("fs"),path=require("path");const f=[];
(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
e.isDirectory()?w(p):e.name==="index.html"&&f.push(p);}})("out");
let bad=0;for(const x of f){const h=fs.readFileSync(x,"utf8");
for(const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
try{JSON.parse(m[1]);}catch{bad++;console.log("UNPARSEABLE:",x);}}}
console.log("unparseable blocks:",bad);'

grep -rL 'application/ld+json' out --include=index.html      # pages with no schema
grep -rl 'BreadcrumbList' out --include=index.html | wc -l   # 104 on 2026-11-04
grep -rl 'aggregateRating\|"@type": *"Review"' out --include=index.html  # must be empty
grep -ro '"email":"[^"]*"' out/index.html                    # must NOT be a personal address
```

Then run Google's Rich Results Test on one URL per route type: `/`, a `/services/` page, a
`/locations/` page, and `/מחירון/`. Zero errors is the bar.
