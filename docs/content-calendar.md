# Content calendar

What gets published, in what order, and what each piece is blocked on. Owned by the
`content-strategist` agent; written by `hebrew-copywriter`; shipped via `/new-service`, `/new-city`
and `/guides-hub`.

**Sequencing rationale:** every batch below either closes a coverage gap that costs leads today, or
unlocks the batch after it. Depth on existing pages outranks new pages on this site
(`docs/keyword-universe.md` §7).

---

## Status key

✅ shipped · 🔨 in progress · ⬜ queued · 🔶 blocked on a business fact · 🚧 blocked on a code change

---

## Batch 0 — done

| Page                         | Type    | Status | Note                                       |
| ---------------------------- | ------- | ------ | ------------------------------------------ |
| `/services/שכפול-מפתח-לרכב/` | service | ✅     | 763 → 1,702 words, full schema, 2026-08-24 |
| `/אודותינו/`                 | core    | ✅     | unverified claims removed, 2026-08-17      |

---

## Batch 1 — the emergency cluster — ✅ DEPLOYED 2026-08-25

> **The 🚧 blocker recorded below was wrong.** `scripts/pages.mjs` creates routes; the three
> emergency routes now exist (ids 9301–9303). Scope was cut from five pages to **three** on purpose:
> "נעלתי מפתחות ברכב" is the same intent as "פתיחת רכב נעול", and "ננעלתי מחוץ לבית" the same as
> "פתיחת דלת נעולה" — a page each would be a doorway cluster. Those phrasings live inside the
> relevant page instead.
>
> **`מנעולן חירום` is deliberately NOT built.** It is a pure availability claim, and hours are
> 🔶 unconfirmed while the schema says 08:00–18:00. Build it when the owner confirms real hours.

| Page             | Route                         | Status |
| ---------------- | ----------------------------- | ------ |
| פתיחת רכב נעול   | `/services/פתיחת-רכב-נעול/`   | 🔨     |
| פתיחת דלת נעולה  | `/services/פתיחת-דלת-נעולה/`  | 🔨     |
| מפתח נשבר במנעול | `/services/מפתח-נשבר-במנעול/` | 🔨     |

### Original entry (kept for history)

#### Batch 1 — the emergency cluster

The biggest coverage gap and the highest-intent demand in the trade
(`docs/keyword-universe.md` Tier E). **Every page here is 🚧 blocked on the same code change:** the
enrichment pipeline can only enrich routes that already exist in `content/site.json`, so genuinely
new URLs need a route-creation step first (`/new-service` "Gotchas", `/guides-hub` for the pattern).

| Page              | Primary query       | Status | Blocked on          |
| ----------------- | ------------------- | ------ | ------------------- |
| פתיחת רכב נעול    | `פתיחת רכב נעול`    | 🚧     | new-route mechanism |
| נעילת מפתחות ברכב | `נעלתי מפתחות ברכב` | 🚧     | new-route mechanism |
| פתיחת דלת נעולה   | `פתיחת דלת נעולה`   | 🚧     | new-route mechanism |
| מפתח נשבר במנעול  | `מפתח נשבר במנעול`  | 🚧     | new-route mechanism |
| מנעולן חירום      | `מנעולן דחוף`       | 🚧 🔶  | + real hours (§D.3) |

> ⚠️ **Availability honesty gates this whole batch.** Emergency copy that implies 24/7 while the
> schema says 08:00–18:00 is a claim the business may not be able to honour, and an emergency lead
> that goes unanswered is worse than no lead. Confirm real hours before publishing any of it.
>
> ⚠️ **`ילד ננעל ברכב` is deliberately not in this table.** If it is ever built it must lead with
> "call 100/101 now", not with a service pitch (`docs/keyword-universe.md` Tier E).

---

## Batch 2 — the guides hub — ✅ FIRST THREE SHIPPED 2026-08-25

> Hub `/מדריכים/` + guides 1–3 are live in the working tree. Guides 4–6 remain ⬜.
> The 🚧 blocker recorded here was wrong: `scripts/pages.mjs` creates routes, and the guides use
> exactly that. Batches 1, 4 and 6 are therefore **unblocked too**.

Zero editorial content exists. This is the whole topical-authority and AEO gap, and it feeds every
other batch by giving services and locations something authoritative to link to.

**Route work first** (🚧 `/guides-hub`), then in this order:

