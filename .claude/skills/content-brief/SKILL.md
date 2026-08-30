---
name: content-brief
description: Write a page brief precise enough that the copywriter never guesses — field-by-field against the EnrichedPage contract, with the answer block, the specs table, the differentiation from the sibling page it could cannibalise, and every gated claim marked before writing starts. Use before authoring any new or retrofitted page. Triggers "write a brief", "spec this page", "content brief", "plan this page", "what should this page say".
---

# Writing a content brief

A brief on this site must be **field-shaped**. Copy is data — a `content/enriched/<id>.mjs` module
matching `lib/enrich/types.ts` → `EnrichedPage` — so a prose brief forces the writer to invent the
structure, and structure is where pages go wrong here.

## Before you write the brief

1. **Confirm the route exists.** `content/enriched/_manifest.json` → `lookup`. If it doesn't, the
   brief is **🚧 blocked**: the pipeline enriches existing routes and cannot invent URLs. Say so
   loudly — it changes the effort by an order of magnitude.
2. **Read two sibling modules** of the same `kind`. They are the real style guide.
3. **Check the cap** — `docs/keyword-universe.md` §7. If this jumps the queue, say what it displaces.
4. **Collect the gated claims** for this page from `docs/business-facts.md` so the writer meets them
   in the brief, not mid-draft.

## The template

```
PAGE:      <route>  (id <n>)  |  🚧 needs a new route
KIND:      service | brand-key | location | core
KEYWORD:   <primary Hebrew keyword>
INTENT:    what the searcher is doing at that moment
TIER:      <docs/keyword-universe.md tier>

── metadata ─────────────────────────────────────────────
seo.title        <keyword-map §3 formula · brand EXACTLY once · <60 chars>
seo.description  <150–160 chars · §5 formula · phone in display format>
hero.h1          <restates the keyword naturally · NOT identical to the title>
hero.tagline     <one sentence, the promise>

── body ─────────────────────────────────────────────────
intro.heading
intro.paragraphs[0]   ★ ANSWER BLOCK — 40–60 words, complete in sentence one,
                        self-contained, carries the concrete number/duration
intro.paragraphs[1]   <what it must establish>
intro.paragraphs[2]   <what it must establish>
intro.outro           <closing line>

pricing[]      <which SITEWIDE rows apply — never a new number>
process[]      <the real steps + realistic per-step time>
specsTable     <columns, and what each row must distinguish>   ★ the citable asset
scenarios[]    <the situations that bring someone here, + FA icon name>
guides[]       <sections; note box: true / columns: true / subsections>
faq.items[]    <the actual questions — 4–6, specific to THIS page>
related        <services + locations, chosen by relevance not array order>
cta            <heading + body>

── constraints ──────────────────────────────────────────
MUST NOT SAY:        <the 🔶 claims that apply>
DIFFERENTIATE FROM:  <sibling page + how>
LINKS IN:            <which existing pages must gain a link to this one>
WORD FLOOR:          900 (service/location) | 350 (hub)
```

## The parts that carry the weight

**The answer block.** 40–60 words, complete in the first sentence, no scene-setting. This is what an
answer engine lifts and what a hurried visitor reads. **None of the 54 existing modules does this
well** — they scene-set first. Specify the actual words' job, not just "write an intro".

**The specs table.** Key type × system × complexity × duration × price band. It is the site's best
citable asset and most competitors publish nothing like it. Say what each row must _distinguish_ —
a table whose rows don't differ is decoration.

**The differentiation.** Every brief must name the page it could cannibalise and how it differs. The
model is `שכפול` vs `שחזור`: one requires an existing original key, the other doesn't. Without this,
two pages compete for one query and both lose.

**The gated claims.** List them explicitly:

> MUST NOT SAY: years in business (`foundedYear: null`) · any warranty term · 24/7 availability
> (schema says 08:00–18:00) · any new price · certifications · reviews or ratings

## Pricing discipline

The site has **zero price contradictions** — a genuine trust asset. The sitewide rows are:

| Row                     | Price       |
| ----------------------- | ----------- |
| שכפול מפתח רכב סטנדרטי  | 200 – 350 ₪ |
| שכפול מפתח חכם עם קידוד | 450 – 900 ₪ |
| שכפול שלט / פתיחת רכב   | 300 – 600 ₪ |

**A brief must reuse these, never invent a fourth.** All are 🔶 owner-unsourced
(`docs/business-facts.md` §D.1).

## Linking

Specify which existing pages must gain a link to the new one — a page nobody links to is invisible
regardless of quality.

⚠️ **Contextual in-copy links are currently impossible.** `paras()` escapes HTML, so an `<a>` in a
paragraph renders as visible literal markup (`docs/information-architecture.md` §4). Until the
renderer changes, "link" means the `related` arrays and the footer. Do not brief in-copy anchors as
though they work.

## Run the doorway test on the brief

Swap the city or service name in the brief itself. If it still reads as valid, **the brief is a
template and will produce a template.** Rewrite it with something true and specific to this page
before handing it over.

## Checklist

- [ ] Route confirmed to exist (or 🚧 flagged).
- [ ] Two siblings read; shape matches.
- [ ] Every `EnrichedPage` field specified or explicitly omitted.
- [ ] Answer block specified as a job, not a placeholder.
- [ ] Specs table rows genuinely distinguish something.
- [ ] Gated claims listed under MUST NOT SAY.
- [ ] Differentiation from the sibling page named.
- [ ] Pricing reuses sitewide rows only.
- [ ] Inbound links specified.
- [ ] Brief fails the doorway substitution test.
