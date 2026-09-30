# Dynamic presence plan — topbar, seasonal card, updates strip, reviews, automation

**Status: approved for execution, 2026-09-29.** Ten decisions below were taken by the owner in
the planning session that produced this document; the research behind it (eleven read-only
investigators plus a completeness critic, 984 tool calls, every external claim fetched that day) is
indexed in Appendix C. Everything in `docs/business-facts.md` still wins over this file.

The ask was: modernize the visual design and give the site an "always fresh, high-activity"
presence — an updates feed, a Google reviews widget, a context-aware seasonal popup, an
announcement topbar, and an automation engine that refreshes all of it without manual work.

**What the site can honestly do is narrower than the ask, and this plan says so item by item.**
The architecture is a byte-deterministic static export with human-only deploys; the Business
Profile's reviews have a provenance problem; there are no real offers; and organic traffic is close
to zero. A plan that ignored any of those would ship the same class of defect this repo has already
paid to remove three times (`docs/business-facts.md` §B.1–B.3, §D.4).

---

## 0. The decisions this plan rests on (owner, 2026-09-29)

| #   | Decision                                                                                                                                                                                                     | Consequence in this plan                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 1   | The 12 reviews that appeared 22–28/09 thank technicians (אבי, אביעד, שרון) who **do not exist** — they are the AI brand characters' names (§G.1). **Decision: have them removed; start a genuine ask-flow.** | The site references **no** review, count, rating or link until a genuine, ledgered baseline exists (§3.4).   |
| 2   | Jobs are done by a **fixed set of three partner locksmiths**; leads are routed to them; the Business Profile is verified on **one locksmith's own Google account**.                                          | "שלושה" and "we" stay honest; §A.2 stands. "Recent activity" copy must never imply the operator did a job.   |
| 3   | **No seasonal offers exist.** No discount, no special price.                                                                                                                                                 | Seasonal content = advice, availability, safety. No ₪ amount and no % may appear on any new surface.         |
| 4   | Popup = **a small, delayed, dismissible card**, never on the emergency pages.                                                                                                                                | Native `<dialog>`, shown on the 2nd pageview or after ~20 s + scroll, frequency-capped, never collects data. |
| 5   | Deploys stay **human-only**, plus phone reminders.                                                                                                                                                           | Nothing in this plan deploys by itself. Freshness without a deploy comes only from pre-authored schedules.   |
| 6   | A fleet **`status.json` kill switch** on an existing Cloudflare origin is acceptable; the account is treated as **Workers Free**.                                                                            | The only runtime input, and it can only _hide_ or _select_ — never inject text (§4.4).                       |
| 7   | Updates: **weekly**, supplied by the owner, pasted into a Claude session; the strip **auto-hides** when the newest item is older than 45 days.                                                               | `announcement-editor` agent + `content/enriched/_updates.mjs` (§3.3, §4.5).                                  |
| 8   | **Pilot on 3locksmiths first**; fleet reuse later at the data/logic layer only.                                                                                                                              | No site-kit change in phases 0–4 (§5, Phase 5).                                                              |
| 9   | Quiet days: **memorial days, fast days, election/Rabin day, and Shabbat + chag themselves** — all promotional/seasonal copy goes silent; only the evergreen line shows.                                      | Hand-kept overlay in the calendar; precedence rule in §4.2.                                                  |
| 10  | Open, not decided: WhatsApp prefill text; brand colour source; legal entity for the privacy notice.                                                                                                          | Listed under §6 as owner actions; nothing here assumes an answer.                                            |

---

## 1. Where the site actually stands — facts that gate the plan

Every row below was verified on 2026-09-29 unless it cites an older dated source.

| Fact                                                                                                                                                                                                                                                                   | Evidence                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| The theme already ships a **hidden topbar slot** on all 109 pages: `<div class="nav-main__top-bar"><div class="container">שירות מהיר ומיידי</div></div>`, first child of `.nav-main`, `display:none`. Its own styles use undefined variables, so it must be restyled.  | `content/site.json` (109/109); `public/wp-content/themes/gogo/assets/css/main.css:1008-1019`                          |
| The header is `position:absolute` until `nav.js` makes it fixed and writes a measured `padding-top` (~126 px desktop, ~84 px mobile) on `.template-header`. **No CSS reserves that height**, so the page already shifts late (~8 s on mobile). A topbar adds to it.    | `main.css:998-1011`; `nav.js:30-42,124-140`; screenshots in the research run                                          |
| The theme also still styles a latest-posts band (`.s-latest-posts`), a reviews band (`.s-feedback`, pruned 2026-08-26 because it held fake testimonials) and a `.ping-dot` "live" pulse. None is rendered.                                                             | `public/assets/main.css:380-400,1820-1941,3144-3200`; `scripts/pages.mjs` `PRUNE_SELECTORS`                           |
| The magnific-popup "contact popup" that CLAUDE.md describes **no longer exists** (0 `.modal-handler` elements sitewide). A new popup cannot reuse it; magnific's z-index (1042–1046) also sits under the sticky CTA (9990).                                            | node scan of `content/site.json`; `app/enrich.css:401-405`                                                            |
| `npm run enrich` must stay **byte-deterministic and offline** — CI re-runs it and diffs `content/site.json`. The only clock read in the pipeline is `scripts/lastmod.mjs:72`, guarded so it fires only for pages whose hash changed.                                   | `.github/workflows/ci.yml:57-66`; grep of `scripts/ lib/ app/ components/`                                            |
| `lastmod.mjs` fingerprints the **whole** `bodyHtml`. Any sitewide chrome text change re-stamps `<lastmod>` on all ~105 sitemap URLs — the exact failure the script exists to prevent.                                                                                  | `scripts/lastmod.mjs:65-69,106-112`; live sitemap: 78×2026-09-29, 27×2026-09-05                                       |
| Every content guard reads `content/site.json` (check-claims, claims, fix-links, phone) or the numeric modules (check-typography). **Nothing rendered from `app/layout.tsx`, fetched at runtime, or stored as JSON inside a `<script>` is checked by any of them.**     | `scripts/check-claims.mjs:24,27-34`; `scripts/check-typography.mjs:75`; `scripts/fix-links.mjs:21,38`                 |
| Everything added to `bodyHtml` ships **twice** (HTML + RSC flight payload): the homepage is 875,866 B, ~455 KB of it the payload. Six inline SVG icons in `section-advantages` cost ~200 KB (~400 KB with the copy).                                                   | `out/index.html` measurement; `content/site.json` front page offsets 43,633–243,651                                   |
| Deploys are human-only via `ops/deploy-site.ps1`, which runs **only** `npm run build` plus a 5-point output gate — none of the repo's own checks. CI last ran 2026-08-30. **GitHub `main` is 29 commits behind production**; the newest 13 commits exist only here.    | `Israeli services sites/ops/deploy-site.ps1:231-233,119-145`; `git rev-list --count origin/main..HEAD` = 29           |
| The Pages project is **Direct Upload** (source `null`, 22 `ad_hoc` deploys). Deploy hooks need Git integration, which a Direct Upload project can never gain.                                                                                                          | Cloudflare API read; developers.cloudflare.com/pages/get-started/direct-upload/                                       |
| Windows Task Scheduler cannot launch processes on this workstation (ManageEngine). A laptop cron is not an option.                                                                                                                                                     | `Sys Admin/.claude/skills/fleet/SKILL.md:67-70`                                                                       |
| Traffic: Search Console 0–9 clicks / ~100–160 impressions per 90 days; 22/105 URLs indexed. No A/B test can read at this volume. The measurement baseline month (September) ends 2026-09-30.                                                                           | `ops/gsc/fleet-3locksmiths.co.il.json`; memory `indexing-backlog-2026-09`; `/reporting-cadence`                       |
| **The Business Profile read is non-deterministic.** The documented `/maps/preview/place` request returns either a ~17 KB payload with no reviews section or a ~37 KB payload with `"12 ביקורות"`. "No ביקורות token" never meant 0 reviews.                            | Three consecutive reads this session: 17,928 B / 37,059 B / 17,203 B; `docs/business-facts.md` §B.5                   |
| Google's terms: Places API content **may not be cached or stored** (place ID excepted); GBP API content may be stored ≤ 30 days, never in git; self-serving reviews earn **no** star snippets, widgets included. GBP API eligibility ≈ **2026-11-04** at the earliest. | developers.google.com Places policies; my-business/content/policies, /prereqs; search review-snippet doc (2026-09-08) |
| `@hebcal/core` is GPL-2.0 (3.8 MB). Hebcal's REST data is CC BY 4.0 (credit required) and omits the 24 Tishrei memorial day and 7 October. Node 24 `Intl` prints `5.12.2026` for he-IL and `5787`, not `תשפ״ז`; CI runs Node 20 (ICU drift).                           | npm registry; hebcal.com REST (i=on) fetched; `node -e` tests; `ci.yml:33`                                            |
| Five sibling fleet sites carry written rules **against** popups and third-party review widgets.                                                                                                                                                                        | betonplus, hambabait, dangates, galbath, skyshade docs (paths in Appendix B)                                          |

