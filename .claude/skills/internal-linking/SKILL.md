---
name: internal-linking
description: Build the link mesh on 3locksmiths — the inherited WordPress navigation that already reaches everything, the related.services and related.locations arrays that are the one place equity is deliberately shaped, missing service↔location cross-links, contextual in-copy anchors, the duplicate-intent page pairs, breadcrumbs versus BreadcrumbList coverage, and the zero-orphan check. Use when wiring related links, fixing orphans, or auditing navigation. Triggers "internal linking", "orphan pages", "navigation", "related links", "footer links", "breadcrumbs".
---

# Internal linking

108 pages. Unlike most sites in this fleet, the mesh is **inherited from WordPress rather than
designed** — which means it is complete but not shaped.

## Current state (backlog §9)

| Aspect                        | State                                                                       |
| ----------------------------- | --------------------------------------------------------------------------- |
| Orphans                       | **none** — the ported header, footer and in-content links reach every route |
| Deliberate shaping            | only `related.services[]` / `related.locations[]` in the authored modules   |
| Service → location contextual | **zero** beyond `related` and, on the 58 family pages, the hub (2026-11-04) |
| Location → location           | only via `related.locations[]`                                              |
| Contextual in-copy anchors    | **near zero** — links are nav items, cards and chips                        |
| Breadcrumbs                   | visible from the theme; `BreadcrumbList` on 103 of 108 pages                |

**Verify the no-orphans claim rather than trusting it** — it is a property of the current scrape, not
a guarantee.

## 1. Where you can actually change links

| Link type                    | Edit                                                       |
| ---------------------------- | ---------------------------------------------------------- |
| Related services / locations | `content/enriched/<id>.mjs` → `related`                    |
| In-copy contextual links     | `content/enriched/<id>.mjs` → `intro.paragraphs`, `guides` |
| Area chips                   | `content/enriched/<id>.mjs` → `areas`                      |
| How any of those render      | `lib/enrich/render.mjs`                                    |
| Header / footer / nav        | `scripts/transform.mjs` (scraped chrome)                   |

**Never edit the built HTML or `content/site.json`.** After any change, `npm run enrich`.

## 2. `related` is the lever — use relevance, not order

```js
// content/enriched/<id>.mjs
related: {
  services: [{ label: "שכפול מפתח מאזדה", href: "/services/שכפול-מפתח-מאזדה/" }],
  locations: [{ label: "שכפול מפתח בתל אביב", href: "/locations/שכפול-מפתח-תל-אביב/" }],
}
```

Two rules:

- **Choose by genuine relevance.** A brand-key page (`שכפול מפתח מאזדה`) should relate to
  `שכפול מפתח לרכב`, `שחזור מפתח לרכב` and `קודן לרכב` — not to whatever sits next in the array. If a
  set of `related` blocks all point at the same four flagship pages, those pages hoard the internal
  equity and the 24 brand-key pages get almost none.
- **Location adjacency is bidirectional.** If תל אביב lists רמת גן, רמת גן must list תל אביב. A
  one-way edge is a modelling error, and here it has to be maintained by hand across two modules.

A module that **omits** `related` gets a derived default from `scripts/build-manifest.mjs`: since
2026-09-29 a rotating "next 5 siblings" window (so no brand or city is starved, as the old
first-5 window starved 27 brands and all 10 newer cities), the car-keypad cluster linking its own
hub, and the priority emergency services — never the `/services/` half of a duplicate-intent pair.
That default is still array order, so it is a floor, not the rules above: author `related` when
topic or adjacency matters.

## 3. The biggest missing edge: service ↔ location

**Partly closed 2026-11-04.** The family hub (below) links every brand page to every city page and
back, on all 58 "שכפול מפתח" pages. What is still missing is the CONTEXTUAL edge: a sentence on a
service page that names a city, or on a city page that names a brand, with a descriptive anchor —
which needs the typed in-copy links renderer change (`docs/information-architecture.md` §4).

On a **service** page, add 4–6 locations to `related.locations`, weighted to the core service area.
On a **location** page, add 2–4 genuinely adjacent cities plus the services most searched there.

## 4. Contextual in-copy links

Nearly all internal links are nav labels and card titles, so the site emits almost **no anchor-text
diversity** — and anchor text is a ranking signal.

