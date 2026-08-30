---
name: engagement-ux
description: Improve what a visitor actually experiences on 3locksmiths — time-to-answer against the fixed block order, the 780 KB homepage, the seven-block sameness across 54 pages, the abandoned price calculator, the emergency-visitor journey on mobile, and the dead end at the bottom of every page. Use when asked about bounce, engagement, dwell or UX. Triggers "improve engagement", "why do people leave", "UX", "user experience", "bounce rate", "dwell time".
---

# Engagement & UX

## First: be honest about measurement

This is a **static export**. There is no scroll data, no dwell time, no session recording. Site-wide
engagement events were only wired on 2026-08-24 and **there is no baseline yet**.

So everything here is **structural** — what's above the fold, how long the page is, how fast the
answer arrives, whether there's a next step. Label structural facts and behavioural hypotheses
separately, and **never present an inference as a measurement**. No invented bounce rates.

## The fixed block order — the core constraint

Every authored page renders the same sequence (`lib/enrich/render.mjs:renderContentBlocks`):

```
hero → intro + pricing → process → specsTable → scenarios → guides →
advantages → stats → faq → related → areas → marquee → form
```

You choose **which blocks exist**, not where they go. Moving a section is a `render.mjs` change and
it moves for **every page**. That is a real constraint on engagement work — and a real lever, since
one change improves 54 pages at once.

## The six things worth fixing

### 1. Time to answer

`intro.paragraphs[0]` is the answer block. **None of the 54 modules opens with a tight 40–60 word
answer** — they scene-set first (backlog §6.2). A visitor who searched a question and lands on
prose that doesn't answer it leaves. This is an engagement cost before it is an AEO one, and
tightening the first paragraph across the modules is the cheapest high-yield pass available.

### 2. The 780 KB homepage

The homepage is one enormous scraped document, and the export carries ~8 MB of legacy icon-font SVGs
(§10.2–10.3). On mobile data, in an emergency, this **is** the experience. Measure the inline
script/style share before proposing anything:

```bash
node -e 'const h=require("fs").readFileSync("out/index.html","utf8");
const s=(h.match(/<script[\s\S]*?<\/script>/g)||[]).join("").length;
const c=(h.match(/<style[\s\S]*?<\/style>/g)||[]).join("").length;
console.log("total",h.length,"script",s,"style",c,"rest",h.length-s-c);'
```

### 3. Sameness across 54 pages

Same seven-block rhythm everywhere. Good for consistency, bad for anyone who visits two pages —
especially the 18 brand-key pages, which overlap heavily. Variety here is a content problem
(per-page `specsTable`, `scenarios`, real model-level detail), not a layout one.

### 4. The abandoned price calculator ⚠️

Four `/step/` pages, 173–182 words, **excluded from the sitemap, untracked, and barely linked**.

A price calculator is the **highest-engagement asset a trade site can have**: interactive, answers
the top question, captures intent. This one is half-built. Either:

- **Revive it** — make it reachable, instrument it with `data-cta`, capture the lead at the end, link
  it from `/מחירון/` and the service pages; or
- **Retire it** — remove it from the build.

**Half-built is the worst option.** Do not pad the pages to "fix" them — they are funnel steps, not
landing pages (`docs/content-standards.md` §1.1).

### 5. The dead end at the bottom

A visitor who scrolls to the end of any page finds the `related` carousel and then a **near-empty
footer** — 6 links, zero services, zero locations (§9.2). For someone not ready to call, there is
nowhere to go. Fixing the footer is an engagement fix as much as an SEO one
(`/site-navigation`).

### 6. Nothing to come back for

No editorial content, nothing to subscribe to. Every visit is a cold visit. `/guides-hub` is the
structural answer.

## The emergency journey — design for the worst case

Outdoors, mobile, one hand, low battery, high stress:

- Call and WhatsApp reachable **without scrolling** — the sticky bar does this now on every route.
- Tap targets ≥44px (the bar is 56px); verify it doesn't collide with the theme's floating phone
  button (lifted in `app/enrich.css`).
- **Never put a form between an emergency visitor and the phone number.**
- Walk one journey end to end and describe it plainly: _lockout query → location page → what do they
  see, in what order, how many taps to a call?_

## RTL specifics

Line length in Hebrew, `dir="ltr"` isolation on phone/price/email, and the contact form still marked
`lang="en-US"` / `dir="ltr"` (§11.4) — which means a screen reader announces the form in the wrong
language. That is an engagement failure for anyone using one.

## What is forbidden

The trust gate in `docs/business-facts.md` applies here in full:

- **No fake countdowns, "X people viewing", fabricated urgency, or invented testimonials.**
- No engagement bait that costs an accessibility regression — the site publishes an accessibility
  statement that must stay true.
- Never remove the jQuery replay, sticky bar or ported markup for "cleanliness"; they are
  load-bearing.

## Checklist

- [ ] Answer arrives within the first paragraph on the pages audited.
- [ ] Page weight measured, not estimated; script/style share stated.
- [ ] Calculator decision made — revive or retire, not left half-built.
- [ ] Footer offers a real next step.
- [ ] Emergency journey walked end to end, tap count stated.
- [ ] 360px layout verified; tap targets ≥44px.
- [ ] Structural facts and behavioural hypotheses clearly separated.
- [ ] Each finding names the metric that would confirm it once GA4 has data.
