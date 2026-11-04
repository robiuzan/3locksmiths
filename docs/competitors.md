# Competitive set

Who this site competes with, where they are beatable, and — critically — what **cannot** be inferred
without live SERP data.

Owned by the `competitor-analyst` agent.

> ⚠️ **This file starts mostly empty on purpose.** Nothing below is a measured SERP result. Naming a
> competitor or claiming a ranking without checking the live SERP is exactly the kind of fabrication
> `docs/business-facts.md` exists to prevent. Populate it from real observation, then date every row.

---

## 1. The competitive shape of Israeli locksmith search

Structural facts about the market, not claims about specific competitors:

- **The map pack dominates.** For `מנעולן <city>` and `מנעולן קרוב אליי`, the local pack sits above
  the organic results. Winning it is a Google Business Profile game, not an on-page one. A profile
  exists as of 2026-09-05 (`docs/business-facts.md` §B.4); reviews on it are now the critical path,
  and neither is a content task.
- **Lead aggregators occupy the head terms.** Directory and lead-gen sites typically outrank
  individual tradespeople for bare `מנעולן`. Competing head-on there is expensive; the winnable
  ground is specificity — brand-key, model-level and emergency long-tail.
- **Most individual locksmith sites are thin.** A handful of pages, no pricing, no structured data.
  **This site is already far deeper than the category norm** (median ~1,500 words, `specsTable`
  blocks, full schema) — its problem is trust signals and coverage, not depth.
- **Review count is the visible differentiator.** In the pack, the business with 200 reviews beats
  the one with 12 almost regardless of on-page quality.

---

## 2. Where this site is genuinely ahead

Confirmed by inspection of our own export, not by comparison:

| Asset               | Detail                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Content depth       | median ~1,500 words/page; location pages pass the doorway test                                                       |
| `specsTable` blocks | key type × system × complexity × duration × price — rare in trade                                                    |
| Structured data     | `Service` + `HowTo` + `FAQPage` + `BreadcrumbList` on all 98 authored pages, every block parsing (2026-11-03)        |
| Transparent pricing | published ranges — but the same key type sits on different rows across pages (fixed by the 2026-11-04 plan, Phase 3) |
| Brand-key silo      | 32 make-specific pages, each with a key-model grid and a specs table                                                 |

**These are the moat.** Competitive strategy should widen them, not chase whatever a competitor does.

---

## 3. Where this site is behind

Rewritten 2026-11-03. The previous version listed "unaudited GBP", "zero reviews", "no emergency
coverage", "no editorial content" and "AI crawlers blocked" — all five had been fixed or had changed
by then (GBP audited 2026-09-05, 13 reviews on the owner's dashboard 2026-10-13, emergency cluster
and 12 guides shipped, the Cloudflare AI block gone from the live `robots.txt`).

| Gap (observed 2026-11-03)                           | Consequence                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| 30 of 32 brand pages and page 95 never crawled      | they cannot rank or be cited; see `docs/geo-observations.md` §1.3  |
| Brand pages linked from 7–10 pages each             | no crawl path; competitors link every brand from every family page |
| Cost answered ~230 words in, not first              | both benchmarks put the price in the title, H1 or first block      |
| No "what to check before choosing" block            | both benchmarks carry buyer checks; we had them on 10 of 62 pages  |
| Same key type priced on different rows across pages | a quoted price can contradict another page of ours                 |

---

## 4. The competitor register — TO BE POPULATED

Fill one row per genuine competitor, from live observation. **Date every entry.**

