---
name: responsive-accessibility
description: WCAG 2.1 AA and Israeli IS 5568 compliance for 3locksmiths — the ≈3.5:1 accent contrast, the contact form marked dir="ltr" and lang="en-US" on a Hebrew RTL site, a form that validates nothing so has no error state to announce, the vendored jQuery mobile menu you cannot edit directly, tap targets, one H1 (enforced at build), and keeping /accessibility-statement/ truthful. Use before shipping or when auditing accessibility. Triggers "accessibility pass", "WCAG", "contrast check", "tap targets", "keyboard navigation", "נגישות", "IS 5568".
---

# Accessibility — WCAG 2.1 AA + IS 5568

This site **publishes an accessibility statement** at `/accessibility-statement/`. That raises the
stakes: a failure here isn't just a bug, it makes a published statement false. Keep the statement and
the site in sync **in both directions**.

## Scope — what you can actually fix

The chrome, the nav, the forms and most of the layout are **vendored WordPress theme output** under
`public/wp-content/`, which this project does not edit. An accessibility fix is only actionable if it
lands in:

- `scripts/transform.mjs` — rewrites the scraped chrome and forms at build time
- `lib/enrich/render.mjs` — the authored-block markup
- `app/enrich.css` — the one stylesheet this project owns
- `app/layout.tsx` — the document shell
- a scoped enhancement script

**Never propose editing the vendored theme.** A fix there is unmaintainable and gets overwritten.

## The contrast question — compute it, don't assume

The theme accent is `--acsent-color: #009f3c` (note the source's misspelling), with **103 references**
across `main.css` and `rtl.css`. White text on it computes to **≈3.5:1** — below the 4.5:1 AA floor
for normal text.

But the accent is also used for **borders, icon fills and large numerals**, where 3:1 is the correct
threshold and it passes. So:

1. Grep where the accent carries **text**, and at what size and weight.
2. Compute the real ratio from the actual hex for each of those surfaces. **Never eyeball contrast.**
3. Rank only the text surfaces as failures; name them individually rather than reporting a blanket
   failure across 103 references.

Large-text exemption: ≥18.66px bold or ≥24px regular qualifies at 3:1. Check before excusing anything.

If the accent must change, note that it is a **theme CSS variable in vendored output** — the override
belongs in `app/enrich.css` (or a shell-level `:root` override), not an edit to `main.css`.

## The live RTL/language defect

The contact form is still Contact Form 7 debris:

```html
<div class="wpcf7 no-js" id="wpcf7-f13-o1" lang="en-US" dir="ltr" data-wpcf7-id="13">
  <form … aria-label="Contact form" novalidate="novalidate"></form>
</div>
```

On a Hebrew RTL site this means: fields render LTR, screen readers announce the form and its contents
**in English**, and the accessible name is English (backlog §8.8, §11.4). Fix in
`scripts/transform.mjs` and `lib/enrich/render.mjs` — set `lang="he"`, `dir="rtl"`, and a Hebrew
`aria-label`.

## Forms

All fields have labels, and the `botcheck` honeypot is correctly off-screen. But `novalidate` is set
and **there is no JS handler**, so there is no error state at all — nothing to announce, and nothing
stopping an empty submit (backlog §8.4, §11.5).

Whatever validation approach is chosen (`/conversion-cro` gap 3), the a11y requirements are the same:

- Each error tied to its input via `aria-describedby`, with `aria-invalid="true"`.
- Focus moved to the first invalid field on submit.
- Messages in Hebrew.
- An error summary that is announced (`role="alert"` or a focused container).

## Semantics

- **One `<h1>` per page** — currently correct on all 66 emitted pages, and `scripts/enrich.mjs`
  **fails the build** if an enriched page has any other count. That guard covers 97 of 108 pages; the
  other 11 are correct but unguarded.
- Heading order: `lib/enrich/render.mjs` owns the `<h2>`/`<h3>` structure for authored content. Give
  any new block the level its position implies — don't pick one for its default size.
- Landmarks (`header`, `nav`, `main`, `footer`) come from the ported markup. Verify they survive any
  transform change.
- Real `<button>` / `<a>`, never a clickable `div`, in anything you emit.

## Keyboard

- **The mobile menu is the theme's jQuery `nav.js`** — no focus trap, no Escape handler, no
  `aria-expanded`, no `aria-controls`, no scroll lock (backlog §11.3). The fix **cannot** be an edit
  to `public/wp-content/`. It has to be a scoped enhancement layer that attaches to the existing
  markup after `ThemeScripts` has run, or a transform-time markup change that adds the ARIA attributes
  the theme's JS then toggles.
- Visible focus everywhere. The theme's focus styles are unaudited — check them, and add
  `:focus-visible` rules in `app/enrich.css` if they're missing.
- Tab order follows DOM order; in RTL that is still correct — don't reorder visually with CSS.

## Images and figures

`alt` text is inherited from WordPress and unaudited (backlog §11.6). Anything `lib/enrich/render.mjs`
emits needs a meaningful Hebrew `alt`; decorative gets `alt=""`. The marquee brand logos and the icon
boxes are decorative — confirm they are not announced.

## Tap targets and mobile

- 44×44px minimum for anything tappable, with adequate spacing.
- Test at 360px. The ported theme is responsive, but authored blocks are not: `app/enrich.css` sets
  `repeat(4, 1fr)` grids that drop to 2 columns at 991px and 1 at 575px — verify any new grid does the
  same.
- Text must reflow to 320px without horizontal scroll; zoom to 200% without loss.

## Hebrew punctuation

`lib/enrich/render.mjs:29` writes hours as `א’-ו’` using U+2019 instead of גרש `׳` U+05F3
(backlog §11.7). It is a shared constant, so one fix corrects every page. See `/hebrew-rtl`.

## Motion

Check whether the theme's carousels and marquee respect `prefers-reduced-motion`. If they don't, a
scoped `@media (prefers-reduced-motion: reduce)` block in `app/enrich.css` can neutralise the
animations without touching vendored CSS.

## Checklist

- [ ] Every text/background pair computed at ≥4.5:1 (≥3:1 for large text and UI boundaries), with the
      failing surfaces named individually.
- [ ] The contact form is `lang="he"` / `dir="rtl"` with a Hebrew accessible name.
- [ ] Form errors tied via `aria-describedby` + `aria-invalid`, focus moved to the first invalid field.
- [ ] One `<h1>`; heading order unbroken; landmarks present.
- [ ] Every interactive element keyboard-reachable with visible focus.
- [ ] The mobile menu has Escape, focus return and `aria-expanded` — via an enhancement layer.
- [ ] Meaningful Hebrew `alt`; decorative images `alt=""`.
- [ ] 44px tap targets; 360px layout clean; 200% zoom usable.
- [ ] `prefers-reduced-motion` respected.
- [ ] `/accessibility-statement/` still describes reality.

## Gotchas

- **Never edit `public/wp-content/`.** Every fix routes through the pipeline, `app/enrich.css`, or an
  enhancement layer.
- Fixing the accent may change the visual brand. Flag it before shipping rather than after.
- `aria-hidden` on a caption removes it from the accessibility tree entirely; a visually hidden but
  announced caption is usually what's wanted.
- An a11y fix that makes the published statement _more_ accurate is still a change to a published
  claim — mention it either way.