---

## 2. Architecture & tech-stack strategy

### 2.1 The verdict in one sentence

**Author everything, guard everything at build time, pre-schedule the whole year, let the browser
choose the active variant by Israel time, and let the edge only hide.** No headless CMS, no scheduled
deploy, no third-party widget, no edge HTML rewriting, no second React client island.

### 2.2 The five rules every surface obeys

1. **Every visible word ships inside `content/site.json` as real HTML** — hidden elements or
   `<template>`, never JSON inside a `<script>` (check-claims strips scripts before matching:
   `scripts/check-claims.mjs:27-34`). That keeps every word inside check-claims, claims, typography,
   fix-links and phone.mjs.
2. **No clock and no network in the enrich chain.** Date selection happens in the browser in
   `Asia/Jerusalem`; copy changes happen through `npm run enrich` + a human deploy.
3. **Volatile chrome is excluded from the `<lastmod>` fingerprint and from snippets.** Every live
   region is wrapped in `<!--lm:ignore-->…<!--/lm:ignore-->` (stripped by `lastmod.mjs` before
   hashing) and carries `data-nosnippet` in the static HTML (Google: never add it via JS).
4. **Runtime input can only hide or select among pre-guarded variants — never inject text.** The one
   runtime input is `status.json` (§4.4); if it is unreachable, slow or malformed the site fails
   **closed**: promos hidden, the evergreen phone line always visible.
5. **No review, rating, count, badge, testimonial or "live stat" without a dated, sourced ledger
   row — and no `Review`/`AggregateRating` markup ever** (CI fails the build on it; Google gives no
   stars for self-serving reviews anyway).

### 2.3 Layer map

```
content/enriched/_calendar.json    generated by a HUMAN-RUN, networked script (scripts/calendar-sync.mjs):
                                   Hebcal REST i=on (CC BY 4.0, credited) + hand-kept Israeli overlay
content/enriched/_campaigns.mjs    authored windows + copy; every entry cites a business-facts row
content/enriched/_updates.mjs      weekly owner items, one sentence + optional catalog photo
        │
        │  npm run enrich  →  scripts/live-surfaces.mjs   (footer.mjs idiom: parse, sentinel, set_content, converge)
        ▼
content/site.json   ← .nav-main__top-bar   : ALL topbar variants as hidden HTML, one data-campaign each
                    ← .s-latest-posts      : the updates strip (homepage), dated cards, no per-item URL
                    ← <dialog class="live-dialog"> : the seasonal card (omitted on 93xx, /thank-you/, /step/)
        │  guards: check-claims (extended), check-typography (extended), fix-links, phone.mjs,
        │          check-campaigns (NEW), schedule simulator (NEW, node:test)  — all in `prebuild`
        ▼
app/layout.tsx      constant inline <head> resolver (window table only, ~1–2 KB) → html[data-live="<id>"]
app/enrich.css      reveals the matching variant BEFORE first paint; JS off → evergreen only
public/assets/live.js (deferred, static, cached)  → <dialog> logic, dismissal (localStorage in try/catch,
                    fail = don't show), 45-day decay rule, status.json fetch (1.5 s timeout, fail closed),
                    dataLayer surface_view / surface_dismiss (variant id only, no PII)
imgquarry.com/status/fleet.json   ← written from Sys Admin (wrangler r2 object put); read by every fleet site
```

Why the resolver is an inline `<head>` script and not a second `"use client"` component: Next 16's
own guide prescribes exactly this for date-dependent UI (`node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md:47-61`),
it runs before first paint, and a client island would run only after hydration — behind the ~8 s
theme-script replay on mobile. `ThemeScripts` stays the only client component (CLAUDE.md §9).

### 2.4 Seams — where each surface attaches and what it costs

| Seam                                                 | Reaches                     | Guarded? | lastmod-safe?                       | Verdict                                                                                                                             |
| ---------------------------------------------------- | --------------------------- | -------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Pipeline pass into scraped chrome (footer.mjs idiom) | 109/109 pages               | **yes**  | only with the `lm:ignore` exclusion | **Chosen** for topbar, updates strip, dialog. Bytes ship twice, so variants stay short.                                             |
| RSC component in `app/layout.tsx` (StickyCta idiom)  | all routes incl. /thank-you | **no**   | yes                                 | Only for the resolver script and CSS. Never for copy.                                                                               |
| New authored block in `lib/enrich/render.mjs`        | 99 pages with a module      | yes      | per page                            | Later, for a per-page "updates" block on /אודותינו/. Not sitewide — sitewide defaults are how `DEFAULT_STATS` fabricated.           |
| New route via `scripts/pages.mjs` (97xx)             | one URL                     | yes      | yes                                 | Only for a `/עדכונים/` hub, and only after the 2026-10-29 indexing checkpoint (§3.3).                                               |
| Pages Function / HTMLRewriter (`functions/`)         | every request               | **no**   | n/a                                 | **Rejected** for content: bypasses all gates, bills every HTML hit, 10 ms CPU vs an 876 KB page, ships silently on the next deploy. |
| GitHub Actions scheduled deploy (skyshade pattern)   | —                           | —        | —                                   | **Rejected**: contradicts CLAUDE.md §10 and `ci.yml:9-11`, needs an account-wide Pages token, and `main` is a month stale.          |
| GTM Custom HTML in the shared container              | 11 domains                  | **no**   | n/a                                 | **Rejected** except as a last-resort emergency off-switch.                                                                          |
| Third-party review widget (Elfsight etc.)            | —                           | **no**   | n/a                                 | **Rejected**: injects schema CI cannot see, sets marketing cookies, full DOM control under `'unsafe-inline'`.                       |