| #   | Guide                                  | Feeds                       | Status |
| --- | -------------------------------------- | --------------------------- | ------ |
| 1   | כמה עולה שכפול מפתח לרכב               | `/מחירון/`, id 95           | ⬜ 🔶  |
| 2   | אבד לי המפתח היחיד לרכב — מה עושים     | שחזור מפתח, emergency batch | ⬜     |
| 3   | מה ההבדל בין מפתח עם שבב למפתח חכם     | all 18 brand-key pages      | ⬜     |
| 4   | אפשר לשכפל מפתח רכב בלי המקור          | id 95, שחזור                | ⬜     |
| 5   | מתי צריך להחליף צילינדר ומתי מנעול שלם | החלפת מנעולים               | ⬜     |
| 6   | מה עושים כשמפתח נשבר בתוך המנעול       | emergency batch             | ⬜     |

Guide #1 is 🔶: a genuine cost breakdown states prices, and every price on this site is
owner-unsourced (`docs/business-facts.md` §D.1). It can be written around the **existing published
ranges** without inventing new numbers — but it is the one guide where a fact check matters most.

**Each guide needs** (`/guides-hub`): the question as `<h1>`, a 40–60 word answer block first, a
table worth screenshotting, 3–5 FAQs, `Article` + `BreadcrumbList` + `FAQPage`, real dates, and 2–3
links into services. **Author is 🔶** — blocked on a named human (`docs/business-facts.md` §A).
Publish with no `author` rather than a fabricated one.

---

## Batch 3 — brand-key depth (no new URLs)

The highest-leverage content work that creates **zero** new pages: adding model-and-year specificity
to the 18 existing brand pages captures hundreds of long-tail queries on pages that already rank
(`docs/keyword-universe.md` §C.1).

Per page, add: which generations use which transponder system · whether the vehicle must be present ·
price band per key type for that make · what specifically fails on that make.

| Wave | Brands                                         | Status |
| ---- | ---------------------------------------------- | ------ |
| 3a   | מאזדה · טויוטה · יונדאי · קיה (largest fleets) | ⬜     |
| 3b   | פורד · שברולט · סקודה · פולקסווגן · רנו        | ⬜     |
| 3c   | the remaining 9                                | ⬜     |

🔶 Every technical claim here (chip systems, whether a key can be cut without the original per make)
must be confirmed by the technician. **Do not infer transponder systems from the internet** — a wrong
spec on a service page is a customer who books a job that can't be done.

---

## Batch 4 — B2B / segment pages

Uncontested (`docs/keyword-universe.md` Tier H). Different copy register: SLA, invoicing, multiple
sites, key management — not "we'll be there fast".

| Page                     | Status | Note                   |
| ------------------------ | ------ | ---------------------- |
| מנעולן לוועד בית         | ⬜ 🚧  |                        |
| מנעולן לחברת ניהול נכסים | ⬜ 🚧  |                        |
| מנעולן לצי רכב           | ⬜ 🚧  | highest value per lead |
| מנעולן לעסקים            | ⬜ 🚧  |                        |

---

## Batch 5 — hub pages and thin-page retrofits

| Page            | Words today | Target                                  | Status |
| --------------- | ----------- | --------------------------------------- | ------ |
| `/services/`    | 371         | 350+ with real prose + contextual links | ⬜     |
| `/אזורי-שירות/` | —           | intro prose linking into all 17 cities  | ⬜     |
| `/contact/`     | 411         | + map, hours, NAP from manifest         | ⬜ 🔶  |
| `/מחירון/`      | —           | the magnet for every "כמה עולה" query   | ⬜ 🔶  |

---

## Batch 6 — new service verticals (each gated on capability)

**Do not publish any of these until the owner confirms the business performs the service.** A page
for work you don't do produces leads you must turn away.

`פתיחת כספת` 🔶 · `מנעולים חכמים` 🔶 · `אינטרקום ומנעול חשמלי` 🔶 · `מנעול לאופנוע` 🔶 ·
`תיקון שלט לרכב` 🔶 · `החלפת סוללה למפתח` 🔶

---

## Batch 7 — geographic expansion

**Only after Batches 1–3.** Then: new cities (central first), then emergency × city for the top 5,
then sub-city neighbourhoods where three or more genuinely local facts exist
(`docs/keyword-universe.md` Tier D, `/new-city`).

---

## The standing rules

- **Nothing ships below `docs/content-standards.md`.** 900-word floor for service and location pages,
  the doorway test, a 40–60 word answer block, gated claims absent.
- **Depth before breadth.** Batch 3 creates no URLs and is worth more than Batch 7.
- **A 🔶 is a question for the owner, not a blocker on the whole batch** — write around it, mark it,
  and record it in `docs/business-facts.md`.
- **A 🚧 is real.** The pipeline enriches existing routes; it cannot invent URLs. Batches 1, 4 and 6
  all need that mechanism built once, and then they unblock together.
- Re-run `npm run enrich` after every module, and verify the page in `out/` before calling it done.
