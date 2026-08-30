---
name: new-article
description: Superseded pointer — guide and article authoring for 3locksmiths now lives in the guides-hub skill, which reflects how the /מדריכים/ hub was actually built (pages.mjs shells + authored modules with kind "guide", Article schema, and the Hebrew-route-directory trap). Use guides-hub instead. Triggers "write an article", "blog post", "knowledge hub", "מדריך", "topical authority", "guide".
---

# Superseded — use `/guides-hub`

This skill described publishing editorial content **before the hub existed**, and its central claim
was wrong: it said a guide "has no existing route" and framed route creation as the hard part.

**Both are now settled by how the hub was actually built on 2026-08-25:**

- `/מדריכים/` exists, with three guides live in production.
- Routes are **not** blocked. `scripts/pages.mjs` creates them from nothing with synthetic ids —
  the guides use ids 92xx, exactly like the 9101/9102 service shells that predate them.
- Guides are ordinary `content/enriched/<id>.mjs` modules with `kind: "guide"`, so they inherit the
  real theme chrome, styling, sitemap entry and footer links for free. The "Path A vs Path B, and
  what about the chrome?" dilemma this skill agonised over was resolved in favour of Path B, and it
  worked.
- `scripts/enrich.mjs` emits `Article` + `BreadcrumbList` (+ `HowTo`/`FAQPage`) for `kind: "guide"`.

**Go to [`/guides-hub`](../guides-hub/SKILL.md)** for the current, accurate procedure.

## The two things worth carrying over

**A literal Hebrew route _directory_ breaks the Next 16 exporter.** `app/תודה/page.tsx` failed the
build with `InvalidCharacterError` and was moved to `app/thank-you/`. Hebrew in the _data_ (rendered
by the ASCII catch-all `app/[...slug]/`) is completely fine — which is why `/מדריכים/<slug>/` works.

**Never invent a byline.** `docs/business-facts.md` §A records that nobody is named anywhere on this
site. The three live guides deliberately omit `author` rather than fabricate one — a fabricated
author is a worse trust signal than an absent one. Supply a real name or leave the field out.
