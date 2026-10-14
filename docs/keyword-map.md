# Keyword map

The intent model behind the 105 routes, and the title / H1 / description formulas every page follows.
Cited by `hebrew-copywriter`, `seo-auditor`, `local-seo-strategist`, `aeo-geo-strategist`,
`/seo-metadata`, `/new-service` and `/new-city`.

---

## 1. The silo structure

The live URL scheme is inherited from WordPress and is **load-bearing** — it holds every ranking
signal this site has. It is not tidy, and it does not get tidied.

| Silo                     | Path shape                                                                                | Count | Intent                              |
| ------------------------ | ----------------------------------------------------------------------------------------- | ----- | ----------------------------------- |
| Homepage                 | `/`                                                                                       | 1     | brand + head term                   |
| Service silo             | `/services/<he-slug>/`                                                                    | 53    | commercial, per service             |
| Service hub              | `/services/`                                                                              | 1     | navigational                        |
| Location silo            | `/locations/<he-slug>/`                                                                   | 24    | commercial, service × city          |
| Top-level Hebrew landers | `/מנעולן-רכב/`, `/מנעולן-לבית/`, `/מחירון/`, `/אודותינו/`, `/אזורי-שירות/`, `/קודן-לרכב/` | 6     | head terms + trust                  |
| Guides hub + guides      | `/מדריכים/`, `/מדריכים/<he-slug>/`                                                        | 12    | informational / question terms      |
| Calculator steps         | `/step/<he-slug>/`                                                                        | 4     | funnel fragments, not landing pages |
| Legal / utility          | `/contact/`, `/privacy-policy/`, `/accessibility-statement/`, `/sitemap/`                 | 4     | trust + utility                     |

**105 pages total. 101 in `sitemap.xml`** (the four `/step/` routes are excluded by `app/sitemap.ts`).
The service silo was 55 until the 2026-10-14 merge removed `/services/מנעולן-רכב/` and
`/services/מנעולן-לבית/` (§8.1); it holds 21 service pages and 32 brand-key pages.

Quirks that are deliberate:

- **Duplicate intent across silos.** `/קודן-לרכב/` and `/services/קודן-לרכב/` both exist. Both URLs
  are live on the source site. Each carries its own canonical and its own authored module. **Do not
  consolidate them without a `_redirects` 301 plan** — see §8.
  ✅ RESOLVED 2026-10-14 for the other two pairs: `/מנעולן-רכב/` and `/מנעולן-לבית/` survive, and
  their `/services/` twins 301 to them for uppercase-encoded requests only; the lowercase 301 is 🔶
  pending the owner's zone rule (§8.1).
- **`/שכפול-שלט-לרכב-2/`** carried WordPress's duplicate-slug `-2` suffix. ✅ RESOLVED 2026-10-14:
  merged into `/services/שכפול-שלט-לרכב/` (301 uppercase-only until the 🔶 zone rule lands, §8.1).
- **Mixed taxonomy.** Two silos use English container segments with Hebrew slugs; top-level landers
  are pure Hebrew. That is the live scheme and it stays.

---

## 2. Intent tiers

### Tier 1 — head commercial terms

The money pages. High volume, high competition, high intent.

`מנעולן` · `מנעולן רכב` · `מנעולן לבית` · `שכפול מפתח לרכב` · `פתיחת דלת נעולה` · `החלפת מנעולים` ·
`מחירון מנעולן`

Mapped to: `/`, `/מנעולן-רכב/`, `/מנעולן-לבית/`, `/services/שכפול-מפתח-לרכב/`, `/מחירון/`,
`/services/החלפת-מנעולים/`, `/services/תיקון-דלתות/`.

> ⚠️ `/services/שכפול-מפתח-לרכב/` is a Tier-1 term sitting on the site's **thinnest, least-marked-up
> service page** (763 words, no description, no `BreadcrumbList`, no `Service` node, malformed
> JSON-LD). It is page id 95, the enrichment `referenceId`, and it has no authored module. Fixing it
> is the highest-value single task on the site.
>
> 2026-10-14: stale. `content/enriched/95.mjs` exists, and `content/site.json` gives the page a
> description and a parseable `BreadcrumbList` · `Service` · `HowTo` · `FAQPage` set. Re-measure its
> depth before treating this as open.

### Tier 2 — brand-key terms (the site's real moat)

