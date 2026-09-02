---
name: site-navigation
description: Edit the global chrome on 3locksmiths — the near-empty footer (6 links, zero to services or locations, one blank column), the header dropdowns, breadcrumbs and the floating/sticky CTAs. Covers where the scraped WordPress chrome actually lives (scripts/transform.mjs, not a React component), how to rebuild the footer without truncating a silo, and the escaping trap. Use when changing anything that appears on every page. Triggers "fix the footer", "header nav", "global links", "chrome", "site-wide links", "breadcrumbs".
---

# Global chrome: header, footer, breadcrumbs, CTAs

The chrome is **scraped WordPress markup**, not React. That single fact determines how every change
in this skill is made.

## Where each surface lives

| Surface                                  | Edit here                                          |
| ---------------------------------------- | -------------------------------------------------- |
| Header, nav, dropdowns                   | `scripts/transform.mjs`                            |
| **Footer**                               | `scripts/transform.mjs`                            |
| Floating phone button (`.floated-right`) | vendored theme — override in `app/enrich.css` only |
| Sticky mobile call/WhatsApp bar          | `components/StickyCta.tsx` + `app/enrich.css`      |
| Breadcrumb markup (`BreadcrumbList`)     | `scripts/enrich.mjs` → `breadcrumbSchema`          |
| Per-page related links                   | `content/enriched/<id>.mjs` → `related`            |

**Never edit:** `content/site.json` (7 MB generated artifact), `public/wp-content/`,
`public/wp-includes/`. After any `transform.mjs` change: **`npm run enrich`**, then rebuild.

> ⚠️ **`transform.mjs` runs ONLY in `npm run snapshot`**, which re-scrapes the live WordPress
> origin. A chrome change made there does not appear from `npm run enrich` at all. That is why
> the footer rebuild lives in **`scripts/footer.mjs`**, which runs in the enrich chain:
>
> ```
> pages → build-manifest → enrich → footer → fix-links
> ```
>
> after build-manifest (the link lists come from `_manifest.json`) and before fix-links (so every
> emitted href is validated against the real route set and picks up its `data-cta`).
> Follow the same pattern for any new chrome change: parse with `node-html-parser`, mutate the
> DOM, serialise. Never string-replace HTML.

## The footer — current state

```
<footer class="footer">
  <div class="footer-top"><div class="footer-row">
    <div class="footer-col sidebar-1">        ← COMPLETELY EMPTY (visible blank gap)
    <div class="footer-col sidebar-3 footer-info">
        hours · phone · email · "derech sara 25/2" · [הזמינו פגישה]
  <div class="footer-bot">
      © 2025 · מדיניות פרטיות · הצהרת נגישות · מפת אתר
```

**6 links. 0 services. 0 locations. 31 words. On all 67 routes.**

## The footer — target

| Column          | Contents                                                                |
| --------------- | ----------------------------------------------------------------------- |
| **1. Services** | 8–10 highest-intent services + "כל השירותים" → `/services/`             |
| **2. Areas**    | 10–12 largest locations + "כל אזורי השירות" → `/אזורי-שירות/`           |
| **3. Guides**   | 4–6 newest guides + "כל המדריכים" → `/מדריכים/` _(once the hub exists)_ |
| **4. Contact**  | the existing `footer-info` block — hours, phone, WhatsApp, email, CTA   |

### The rules that matter

- **Never truncate a silo with `slice()`.** Truncation is what creates orphans. Too long → two-column
  grid, or a curated "top N + see all" where the "see all" link is real.
- **Trailing slash on every href** (`trailingSlash: true`) or it 301s and wastes a hop.
- **Hebrew hrefs are percent-encoded in `content/site.json`.** Build them from
  `content/enriched/_manifest.json` → `lookup[id].path`, which already holds the encoded form. Do not
  hand-encode, and do not hand-decode.
- **Keep links in the DOM.** No mobile accordion that removes them — crawlers need them.
- **Derive the copyright year.** It is the literal `2025` today; a hardcoded year makes the site look
  abandoned every January.
- **Fill `sidebar-1`** or remove the column. A blank column is a visible layout bug.

### Building the link lists from real data

```js
// scripts/transform.mjs — never hardcode a route
const manifest = JSON.parse(
  readFileSync(join(ROOT, "content/enriched/_manifest.json"), "utf8"),
);
const byKind = (k) => Object.entries(manifest.lookup); /* … filter by the page's kind … */
```

`_manifest.json` → `lookup` maps id → `{ path, title }`. The enrich step also groups by `kind`
(`core`, `service`, `brand-key`, `location`) — read `scripts/build-manifest.mjs` for the grouping it
already computes rather than re-deriving it.

## Idempotency — required

`transform.mjs` runs on every `npm run enrich`. A footer rebuild must be **safe to run repeatedly**:
detect an already-rebuilt footer and replace it, rather than appending a second copy. The existing
Web3Forms transform shows the pattern — it checks for an existing `access_key` input and refreshes it
instead of prepending again.

## Header

The scraped markup already contains a `locations-drop-down sub-menu` structure. Use it rather than
inventing a second pattern.

Target: **all 30 services and 25 locations within one hop.** Keyboard support (`aria-expanded`,
`aria-controls`, Escape, focus return) is missing from the theme's jQuery menu — fix it with a
**scoped enhancement layer** that attaches after `ThemeScripts` has run, never by editing vendored JS
(backlog §11.3).

## The sticky CTA bar

`components/StickyCta.tsx`, rendered by `app/layout.tsx` **outside** the ported body, so it appears on
every route including `/thank-you/`. Mobile only (`<992px`). Its CSS lifts the theme's floating phone
button clear of it. `data-cta="sticky-call"` / `"sticky-whatsapp"`.

Colors are computed for AA: white on `#00702b` = 6.26:1, on `#075e54` = 7.67:1. **Do not reuse the
theme accent `#009f3c` for CTA text — it is 3.49:1.**

## The escaping trap

`lib/enrich/render.mjs:paras()` calls `esc()`. An `<a href>` in an authored **paragraph** renders as
visible literal markup. This does **not** apply to `transform.mjs`, which manipulates real DOM nodes —
but it does mean contextual in-copy links need a renderer change first
(`docs/information-architecture.md` §4).

## Verify

```bash
npm run enrich && npm run build

# footer link coverage
node -e '
const s=require("fs").readFileSync("out/index.html","utf8");
const f=s.slice(s.indexOf("<footer"), s.indexOf("</footer>")+9);
console.log("links:",(f.match(/<a /g)||[]).length);
console.log("services:",(f.match(/\/services\//g)||[]).length);
console.log("locations:",(f.match(/\/locations\//g)||[]).length);'

# no empty columns
grep -o 'footer-col[^"]*"> *<' out/index.html   # expect nothing

# orphans
find out -name index.html | sed 's|^out||; s|index.html$||' | sort > /tmp/routes.txt
grep -rho 'href="/[^"]*"' out --include=index.html | sed 's|href="||; s|"$||' | sort -u > /tmp/linked.txt
comm -23 /tmp/routes.txt /tmp/linked.txt
```

## Checklist

- [ ] `sidebar-1` filled (or the column removed).
- [ ] Footer reaches both silos; no `slice()` truncation.
- [ ] Every href has a trailing slash and came from `_manifest.json`.
- [ ] Copyright year derived, not hardcoded.
- [ ] Transform is idempotent across repeated `npm run enrich` runs.
- [ ] Links present in the DOM on mobile.
- [ ] Orphan check returns nothing new.
- [ ] Verified in `out/` **and** on the live site after deploy.
