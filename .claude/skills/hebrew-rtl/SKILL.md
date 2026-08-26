---
name: hebrew-rtl
description: RTL and Hebrew (he-IL) discipline for 3locksmiths — what the vendored gogo rtl.css already owns versus what you must get right yourself, logical utilities and logical CSS properties in app/enrich.css, LTR islands for phone and price, Israeli number and date formats, Hebrew punctuation with גרש and גרשיים, the dir="ltr" contact form defect, and the percent-encoded Hebrew route trap. Use whenever writing markup, classes or copy that appears on the page. Mandatory per CLAUDE.md §8. Triggers "RTL", "Hebrew", "which padding utility", "text direction", "LTR island", "Hebrew slug 404".
---

# Hebrew & RTL discipline

`<html lang="he" dir="rtl">` is set in `app/layout.tsx`, and `<body className="rtl wp-theme-gogo">`
carries the classes the vendored theme's selectors expect. Do not remove either.

## Scope — what you actually control

Most layout on this site comes from the **vendored gogo theme CSS**, which ships its own `rtl.css`.
You do not edit it. So the RTL rules below govern:

1. New Tailwind utility classes you write.
2. `app/enrich.css` — the one stylesheet this project owns.
3. Markup emitted by `lib/enrich/render.mjs`.
4. Copy in `content/enriched/<id>.mjs`.

A recommendation to "fix the RTL" in `public/wp-content/` is out of scope. Overrides go in
`app/enrich.css`, scoped under `.content-blocks`.

## Logical utilities only — the ban list

For horizontal spacing and positioning in **new** Tailwind classes:

| Use                                     | Never use                     |
| --------------------------------------- | ----------------------------- |
| `ps-*` / `pe-*`                         | `pl-*` / `pr-*`               |
| `ms-*` / `me-*`                         | `ml-*` / `mr-*`               |
| `start-*` / `end-*`                     | `left-*` / `right-*`          |
| `text-start` / `text-end`               | `text-left` / `text-right`    |
| `space-x-reverse` alongside `space-x-*` | bare `space-x-*`              |
| `rounded-s-*` / `rounded-e-*`           | `rounded-l-*` / `rounded-r-*` |
| `border-s-*` / `border-e-*`             | `border-l-*` / `border-r-*`   |

Vertical utilities (`pt`, `pb`, `mt`, `mb`, `top`, `bottom`) are unaffected.

The only exception is a genuinely direction-agnostic case — a centred absolute overlay, a
mathematically symmetric transform — and it **must carry an explanatory comment** saying why.

> Note: Tailwind's **preflight and theme layers are deliberately not imported** (`app/globals.css`),
> so only the utilities layer is available. Utilities still work; the reset and design tokens are
> intentionally absent. Read the comment in that file before touching it.

## Logical CSS properties in `app/enrich.css`

The same rule in raw CSS:

| Use                        | Never use            |
| -------------------------- | -------------------- |
| `padding-inline-start/end` | `padding-left/right` |
| `margin-inline-start/end`  | `margin-left/right`  |
| `inset-inline-start/end`   | `left` / `right`     |
| `border-inline-start/end`  | `border-left/right`  |
| `text-align: start / end`  | `left` / `right`     |

`app/enrich.css` currently uses `margin-bottom`, `border-radius` and flex centring — all
direction-safe. Keep new rules the same way.

Let `dir="rtl"` mirror flex and grid naturally. Don't reach for `flex-row-reverse` to "fix" order; if
the order looks wrong, the DOM order is wrong.

## LTR islands

Latin and numeric content inside Hebrew must be isolated or the bidi algorithm reorders it — phone
numbers render backwards, prices lose their currency position, URLs fragment.

```html
<span dir="ltr">055-6601006</span> <a href="tel:+972556601006" dir="ltr">055-6601006</a>
```

Use it for phone numbers, emails, URLs, prices with `₪`, and Latin model or brand names embedded
mid-sentence.

