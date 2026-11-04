---
name: aeo-answer-content
description: Answer-engine and LLM-citability layer for 3locksmiths — reachability (AI crawlers allowed since 2026-11-03; verify the live robots.txt and run the tripwire), indexing as the real gate for AI Overviews, question-form headings with a 40–60 word extractable answer first, the specs tables that are already the site's best citable asset, the generated llms.txt, and freshness/authorship. Use when optimizing a page to be quoted by AI Overviews, ChatGPT or Perplexity. Triggers "AEO", "GEO", "AI Overviews", "llms.txt", "will an LLM cite this", "answer block", "AI crawlers".
---

# Answer-engine optimization

The question is not "does this rank" but **"can an assistant reach this page, parse it, and prefer to
quote it?"** Three gates, in that order.

## Gate 1 — reachability. Check this first.

**State on 2026-11-03: open.** The live `robots.txt` is what `app/robots.ts` emits — `Allow: /` for
`*` plus an explicit allow group for OAI-SearchBot, ChatGPT-User, Claude-User, Claude-SearchBot,
PerplexityBot, Perplexity-User, GPTBot, ClaudeBot, Google-Extended, Applebot-Extended and CCBot
(`docs/geo-observations.md` §1.1).

**History, because it can come back:** from 2026-08-16 Cloudflare prepended a managed block at the
edge (`Content-Signal: … ai-train=no` and `Disallow: /` for ClaudeBot, GPTBot, Google-Extended,
CCBot and others), and no repo change could override it. That is a zone setting (AI Crawl Control /
managed robots.txt) — the owner's to change, never assumed. So verify, every time, both what the
file says and what the edge enforces:

```bash
curl -sS https://3locksmiths.co.il/robots.txt
node scripts/check-ai-crawlers.mjs     # robots.txt + a user-agent probe; networked, never in prebuild
```

**The gate that actually binds now is indexing.** Google AI Overviews draw on Google's ordinary
index (`Google-Extended` does not gate them), so a page Google has not crawled cannot be cited. On
2026-11-03, 30 of 32 brand pages and page 95 had never been crawled (`docs/geo-observations.md`
§1.3).

Understand the three permissions separately, because they have different consequences:

- **`ai-train`** — may the content train a model.
- **Retrieval bots** (OAI-SearchBot, PerplexityBot, ClaudeBot) — may an assistant fetch the page to
  answer a live question. **This is the one that produces citations.**
- **`use=reference`** — may the content be referenced with attribution.

Blocking training while allowing retrieval is a coherent position. Blocking everything — the state
from 2026-08-16 until some point before 2026-11-03 — means the site cannot be cited at all.

## Gate 2 — parseability. Passing since 2026-08.

Every JSON-LD block on the site parses: `scripts/enrich.mjs` repairs or drops unparseable scraped
blocks and fails the build on a broken authored one. The homepage `FAQPage` mirrors the accordion,
and `scripts/claims.mjs` fails the build if the two ever differ. Keep both properties.

FAQ rich results are no longer shown for most sites, and HowTo rich results ended in 2023 — the
`FAQPage` and `HowTo` markup stay as understanding signals, not as a SERP feature to chase.

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
שכפול וקידוד מפתח רכב אורכים 20–90 דקות לפי סוג המפתח, ומתבצעים בשטח, ליד הרכב, בלי גרירה.
מפתח מכני מוכן תוך 20–30 דקות; מפתח חכם עם קידוד לוקח 45–90 דקות, לפי הדגם.
```

**Measured 2026-11-03 across the 62 car-key family and cost pages:** 40 first paragraphs are within
60 words, but only 4 sit under a real question heading and only one (9201) opens with a price; the
first ₪ comes after a median 230 words on brand pages. Tightening the first paragraph is the
cheapest high-yield pass available. The 2026-11-04 plan (Phase 3) does it batch by batch, with the
shared rows in `content/enriched/_prices.mjs`.

**Enforced since 2026-11-04**, in `prebuild`: `scripts/check-answer-block.mjs` (question heading,
40–60 words, a price or duration), `scripts/check-prices.mjs` (every car-key price on its key
type's row), `scripts/check-boilerplate.mjs` (no answer copied across modules). All three are
ratcheted through `content/geo-ratchet.json`: pages marked `done` pass in full, the rest may only
improve. Batch 0 — 95, 96, 9201, 9202, 9204 — is done; the brand batches follow
(`docs/content-standards.md` §5).

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
it. Audit coverage: which of the 30 service pages and 25 location pages carry one, and which Tier-2
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

Assistants discount undated, unattributed content. The 12 guides carry `datePublished` and
`dateModified`, visible and in `Article` JSON-LD, kept honest by `scripts/check-dates.mjs`. They
carry **no author**, on purpose: nobody is named on this site and the people in its images are
AI-generated brand characters (`docs/business-facts.md` §A, §G.1). **Never invent an author**; a
fabricated byline is a worse trust signal than an absent one.

## Entity consistency

An assistant resolves "שלושה מנעולנים" by cross-referencing sources. Since 2026-09-05 `sameAs` carries
the Google Business Profile — one other source, where there were none. The business node reads its
contact details from the manifest (info@, the 076 line), and since 2026-11-04 adds `alternateName`
("3 Locksmiths"), `hasMap`, `knowsLanguage` and `knowsAbout`; the homepage carries a `WebSite` node
instead of the scraped, disconnected `Organization`. `description` and `logo` stay absent until the
roster has a confirmed one-line description and a logo slot. See also `/local-seo-il` §3.

## llms.txt

Generated at build time by `app/llms.txt/route.ts` from the manifest (2026-11-04) — who the business
is, what it does, every service, brand, city and guide with canonical URLs, and contact. It carries
no prices, warranty wording, coverage phrase or imagery line, because it bypasses every content gate;
`node scripts/check-llms.mjs` (after the build) checks its URLs against the sitemap and its text
against the claim rules. No major engine has confirmed it reads llms.txt: cheap hygiene, not a lever.

## Checklist

- [ ] Live `robots.txt` fetched and `node scripts/check-ai-crawlers.mjs` green (not assumed).
- [ ] The page is indexed (Search Console URL Inspection, UPPERCASE `%D7`) — AI Overviews need it.
- [ ] Every `ld+json` block in `out/` parses.
- [ ] The business node's contact details are correct and manifest-driven.
- [ ] Every service, location and guide page opens with a 40–60 word answer block.
- [ ] Answers ship in the HTML at first paint; the accordion still hides with CSS only.
- [ ] Each answer is comprehensible with zero surrounding context.
- [ ] Every brand-key page carries a `specsTable`.
- [ ] Guides carry `datePublished` and `dateModified`; no author unless a real person is confirmed.
- [ ] `node scripts/check-llms.mjs` green after the build.

## Gotchas

- Never fabricate dates, authors or data to look authoritative.
- Never mark up an answer in `FAQPage` that isn't rendered on the page.
- A blocked crawler makes perfect on-page AEO worth nothing, and so does an unindexed page. **Gate 1
  first, always** (run the tripwire — the block can return with no commit), then indexing, then prose.
- Never put an answer block, a price table or the family hub inside `data-nosnippet`: it is what
  removes text from snippets and AI Overviews (Google honours it on `span`, `div` and `section` only).
