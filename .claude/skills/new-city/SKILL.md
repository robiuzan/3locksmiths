---
name: new-city
description: Add or deepen a location page the data-driven way — author content/enriched/<id>.mjs with genuinely local substance so the route, the link mesh, the Service + areaServed schema and the sitemap follow automatically. The existing 17 pass the doorway test; this skill is about holding that bar and fixing the region-typed-as-City error. Use when expanding coverage or retrofitting a city page. Triggers "add a city", "new location page", "cover <city>", "this city page is thin", "doorway".
---

# Add or deepen a location page

**Read this first: the 17 existing location pages pass the doorway test.** They carry 1,282–1,598
unique words and name real neighbourhoods, streets and local conditions. Your job is to hold that bar,
not to climb to it.

`content/enriched/137.mjs` (תל אביב) is the reference. It names דיזנגוף, רוטשילד, פלורנטין, נווה צדק,
רמת אביב, הבורסה and שכונת התקווה, and reasons about parking in מרכז העיר and the older buildings of
לב העיר. Substituting "חיפה" would make the page **wrong**, not merely generic. That is the standard.

## The data model

One module per page at `content/enriched/<id>.mjs`, matching `lib/enrich/types.ts` → `EnrichedPage`.
Find the `id` in `content/enriched/_manifest.json` → `lookup`.

```js
export default {
  id: 137,
  kind: "location",
  keyword: "שכפול מפתח בתל אביב",
  city: "תל אביב", // ⭐ drives areaServed in the Service node
  areaKind: "city", // ⭐ "city" | "region" — see below

  seo: { title, description },
  hero: { h1, tagline },
  intro: { heading, paragraphs: [], outro: [] },
  pricing: [{ service, price }],
  process: [{ title, text, time }],
  specsTable: { caption, intro, columns, rows },
  faq: { subtitle, items: [{ q, a }] },
  related: { services: [], locations: [] },
  areas: [{ label, href }],
  cta: { heading, body },
};
```

> ⚠️ **The contract is documented, not enforced.** The modules are plain `.mjs`; a typo'd field name
> renders nothing, silently. Diff against `lib/enrich/types.ts` by hand.

### `areaKind` — the fix you should make while you're here

`scripts/enrich.mjs:serviceSchema()` currently types every location's `areaServed` as `City`. **קריות
is a region**, and typing a region as a `City` is a factual error in the graph. Add an explicit
`areaKind` field rather than special-casing the string:

```js
{ "@type": data.areaKind === "region" ? "AdministrativeArea" : "City", name: data.city }
```

See `/schema-structured-data` and `/local-seo-il` §4.

## The doorway test — the gate

> Replace the city name with a different city name. Is the page now correct and publishable for that
> other city? **If yes, it does not ship.**

To pass, the page needs **three or more** true, specific items:

- **Named neighbourhoods, streets, junctions or landmarks.**
- **Building-stock and access reality** — older blocks with particular lock types, new towers with
  smart entry, buildings where a technician can't park close.
- **Travel and scheduling honesty for that distance** — whether same-day genuinely applies.
- **A city-specific FAQ** that would read oddly anywhere else.
- **Local pricing reality** if it genuinely differs.
- A real job reference — 🔶, needs owner confirmation (`docs/business-facts.md` §G).

**If none of those can be said truthfully about a city, that city does not warrant a page.** Record
that in `docs/business-facts.md` §E rather than padding. A page that exists to hold a keyword is what
Google's doorway policy names, and the penalty lands on the domain, not the page.

> ⚠️ Everything you write about a city's coverage is a **coverage claim**. Nobody has confirmed the
> business services these areas within the stated times (`docs/business-facts.md` §E). Write what is
> plausible and physical (geography, building stock) rather than promising a response window you
> cannot source.

## Duplicate-city slugs

Two cities already have two live pages each:

- `/locations/שכפול-מפתח-בנתניה/` **and** `/locations/שכפול-מפתחות-בנתניה/`
- `/locations/שכפול-מפתח-חולון/` **and** `/locations/שכפול-מפתחות-חולון/`

Both of each pair are live WordPress URLs holding ranking signal. If you are deepening one, **check
the other and differentiate them** — don't write the same page twice. And **never merge or rename
either without a `public/_redirects` 301** (`docs/keyword-map.md` §8).

## Steps

1. **Check the cap.** `/local-seo-il` §9 — no 18th location before `content/enriched/95.mjs` exists.
2. **Find the id** in `_manifest.json`. The route must already exist in `content/site.json`; this
   pipeline enriches existing WordPress pages rather than inventing routes.
3. **Read two sibling location modules**, including `137.mjs`.
4. Author the module. Open `intro.paragraphs[0]` with a **40–60 word answer block** naming the city and
   the concrete outcome (`docs/content-standards.md` §5).
5. Put the local substance in `intro.paragraphs` and `process[]` — the process steps in `137.mjs`
   reference actual areas ("הניידת הקרובה", named neighbourhoods), which is what makes them non-generic.
6. Write 2–3 **city-specific** FAQs.
7. Set `related.locations` from **real geographic adjacency**, and add this city to its neighbours'
   `related.locations` too — the edge is bidirectional and maintained by hand.
8. Set `areas[]` where a neighbourhood list earns its place.
9. Title and description per `docs/keyword-map.md` §3 and §5 — brand **exactly once**, under ~60 chars.
10. `npm run enrich` (**never** `npm run snapshot`).
11. `npm run lint && npm run typecheck && npm run build`.
12. Verify the route in `out/`, its `sitemap.xml` entry, and that its JSON-LD parses.

## What follows automatically

The route (it already exists) · `Service` + `areaServed` + `HowTo` + `FAQPage` + `BreadcrumbList` ·
the metadata · the sitemap entry · the one-`<h1>` build assertion.

## Checklist

- [ ] `id` matches `_manifest.json`; field names diffed against `lib/enrich/types.ts`.
- [ ] `city` set; `areaKind` set (`"region"` for קריות).
- [ ] ≥900 unique words; **three or more** genuinely local items.
- [ ] Passes the doorway substitution test.
- [ ] Opens with a 40–60 word answer block.
- [ ] 2–3 city-specific FAQs, all rendered.
- [ ] `related.locations` set on **both** sides.
- [ ] The duplicate-slug twin (if any) is differentiated, not duplicated.
- [ ] Title has the brand exactly once; description 150–160 chars and unique.
- [ ] `npm run enrich` run; verified in `out/` and `out/sitemap.xml`; JSON-LD parses.

## Gotchas

- The pipeline enriches **existing** routes. It cannot create a URL that isn't in `content/site.json`.
- Never edit `content/site.json`; never run `npm run snapshot` to refresh.
- Hebrew `href`s in `related`/`areas` are written **unescaped** — the build percent-escapes them.
- Never invent a neighbourhood, a landmark, a local job or a response time. Unverified →
  `// 🔶 confirm` + `docs/business-facts.md`.
- Never rename an existing live slug without a `_redirects` 301.
- Copy is written per page, not interpolated from a `ב${city}` template — which is why the Hebrew
  reads correctly. Keep it that way.
