---
name: keyword-research
description: The method for finding and ranking what 3locksmiths should target next — mapping the tiered keyword universe against the 64 live routes, judging intent over volume, the depth-before-breadth rule that makes an existing brand page worth more than a new one, the anti-doorway expansion cap, and the honesty rules about numbers you did not measure. Use when asked what to rank for, or before adding any page. Triggers "keyword research", "what should we rank for", "keyword gaps", "more traffic", "expand coverage".
---

# Keyword research

The full demand map is `docs/keyword-universe.md`. This skill is **how to work with it** — how to
find a gap, judge it, and decide whether it becomes a page.

## The three rules that override everything

1. **Intent beats volume.** `נעלתי מפתחות ברכב` converts far better than a high-volume
   informational query. On a locksmith site, urgency _is_ the qualifier.
2. **Depth beats breadth.** The 18 brand-key pages already rank. Adding model-and-year specificity to
   one captures dozens of long-tail queries with **zero new URLs**. That beats a new page almost
   every time on this site.
3. **Truth gates targeting.** A keyword the business cannot serve — a service it doesn't perform, a
   city it doesn't reach, an availability it can't honour — is not a target at any volume.

## Step 1 — know what exists

Never guess the route set.

```bash
node -e '
const m=require("./content/enriched/_manifest.json");
const k={};for(const v of Object.values(m.lookup)){}
console.log("authored pages:", m.count);'
grep -o '"kind": "[a-z-]*"' content/enriched/*.mjs | sed 's/.*: //' | sort | uniq -c
```

64 routes: 30 services (18 brand-key), 25 locations, 7 top-level Hebrew landers, 4 calculator steps,
4 legal/utility, 1 service hub, 1 homepage. 54 have authored modules.

## Step 2 — map demand to routes

Walk the tiers in `docs/keyword-universe.md` and mark each **covered / partial / absent**, naming the
route that covers it. The current verdict:

| Tier | Cluster                  | Verdict                               |
| ---- | ------------------------ | ------------------------------------- |
| A    | head / generic           | 🟡 thin on "near me" and 24/7         |
| B1   | car key services         | 🟢 strong                             |
| B2   | home & business locks    | 🟡 gaps: safes, smart locks, intercom |
| C    | brand-key                | 🟢 the moat; missing modern brands    |
| D    | location                 | 🟢 deep; geographically incomplete    |
| E    | **emergency / lockout**  | 🔴 **zero coverage**                  |
| F    | question / informational | 🔴 no editorial surface               |
| G    | commercial modifiers     | 🟡 pricing page only                  |
| H    | B2B / segment            | 🔴 uncontested                        |

## Step 3 — judge each gap

For every candidate cluster, answer all five:

1. **Intent** — what is the searcher doing at that moment? Emergency > commercial > informational.
2. **Can we serve it truthfully?** Capability, coverage, availability. Any doubt → 🔶 to
   `docs/business-facts.md`, and it does not ship until answered.
3. **Does a page already exist that could absorb it?** Usually yes. Prefer depth.
4. **Is it winnable?** Pack-dominated queries are won with a Business Profile and reviews, which the
   site does not have. Aggregator-held head terms are expensive. Long-tail specificity is winnable.
   See `competitor-analyst` — and **do not invent a difficulty score**.
5. **What does it unlock?** A guide that feeds five service pages beats a page that stands alone.

## Step 4 — apply the cap

`docs/keyword-universe.md` §7, in order. Do not skip, and **report the order, not just the list**:

1. ✅ Tier-1 head term (id 95) — done
2. Tier E emergency cluster
3. Tier F guides hub
4. Tier C depth on the 18 existing brand pages _(no new URLs)_
5. Tier H B2B
6. Tier B2 capability gaps
7. Tier C new brands (EVs first)
8. Tier D new cities → emergency × city, top 5 only
9. Tier D sub-city neighbourhoods

## The mechanics constraint you must state

**The pipeline enriches existing routes.** `scripts/enrich.mjs` fills in pages already in
`content/site.json`; it cannot invent a URL. A genuinely new page needs a route-creation step first
(see `/guides-hub` for the pattern and the Hebrew-directory bug).

**Always say which category a recommendation falls into** — "depth on an existing module" and "needs
a new route mechanism" differ by an order of magnitude in effort, and a plan that hides that is
misleading.

## Honesty about numbers

- **Never invent search volume, keyword difficulty, CPC or traffic estimates.** If you did not run a
  tool, say the ranking is judgement based on intent and market structure.
- Never present a `WebFetch` search result as a ranking position.
- "I can't determine this without a rank tracker" is a complete answer.

## Hard limits

- **Never the service × location matrix.** 30 × 17 = 510 is a doorway cluster; the penalty lands on
  the domain, not the page.
- **Never a page for a service the business may not perform.**
- **Never review or "מומלץ" terms** while the site has zero reviews.
- **Never rename or merge a live slug** without a `_redirects` 301 — including the ones that look
  like typos.
- **`ילד ננעל ברכב`** and similar: safety content first, commercial second, or not at all.

## Output

A ranked plan grouped **Now / Next / Later / Blocked**. Per cluster: the Hebrew queries, where it
lands (new route vs depth on a named page), why now, honest effort, and what blocks it. Close with
the single highest-value next action — and the one thing you would explicitly not do.
