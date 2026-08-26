---
name: competitor-gap
description: Assess whether a keyword gap is genuinely winnable for 3locksmiths — the market structure (map pack above organic, aggregators on head terms), what this site already beats the category on, the strict rules against inventing rankings or difficulty scores, and how to record a dated SERP observation that is actually evidence. Use before committing to a keyword cluster. Triggers "competitor analysis", "can we rank for this", "who ranks for", "SERP check", "is this winnable".
---

# Competitor gap analysis

One question, answered honestly: **is this gap winnable, and what would it take?**

## The rule that matters more than any technique

**Never invent competitive data.** Not a ranking, not a traffic estimate, not a difficulty score, not
a competitor name.

A fabricated competitor analysis is indistinguishable from a real one until months of work have gone
the wrong way. When you cannot observe something, say so and say what would be needed to observe it —
**that is a complete answer**, not a failure.

## What you can and cannot do here

**Can:** fetch a live competitor page and analyse it concretely (depth, schema, pricing shown, trust
signals, review count if displayed) · compare it against our export · reason from documented market
structure · read our own `out/` for a truthful picture of our side.

**Cannot:** see live SERP positions without a real search · estimate volume or difficulty without a
tool · know a competitor's traffic. **`WebFetch` against a search engine returns personalised or
blocked results — never present what it returns as a ranking.**

## Market structure — established, cite freely

- **The map pack sits above organic** for `מנעולן <city>` and `מנעולן קרוב אליי`. It is won with a
  Google Business Profile and reviews. **We have neither**, so those queries are not winnable with
  content at all — that is a Business Profile task (`docs/business-facts.md` §B).
- **Lead aggregators hold the bare head terms.** `מנעולן` head-on is expensive. Winnable ground is
  specificity: brand-key, model-level, emergency long-tail.
- **Most individual locksmith sites are thin** — a few pages, no pricing, no structured data.

## Where we already beat the category

Verify from our own export before asserting it, then say it plainly:

| Asset           | Detail                                                         |
| --------------- | -------------------------------------------------------------- |
| Depth           | median ~1,500 words; location pages pass the doorway test      |
| `specsTable`    | key type × system × complexity × duration × price — rare       |
| Structured data | `Service` + `HowTo` + `FAQPage` + `BreadcrumbList` on 54 pages |
| Pricing         | published, internally consistent sitewide                      |
| Brand-key silo  | 18 make-specific pages                                         |

**Strategy widens this moat. It does not chase a competitor's feature.**

## Where we are behind

No Business Profile · zero reviews · no emergency coverage · no editorial content · **every major AI
crawler blocked at the Cloudflare edge** (backlog §6.1).

## The winnability framework

Score each candidate on five, and **state which parts are observed and which are judgement**:

1. **Intent match** — can our page satisfy what the searcher wants right now?
2. **Existing authority** — do we already rank for anything adjacent? (Check Search Console when it
   has data; until then say so.)
3. **SERP shape** — pack-dominated? aggregator-held? If pack-dominated, content is not the lever.
4. **Serve-ability** — can the business truthfully deliver it? Capability, coverage, availability.
   Any doubt → 🔶.
5. **Effort** — depth on an existing page, or a new route? The pipeline enriches existing routes
   only; a new URL needs a route-creation step (`/guides-hub`).

**Verdict:** Winnable now · Winnable after X · Pack-dominated · Not worth it.

## Recording an observation that counts as evidence

In `docs/competitors.md`, every row needs **the query and the date**. Without both it is not evidence.

1. Search in a **clean context** — logged out, location matching the query's intent. Your own
   personalisation and location will otherwise distort everything.
2. Record what appears: pack vs organic, who, position.
3. For recurring competitors, open the ranking page and note **what it has that we don't** — reviews,
   depth, schema, pricing, a named human, real photos.
4. Never conclude from one observation. SERPs vary by location, device and day — say so.

## What not to do

- Don't copy a competitor's copy, structure or claims.
- Don't infer rankings from a competitor's marketing pages.
- Don't recommend targeting a term we can't serve truthfully, however weak the competition.
- Don't treat "a competitor ranks for it" as proof it's worth having.

## Output

A verdict per cluster with reasoning, **observed vs judgement clearly separated**, and the effort
category named. Close with what would most improve competitive position — and be prepared for that
to be "reviews and a Business Profile", because on this site it usually is.
