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

| Asset               | Detail                                                            |
| ------------------- | ----------------------------------------------------------------- |
| Content depth       | median ~1,500 words/page; location pages pass the doorway test    |
| `specsTable` blocks | key type × system × complexity × duration × price — rare in trade |
| Structured data     | `Service` + `HowTo` + `FAQPage` + `BreadcrumbList` on 54 pages    |
| Transparent pricing | published ranges, internally consistent sitewide                  |
| Brand-key silo      | 18 make-specific pages                                            |

**These are the moat.** Competitive strategy should widen them, not chase whatever a competitor does.

---

## 3. Where this site is behind

| Gap                   | Consequence                                                   |
| --------------------- | ------------------------------------------------------------- |
| Unaudited GBP         | in the pack since 2026-09-05, but its contents are unverified |
| Zero reviews          | loses the pack and loses the click even when ranked           |
| No emergency coverage | absent from the highest-intent half of the market             |
| No editorial content  | no topical-authority signal, no AEO citations                 |
| AI crawlers blocked   | cannot be cited by any assistant (backlog §6.1)               |

---

## 4. The competitor register — TO BE POPULATED

Fill one row per genuine competitor, from live observation. **Date every entry.**

| Competitor                                      | Domain | Where they beat us | Where they're weak | Observed |
| ----------------------------------------------- | ------ | ------------------ | ------------------ | -------- |
| _(empty — populate from live SERP observation)_ |        |                    |                    |          |

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