### 2.5 Tech stack — what is added, and what is deliberately not

- **Added: nothing to `dependencies`.** Native `<dialog>`, vanilla JS, `node:test` for the schedule
  simulator, `node-html-parser` (already present) for the pipeline pass.
- **Hebcal:** REST JSON fetched by a human-run script and committed with a CC BY 4.0 credit line.
  Never `@hebcal/core` in anything that ships (GPL-2.0). Never `Intl` inside the enrich chain
  (Node 20 in CI vs Node 24 here — ICU output differs; §1). All user-visible date strings are
  **pre-rendered** `dd/mm/yyyy` by the generator, never formatted at runtime.
- **Optional, Phase 3+:** `wrangler` pinned as a devDependency **only** if an edge proxy is ever built
  (Phase 4c). Playwright **only** for the screenshot matrix, and only if it survives CLAUDE.md §13's
  "can the platform already do this".

---

## 3. UI/UX wireframe outlines

All markup is RTL-first: logical properties only in `app/enrich.css`, phone numbers in `dir="ltr"`
islands, גרש/גרשיים per CLAUDE.md §8. Every colour pair is AA: white on `#00702b` (6.26:1) or
`#075e54` (7.67:1) — never on the theme accent `#009f3c` (3.49:1) or WhatsApp green `#25d366`
(1.98:1). One `prefers-reduced-motion` block in `enrich.css` neutralises every new motion **and**
the theme's existing unguarded `.phone-btn:before` pulse (`main.css:6126-6147`).

### 3.1 Announcement topbar — in the theme's own slot

```
┌──────────────────────────────────────────────────────────────────────────────┐  .nav-main__top-bar
│  [✕]   וואטסאפ 055-660-1006  ·  שיחה 076-599-1266     ?צריכים מנעולן עכשיו  ⚡ │  36 px desktop / 32 px mobile
└──────────────────────────────────────────────────────────────────────────────┘  navy #011532, white text
│                               existing .nav-center (logo · menu · 24/7 · CTA)                   │
```

- **Placement:** the existing `.nav-main__top-bar` node, un-hidden via
  `body .nav-main .nav-main__top-bar[data-live-slot]{display:flex}` in `enrich.css` (specificity
  beats the vendored rule; never edit `main.css`). Because it sits _inside_ `.nav-main`, `nav.js`
  measures it automatically and it rides the fixed header.
- **Prerequisite (Phase 0):** a CSS height reserve per breakpoint on `body .template-header`
  equal to what `nav.js` measures (topbar included), so the header stops covering the hero before JS
  runs. This removes a pre-existing late layout shift; without it the topbar's CLS gets blamed on
  the topbar.
- **Content model:** one message at a time. **No ticker, no rotation** (WCAG 2.2.2 pause/stop/hide
  - IS 5568; and a rotating region must not be `aria-live`). If two messages are ever needed, a
    manual ‹ › control, never a timer.
