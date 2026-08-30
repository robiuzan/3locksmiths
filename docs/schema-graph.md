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
  (103 of 108 pages)
```

- For the **53 enriched pages**, `scripts/enrich.mjs` **overwrites** `page.jsonLd` entirely with
  `[breadcrumbSchema, serviceSchema, howToSchema, faqSchema]`. Whatever WordPress emitted is
  discarded. It then asserts each block `JSON.parse`s and that the page has exactly one `<h1>`,
  failing the build if not.
- For the **homepage (id 7)**, `enrich.mjs` _prepends_ `localBusinessSchema()` and **keeps the scraped
  blocks**. They are not validated.
- For the **10 other un-enriched pages**, the scraped blocks pass through untouched and unvalidated.

**That asymmetry is the root cause of §4.1.** The generator is sound; the pass-through path has no
gate.

`SiteFrame` injects each string with `dangerouslySetInnerHTML` — no parsing, no escaping, no
validation at render time.

---

## 2. Node per route type

| Route                                                      | Emits today                                                                    | Target                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------- |
| `/`                                                        | `LocalBusiness`+`Locksmith`, scraped `FAQPage` (**broken**), scraped `WebSite` | business node + valid `FAQPage` + `WebSite`    |
| `/services/<slug>/` ×29                                    | `BreadcrumbList` · `Service` · `HowTo` · `FAQPage`                             | unchanged — this is correct                    |
| `/services/שכפול-מפתח-לרכב/`                               | scraped only (**broken**)                                                      | full set — needs `content/enriched/95.mjs`     |
| `/locations/<slug>/` ×17                                   | `BreadcrumbList` · `Service`+`areaServed` · `HowTo` · `FAQPage`                | unchanged, but fix the `קריות` area type (§5)  |
| Top-level landers ×7                                       | `BreadcrumbList` · `Service` · `HowTo` · `FAQPage`                             | unchanged                                      |
| `/services/` (hub)                                         | **nothing**                                                                    | `CollectionPage` + `BreadcrumbList`            |
| `/contact/`                                                | **nothing**                                                                    | `ContactPage` + `BreadcrumbList`               |
| `/מחירון/`                                                 | `Service` + `FAQPage`                                                          | + `OfferCatalog` — **gated on §4.3**           |
| `/אודותינו/`                                               | `Service` + `FAQPage`                                                          | `AboutPage` + `BreadcrumbList`                 |
| `/privacy-policy/` `/accessibility-statement/` `/sitemap/` | **nothing**                                                                    | `BreadcrumbList` only                          |
| `/step/<slug>/` ×4                                         | **nothing**                                                                    | **nothing** — funnel fragments, correctly bare |
| `/404`                                                     | none                                                                           | none                                           |

Measured on the 2026-08-02 export: 207 well-formed blocks, **2 unparseable**, 0 empty.
`BreadcrumbList` on 53 pages; `FAQPage` 55; `HowTo` 53; `Service` 46.

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

**Everything else about this node is hardcoded in `enrich.mjs` rather than read from the manifest, and
three fields are wrong:**

| Field          | Emitted                              | Manifest                 | Verdict                         |
| -------------- | ------------------------------------ | ------------------------ | ------------------------------- |
| `name`         | `שלושה מנעולנים`                     | same                     | correct by coincidence          |
| `telephone`    | `+972-55-6601006`                    | `+972556601006`          | ⚠️ two NAP spellings            |
| `email`        | **`robiuzan@gmail.com`**             | `info@3locksmiths.co.il` | 🔴 **Critical — §4.2**          |
| `priceRange`   | `₪₪`                                 | `₪₪`                     | correct by coincidence          |
| `address`      | **absent**                           | **absent**               | blocked — business-facts §C.1   |
| `areaServed`   | 15 hardcoded `City` nodes            | `areaServed: null`       | ⚠️ drift, and קריות is mistyped |
| `openingHours` | Sun–Fri 08:00–18:00, Sat 08:00–17:00 | —                        | ⚠️ contradicts the "24/7" title |
| `foundingDate` | absent                               | `foundedYear: null`      | correct — do not infer it       |
| `sameAs`       | absent                               | `[]`                     | correct — blocked on owner      |

**Fix direction:** `localBusinessSchema()` should read from `site.config.json` (already imported by
`app/layout.tsx` as the manifest) rather than carrying its own literals. Values themselves change in
the **roster manifest**, then sync down. Never edit `site.config.json` directly.

---

## 4. Gating rules — correctness, not preference

### 4.1 Every block must parse — including the ones we didn't generate

Two pages ship an unparseable `application/ld+json` block, both inherited from the WordPress scrape:

- `out/index.html` — the homepage `FAQPage`. Fails with _"Bad control character in string literal"_: a
  raw newline inside a JSON string. **Google cannot read it, so the homepage FAQ rich result is
  dead.**
- `out/services/שכפול-מפתח-לרכב/index.html` — same class of defect.

`enrich.mjs` already validates every block it _generates_. The gap is that scraped blocks are passed
through unvalidated. Close it in one of two ways:

1. Validate all `page.jsonLd` entries at the end of `enrich.mjs` (not just generated ones) and drop or
   repair anything that fails. A malformed block is worth strictly less than no block.
2. Author `content/enriched/95.mjs` and give the homepage a generated `FAQPage`, which replaces both
   broken blocks at source. Preferred — it fixes the cause, not the symptom.

**A block that does not `JSON.parse` is a stop-ship.**

### 4.2 The business node must not carry a personal address

`email: "robiuzan@gmail.com"` is **live on the homepage** (verified 2026-08-16). It is the developer's
personal Gmail published as the business's contact address in structured data. It is wrong for the
business, it leaks a personal address, and it contradicts the manifest.

Fix: read `contact.email` from the manifest. This is Critical and should ship ahead of anything
cosmetic.

### 4.3 `Offer` / `PriceSpecification` only when the prices are owner-sourced

The `pricing[]` rows in every authored module were written during enrichment, not supplied by the
owner (`docs/business-facts.md` §D.1). Marking them up as `Offer` publishes them as commitments.
**Do not emit `Offer` or `OfferCatalog` until the ranges are confirmed.**

### 4.4 `Review` / `AggregateRating` — sourced only

Currently **absent from all 66 pages**, which is correct. Either shipping without a verifiable public
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

One business, one node. The 17 location pages emit `Service` with `areaServed`, which is right.
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

- **`קריות` is a region, not a city.** It must be `{ "@type": "AdministrativeArea", name: "קריות" }`.
  Typing a region as a `City` is a factual error in the graph. Add a `kind: "city" | "region"` field
  to the authored module rather than special-casing a string.
- **`{ "@type": "Country", name: "IL" }`** should carry the country name (`"Israel"`) or use a proper
  identifier. `"IL"` is an ISO code in a `name` field.

The business node's own `areaServed` is a hardcoded 15-city array in `enrich.mjs` that does not match
the 17 location pages. Derive it from the location set, or from `schema.areaServed` in the manifest
once that is confirmed (`docs/business-facts.md` §E).

---

## 6. Guides (when `/מדריכים/` lands)

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
grep -rl 'BreadcrumbList' out --include=index.html | wc -l   # 53 today
grep -rl 'aggregateRating\|"@type": *"Review"' out --include=index.html  # must be empty
grep -ro '"email":"[^"]*"' out/index.html                    # must NOT be a personal address
```

Then run Google's Rich Results Test on one URL per route type: `/`, a `/services/` page, a
`/locations/` page, and `/מחירון/`. Zero errors is the bar.
