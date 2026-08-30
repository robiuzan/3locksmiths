---
name: page-imagery
description: Which image belongs in which slot on שלושה מנעולנים — the measured inventory of every image position with its intrinsic size, governing CSS and crop behaviour, the three hero buckets and how a page is assigned one, alt-text rules that clear the claims guard, and the markup contract. Use before writing an image prompt, adding a picture to a page or section, or judging whether an image fits. Triggers "what image goes here", "which aspect ratio", "add a photo", "image brief", "why is this image cropped".
---

# Page imagery

Getting an image to _fit_ is mostly a CSS question, and the answers are measured, not guessable.
Every image position on this site is `object-fit: cover`, so **composition must survive a crop**.

## The slot inventory

| Slot                                 | Intrinsic              | Governing CSS                                                                                            | What it does to your picture                                                                                                                                 |
| ------------------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Page hero**                        | 587×426 · **4:3**      | `.header-banner-right > img` — `min-height:426px`, `cover`, `radius:15px` (main.css:3931)                | Collapses to 380 / 300 / **224px** tall on smaller screens (media.css:118, 288, 390). Severe vertical crop. **LCP element** — eager, `fetchpriority="high"`. |
| **Homepage tile ×4**                 | 632×426 · **3:2**      | `.home-hero-right-galley .gallery-item img` — `max-height:213px`, `cover`, `radius:20px` (main.css:1768) | 2×2 flex grid; tiles 1 and 4 offset ±39px. Read as a **set**: vary the framing, hold the lighting constant. Not a carousel — no `owlCarousel` binds here.    |
| **Contact avatar**                   | 96×96 · **1:1**        | `.form-wrap-bar img` (main.css:2746)                                                                     | Rendered **twice per page on 112 pages**. Fixed box → 1x/2x ladder only.                                                                                     |
| **Service card thumb**               | fills a 298px box      | `.service-card-template .thumbnail img` — `cover` (main.css:5102)                                        | Bottom ~40% sits under a black gradient. **Keep the subject in the upper two-thirds.**                                                                       |
| **Article figure**                   | 100% of a 785px column | `.photo-wrap img` (main.css:5457)                                                                        | The only genuinely full-width photo slot.                                                                                                                    |
| **OG card**                          | **1200×630**           | —                                                                                                        | Nothing enforces it; every social platform expects it.                                                                                                       |
| Advantage icon · form icon · marquee | 36px · 44px · logos    | main.css:3485, 2095, 3536                                                                                | **Icon slots, not photo slots.** Never send a photograph.                                                                                                    |

Two consequences that are easy to get wrong:

- **The focal point is the crop insurance.** The catalog stores `focal {x,y}` and it becomes
  `gravity=XxY` on the transform URL, so an off-centre subject survives. It cannot rescue a subject
  that was never in frame.
- **`assets.mjs`'s 1600px `MAX_W` does not apply to catalog images.** That script only touches
  `/wp-content/uploads/**` (assets.mjs:177). Catalog images are resized at the Cloudflare edge and
  ride a 320→2560 ladder.

## Which hero a page gets

The site sells car and home through **one shared hero**, so the split is three buckets, not two.
Measured against `content/enriched/_manifest.json`:

```
brand-key (32)              -> car     48 pages total
CAR_SERVICES / CAR_CORE     -> car
HOME_SERVICES / HOME_CORE   -> home     9 pages
everything else             -> both    49 pages  <- locations (32), guides (12), core (3)
```

The id sets live in `lib/enrich/catalog-image.mjs` and are asserted by
`node scripts/check-catalog-images.mjs`. **The default is `both`** — a page added tomorrow gets the
image that is never actively wrong rather than silently inheriting a car photo onto a lock article.

`both` occupies the real `hero` **slot** because it covers the most pages and Media Studio allows
exactly one hero key per site; `car` and `home` are gallery items named `hero-car` / `hero-home`.

## The markup contract

`catalogImg(ref, opts)` in `lib/enrich/catalog-image.mjs` is the only place a catalog key becomes
markup. It emits `src`, `srcset`, `sizes`, `width`, `height`, escaped `alt`, `decoding`, and either
`loading="lazy"` or `fetchpriority="high"`.

**It must emit `width`/`height` itself.** `assets.mjs` adds those to `/wp-content/uploads/**` images
only, so it never sees an `imgquarry.com` URL — without them the hero ships with no reserved box and
CLS regresses across the site (`optimization-backlog.md` §10.7).

Every attribute goes through `esc()`. `render.mjs` escapes text but almost no attributes — only
`alt` on the hero — so do not assume the surrounding code protects you.

`SIZES` carries the per-slot `sizes` value, derived from the CSS above. **Never write a `sizes`
without a `srcset`**: it looks right in review and does nothing.

## Alt text

Hebrew first (`altHe`), because the page is `lang="he" dir="rtl"` and it is read aloud in Hebrew.
`catalogImg` prefers `altHe`, falls back to `alt`. An empty string is a legitimate value for
decoration — an empty alt is not a missing alt.

**`scripts/check-claims.mjs` tests raw HTML, which includes `alt`.** Alt text mentioning years of
experience, response times, ratings or customer counts **fails the build**. That is correct: an
unsourced claim is no more acceptable in an alt attribute than in a heading.

Describe what is visible. Never "תמונה של". Never invent a detail the camera cannot see.

## Honesty

`docs/optimization-backlog.md` §7.7 — imagery provenance is not established for the inherited stock,
and a generated scene is not evidence of a particular job.

- Never caption an image as a specific real job, a before/after, or a named customer.
- Never generate a certificate, licence, rating, badge or review. **This site has already shipped
  three fabricated Google 5.0 badges**, two of them hidden inside images where no text guard could
  see them.
- Never invent branding, van livery or signage. The business has confirmed: nothing branded.
- The figures are **AI-generated brand characters, not real staff** (business-facts §G.1). Never
  name them, and never imply a headcount from a picture.
- **Reject any image with legible text.** The supplied set already contains a dead domain
  (`3locksmith.co.il`), a gibberish phone number and a scrambled Hebrew logo — all baked into
  rasters where no text guard can see them.

## Related

`.claude/skills/image-pipeline-3locksmiths` for the mechanics · `.claude/agents/image-art-director`
writes the prompts · `Media Studio/.claude/skills/image-generation` for generation itself.
