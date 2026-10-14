# Information architecture

The target structure of the site: what links to what, what the global chrome must carry, and how a
visitor (or a crawler) gets from any page to the one they need.

Owned by the `ia-navigation-architect` agent. The mechanics of editing each surface are in
`/site-navigation` and `/internal-linking`.

---

## 0. The state today

105 routes, and a link graph that is close to a star: everything hangs off the homepage and almost
nothing connects sideways.

| Surface              | Reaches                                      | Verdict |
| -------------------- | -------------------------------------------- | ------- |
| Header nav           | ~5 top-level pages + two dropdowns           | 🟡      |
| **Footer**           | **6 links. 0 services. 0 locations.**        | 🔴      |
| Floating button      | phone only                                   | 🟢      |
| Sticky mobile bar    | call + WhatsApp (added 2026-08-24)           | 🟢      |
| In-content `related` | per-page service/location carousel           | 🟡      |
| Contextual in-copy   | **none — blocked by the renderer**           | 🔴      |
| Breadcrumbs          | visible on inner pages; `BreadcrumbList` ×54 | 🟡      |

> 2026-10-14: the **Footer** row is the scraped footer of §1. `scripts/footer.mjs` has since
> rebuilt it on every page — after the merge, a services column of 23 links and an areas column of
> 23 (`docs/keyword-map.md` §8.1). The other rows were not re-measured.

---

## 1. The footer — the biggest single fix on the site

### What it was — the scraped WordPress footer

```
<footer>
  <div class="footer-col sidebar-1">   ← COMPLETELY EMPTY (renders as a blank gap)
  <div class="footer-col sidebar-3 footer-info">
      hours · phone · email · "דרך שרה 25/2, זכרון יעקב" · [הזמינו פגישה] button
  <div class="footer-bot">
      © 2025 · מדיניות פרטיות · הצהרת נגישות · מפת אתר
```

**6 links total, on all 67 routes.** Zero reach into the 30 services or 25 locations. One empty
column. The address is a Latin transliteration with no city
(`docs/business-facts.md` §C.1).

> 2026-10-14: historical. That is the footer as scraped; `scripts/footer.mjs` now rebuilds it on
> every page in the enrich chain — after the duplicate-twin merge (§3.2), a services column of 23
> links and an areas column of 23. Check the target below against that script before treating any
> of it as open.

### What it must become

A four-column footer, filling `sidebar-1` and adding columns:

| Column          | Contents                                                                    |
| --------------- | --------------------------------------------------------------------------- |
| **1. Services** | The 8–10 highest-intent services, plus "כל השירותים" → `/services/`         |
| **2. Areas**    | The 10–12 largest locations, plus "כל אזורי השירות" → `/אזורי-שירות/`       |
| **3. Guides**   | 4–6 newest guides, plus "כל המדריכים" → `/מדריכים/` _(once the hub exists)_ |
| **4. Contact**  | Hours, phone, WhatsApp, email, address, CTA — the existing `footer-info`    |
| **Bottom bar**  | Copyright (dynamic year), legal links, `/sitemap/`                          |

**Rules:**

- **Never truncate a silo with a `slice()`.** Truncation is what creates orphans on sibling fleet
  sites. If a list is too long, use a two-column grid or a curated "top N + see all" — and make the
  "see all" link real.
- Every footer link needs the **trailing slash** (`trailingSlash: true`) or it 301s and wastes a hop.
- The copyright year is currently the literal `2025`. Derive it, or the site looks abandoned every
  January.
- Keep it **crawlable HTML** — no accordion that hides links from the DOM on mobile.

### Where to edit it

The footer is **scraped WordPress chrome**, not a React component. It lives in `content/site.json`
and is rebuilt by **`scripts/footer.mjs`** in the enrich chain — not `scripts/transform.mjs`, which
runs only in `npm run snapshot`. See `/site-navigation` for the mechanics. **Never edit
`content/site.json` or `public/wp-content/`.**

---

## 2. The header

Reaches ~5 top-level pages plus a services dropdown and a locations dropdown (`locations-drop-down`
exists in the scraped markup).

**Targets:**

- All 53 services and 24 locations reachable **within one hop** of any page.
- The dropdowns are the natural home for this — they already exist structurally.
- Keyboard operable: `aria-expanded`, `aria-controls`, Escape closes, focus returns. The current
  mobile menu has none of these (backlog §11.3) and the fix is an **enhancement layer**, never an
  edit to the vendored theme JS.
- Add a persistent **call** affordance in the header on mobile — the sticky bar covers this now, so
  verify they don't double up.

---

## 3. The silo model

```
/                                    home
├── /services/                       hub  → 53 service pages
│   ├── /services/<service>/         incl. 32 brand-key pages
│   └── (planned) emergency cluster
├── /אזורי-שירות/                    hub  → 24 location pages
│   └── /locations/<city>/
├── /מדריכים/            (planned)   hub  → guides
├── /מחירון/                         pricing — the magnet for every "כמה עולה" query
├── /אודותינו/  /contact/            trust
└── /step/…                          calculator funnel (noindex, follow — §1.5)
```

