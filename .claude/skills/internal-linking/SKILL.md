---
name: internal-linking
description: Build the link mesh on 3locksmiths — the inherited WordPress navigation that already reaches everything, the related.services and related.locations arrays that are the one place equity is deliberately shaped, missing service↔location cross-links, contextual in-copy anchors, the duplicate-intent page pairs, breadcrumbs versus BreadcrumbList coverage, and the zero-orphan check. Use when wiring related links, fixing orphans, or auditing navigation. Triggers "internal linking", "orphan pages", "navigation", "related links", "footer links", "breadcrumbs".
---

# Internal linking

64 pages. Unlike most sites in this fleet, the mesh is **inherited from WordPress rather than
designed** — which means it is complete but not shaped.

## Current state (backlog §9)

| Aspect                        | State                                                                       |
| ----------------------------- | --------------------------------------------------------------------------- |
| Orphans                       | **none** — the ported header, footer and in-content links reach every route |
| Deliberate shaping            | only `related.services[]` / `related.locations[]` in the authored modules   |
| Service → location contextual | **zero** beyond `related`                                                   |
| Location → location           | only via `related.locations[]`                                              |
| Contextual in-copy anchors    | **near zero** — links are nav items, cards and chips                        |
| Breadcrumbs                   | visible from the theme; `BreadcrumbList` on 53 of 64 pages                  |

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

## 3. The biggest missing edge: service ↔ location

No service page links contextually into the city set, and the 24 brand-key pages don't reach the 17
location pages at all. That is the largest untapped mesh on the site.

On a **service** page, add 4–6 locations to `related.locations`, weighted to the core service area.
On a **location** page, add 2–4 genuinely adjacent cities plus the services most searched there.

## 4. Contextual in-copy links

Nearly all internal links are nav labels and card titles, so the site emits almost **no anchor-text
diversity** — and anchor text is a ranking signal.

As you author or deepen a module, put 2–3 links **inside the prose** with descriptive Hebrew anchors:

- ✅ `<a href="/services/שחזור-מפתח-לרכב/">שחזור מפתח שאבד לרכב</a>`
- ❌ "לחצו כאן", "למידע נוסף", a bare URL

Hebrew `href`s are written **unescaped** in the module; the build percent-escapes them on output so
they match the canonical and the sitemap `<loc>`. **Do not pre-encode them.**

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
