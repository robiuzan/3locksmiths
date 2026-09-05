---
name: local-seo-il
description: Israeli local-SEO doctrine for שלושה מנעולנים — the missing address that has no field in the manifest, the Google עסק שלי profile that arrived 2026-09-05 with its NAP verified and its service areas still unread, four spellings of one phone number including a dead placeholder, the region-typed-as-City fix for קריות, duplicate-city slugs, coverage honesty, and the expansion cap. Use when populating locations for local ranking or auditing local visibility. Triggers "local SEO", "NAP", "city pages", "Google עסק שלי", "doorway pages", "areaServed", "add a city".
---

# Local SEO — Israel

One business, **no published address**, 25 location pages. Everything below follows from that
asymmetry.

## 0. Start from the right premise

The location pages here are **not doorway pages**. They carry 1,282–1,598 unique words, name real
neighbourhoods and streets, and reason about local building stock and parking.
`content/enriched/137.mjs` (תל אביב) names דיזנגוף, רוטשילד, פלורנטין, נווה צדק, רמת אביב and
שכונת התקווה. Substituting another city would make the page **wrong**, not merely generic.

**The content is the asset. The structural signals around it are what's broken.** Don't spend effort
rewriting pages that already pass.

## 1. NAP consistency — one number, four strings

The name, address and phone must be **byte-identical** everywhere. They are not:

> ℹ️ **The counts and spellings below are a dated audit record.** The number itself changed to
> **076-599-1266** on 2026-09-02 (`docs/business-facts.md` §C.5); `scripts/phone.mjs` now fails the
> build if the retired 055-6601006 reaches the browser outside the WhatsApp URL. Read the digits
> here as history, not as something to restore.

| Where                        | Value                 | Count        |
| ---------------------------- | --------------------- | ------------ |
| `tel:` in the ported HTML    | `tel:0556601006`      | 385          |
| `tel:` in the ported HTML    | `tel:055-6601006`     | 114          |
| `tel:` in the ported HTML    | `tel:+972556601006`   | 4            |
| `tel:` in the ported HTML    | **`tel:%5Bphone%5D`** | **3 — dead** |
| `LocalBusiness` JSON-LD      | `+972-55-6601006`     | —            |
| Manifest `contact.phoneE164` | `+972765991266`       | —            |

The `tel:[phone]` entries are an unresolved WordPress shortcode, **live on the homepage** (6
occurrences in the served HTML). Tapping them does nothing. Fix in the pipeline
(`scripts/transform.mjs` / `fix-links.mjs`) so it cannot return, and normalise everything to
`manifest.contact.phoneE164` (backlog §5.3, §8.1).

## 2. 🔴 There is no address — and no field to put one in

The roster manifest's `schema` block carries `type`, `priceRange`, `areaServed` and `sameAs`. **There
is no `address` field.** No page renders an address; the `LocalBusiness` node has none; the footer has
none.

For a locksmith this may be entirely legitimate — a mobile-only operation may have no public premises,
in which case the right answer is a **service-area business** on the Google side, not an address on
the site.

So this is two questions, in order:

1. Does the business have a public address? → `docs/business-facts.md` §C.1. **Never invent one.**
2. If yes, adding it is a **manifest-schema change** in the hub
   (`roster/manifest.schema.json`), then the roster entry, then sync — not a local edit.

## 3. Google עסק שלי — the top lever, and it now exists

**Supplied by the owner 2026-09-05.** `schema.sameAs` carries the profile URL, so the `LocalBusiness`
node on every enriched page finally points at something off-site. For a single-trade local business
the profile outranks almost everything else you can do on-page: it drives the map pack, it is where
reviews live, and it is the entity anchor that makes `sameAs` meaningful.

**The NAP was checked, and it agrees.** Business name, phone, website, primary category and opening
hours were read straight off the profile on 2026-09-05 and all match what we publish. `docs/business-facts.md`
§B.4 carries the values and the cookieless `/maps/preview/place` command that reads them — use it
rather than assuming, and rather than parking these on the owner.

**Three things it does not answer**, and only the dashboard does: whether the listing is claimed and
ownership-verified, whether its service areas still include the 7 cities withdrawn 2026-09-02 (§E.1),
and the review count. Do not state any of the three.

We hold no citable review, so §B's ban on `Review` and `AggregateRating` without a verifiable public
source is untouched by any of this.

If further profiles appear (social, directories): URLs go in the **roster manifest** `schema.sameAs`,
then `ops/sync-manifest.ps1`, then `npm run enrich`. Never into `site.config.json` directly.