32 of the 53 service pages are brand-key pages targeting `שכפול מפתח ל<brand>`: מאזדה, טויוטה,
יונדאי, קיה, פורד, סקודה, שברולט, סוזוקי, רנו, סיטרואן, פיגו, מיצובישי, סובארו, מרצדס, הונדה, אופל,
במוו, פולקסווגן, and fourteen more added as ids 9501–9514 — plus `שכפול שלט לרכב`,
`שחזור מפתח לרכב`, `קודן לרכב`.

Lower volume each, but **high intent, low competition, and highly answerable** — a driver searching
"שכפול מפתח מאזדה" wants a specific answer about their car. This is where the `specsTable` block
earns its keep and where AEO citations are most winnable.

Also Tier 2 on the door side: `דלת פלדלת`, `דלת ממד`, `מנעול רב בריח`, `מולטילוק`.

### Tier 3 — local terms

`שכפול מפתח ב<city>` across 23 cities on 24 pages: תל אביב, חיפה, ראשון לציון, פתח תקווה, נתניה,
חולון (×2 slugs), רמת גן, גבעתיים, בת ים, כפר סבא, רעננה, חדרה, קריות, אשדוד, הרצליה, רחובות,
בני ברק, מודיעין, רמת השרון, הוד השרון, לוד, נס ציונה, ראש העין.

> ירושלים, באר שבע, אשקלון, בית שמש, כרמיאל, עכו and עפולה were **withdrawn 2026-09-02** — the
> business no longer services them (`docs/business-facts.md` §E.1). All seven 301 to
> `/אזורי-שירות/` via `public/_redirects`. Do not re-add them as keyword targets.

> Note the duplicate-city slugs: `שכפול-מפתח-חולון` **and** `שכפול-מפתחות-חולון`. Both are live.
> Treat as §8 — do not merge without a 301 plan.
>
> ✅ RESOLVED 2026-10-14: the נתניה pair (`שכפול-מפתח-בנתניה` / `שכפול-מפתחות-בנתניה`) was merged —
> `שכפול-מפתח-בנתניה` survives and the other 301s to it — uppercase-encoded requests only until the
> 🔶 owner-side zone rule is added (§8.1).
>
> **קריות is a region, not a city.** Any template that interpolates a bare `ב${city}` produces wrong
> Hebrew for it. See §6.

### Tier 4 — informational / question terms (unbuilt)

The topical-authority gap. Nothing on this site targets these today:

- כמה עולה שכפול מפתח לרכב?
- מה ההבדל בין מפתח עם שבב למפתח חכם?
- אבד לי המפתח היחיד לרכב — מה עושים?
- כמה זמן לוקח לשכפל מפתח רכב?
- האם אפשר לשכפל מפתח רכב בלי המקור?
- מתי צריך להחליף צילינדר ומתי מספיק תיקון?

These are the natural spine of a `/מדריכים/` hub. Each should answer the question **better than the
service page does**, then link to the service page for the commercial action. See `/new-article`.

---

## 3. Title formula

Titles are **absolute** on this site. `lib/content.ts:buildMetadata` sets
`md.title = { absolute: title }`, and `app/layout.tsx` defines **no `template`** — so there is no
layout-level brand suffix and no risk of the doubling bug that affects sibling fleet sites.

The brand is therefore written **into** the title, exactly once:

```
<subject> – <differentiator> | שלושה מנעולנים
```

| Route type | Formula                                          |
| ---------- | ------------------------------------------------ |
| Service    | `<שירות> – <בידול קצר> \| שלושה מנעולנים`        |
| Brand-key  | `שכפול מפתח ל<מותג> – <בידול> \| שלושה מנעולנים` |
| Location   | `שכפול מפתח ב<עיר> – <בידול> \| שלושה מנעולנים`  |
| Top-level  | `<נושא> – <בידול> \| שלושה מנעולנים`             |
| Guide      | the question verbatim + ` \| שלושה מנעולנים`     |

**Rules:**

- The brand appears **exactly once**. `/אודותינו/` currently violates this —
  `אודותינו – שלושה מנעולנים, מעל 25 שנות ניסיון | שלושה מנעולנים` — and also repeats the ⛔
  25-years claim. Both must be fixed together.
