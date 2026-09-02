# Keyword map

The intent model behind the 64 routes, and the title / H1 / description formulas every page follows.
Cited by `hebrew-copywriter`, `seo-auditor`, `local-seo-strategist`, `aeo-geo-strategist`,
`/seo-metadata`, `/new-service` and `/new-city`.

---

## 1. The silo structure

The live URL scheme is inherited from WordPress and is **load-bearing** — it holds every ranking
signal this site has. It is not tidy, and it does not get tidied.

| Silo                     | Path shape                                                                                                      | Count | Intent                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------- |
| Homepage                 | `/`                                                                                                             | 1     | brand + head term                   |
| Service silo             | `/services/<he-slug>/`                                                                                          | 30    | commercial, per service             |
| Service hub              | `/services/`                                                                                                    | 1     | navigational                        |
| Location silo            | `/locations/<he-slug>/`                                                                                         | 17    | commercial, service × city          |
| Top-level Hebrew landers | `/מנעולן-רכב/`, `/מנעולן-לבית/`, `/מחירון/`, `/אודותינו/`, `/אזורי-שירות/`, `/קודן-לרכב/`, `/שכפול-שלט-לרכב-2/` | 7     | head terms + trust                  |
| Calculator steps         | `/step/<he-slug>/`                                                                                              | 4     | funnel fragments, not landing pages |
| Legal / utility          | `/contact/`, `/privacy-policy/`, `/accessibility-statement/`, `/sitemap/`                                       | 4     | trust + utility                     |

**108 pages total. 104 in `sitemap.xml`** (the four `/step/` routes are excluded by `app/sitemap.ts`).

Three quirks that are deliberate:

- **Duplicate intent across silos.** `/מנעולן-רכב/` and `/services/מנעולן-רכב/` both exist, as do
  `/מנעולן-לבית/` / `/services/מנעולן-לבית/` and `/קודן-לרכב/` / `/services/קודן-לרכב/`. Both URLs
  are live on the source site. Each carries its own canonical and its own authored module. **Do not
  consolidate them without a `_redirects` 301 plan** — see §7.
- **`/שכפול-שלט-לרכב-2/`** carries WordPress's duplicate-slug `-2` suffix. It is the live URL.
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

### Tier 2 — brand-key terms (the site's real moat)

24 of the 30 service pages target `שכפול מפתח ל<brand>`: מאזדה, טויוטה, יונדאי, קיה, פורד, סקודה,
שברולט, סוזוקי, רנו, סיטרואן, פיגו, מיצובישי, סובארו, מרצדס, הונדה, אופל, במוו, פולקסווגן, plus
`שכפול שלט לרכב`, `שחזור מפתח לרכב`, `קודן לרכב`.

Lower volume each, but **high intent, low competition, and highly answerable** — a driver searching
"שכפול מפתח מאזדה" wants a specific answer about their car. This is where the `specsTable` block
earns its keep and where AEO citations are most winnable.

Also Tier 2 on the door side: `דלת פלדלת`, `דלת ממד`, `מנעול רב בריח`, `מולטילוק`.

### Tier 3 — local terms

`שכפול מפתח ב<city>` across 25 cities: תל אביב, חיפה, ראשון לציון, פתח תקווה, נתניה (×2 slugs),
חולון (×2 slugs), רמת גן, גבעתיים, בת ים, כפר סבא, רעננה, חדרה, קריות, אשדוד, הרצליה, רחובות,
בני ברק, מודיעין, רמת השרון, הוד השרון, לוד, נס ציונה, ראש העין.

> ירושלים, באר שבע, אשקלון, בית שמש, כרמיאל, עכו and עפולה were **withdrawn 2026-09-02** — the
> business no longer services them (`docs/business-facts.md` §E.1). All seven 301 to
> `/אזורי-שירות/` via `public/_redirects`. Do not re-add them as keyword targets.

> Note the duplicate-city slugs: `שכפול-מפתח-בנתניה` **and** `שכפול-מפתחות-בנתניה`;
> `שכפול-מפתח-חולון` **and** `שכפול-מפתחות-חולון`. Both of each pair are live. Treat as §7 — do not
> merge without a 301 plan.
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

Exactly one `<h1>` per page — **currently true on all 66 emitted pages; protect it.**

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

150–160 characters, unique per route. Present on 104 of 108 pages today.

```
<שירות> ב<מקום/מותג> <בידול אמיתי>. <מה קורה בפועל>. חייגו 055-6601006.
```

Rules:

- Unique per page — currently **zero duplicates**, which is the standard to hold.
- Include the phone in display format.
- Claim only what `docs/business-facts.md` confirms. The homepage description currently states
  "מעל 25 שנות ניסיון" (⛔) — it is written in `scripts/enrich.mjs:HOME_SEO` and needs the same fix
  as the `/אודותינו/` title.
- **Missing on 5 real pages:** `/services/שכפול-מפתח-לרכב/` and the four `/step/` routes. The `/step/`
  pages are funnel fragments and may legitimately stay bare; the service page may not.

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

30 services × 17 locations = 510 possible cells. **Do not build them.**

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

---

## 8. Never rename a live slug

Every path in `content/site.json` is a live WordPress permalink carrying real ranking signal. This
includes the ones that look like mistakes:

- `/שכפול-שלט-לרכב-2/` — the `-2` is WordPress's duplicate-slug suffix.
- `שכפול-מפתח-בנתניה` vs `שכפול-מפתחות-בנתניה`, and the same pair for חולון.
- The `/מנעולן-רכב/` ↔ `/services/מנעולן-רכב/` duplicates.

Renaming or merging any of them **without a `public/_redirects` 301 discards the signal that URL
holds.** That is a deliberate project with a redirect map, not a cleanup task.