| Competitor | Domain          | Where they beat us                                                                                                                                                                                                                                                                                                                                                                               | Where they're weak                                                                                                                                                                                                                                                                                                                                    | Observed                                                                                                                   |
| ---------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| מפתח עכשיו | carkeynow.co.il | Brand page (Peugeot) puts cost in the title ("כמה זה עולה") and H1 ("מחירון בפנים"); price table ~150 words in, per key type and model group, with scope lines (arrival + coding included, VAT excluded, "משוערים"); dealer-vs-us table; time-per-key-type table; "when to duplicate" list; 11-item TOC; 27-brand + 10-city + 6-service link blocks on every brand page; named technician byline | Claims we may not make: "10+ שנות ניסיון", "100% אחריות בכתב", "20 דק׳ זמן הגעה ממוצע", "פריסה ארצית", "אחריות 30 יום". Its Peugeot chip/smart ranges differ between two tables on the same page; "20 minutes" header vs "שעה-שעתיים" body; brand block omits 7 of its own brands; one blog post, which 404s                                          | 2026-11-03, WebFetch of `/`, `/שכפול-מפתח-לפיגו/`, `/בלוג/` — structure only, no ranking or traffic measured               |
| קי פור מי  | keyforme.co.il  | Parent page opens with "כמה עולה לשכפל…", a 19-make price table with a price-driver column, VAT note and a dated "last checked" stamp; 28-tile make grid mid-parent; identical "לפי עיר" (74) and "לפי יצרן" (36) hubs on every sub-page; parent bold-first in the header dropdown; 6-step process table; 15-item FAQ with buyer checks; author byline                                           | Location pages largely templated (Holon copies 13 of 15 parent FAQ answers); 13 of 19 make prices differ between parent and Holon; Peugeot priced three ways on one page; warranty "שנה" vs "חצי שנה"; makes inside the city list, duplicate city spellings; the two URLs the brief cited (`/שכפול-מפתח-לוקיישן/`, `/שכפול-מפתח-לפואינט/`) return 404 | 2026-11-03, WebFetch of `/`, `/שכפול-מפתחות-לרכב/`, `/שכפול-מפתח-לרכב-בחולון/`, `/שכפול-מפתח-לרכב-לפיגו/` — structure only |

Neither competitor's AI citations or traffic were measured. The monthly probe in
`docs/geo-observations.md` §1.5 records who is cited, for us and for both of them.

### How to populate it honestly

1. Search the target query in a **clean context** — logged out, and with a location that matches the
   query's intent. Personalisation and your own location will otherwise distort every result.
2. Record what actually appears: pack vs organic, who, and in what position.
3. For each competitor that recurs, open the ranking page and note **what it has that we don't** —
   review count, page depth, schema, a pricing table, a named human, photos of real work.
4. Record the **date and the query**. A SERP observation without both is not evidence.
5. Never record an estimated traffic or difficulty number as fact unless it came from a tool you
   actually ran — attribute the tool and the date.

### What not to do

- Do not copy a competitor's copy, structure or claims.
- Do not infer a competitor's rankings from their marketing pages.
- Do not conclude "we can't win X" from a single observation — SERPs vary by location and day.
- Do not target a term because a competitor ranks for it if we cannot serve it truthfully
  (`docs/keyword-universe.md` §7).

---

## 5. Query watchlist

Track position over time for a small, stable set rather than a sprawling list. Suggested starting
watchlist, spanning every tier:

| Tier | Query                      | Why watch it                          |
| ---- | -------------------------- | ------------------------------------- |
| A    | `מנעולן רכב`               | head term, brand visibility           |
| B1   | `שכפול מפתח לרכב`          | the Tier-1 money page (id 95)         |
| C    | `שכפול מפתח מאזדה`         | representative brand-key page         |
| D    | `שכפול מפתח בתל אביב`      | representative location page          |
| E    | `פתיחת רכב נעול`           | the gap — baseline before we build it |
| F    | `כמה עולה שכפול מפתח לרכב` | the gap — guides baseline             |
| G    | `מחירון מנעולן`            | commercial modifier                   |

Baseline these **after** the measurement work in `docs/growth-roadmap.md` Phase 1 is reading data,
so movement can be attributed rather than guessed.

---

## 6. Cadence

- **Monthly:** re-observe the watchlist; update positions and any competitor change.
- **Quarterly:** re-run the full gap analysis; feed findings into `docs/keyword-universe.md`.
- **On any ranking drop:** check whether it is us (a change we shipped) or them (a competitor move)
  before acting. Most drops are neither — they are normal SERP variance.