- Keep the rendered title **under ~60 characters**. Five titles currently exceed it (62–69 chars):
  `/`, `/services/החלפת-מנעולים/`, `/services/תיקון-דלתות/`, `/אודותינו/`, `/מנעולן-לבית/`.
- The differentiator must be **true** — no "המובילים", no unconfirmed year count.
- Titles live in the authored module's `seo.title`, or in `HOME_SEO` in `scripts/enrich.mjs` for the
  homepage. Never hand-edit `content/site.json`.

---

## 4. H1 formula

Exactly one `<h1>` per page — **currently true on all 105 pages; protect it.**

The H1 is `hero.h1` in the authored module. It restates the keyword naturally and is _not_ identical
to the title:

```
title: שכפול מפתח בתל אביב – מנעולן זמין בעיר | שלושה מנעולנים
h1:    שכפול מפתח בתל אביב – שירות מנעולן מהיר ומקצועי
```

Everything below is `<h2>`/`<h3>` with no skipped levels. `lib/enrich/render.mjs` owns that hierarchy
— if a new block type needs a heading, give it the level its position implies.

---

## 5. Description formula

150–160 characters, unique per route. Present on 101 of 105 pages today.

```
<שירות> ב<מקום/מותג> <בידול אמיתי>. <מה קורה בפועל>. חייגו 076-599-1266.
```

Rules:

- Unique per page — currently **zero duplicates**, which is the standard to hold.
- Include the phone in display format.
- Claim only what `docs/business-facts.md` confirms. The homepage description currently states
  "מעל 25 שנות ניסיון" (⛔) — it is written in `scripts/enrich.mjs:HOME_SEO` and needs the same fix
  as the `/אודותינו/` title.
- **Missing on 4 real pages:** the four `/step/` routes, which are funnel fragments and may
  legitimately stay bare. `/services/שכפול-מפתח-לרכב/` was a fifth and may not stay bare; it now has
  one (measured in `content/site.json`, 2026-10-14).

---

## 6. Hebrew grammar per location

The `ב` preposition is written into the authored copy per page, not interpolated from a template —
which is why the location pages read correctly today. **Keep it that way.** If a future refactor
introduces a shared template, it must carry an explicit prefixed form per location rather than
`ב${city}`:

| City / region | Bare `ב${name}` | Correct                                                                                                                                                 |
| ------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| תל אביב       | בתל אביב        | ✅ fine                                                                                                                                                 |
| חיפה          | בחיפה           | ✅ fine                                                                                                                                                 |
| **קריות**     | בקריות          | ❌ → **בקריות** as a region reads wrong in a sentence like "מנעולן בקריות" only marginally, but schema must type it as `AdministrativeArea`, not `City` |

`קריות` is the one entry that is a region rather than a city. It drives the schema `areaServed` type —
see `docs/schema-graph.md` §5.

---

## 7. The expansion cap

53 services × 24 locations = 1,272 possible cells. **Do not build them.**

Order of operations:

1. **Author `content/enriched/95.mjs`** so the Tier-1 `שכפול מפתח לרכב` page stops being the weakest
   page on the site.
2. Fix the two malformed JSON-LD blocks and the `tel:[phone]` placeholder (backlog §4.1, §8.1).
3. Bring the remaining 10 un-enriched pages (`/contact/`, `/services/`, `/sitemap/`, the legal pages,
   the four `/step/` routes) to whatever bar their type warrants.
4. Build Tier 4 — the `/מדריכים/` guides. Topical authority is the real gap, not more silo cells.
5. **Only then** consider service × location cells, and only for services with genuine local demand.

**Do not add an 18th location or a 31st service before step 1.** The existing pages are good; the
gaps are in the pages that were skipped, not in the ones that don't exist yet.

> 2026-10-14: the numbers in that sentence are stale — it was written at 17 locations and 30
> services; the site now has 24 location pages and 53 `/services/` pages, and `95.mjs` exists. The
> intent (depth before breadth) stands, as does the matching cap in CLAUDE.md §13.

---

## 8. Never rename a live slug

Every path in `content/site.json` is a live WordPress permalink carrying real ranking signal. This
includes the ones that look like mistakes:

- `שכפול-מפתח-חולון` vs `שכפול-מפתחות-חולון` — both live.
- The `/קודן-לרכב/` ↔ `/services/קודן-לרכב/` duplicates — both live.