## 4. Hebrew grammar and area typing

Location copy is **written per page**, not interpolated from a `ב${city}` template — which is why it
reads correctly. **Protect that.** If a future refactor introduces a shared template, it must carry an
explicit prefixed form per location.

The schema is a different story. `serviceSchema` types every location's `areaServed` as `City`, but
**קריות is a region**:

```js
// content/enriched/<id>.mjs
city: "קריות",
areaKind: "region",     // "city" | "region"

// scripts/enrich.mjs
{ "@type": data.areaKind === "region" ? "AdministrativeArea" : "City", name: data.city }
```

Typing a region as a `City` is a factual error in the graph. See `/schema-structured-data`.

## 5. Duplicate-city slugs

Two cities have two live pages each:

- `/locations/שכפול-מפתח-בנתניה/` **and** `/locations/שכפול-מפתחות-בנתניה/`
- `/locations/שכפול-מפתח-חולון/` **and** `/locations/שכפול-מפתחות-חולון/`

Both of each pair are live WordPress URLs holding ranking signal. Assess cannibalisation — titles and
descriptions currently differ, so it is not acute — but **a merge is only ever safe with a
`public/_redirects` 301**. Not a cleanup task (`docs/keyword-map.md` §8).

The same applies to the cross-silo duplicates: `/מנעולן-רכב/` ↔ `/services/מנעולן-רכב/`, and the same
for `מנעולן-לבית` and `קודן-לרכב`.

## 6. Coverage honesty — four different answers

| Source                        | Says              |
| ----------------------------- | ----------------- |
| Manifest `schema.areaServed`  | `null`            |
| Sitewide copy (not the title) | פריסה רחבה        |
| `scripts/enrich.mjs:CITIES`   | 23 derived cities |
| `/locations/` routes          | 25 cities         |

An `areaServed` the business cannot actually service is a liability — it produces leads it can't serve
and a claim it can't defend. Reconcile via `docs/business-facts.md` §E, then derive the schema list
from the location set rather than hardcoding it (backlog §4.6, §5.4).

## 7. Geo signals

Missing entirely: `GeoCoordinates`, `hasMap`, any map embed on `/contact/`. Coordinates go in the
roster manifest `schema.geo` once the address question (§2) is settled.

## 8. The doorway policy — the gate on any expansion

> Replace the city name with another city name. Is the page now correct and publishable for that other
> city? If yes, it is a doorway page.

The existing 17 **pass**. Any new one must clear the same bar with **three or more** true, specific
items: named neighbourhoods or landmarks; local building stock and access reality; travel and
scheduling honesty for that distance; a city-specific FAQ; local pricing if it genuinely differs.

**If none of those can be said truthfully about a city, that city does not warrant a page.** Record
it in `docs/business-facts.md` §E rather than padding. Full spec: `docs/content-standards.md` §2–§3.

## 9. The expansion cap

30 services × 25 locations = 750 possible cells. **Do not build them.** Order of operations
(`docs/keyword-map.md` §7):

1. Author `content/enriched/95.mjs` — a Tier-1 term currently on the site's weakest page.
2. Fix the broken JSON-LD, the dead `tel:` links and the personal email in the business node.
3. Bring the remaining un-enriched pages to their type's bar.
4. Build the Tier-4 guides — topical authority is the real gap.
5. **Only then** consider service × location cells.

**No 18th location before step 1.** The depth is already there; scaling adds risk, not reach.

## 10. Internal equity

The inherited WordPress mesh has **no orphans** — verify rather than assume. But no service page links
contextually into the city set, and no location links to an adjacent city beyond
`related.locations[]`. See `/internal-linking`.

## Checklist

- [ ] Every `tel:` href is the manifest's E.164 value — and no `tel:[phone]` survives.
- [ ] The `LocalBusiness` node reads NAP from the manifest, not from literals.
- [ ] The address question is answered in `docs/business-facts.md` §C.1 — or explicitly deferred.
- [ ] Every location has an explicit `areaKind`; קריות is `AdministrativeArea`.
- [ ] `sameAs` populated (Business Profile since 2026-09-05), or a 🔶 row exists.
- [ ] `areaServed` derived from the location set, not hardcoded.
- [ ] Every location page passes the doorway test.

## Gotchas

- **Never** a `LocalBusiness` node per city. One business, one node.
- Never rename or merge a live slug without a `_redirects` 301 — including the duplicate-city pairs.
- Never invent an address, a review, a rating or a coverage claim to fill a checkbox.
- Never edit `content/site.json`; the fix is always in an authored module or a pipeline script.