- **Variants (all pre-rendered, hidden; the resolver reveals one):**
  - `evergreen` — the default and the JS-off state. Puts **WhatsApp on desktop**, where the sticky
    bar does not exist (conversion goal #2, backlog §8.2). Draft copy for `hebrew-copywriter`:
    `צריכים מנעולן עכשיו? שיחה 076-599-1266 · וואטסאפ 055-660-1006`.
  - `seasonal-*` — advice only (§4.2 list). Each links to an **existing** guide or section.
  - `safety-summer` — `ילד או חיית מחמד נעולים ברכב? התקשרו קודם ל-100 או ל-101` linking to the
    9301 safety section. Non-commercial; wins over any seasonal variant.
  - `reduced` — `זמינות מופחתת כרגע — התקשרו ונעדכן` (shown only when `status.json` says so;
    strips the 24/7 wording from the bar; the schema cannot change at runtime, so a reserve-duty
    period longer than a week needs a deploy that changes `openingHoursSpecification` too).
  - `quiet` days show `evergreen` only.
- **Links:** `data-cta="topbar-call"` and `data-cta="topbar-whatsapp"` — the `-call`/`-whatsapp`
  suffix is what the shared GTM container counts as `contact_click` (its predicate is
  `-(call|whatsapp)$`). The ✕ stores a per-campaign dismissal in `localStorage` inside `try/catch`.
- **Existing text `שירות מהיר ומיידי`** is an unquantified speed claim; it is replaced, not revealed.
- **Bytes:** ~120 B per variant × ~8 variants × 2 (payload) ≈ 2 KB per page. Acceptable; the
  SVG-icon swap in §3.5 pays it back 200×.

### 3.2 Seasonal / context card — native `<dialog>`

```
        ┌───────────────────────────────────┐   max-width 360 px, centred; on mobile: bottom sheet
        │ ✕                                 │   with margin-bottom ≥ 72 px so it never covers .sticky-cta
        │   🕎  חופשת חנוכה מתקרבת            │   title = <p class="live-dialog__title"> (no h1/h2 — CI enforces
        │   נוסעים? ודאו שיש מפתח רזרבי       │   one h1; a heading on 100 pages adds outline noise)
        │   אצל מישהו שאתם סומכים עליו.       │
        │   [ 📞 התקשרו עכשיו ]  [ וואטסאפ ]   │   primary = tel: (data-cta popup-call), secondary WhatsApp
        │   למדריך המלא ←                     │   tertiary = existing guide link (data-cta popup-link)
        └───────────────────────────────────┘   backdrop 40 %; no form fields, ever
```

- **Why `<dialog>.showModal()`:** it renders in the browser's **top layer**, above the z-index war
  (`.menu-toggle` 99,999,999 · `.sticky-cta` 9,990 · magnific 1,042), and gives focus-on-open,
  Tab containment, Esc and focus-return for free (ARIA APG modal contract; IS 5568). `aria-modal`
  and `aria-labelledby` set explicitly.
- **Trigger rules (Google's interstitial guidance + this site's emergency intent):** never on first
  pageview from search; show on the **2nd pageview** of a session or after **20 s and a scroll**;
  never on the 93xx emergency pages, `/thank-you/`, `/step/*`, or any page whose answer block
  carries the 100/101 line; at most once per campaign per 14 days; never while `status.json` says
  `quiet`/`reduced`/`off`; never on a quiet day. If storage throws (private mode, in-app webviews) →
  **do not show**.
- **Content = the same seasonal advice as the topbar**, one card per window, authored in
  `_campaigns.mjs` under `dialog`. No offers, no countdowns, no "X people viewing".
- **Markup** is injected by `live-surfaces.mjs` only on pages where it may show, hidden (`<dialog>`
  without `open`), inside `lm:ignore` sentinels and `data-nosnippet`.

### 3.3 Company updates strip — restore `.s-latest-posts` on the homepage

```
 ── עדכונים אחרונים ─────────────────────────────────────────────────────────────  <section class="s-latest-posts">
 ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
 │ 02/09/2026         │ │ 05/09/2026         │ │ 29/09/2026         │   3 newest cards, newest first (RTL)
 │ המספר החדש שלנו:    │ │ הפרופיל שלנו בגוגל  │ │ 25 אזורי שירות     │   date · one sentence · optional link
 │ 076-599-1266 …     │ │ מפות עלה לאוויר …   │ │ מעודכנים …         │   optional owner photo (catalog, EXIF-stripped)
 │ למידע נוסף ←        │ │                    │ │ לרשימה המלאה ←     │
 └────────────────────┘ └────────────────────┘ └────────────────────┘
```

- **No per-item URLs.** Only 22/105 URLs are indexed and the `/מדריכים/` hub is not among them; new
  thin URLs would join a queue Google is not draining and compete with the owner's ~10/day
  Request-Indexing clicks. Cards link to **existing** evergreen pages. A `/עדכונים/` hub
  (pages.mjs, 97xx, `CollectionPage`) is reconsidered **after the 2026-10-29 indexing checkpoint**,
  and per-item `BlogPosting` URLs are not planned at all — anything substantive enough for a URL is a
  guide and belongs in the 92xx pipeline.
- **Placement:** after `section-advantages` on the homepage (the one reliably indexed page); the
  band is scraped chrome, so `live-surfaces.mjs` re-creates it from the theme's own `.s-latest-posts`
  vocabulary (already styled in `public/assets/main.css:1820-1941`). Later, an optional authored
  `updates` block on `/אודותינו/` through `render.mjs` (per-page opt-in, never a default).
- **Honesty rules:** every item cites a `docs/business-facts.md` row or an owner-supplied event
  with a date; absolute `dd/mm/yyyy` dates only (relative "לפני 3 ימים" cannot be baked into static
  HTML); the strip **hides itself client-side** when the newest item is older than 45 days
  (decision 7); the homepage `<lastmod>` moves when an item is added — that is a real content change
  and is left inside the fingerprint on purpose (the strip is _not_ wrapped in `lm:ignore`).
- **Starting corpus (all sourced today):** the 076 line (§C.5, 02/09), 24/7 confirmed (§D.3,
  30/08), 25 service areas (§E.1, 02/09), the Business Profile live (§B.4, 05/09), the guides hub.
- **Photos:** owner job photos only through Media Studio with EXIF stripped (raw catalog originals
  are served untransformed at `imgquarry.com/<key>` — GPS would leak), plates and faces out of frame,
  customer consent, city only, one week after the job, never a street. Never an AI image as a real
  job (§G.1).
- **Visible dates on the 11 guides** (`פורסם / עודכן: dd/mm/yyyy`, rendered from the same module
  fields as the Article JSON-LD) ship in the same phase — today the guides carry
  `dateModified 2026-08-25/26` in schema, no visible date, and sitemap lastmod 05/09 or 29/09.

### 3.4 Google reviews — three states, gated on a ledger

**State A — now (decision 1): nothing.** No widget, no count, no rating, no "see our reviews" link.
The 12 reviews are being removed; the site must not draw a visitor's eye to them. The one thing that
ships is a **compliant ask-flow** (§4.6) — the only lever that ever produces genuine social proof.

**State B — after ≥ 5 genuine reviews with a dated ledger row** (`docs/local-presence.md` §3, read
with the §B.4 command _and_ confirmed in the owner's dashboard, because the endpoint is
non-deterministic):

```
  ┌───────────────────────────────────────────────┐   contact block + footer, static, zero JS
  │  ★ N ביקורות בגוגל · נכון ל-dd/mm/yyyy         │   count + read date from a committed reputation ledger
  │  [ הביקורות שלנו בגוגל ↗ ]  [ כתבו לנו ביקורת ] │   links: Google-issued reviewsUri / writeAReviewUri
  └───────────────────────────────────────────────┘   data-cta review-link / review-ask ; no schema
```

The count is a business fact: it ships as text, cites its ledger row, and `scripts/check-claims.mjs`
`review-widget-markup` / `ratings` rules are **re-keyed** to fail only when the ledger count is 0 or
the row lacks a source URL. The `.s-feedback` band stays pruned.

**State C — live review display (≥ 2026-11-04 + GBP API approval, owner accepts Google's
relevance ordering and a possible negative):** a same-origin proxy (Pages Function or Worker route
holding the key as a secret, source of truth in Sys Admin) calling Place Details (New) **per view,
uncached** (`reviews` field = Enterprise + Atmosphere SKU, 1,000 free/month then $25/1k, max 5
reviews by relevance, no "newest") — or the GBP API (`reviews.list`, all reviews, newest-first)
synced into KV with a **≤ 30-day TTL, never git**. Rendering rules: `textContent` only (UGC is an
XSS path under `'unsafe-inline'`), author avatar + name + profile link, per-review `googleMapsUri`
and `flagContentUri`, the Google Maps logo, a Hebrew ordering notice (`הביקורות מוצגות לפי
רלוונטיות, כפי שמחזירה Google`), `originalText` with `<bdi>` for Latin/Cyrillic/Arabic names, lazy
on scroll-into-view, homepage + `/contact/` only, hard GCP quota caps. Hide below the threshold;
**never filter by stars** (display-side gating and a ToS "search results integrity" breach). No
`Review`/`AggregateRating` markup — ever — and a rendered-DOM check is added so a future widget
cannot inject it past CI.

### 3.5 Visual modernization — tokens, not a redesign

This is a fidelity port ("improvement is often regression", CLAUDE.md §13), so modernization is a
set of measurable, reversible overrides in `app/enrich.css` and pipeline passes — no dark mode, no
new layout, no new fonts.

| Lever                                                                                                                                                | Effect                                                                 | Where                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Palette override at `html:root` of the 11 customizer variables (the theme routes 309 colour uses through them): accent `#009f3c` → AA-safe `#00702b` | ~61 accent uses recoloured at once; fixes the 3.49:1 contrast defect   | `enrich.css`; source of truth = roster `brand.*` (currently all `null` → owner action §6)                       |
| Never define the theme's intentionally-undefined variables (`--color-white`, `--shadow`, `--font-primary`, …); new tokens are namespaced `--ls-*`    | avoids the white-on-white nav incident recorded in `app/globals.css`   | `enrich.css`                                                                                                    |
| `prefers-reduced-motion` block                                                                                                                       | all new motion + the existing phone-button pulse honour the preference | `enrich.css`                                                                                                    |
| Header height reserve per breakpoint (§3.1)                                                                                                          | removes a pre-existing ~84–126 px late shift                           | `enrich.css`                                                                                                    |
| Swap the six ~33 KB inline SVG icons in the homepage `section-advantages` for small SVGs                                                             | −200 KB body, −400 KB total HTML on the LCP-critical page              | new pipeline pass (claims.mjs / hero-gallery idiom)                                                             |
| Footer `© 2025` → year-free `© שלושה מנעולנים`                                                                                                       | removes the most visible "abandoned site" cue; deterministic           | `scripts/footer.mjs`                                                                                            |
| Visible `פורסם / עודכן` dates on guides (§3.3)                                                                                                       | honest freshness signal Google recommends                              | `lib/enrich/render.mjs`                                                                                         |
| Spacing/typography polish scoped under `.content-blocks` and the new `.live-*` classes                                                               | consistent rhythm without touching vendored CSS                        | `enrich.css`, checked by `scripts/check-css-cascade.mjs` (extend it to read `media.css` and the inline `:root`) |

Every colour or spacing change is verified by **computed-style comparison on the rendered page**, the
same way the port was verified — not by reading CSS.

---

## 4. Automation & data-flow pipeline

### 4.1 The calendar — generated once a year by a human, consumed offline forever

`scripts/calendar-sync.mjs` (**networked, human-run, never in the enrich chain** — the same split as
the image pipeline):

1. Fetch `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=on&mod=on&year=<Y>&i=on&lg=he` for
   the current and next two Hebrew years. `i=on` is mandatory (the default is the diaspora
   schedule, which shifts Shmini Atzeret and the last day of Pesach). Use the `hebrew` field, not
   `title` (which carries nikud).
2. Merge the **hand-kept overlay** `content/enriched/_calendar.overlay.json`: 24 Tishrei Iron Swords
   memorial (Mon 05/10/2026, Mon 25/10/2027; moves to Sunday when on Shabbat — a government decision,
   not in Hebcal), 7 October, Rabin memorial (22/10/2026), Knesset election day (27/10/2026, public
   day off), Ministry of Education vacations (Hanukkah 06–12/12/2026, Pesach 13–28/04/2027, summer
   from 21/06 or 01/07/2027), and the weekly Shabbat window.
3. Emit `content/enriched/_calendar.json`: every window as `{ id, kind, from, until, label }` with
   **explicit ISO offsets** (`+03:00` until 2026-10-25 02:00, `+02:00` after; `+03:00` again from
   2027-03-26), sundown-aware: memorial days start **12:00 on the eve**, chagim at **candle-lighting
   minus 60 min**, Yom HaAtzmaut festive copy not before **nightfall** after Yom HaZikaron. Shabbat is
   a padded fixed window (Fri 15:00 → Sat 21:00 Israel time) rather than astronomical. Every
   user-visible date string is pre-rendered `dd/mm/yyyy`; Hebrew years in letters (תשפ״ז) come from a
   small lookup, not `Intl`. 5787 is a leap year — Adar I/II logic is data, never month matching.
4. Write the CC BY 4.0 credit into the file header and `docs/`. Add the file to `.prettierignore`.
5. `check-campaigns` fails when the calendar ends less than **12 months** after today.

### 4.2 Resolution in the browser — the precedence that cannot be argued about at 3 a.m.

```
status.json override (off | quiet | reduced)      ← runtime, fail-closed
  > quiet-day window                              ← memorial, fast, election/Rabin, Shabbat + chag
    > safety window (summer hot-car line)         ← non-commercial, always allowed to win
      > seasonal advice window (highest priority number wins on overlap; check-campaigns forbids ties)
        > evergreen                               ← also the JS-off state and the fallback for any error
```

- Evaluated in `Asia/Jerusalem` from windows that already carry offsets — never the visitor's
  local date, never `new Date('YYYY-MM-DD')` (parsed as UTC midnight = 03:00 in Israel).
- Re-evaluated on `pageshow` and `visibilitychange`, so a tab left open across a sundown flips.
- A **time-travel preview**: `?at=2026-12-04T18:30+02:00` is honoured client-only (never linked,
  so never indexed) for review; the schedule simulator (§4.3) is the automated version.
- Page scoping: the body wrapper already carries the WordPress body class; `live-surfaces.mjs` adds
  `data-live-kind="<manifest kind>"` and `data-live-noint` on excluded routes so the resolver can
  refuse the dialog without a lookup table.

### 4.3 Build gates — run on every human deploy, not only in CI

`deploy-site.ps1` runs only `npm run build`; CI has not run since 2026-08-30. So the gates that must
protect production go into an npm **`prebuild`** script (npm runs it before `build` automatically):

| Gate                                         | Fails when                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check-freshness` (exists)                   | `content/site.json` is older than its sources                                                                                                                                                                                                                                                                                     |
| `check-claims` (**extended**)                | ⛔ patterns in `site.json` **or** in `_campaigns.mjs`/`_updates.mjs` string values **or** in `out/**/index.html`; new BLOCKING rules: arrival time `תוך \d+ דקות`, `טכנאים זמינים`, `נותרו`, `רק היום`, `\d+% הנחה`, `במקום \d+ ₪`, countdowns, ★ + number                                                                        |
| `check-typography` (**extended**)            | ASCII quotes in `_campaigns.mjs`, `_updates.mjs`, `_calendar.json` labels (add holiday tokens: `ל״ג`, `חוה״מ`, `ט״ו`)                                                                                                                                                                                                             |
| `check-campaigns` (**new**)                  | a window lacks an offset; a seasonal window overlaps a quiet window; two windows tie on priority; runway < 30 days of authored windows; the calendar ends < 12 months out; an entry cites no business-facts row; a link is not a live route; a `data-cta` lacks the `-call`/`-whatsapp` suffix; an update's date is in the future |
| schedule simulator (**new**, `node:test`)    | `resolve(schedule, instant)` over every hour of the next 400 days produces an overlap, a quiet-day promo, a wrong-side DST result on 2026-10-25/2027-03-26, or an Adar mis-match in 5787                                                                                                                                          |
| `check-live-regions` (**new**)               | a `lm:ignore` region appears inside `<main>`, or a live region lacks `data-nosnippet`, or a variant is stored as JSON in a `<script>`                                                                                                                                                                                             |
| rendered-DOM rating scan (**new**, Phase 4c) | any `Review`/`AggregateRating` JSON-LD or third-party review host after JS runs                                                                                                                                                                                                                                                   |

`.prettierignore` gains `content/enriched/_calendar.json` and `public/assets/live-schedule.json`,
or the Stop hook's Prettier pass creates a format → enrich loop.

### 4.4 The kill switch — `status.json`, read-only, fail-closed

- **Where:** `https://imgquarry.com/status/fleet.json` — the R2 public bucket the fleet already
  serves images from (free egress, CDN-cached, same account). Shape:
  `{ "mode": "normal" | "quiet" | "reduced" | "off", "until": "<ISO>", "note": "<internal>" }`.
  `quiet` = evergreen only; `reduced` = the reduced-availability variant, dialog off; `off` = topbar
  and dialog hidden entirely (the sticky bar and header phone never go away).
- **Write path:** a Sys Admin runbook (`wrangler r2 object put` with the existing Studio token;
  bucket CORS `GET` for the fleet origins; `Cache-Control: max-age=60`). Phase 3b adds a
  phone-friendly Hebrew form behind Cloudflare Access one-time PIN — on the apex, `www` **and**
  `*.pages.dev`, which all serve the site.
- **Read path:** `live.js` fetches after first paint with a 1.5 s timeout; any failure = `normal`
  behaviour minus promos (**fail closed**); the response can only set `mode` — it carries no text.
  `public/_headers` `connect-src` gains `https://imgquarry.com`.
- **Pre-approved wartime state:** `quiet` plus the evergreen line. A `פועלים בכפוף להנחיות פיקוד
העורף` variant is authored in advance and revealed only under `mode: reduced`. The site never
  repeats Home Front Command alerts.
- Cloudflare dashboard rollback remains the last resort (instant, but reverts everything since).

### 4.5 Weekly updates — intake without infrastructure (decision 7 + 10)

1. The owner pastes one sentence (+ optional photo) into a Claude session.
2. The **`announcement-editor`** agent (new) drafts the `_updates.mjs` entry: date, one sentence in
   the brand voice via `hebrew-copywriter`, a link to an existing page, and the business-facts row
   or owner message it rests on. It never invents an item, never writes a number it cannot cite, and
   never names a customer, street or plate.
3. `npm run enrich` → `prebuild` gates → the owner deploys with `ops/deploy-site.ps1`.
4. **Reminders, no deploy:** a Claude scheduled routine (`/schedule`) or a build-only GitHub Action
   (after `main` is pushed) reads the **live** `public/assets/live-schedule.json` and the live
   homepage weekly and pushes to the owner's phone via the existing ntfy topic: runway < 30 days; a
   window expiring in 14 days with no successor; no update in 21 days (the strip hides at 45); a
   quiet day in 7 days (set Business Profile special hours). It reads production, so it warns about
   what visitors actually see — not about the repo.
5. **Write once, publish twice** (Phase 4b): the same `_updates.mjs` entry becomes a Business
   Profile post through the GBP `localPosts` API once access is approved (posts live 6 months; no
   phone number in the text — use the CALL button).

### 4.6 Reviews — acquisition first, data path later

- **Now:** the posters delete the 12 reviews from their own Google accounts; the owner replies to
  none; `local-presence-strategist` re-reads weekly (three reads, both payload shapes) and logs the
  count until the genuine baseline is 0 again.
- **Ask-flow (the only thing that produces reviews):** at the vehicle, at the moment of relief, a
  **QR/NFC card** opening the profile's official "Get more reviews" link (copied from the dashboard
  on a desktop browser — it cannot be generated on mobile; never reconstructed from the place ID
  by hand). The same link in the post-job WhatsApp from `+972556601006`, whose first line **names
  שלושה מנעולנים and the job** because that number serves ~10 fleet brands. Same wording to every
  customer; no incentive; no sentiment gating; drip, never a batch. Test the link on a real Android
  and a real iPhone. The place ID `ChIJpcB6V12ivggRi8lyDvLJiNs` is the one identifier Google lets us
  store forever — record it in the roster.