Renaming or merging any of them **without a `public/_redirects` 301 discards the signal that URL
holds.** That is a deliberate project with a redirect map, not a cleanup task.

✅ RESOLVED 2026-10-14: `/שכפול-שלט-לרכב-2/`, the נתניה pair and the `/מנעולן-רכב/` ↔
`/services/מנעולן-רכב/` duplicates were listed here until the merge in §8.1. They followed this
rule: the merge carries its 301 plan (§8.1), whose lowercase half is 🔶 pending the owner's zone
rule.

### 8.1 The 2026-10-14 merge — four pairs, one page each

Owner instruction 2026-10-14: each pair below becomes one page — keep the SEO-strongest, 301 the
other to it, and point every link and navigation surface at the survivor.

| Pair           | Kept (survivor)                               | Removed → 301 to survivor                  | Why the survivor won                                                                         |
| -------------- | --------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| מנעולן רכב     | `/מנעולן-רכב/` (id 77, core lander)           | `/services/מנעולן-רכב/` (id 93)            | shorter exact-match URL; 439 vs 145 inbound internal links; the original lander              |
| מנעולן לבית    | `/מנעולן-לבית/` (id 78, core lander)          | `/services/מנעולן-לבית/` (id 94)           | same reasons; 319 vs 143 inbound links                                                       |
| שכפול שלט לרכב | `/services/שכפול-שלט-לרכב/` (id 115, service) | `/שכפול-שלט-לרכב-2/` (id 113)              | the `-2` is WordPress's duplicate-slug artefact; 244 vs 109 inbound links                    |
| נתניה          | `/locations/שכפול-מפתח-בנתניה/` (id 140)      | `/locations/שכפול-מפתחות-בנתניה/` (id 149) | singular `שכפול-מפתח-` prefix, as on 20 of the other 23 city slugs; 268 vs 224 inbound links |

> ⚠️ **Which half Google indexed is not known.** The last recorded Search Console URL Inspection
> sweep (2026-09-02) found neither member of any pair indexed, and the repo holds no newer per-URL
> indexing data. The survivors were chosen on URL shape and internal-link weight, not on Google's
> preference. 🔶 The owner should re-check both halves of each pair in GSC before deploy.

**How it ships:**

- `scripts/pages.mjs` `PRUNE_PATHS` lists the four removed paths (lowercase percent-encoded), so they
  stop shipping. `content/enriched/93.mjs`, `94.mjs`, `113.mjs` and `149.mjs` are deleted.
- 22 authored modules had their links to a removed page repointed at the survivor — dropped instead
  where that would self-link (77, 78) or duplicate an entry already in the list (105, 148, 158).
- `scripts/footer.mjs` was changed for the merge: a core lander that is a service page to a visitor
  (`CORE_SERVICE_LANDERS`) heads the services column once its `/services/` twin is gone, so
  `/מנעולן-רכב/` and `/מנעולן-לבית/` top it; the bottom bar drops any entry whose page is gone or
  that the services column already links. The bottom bar still carries `/קודן-לרכב/` and the חולון
  twin.
- The header city mega-menu and the homepage areas band are pruned by
  `scripts/prune-chrome-links.mjs`, which is route-driven.
- `public/_redirects`: 16 fallback lines — 4 per removed URL (slash / no-slash × lowercase /
  uppercase hex) — each 301 to the survivor.

> 🔶 **Pending owner — the lowercase 301 is not live.** The Cloudflare Pages defect
> (`docs/business-facts.md` §E.1.1) uppercase-normalises rule sources, and this site publishes
> lowercase `%d7` — so the `_redirects` lines catch **only UPPERCASE** traffic. The lowercase form,
> the one the sitemap, canonicals and every href carried, needs a **zone-level Cloudflare Redirect
> Rule** on `lower(http.request.uri.path)`; the expression is written out in the merged-twins
> section of `public/_redirects`. Adding it is the owner's action and it has not been done. Never
> record it as done until the curl in that file's VERIFYING section passes, lowercase and uppercase.

**Not merged — still live twins.** `/קודן-לרכב/` (189) ↔ `/services/קודן-לרכב/` (97), and
`/locations/שכפול-מפתח-חולון/` ↔ `/locations/שכפול-מפתחות-חולון/`, were out of scope on 2026-10-14.
Both halves of each stay live, under the rule at the top of this section.
