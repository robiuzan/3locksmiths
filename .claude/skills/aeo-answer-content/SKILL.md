---
name: aeo-answer-content
description: Answer-engine and LLM-citability layer for 3locksmiths — the Cloudflare managed robots.txt blocking every major AI crawler at the edge, the two unparseable JSON-LD blocks that break the machine-readable layer, question-form headings with a 40–60 word extractable answer first, the specs tables that are already the site's best citable asset, llms.txt, and freshness/authorship. Use when optimizing a page to be quoted by AI Overviews, ChatGPT or Perplexity. Triggers "AEO", "GEO", "AI Overviews", "llms.txt", "will an LLM cite this", "answer block", "AI crawlers".
---

# Answer-engine optimization

The question is not "does this rank" but **"can an assistant reach this page, parse it, and prefer to
quote it?"** Three gates, in that order.

## Gate 1 — reachability. Check this first.

`app/robots.ts` is **not what serves.** Cloudflare prepends a managed block at the edge. Verified live
2026-08-16:

```
User-agent: *
Content-Signal: search=yes, ai-train=no, use=reference
Allow: /

Disallow: /   for  Amazonbot · Applebot-Extended · Bytespider · CCBot · ClaudeBot ·
                   CloudflareBrowserRenderingCrawler · Google-Extended · GPTBot · meta-externalagent
```

**No repo change overrides this.** Every recommendation below is capped until the zone setting
changes (Cloudflare dashboard → the zone → AI Crawl Control / managed robots.txt). It is the owner's
call and the owner's action — document it, never assume it was done, and always verify against the
live file:

```bash
curl -sS https://3locksmiths.co.il/robots.txt
```

Understand the three permissions separately, because they have different consequences:

- **`ai-train`** — may the content train a model.
- **Retrieval bots** (OAI-SearchBot, PerplexityBot, ClaudeBot) — may an assistant fetch the page to
  answer a live question. **This is the one that produces citations.**
- **`use=reference`** — may the content be referenced with attribution.

Blocking training while allowing retrieval is a coherent position. Blocking everything, which is the
current state, means the site cannot be cited at all.

## Gate 2 — parseability. Currently failing.

Two pages ship an `application/ld+json` block that does not parse — the homepage's scraped `FAQPage`
and one on `/services/שכפול-מפתח-לרכב/`. **The homepage FAQ is the cleanest machine-readable answer
set on the site, and an assistant cannot read it.**

This is worth more than any prose tuning below. Fix: `/schema-structured-data`, Fix 1.

## Gate 3 — extractability

An answer engine lifts a **contiguous, self-contained span**. Structure for that.

**The answer block** — every service, location and guide page should open with one, in
`intro.paragraphs[0]`:

- Under an intent-matching or question-form heading (`intro.heading`).
- **40–60 words.** Shorter reads thin; longer stops being liftable.
- **Complete in the first sentence.** No "יש כמה גורמים" preamble.
- Self-contained — no pronoun points outside the block, because that is how it gets quoted.
- Carries the concrete number, range or duration where one exists.

```
## כמה זמן לוקח לשכפל מפתח רכב?
שכפול וקידוד מפתח רכב אורכים 20–45 דקות ומתבצעים בשטח, ליד הרכב, בלי גרירה למוסך.
מפתח סטנדרטי מוכן תוך כ-20 דקות; מפתח חכם עם קידוד שבב לוקח עד 45 דקות, בהתאם לדגם.
```

**None of the 53 authored pages does this today.** The first paragraph is usually close but scene-sets
before answering. Tightening it across the modules is the cheapest high-yield AEO pass available
(backlog §6.2).

**Rendering rules:** the answer must be in the HTML at first paint. **Both currently hold and must be
preserved:**

- The gogo FAQ accordion hides answers with **CSS**, not conditional rendering — so they ship in the
  DOM.
- `specsTable` blocks render as real `<table>` markup, not a client-side widget.

## Gate 4 — worth citing

An assistant picks the source that answers most precisely. **This site is unusually strong here**, and
that should shape where you spend effort.

**The asset:** `specsTable` blocks — key type × system × complexity × duration × price band. That is
exactly the shape an assistant prefers to quote, and most locksmith competitors publish nothing like
it. Audit coverage: which of the 30 service pages and 17 location pages carry one, and which Tier-2
brand-key pages are missing it.

**What's still absent** (backlog §6.7):

- A cost breakdown by scenario, not just a range table.
- מפתח עם שבב מול מפתח חכם — how to tell, what each costs, why it matters.
- What to do when the **only** key is lost — the highest-intent question in the trade.
- Which key types can be duplicated on the spot and which need the vehicle present.
- Realistic timing per situation, stated honestly.

These are the Tier-4 targets in `docs/keyword-map.md` §2 and the natural spine of a `/מדריכים/` hub.
One genuinely useful comparison table earns more citations than ten reassuring pages.

## Freshness and authorship

Assistants discount undated, unattributed content. The site has **no** `datePublished`, `dateModified`
or author anywhere. Add all three to guides (see `/new-article`), with a real named person — blocked
on `docs/business-facts.md` §A. **Never invent an author**; a fabricated byline is a worse trust
signal than an absent one.

## Entity consistency

An assistant resolves "שלושה מנעולנים" by cross-referencing sources. With `sameAs` empty there are no
other sources. Worse, the one machine-readable contact detail is **wrong**: the business node
publishes `robiuzan@gmail.com` rather than the manifest's address. Fix that before worrying about
prose (`/schema-structured-data`, Fix 2). See also `/local-seo-il` §3.

## llms.txt

A plain-language map at `public/llms.txt` — who the business is, what it does, the service and city
lists, canonical URLs for the key answers, and contact. Keep it short and factual; it is a pointer
file, not a second website. **Only useful once Gate 1 is open.**

## Checklist

- [ ] Live `robots.txt` fetched and the AI-crawler stance recorded (not assumed).
- [ ] Every `ld+json` block in `out/` parses.
- [ ] The business node's contact details are correct and manifest-driven.
- [ ] Every service, location and guide page opens with a 40–60 word answer block.
- [ ] Answers ship in the HTML at first paint; the accordion still hides with CSS only.
- [ ] Each answer is comprehensible with zero surrounding context.
- [ ] Every brand-key page carries a `specsTable`.
- [ ] Guides carry `datePublished`, `dateModified` and a real named author.
- [ ] `public/llms.txt` published and accurate.

## Gotchas

- Never fabricate dates, authors or data to look authoritative.
- Never mark up an answer in `FAQPage` that isn't rendered on the page.
- A blocked crawler makes perfect on-page AEO worth nothing. **Gate 1 first, always** — and Gate 2
  before any prose work.