### 3.1 Cross-silo edges — the largest missing piece

| Edge                       | Today           | Target                                         |
| -------------------------- | --------------- | ---------------------------------------------- |
| service → location         | none contextual | 4–6 relevant cities per service page           |
| location → service         | full list       | keep, but order by local relevance             |
| brand-key → location       | **none**        | the 32 brand pages must reach the city silo    |
| location → nearby location | via `related`   | 2–4 genuinely adjacent, **both directions**    |
| guide → service            | n/a             | 2–3 per guide, descriptive anchors             |
| service → guide            | n/a             | 1–2 per service, once guides exist             |
| pricing ↔ everything       | weak            | `/מחירון/` should be reachable from every page |

### 3.2 The duplicate-intent pairs

`/קודן-לרכב/` ↔ `/services/קודן-לרכב/`, plus the חולון location pair
(`/locations/שכפול-מפתח-חולון/` ↔ `/locations/שכפול-מפתחות-חולון/`). **Both halves of each are
live URLs holding ranking signal.**

Link them to each other so they read as related rather than competing. **Never merge or rename
without a `public/_redirects` 301** (`docs/keyword-map.md` §8).

✅ RESOLVED 2026-10-14: the `מנעולן-רכב` and `מנעולן-לבית` pairs, the נתניה location pair and
`/שכפול-שלט-לרכב-2/` were merged on the owner's instruction, one page each. Survivors:
`/מנעולן-רכב/`, `/מנעולן-לבית/`, `/services/שכפול-שלט-לרכב/`, `/locations/שכפול-מפתח-בנתניה/`.
Every link to a removed page now points at its survivor or is gone — 22 authored modules repointed
(dropped instead where that would self-link or duplicate an entry),
`scripts/footer.mjs` changed to put `/מנעולן-רכב/` and `/מנעולן-לבית/` at the head of the services
column (the bottom bar drops any entry whose page is gone or that the column links), and
`scripts/prune-chrome-links.mjs` dropping the removed routes from the header city mega-menu and the
homepage areas band. Why each survivor won, the 301 plan and the 🔶 pending zone-level rule for
lowercase traffic: `docs/keyword-map.md` §8.1.

---

## 4. The contextual-link blocker

`lib/enrich/render.mjs` renders authored paragraphs through `paras()`, which calls `esc()`. **Any
`<a href>` written into an authored paragraph is HTML-escaped and renders as visible literal
markup.** Verified 2026-08-24.

So contextual in-copy linking — the cheapest remaining anchor-text win — **requires a renderer
change first**:

```js
// Option A (preferred): a typed, escaped-by-construction link list per paragraph
{ text: "...", links: [{ anchor: "שחזור מפתח לרכב", href: "/services/…/" }] }

// Option B: an explicit opt-in that bypasses esc() for a vetted subset
{ html: true, text: "… <a href=\"/services/…/\">שחזור מפתח</a> …" }
```

Option A keeps the escape-by-default guarantee, which is why the renderer is safe today. Prefer it.
Until one ships, in-copy references must **name** the target page in prose and rely on `related`.

---

## 5. Breadcrumbs

Visible trail comes from the gogo theme; `BreadcrumbList` is generated by `scripts/enrich.mjs` for
the authored pages (94 after the 2026-10-14 merge; 54 when this was written) and by
`scripts/pages.mjs` for its six utility pages (`/contact/`, `/sitemap/`, the two legal pages, and
the `/services/` and `/מדריכים/` hubs). **13 real pages emitted none** when backlog §4.8 was
written; in `content/site.json` on 2026-10-14 only the homepage and the four `/step/` routes do.
Markup and visible trail must agree — fix the markup to match what renders, never the reverse.

---

## 6. Orphan check

```bash
find out -name index.html | sed 's|^out||; s|index.html$||' | sort > /tmp/routes.txt
grep -rho 'href="/[^"]*"' out --include=index.html | sed 's|href="||; s|"$||' | sort -u > /tmp/linked.txt
comm -23 /tmp/routes.txt /tmp/linked.txt
```

Target: empty (excluding `/404/`, `/_not-found/`, `/thank-you/`). Hrefs in the export are
percent-encoded — decode consistently on both sides or the diff is meaningless.

---

## 7. Checklist for any IA change

- [ ] Footer reaches both silos; no `slice()` truncation; no empty column.
- [ ] All 53 services and 24 locations within one hop of the header.
- [ ] Every internal link has a trailing slash and is written unescaped.
- [ ] Cross-silo edges present, and location adjacency set on **both** sides.
- [ ] The remaining duplicate-intent pairs (§3.2) cross-link rather than compete.
- [ ] Breadcrumbs render **and** emit `BreadcrumbList`.
- [ ] Orphan check returns nothing.
- [ ] `npm run enrich && npm run build`, then re-run the orphan check.
- [ ] Nav changes are keyboard-operable and don't hide links from the DOM.