- **From ≈ 2026-11-04:** apply for GBP API Basic Access from a **manager** account (never the
  owner login), OAuth app in **Production** status (a Testing app's refresh token dies after 7 days),
  token custody in Sys Admin. Then: Pub/Sub `NEW_REVIEW` → ntfy alert + a Hebrew reply draft the
  owner approves (Google forbids automated replies without express consent); a **velocity guard**
  that alerts when > X reviews arrive in 7 days (Google's "unusual volumes" rule); an unanswered
  review older than 48 h alert.
- **Display** follows §3.4 states B and C, in that order, and only after the ledger says so.

### 4.7 Measurement — honest at this traffic

- New `data-cta` values: `topbar-call`, `topbar-whatsapp`, `popup-call`, `popup-whatsapp`,
  `popup-link`, `update-link`, `review-ask`, `review-link`. CI's 5-value floor stays.
- Two `dataLayer` events, no PII: `surface_view` and `surface_dismiss` with `{ surface, variant }`.
  One hostname-scoped trigger + tag in the shared container, tested in Preview first.
- **Freeze the September baseline before anything ships** (GA4 `contact_click` by `data-cta`,
  `/thank-you/` views, GSC, Business Profile performance). No lift claims: at 0–9 clicks per 90
  days nothing reaches significance; the readable signal is total `contact_click` per session and
  the owner's own call log. Stagger launches so each can be read apart from the 2026-10-29 indexing
  checkpoint and the holiday period.
- Do **not** switch the CSP to enforcing to "protect" any of this: `connect-src` lacks the GA4
  hosts, so enforcing would silently end measurement. Add a CSP report sink (Page Shield, free,
  owner toggle) first — the report-only policy has collected nothing since 2026-08-25.

---

## 5. Step-by-step roadmap

Each phase ends with the full build gate (CLAUDE.md §11) plus the new `prebuild` gates, the
rendered-page check (never report done from the source — memory `verify-rendered-not-source`), and a
human deploy. **Launch caution:** the first four weeks contain Simchat Torah (03/10, the Hebrew-date
anniversary of 7 October), the 24 Tishrei memorial (05/10), 7 October, Rabin day (22/10), the DST
change (25/10) and election day (27/10). Nothing festive ships before the quiet-day machinery does;
the first seasonal window is **Hanukkah (first candle 04/12/2026)**.

### Phase 0 — Prerequisites and hygiene (this week; mostly owner + docs)

| #   | Task                                                                                                                                                                                                                                                                                                                                                                                                                               | Who                     | Done when                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------- |
| 0.1 | Have the 12 reviews deleted by their posters; replace the two AI-generated profile photos with real key/lock photos; stop any review collection that is not the §4.6 ask-flow                                                                                                                                                                                                                                                      | owner                   | ledger reads 0 genuine-baseline; photos real                    |
| 0.2 | Push the 29 local commits so `main` matches production; enable GitHub secret scanning + push protection (free on a public repo); consider branch protection                                                                                                                                                                                                                                                                        | owner / operator        | `git rev-list --count origin/main..HEAD` = 0                    |
| 0.3 | Freeze the September baseline (§4.7)                                                                                                                                                                                                                                                                                                                                                                                               | operator                | a dated snapshot in `docs/reporting/`                           |
| 0.4 | Record the place ID and the Google-issued review/write-review URLs in the roster (`schema.*` or a new `googleProfile` block — fleet schema change) and sync down                                                                                                                                                                                                                                                                   | operator                | `site.config.json` carries them                                 |
| 0.5 | Add the `prebuild` script; add `check-campaigns`, `check-live-regions` and the simulator as stubs that pass on an empty register                                                                                                                                                                                                                                                                                                   | `rtl-frontend-engineer` | `npm run build` runs the gates                                  |
| 0.6 | Header height reserve + `prefers-reduced-motion` block in `enrich.css`; measure on the rendered page at 1366/992/768/360                                                                                                                                                                                                                                                                                                           | `rtl-frontend-engineer` | no pre-JS hero overlap; CLS unchanged or better on the live URL |
| 0.7 | Fix stale doctrine that would misjudge this plan: `conversion-optimizer` (24/7 is ✅), `aeo-geo-strategist` + `/aeo-answer-content` + backlog §6.1 (the live robots.txt allows every AI bot), `local-presence-strategist` (posts live 6 months; Q&A discontinued 2025-11-03; the two payload shapes), `web-security-headers` (`_headers` exists), CLAUDE.md §1 (no contact popup) and §4 (`html-react-parser` is not a dependency) | operator                | agents cite `business-facts` rows instead of restating facts    |
| 0.8 | Enable Cloudflare Page Shield (free) so the report-only CSP finally reports                                                                                                                                                                                                                                                                                                                                                        | owner (zone toggle)     | violations visible in the dashboard                             |

### Phase 1 — Calendar, topbar, gates (weeks 1–2)

1. `scripts/calendar-sync.mjs` + `_calendar.overlay.json` → `content/enriched/_calendar.json`
   (§4.1). Commit with the CC BY credit. `.prettierignore` updated.
2. `content/enriched/_campaigns.mjs` with: `evergreen`, `quiet` (derived), `safety-summer`
   (15/06–15/09), `hanukkah-travel` (03/12–12/12 → guide 9211), `winter-battery` (01/11–31/03 →
   guide 9210), `pesach-cleaning-keys` (13/04–28/04/2027 → the relevant guide), `back-to-school`
   (15/08–10/09/2027), `before-shabbat` (weekly Thu 17:00 → Fri 14:00, spare-key advice, the tested
   Bnei Brak framing). Copy by `hebrew-copywriter`; every entry cites its row.
3. `scripts/live-surfaces.mjs` in the enrich chain (after `footer.mjs`, before `fix-links.mjs` so
   every link is validated and gets its `data-cta`): fills `.nav-main__top-bar` with all variants
   inside `lm:ignore` sentinels + `data-nosnippet`; emits `public/assets/live-schedule.json`.
4. `scripts/lastmod.mjs`: strip `lm:ignore` regions before hashing (assert on a fixture that the
   homepage hash is unchanged when only a variant changes).
5. `app/layout.tsx`: the constant inline resolver (`<html suppressHydrationWarning>`), reading the
   window table imported from `_campaigns.mjs` at build time. `app/enrich.css`: slot styling,
   `html[data-live="…"]` reveal rules, JS-off = evergreen.
6. `check-campaigns`, `check-live-regions`, the simulator, and the check-claims/typography
   extensions (§4.3). Add the topbar `data-cta` values to the tracking skill.
7. Gate, deploy, **verify on the live URL** with `?at=` for Hanukkah, a quiet day, DST night.
   Lighthouse on the live URL, 3 runs (the local harness under-reads by ~1.8 s — memory
   `match-production-compression`).

### Phase 2 — Updates strip, seasonal card, visual tokens (weeks 2–4)

1. `content/enriched/_updates.mjs` seeded from the sourced corpus (§3.3); `live-surfaces.mjs`
   restores `.s-latest-posts` on the homepage; the 45-day decay rule in `live.js`.
2. `announcement-editor` workflow live (§4.5); the first weekly item from the owner.
3. Visible dates on guides + `scripts/check-dates.mjs` (dateModified ≥ datePublished, not in the
   future, moves only when a main-content fingerprint moves).
4. `public/assets/live.js`: the `<dialog>` card with the §3.2 rules; `surface_view`/`surface_dismiss`
   events; GTM trigger + tag added hostname-scoped and tested in Preview.
5. Visual tokens (§3.5): `html:root` palette override from roster `brand.*` (owner supplies colours
   or approves the AA-safe defaults), SVG icon swap pass, footer year, computed-style verification.
6. `/accessibility-statement/` updated for the dialog and the reduced-motion support (it makes
   specific, falsifiable claims; "last updated" moves).
7. Gate, deploy, verify live.

### Phase 3 — Kill switch and reminders (weeks 4–6)

1. `status.json` on the R2 public bucket + Sys Admin runbook + CORS + `connect-src` (§4.4);
   `live.js` reads it fail-closed; a drill: flip `quiet`, confirm on the live URL within 60 s, flip
   back.
2. The weekly reminder routine (§4.5 step 4) via `/schedule` — reads production, pushes to ntfy.
3. Optional: Playwright screenshot matrix for the key dates (only if it survives §13).
4. Phase 3b (optional, owner decision): the Access-OTP phone form for `status.json`.

### Phase 4 — Reviews, gated on genuineness and on Google (from ≈ 2026-11-04)

- **4a (now, continuous):** the ask-flow (§4.6); weekly ledger reads; nothing on the site.
- **4b (≥ 5 genuine reviews, ledgered):** state B link-out + count (§3.4); re-keyed check-claims
  rules; `review-ask` on `/thank-you/`.
- **4c (GBP API approved; owner accepts relevance ordering):** state C — start with the GBP-API/KV
  path (all reviews, newest first, ≤ 30-day TTL) behind a same-origin route; the Places proxy only if
  GBP access is refused. Pin `wrangler`, give `functions/` its own `tsconfig` excluded from the root
  one, add `_routes.json` (`include: ["/api/*"]`), set security headers in code (`_headers` does not
  apply to Functions), extend the deploy dry-run to list `functions/` and warn that `out.prev`
  rollback does **not** revert it. Rendered-DOM rating scan in the gate.

### Phase 5 — Fleet (after the pilot has run one full quiet day and one seasonal window)

Move the calendar data, the pure `resolve()` function, the blackout list and the `status.json`
contract into `@ishub/site-kit` (`/calendar`), bump the tarball, and let each site keep its own
markup and copy — identical fleet-wide seasonal copy on 10 brands sharing one WhatsApp number is a
cross-domain footprint Google's doorway policy names. The five sibling no-popup rules stand unless
their owners change them.

---

## 6. Owner actions and open decisions

1. **Delete the 12 reviews** (each poster, from their own account) and replace the two AI photos on
   the profile. Confirm the dashboard count afterwards — the public endpoint cannot.
2. **Push `main`** (or approve the operator doing it); turn on secret scanning + push protection.
3. Send the profile's official **"Get more reviews" link and QR** (desktop browser only).
4. Decide **WhatsApp prefill** — recommended _yes_: `שלום, הגעתי מהאתר של שלושה מנעולנים` per
   surface, via site-kit's `whatsappHref(m, message)`, no personal data. It is the only end-to-end
   attribution WhatsApp can give on a number shared by ~10 brands.
5. **Brand colours:** send official values or approve the AA-safe defaults; they go into the roster
   `brand.*` block, never into `enrich.css` directly.
6. **Legal entity / data controller** (name + ע.מ./ח.פ.) for the privacy notice — required before any
   surface collects data and before any priced offer could ever run (Consumer Protection Law §14ג).
   No surface in this plan collects data, so this blocks nothing in phases 0–4.
7. **Cloudflare toggles you own:** Page Shield on; later a Cache Rule for `/status/fleet.json`;
   confirm the account is on Workers Free.
8. **Reserve duty / closures:** tell the operator the same day; the `reduced` mode is a phone tap,
   the schema change is a deploy.
9. **Bing Webmaster Tools + IndexNow** (the only first-party AI-citation metric available; Google
   does not participate) — an account action, separate from this plan but cheap.

---

## 7. Risks and kill criteria

| Risk                                                                                     | Mitigation / kill                                                                                                    |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Google filters or penalises the profile over the 12 reviews                              | Removal first (0.1); no site dependency on the count; velocity guard once the API exists                             |
| A festive variant shows on a sombre day                                                  | precedence §4.2; simulator + overlap lint fail the build; `status.json` `quiet`; dashboard rollback                  |
| The calendar silently runs out                                                           | runway gate (30 days), calendar-expiry gate (12 months), weekly ntfy reminder                                        |
| The topbar makes the fixed header too tall on mobile (header + 32 px + 56 px sticky bar) | measured reserve; bar hidden under 360 px width if the H1 clips; the dialog never covers the sticky bar              |
| Popup replaces sticky-call clicks instead of adding calls                                | read total `contact_click` per session, not popup clicks; kill the dialog if sessions with calls fall for two months |
| Runtime content bypasses the guards                                                      | rule 4: `status.json` carries no text; no other runtime input exists in phases 0–3                                   |
| Deploy ships a half-finished `functions/` folder                                         | PreToolUse hook warns on any write under `functions/`; dry-run lists it (Phase 4c)                                   |
| Owner cadence lapses                                                                     | 45-day auto-hide; the strip disappears rather than looking abandoned                                                 |
| Photos leak a customer's address                                                         | Media Studio path only (EXIF stripped), city-only text, one-week delay, consent                                      |

## 8. What this plan deliberately does not do

- No "live stats" of any kind — there is no data source (the booking API returns 404 for this
  domain; no CRM; no call log). The one honest live signal is confirmed 24/7 availability.
- No "recent activity" feed of customer jobs — location data is especially sensitive under Privacy
  Protection Law Amendment 13, and "we just replaced a lock on X street" is a burglary signal.
- No seasonal offers, discounts, countdowns or scarcity — decision 3 and Consumer Protection Law
  §2(a)(3)/(13).
- No review schema, no third-party widget, no build-time baking of any Google review content.
- No scheduled deploy, no headless CMS, no GTM-injected UI, no edge HTML rewriting.
- No Arabic/Russian surfaces yet — Lod (Ramadan/Eid) and Haifa audiences are a Phase 5 question for
  the owner, not a default.
- No new `"use client"` component.

---

## Appendix A — data contracts

```js
// content/enriched/_campaigns.mjs  (authored; read by live-surfaces.mjs AND app/layout.tsx)
export default {
  evergreen: {
    topbar: { text: "…", call: true, whatsapp: true }, // copy via hebrew-copywriter
    source: "business-facts §C.5, §D.3",
  },
  windows: [
    {
      id: "hanukkah-travel-2026",
      kind: "seasonal", // seasonal | safety | reduced
      from: "2026-12-03T12:00:00+02:00",
      until: "2026-12-12T23:59:00+02:00",
      priority: 20, // higher wins; ties fail check-campaigns
      pages: { exclude: ["emergency"] }, // manifest kinds / ids; dialog also obeys data-live-noint
      topbar: { text: "…", href: "/%d7%9e%d7%93%d7%a8%d7%99%d7%9b%d7%99%d7%9d/…/", cta: "topbar-link" },
      dialog: { title: "…", body: "…", href: "…", capDays: 14 },
      source: "guide 9211; owner 2026-09-29 (no offers)",
    },
  ],
};

// content/enriched/_calendar.json  (generated; CC BY 4.0 Hebcal.com; do not hand-edit)
{ "generated": "2026-10-02", "credit": "Hebcal.com (CC BY 4.0) + overlay",
  "windows": [ { "id": "yom-kippur-5788", "kind": "quiet", "from": "2027-10-10T12:00:00+03:00",
                 "until": "2027-10-11T20:30:00+03:00", "label": "יום כיפור", "labelDate": "11/10/2027" } ] }

// content/enriched/_updates.mjs
export default [
  { date: "2026-09-02", text: "…", href: "/…/", source: "business-facts §C.5", image: null },
];

// https://imgquarry.com/status/fleet.json
{ "mode": "normal", "until": null, "note": "" }
```

## Appendix B — evidence index (repo)

- Topbar slot: `content/site.json` (109/109) · `public/wp-content/themes/gogo/assets/css/main.css:1008-1019`
- Header mechanics: `main.css:998-1011` · `public/wp-content/themes/gogo/assets/js/nav.js:30-42,124-140`
- z-index map: `main.css:161,285,311,996,1035,6055-6062,6101-6108` · `magnific-popup.css:7-117` · `app/enrich.css:401-405`
- Guards' scope: `scripts/check-claims.mjs:24,27-34,41-116` · `scripts/check-typography.mjs:15-40,75` · `scripts/fix-links.mjs:21,38` · `scripts/check-freshness.mjs:36-48`
- lastmod: `scripts/lastmod.mjs:17-37,65-72,106-112`
- CI determinism: `.github/workflows/ci.yml:33,57-66,97-115,183-191`
- Deploy: `Israeli services sites/ops/deploy-site.ps1:78-98,119-145,204,231-233,251-256,278`
- Byte cost: `out/index.html` (875,866 B; 17 `self.__next_f.push`, ~455 KB)
- Sibling no-popup doctrine: `betonplus.co.il/docs/mobile-ux-and-personalization.md:64` · `hambabait.co.il/docs/ux-cro-security.md:82` · `dangates.co.il/docs/ux-cro-security.md:83,170,292` · `galbath.co.il/docs/ux-cro-security.md:35-36` · `skyshade.co.il/audit-roadmap-full.md:472`
- Skyshade scheduled deploy (rejected pattern): `skyshade.co.il/.github/workflows/deploy.yml:18-21,48-54`
- ManageEngine / ntfy: `Sys Admin/.claude/skills/fleet/SKILL.md:54-56,67-70`
- Business facts this plan relies on: `docs/business-facts.md` §A.2, §A.3, §B.4, §B.5, §C.5, §D.3, §D.10, §E.1, §G.1

## Appendix C — research provenance

Produced 2026-09-29 by an eleven-agent read-only research workflow (code seams; perf/a11y; honesty +
CRO; deploy/automation infra; Business Profile; SEO/AEO; Google APIs and terms; the Israeli
calendar; Cloudflare edge; security/privacy/law; a completeness critic). External claims were fetched
that day from developers.google.com, support.google.com, cloud.google.com/maps-platform/terms,
developers.cloudflare.com, hebcal.com, docs.github.com, w3.org, nevo.co.il and the npm registry;
anything the agents could not fetch is marked _unverified_ in their transcripts and was not used as
a load-bearing fact here. The full digest lives in the session scratchpad
(`tasks/research-digest.md`) and is not committed.