**Write the plain value in `content/enriched/<id>.mjs`** — `055-6601006`, `200 – 350 ₪`. The renderer
adds the isolation. Never put markup in the content module.

## The live RTL defect

The contact form is still Contact Form 7 debris: the wrapper carries `lang="en-US"` **and
`dir="ltr"`** on a Hebrew RTL site, plus an English `aria-label="Contact form"`. Screen readers
announce it in the wrong language, and the fields render LTR (backlog §8.8, §11.4). Fix it in
`scripts/transform.mjs` (scraped instances) and `lib/enrich/render.mjs` (authored ones), not in the
built HTML.

## Israeli formats

- Phone: `055-6601006` displayed; `+972556601006` in `tel:` — both from the manifest.
  **Note the site currently ships four different spellings, one of them dead.** See `/conversion-cro`.
- Currency: `₪` **after** the number — `350 ₪`.
- Dates: `dd/mm/yyyy`.
- Ranges: en dash — `200 – 350 ₪`, `20–45 דקות`. The existing modules use a **spaced** en dash in
  prices and an **unspaced** one in durations. **Match the neighbouring module** rather than
  normalising unilaterally.
- Thousands separator: comma.

## Hebrew punctuation

Use **גרש** `׳` (U+05F3) and **גרשיים** `״` (U+05F4) in Hebrew abbreviations — `רח׳`, `ח״פ`, `ע״מ`.
Not the ASCII `'` / `"`, and **not the typographic `’` (U+2019)**, which is an English apostrophe.

`lib/enrich/render.mjs:29` currently gets this wrong:

```js
const HOURS = "א’-ו’: 8:00–18:00 | שבת: 8:00–17:00"; // ❌ U+2019
const HOURS = "א׳-ו׳: 8:00–18:00 | שבת: 8:00–17:00"; // ✅ U+05F3
```

It is a shared constant, so one fix corrects every page (backlog §11.7).

## The percent-encoded route trap

Hebrew slugs are stored **percent-encoded** in `content/site.json`
(`/%d7%9e%d7%97%d7%99%d7%a8%d7%95%d7%9f/`), and route params also arrive encoded during static export.
`lib/content.ts` decodes **both sides** before matching:

```ts
function decodeSeg(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
const key = segments.map(decodeSeg).join("/");
return site.pages.find((p) => !p.isFront && p.segments.map(decodeSeg).join("/") === key);
```

A route or matcher that skips the decode **works in dev and 404s in production**. Reuse
`getPageBySegments()` — do not write a second matcher.

Hebrew `href`s inside authored blocks are written **unescaped**; the build percent-escapes them on
output so they match the canonical and the sitemap `<loc>`. Do not pre-encode them.

## Copy rules

- Keep user-facing strings Hebrew. No mid-sentence language mixing — a Latin brand or model name
  (BMW, Multilock, Mul-T-Lock) gets its own clause.
- Address the reader as "אתם"; speak as "אנחנו" / שלושה מנעולנים.
- Copy lives in `content/enriched/<id>.mjs`, never in `render.mjs` string literals and never in HTML.
- Full voice and depth rules: `docs/content-standards.md` §4 and §7.

## Checklist

- [ ] No banned physical-direction utility or CSS property in code you wrote, or an exception with a
      comment.
- [ ] Every phone, email, URL and price is inside an LTR island.
- [ ] Hebrew abbreviations use `׳` / `״` — not `'`, `"` or `’`.
- [ ] Any new route reuses `getPageBySegments()`.
- [ ] Hebrew `href`s written unescaped.
- [ ] Layout checked at 360px and at desktop, in RTL.

```bash
# banned utilities and physical properties in code this project owns
grep -rnE '\b(pl|pr|ml|mr)-[0-9]|\b(left|right)-[0-9]|text-(left|right)\b' app components lib/enrich
grep -rnE 'padding-(left|right)|margin-(left|right)' app/enrich.css
# the wrong apostrophe
grep -rn '’' lib/enrich content/enriched
```