As you author or deepen a module, put 2–3 links **inside the prose** with descriptive Hebrew anchors:

- ✅ `<a href="/services/שחזור-מפתח-לרכב/">שחזור מפתח שאבד לרכב</a>`
- ❌ "לחצו כאן", "למידע נוסף", a bare URL

**Correction (2026-11-04):** the build does NOT percent-escape hrefs. `scripts/fix-links.mjs`
validates a decoded or an encoded href alike and leaves either spelling as written (`fix-links.mjs`
"Normalize to the trailing-slash form"). Both work for users and crawlers, but the stored spelling —
the manifest's lowercase percent-encoded `path` — is what every generated link uses, and inside a
`.location-list` it is the only spelling `scripts/prune-chrome-links.mjs` keeps. Prefer deriving
links from the manifest (`related` omitted → `withDerivedLinks`) over typing them.

## The family hub (2026-11-04)

Page 95 and its 57 brand and city pages carry one block listing every brand page and every city
(`renderFamilyHub` in `lib/enrich/render.mjs`, data from the manifest's `family` key). It took every
brand page from 7–10 linking pages to at least 60. Never add a brand or city by hand: a new page joins
the hub through `scripts/build-manifest.mjs`, and a withdrawn one leaves it the same way.

All internal links need the **trailing slash** (`trailingSlash: true`), or they 301 and waste a hop.

## 5. The duplicate-intent pairs — link them deliberately

These pairs both exist and are both live:

- `/מנעולן-רכב/` ↔ `/services/מנעולן-רכב/`
- `/מנעולן-לבית/` ↔ `/services/מנעולן-לבית/`
- `/קודן-לרכב/` ↔ `/services/קודן-לרכב/`
- `/locations/שכפול-מפתח-בנתניה/` ↔ `/locations/שכפול-מפתחות-בנתניה/` (and the same for חולון)

Cross-linking them tightly signals they're related rather than competing. **Do not merge or rename
either side without a `public/_redirects` 301** (`docs/keyword-map.md` §8).

## 6. Hub pages

`/services/` (371 words) and `/אזורי-שירות/` are the natural hubs. `/services/` currently has no
authored module at all, so it is a bare grid. Give each an intro that links **contextually** into its
children — `docs/content-standards.md` §1 sets a 350-word floor for index pages.

## 7. Breadcrumbs

The visible trail comes from the gogo theme. `BreadcrumbList` is generated by
`scripts/enrich.mjs:breadcrumbSchema()` for the 53 enriched pages:

```
בית › שירותים|אזורי שירות › <keyword>
```

Eleven real pages emit none (backlog §4.8). Where the markup and the visible trail disagree, fix the
markup to match what renders — never the other way round. See `/schema-structured-data`.

## Zero-orphan check

```bash
# every emitted route
find out -name index.html | sed 's|^out||; s|index.html$||' | sort > /tmp/routes.txt
# every internally linked href
grep -rho 'href="/[^"]*"' out --include=index.html | sed 's|href="||; s|"$||' | sort -u > /tmp/linked.txt
comm -23 /tmp/routes.txt /tmp/linked.txt
```

Anything printed has no inbound internal link. Target: empty (excluding `/404/` and `/_not-found/`).

Note hrefs in the export are **percent-encoded**, so decode before comparing, or compare encoded on
both sides consistently.

## Checklist

- [ ] Orphan check returns nothing.
- [ ] `related.services` chosen by relevance, not array order.
- [ ] `related.locations` adjacency is set on **both** sides.
- [ ] Every service page links to 4+ locations; every location links to 2+ adjacent cities.
- [ ] Each authored module carries 2–3 contextual in-copy links with descriptive Hebrew anchors.
- [ ] Duplicate-intent pairs cross-link each other.
- [ ] Every internal link has a trailing slash and is written unescaped.
- [ ] Breadcrumbs render **and** emit `BreadcrumbList` on every nested route.
- [ ] `npm run enrich && npm run build`, then re-run the orphan check.

## Gotchas

- Adding links to a thin page doesn't fix the thin page. Depth first (`/new-service`), then the mesh.
- Never pre-encode a Hebrew `href` — the build does it.
- Never patch links in `out/` or `content/site.json`; `scripts/fix-links.mjs` and the authored modules
  are the only places link changes survive a rebuild.
