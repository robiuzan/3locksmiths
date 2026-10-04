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

| #   | Decision                                                                                                                                                                                                                                             | Consequence in this plan                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | The 12 reviews that appeared 22–28/09 thank technicians (אבי, אביעד, שרון) who **do not exist** — they are the AI brand characters' names (§G.1). **Decision: have them removed; start a genuine ask-flow.**                                         | The site references **no** review, count, rating or link until a genuine, ledgered baseline exists (§3.4).    |
| 2   | Jobs are done by a **fixed set of three partner locksmiths**; leads are routed to them; the Business Profile is verified on **one locksmith's own Google account**.                                                                                  | "שלושה" and "we" stay honest; §A.2 stands. "Recent activity" copy must never imply the operator did a job.    |
| 3   | **No seasonal offers exist.** No discount, no special price.                                                                                                                                                                                         | Seasonal content = advice, availability, safety. No ₪ amount and no % may appear on any new surface.          |
| 4   | Popup = **a small, delayed, dismissible card**, never on the emergency pages.                                                                                                                                                                        | Native `<dialog>`, shown on the 2nd pageview or after ~20 s + scroll, frequency-capped, never collects data.  |
| 5   | Deploys stay **human-only**, plus phone reminders.                                                                                                                                                                                                   | Nothing in this plan deploys by itself. Freshness without a deploy comes only from pre-authored schedules.    |
| 6   | A fleet **`status.json` kill switch** on an existing Cloudflare origin is acceptable; the account is treated as **Workers Free**.                                                                                                                    | The only runtime input, and it can only _hide_ or _select_ — never inject text (§4.4).                        |
| 7   | Updates: **weekly**, supplied by the owner, pasted into a Claude session; the strip **auto-hides** when the newest item is older than 45 days.                                                                                                       | `announcement-editor` agent + `content/enriched/_updates.mjs` (§3.3, §4.5).                                   |
| 8   | **Pilot on 3locksmiths first**; fleet reuse later at the data/logic layer only.                                                                                                                                                                      | No site-kit change in phases 0–4 (§5, Phase 5).                                                               |
| 9   | Quiet days: **memorial days, fast days, election/Rabin day, and Shabbat + chag themselves** — all promotional/seasonal copy goes silent; only the evergreen line shows. _(Amended by row 11: on Shabbat and chag the safety line stays on.)_         | Hand-kept overlay in the calendar; precedence rule in §4.2.                                                   |
| 10  | Open, not decided: WhatsApp prefill text; brand colour source; legal entity for the privacy notice.                                                                                                                                                  | Listed under §6 as owner actions; nothing here assumes an answer.                                             |
| 11  | **2026-10-01, after Phase 1:** the summer hot-car safety line stays on through Shabbat and chag (memorial days and fasts still silence it); it runs from **01/05**, not 15/06; the desktop WhatsApp line at the top of the emergency pages is right. | `lib/live/resolve.mjs` + `compile.mjs` (two grades of quiet); `_campaigns.mjs`; the calm-page rule unchanged. |

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
3. **Volatile chrome is excluded from the `<lastmod>` fingerprint and from snippets.** The root
   element of every live region carries `data-lm-ignore` (cut out by `lastmod.mjs` before hashing)
   and `data-nosnippet`, both in the static HTML (Google: never add it via JS). _As planned this
   was an HTML comment pair, `<!--lm:ignore-->`; Phase 1 found that eight passes in the enrich
   chain re-parse the body with node-html-parser's defaults, which drop comments, so the marker
   became an attribute. Wherever this document still says "`lm:ignore` sentinels", read "a
   `data-lm-ignore` region"._
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

| Seam                                                 | Reaches                     | Guarded? | lastmod-safe?                      | Verdict                                                                                                                             |
| ---------------------------------------------------- | --------------------------- | -------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Pipeline pass into scraped chrome (footer.mjs idiom) | 109/109 pages               | **yes**  | only with the `data-lm-ignore` cut | **Chosen** for topbar, updates strip, dialog. Bytes ship twice, so variants stay short.                                             |
| RSC component in `app/layout.tsx` (StickyCta idiom)  | all routes incl. /thank-you | **no**   | yes                                | Only for the resolver script and CSS. Never for copy.                                                                               |
| New authored block in `lib/enrich/render.mjs`        | 99 pages with a module      | yes      | per page                           | Later, for a per-page "updates" block on /אודותינו/. Not sitewide — sitewide defaults are how `DEFAULT_STATS` fabricated.           |
| New route via `scripts/pages.mjs` (97xx)             | one URL                     | yes      | yes                                | Only for a `/עדכונים/` hub, and only after the 2026-10-29 indexing checkpoint (§3.3).                                               |
| Pages Function / HTMLRewriter (`functions/`)         | every request               | **no**   | n/a                                | **Rejected** for content: bypasses all gates, bills every HTML hit, 10 ms CPU vs an 876 KB page, ships silently on the next deploy. |
| GitHub Actions scheduled deploy (skyshade pattern)   | —                           | —        | —                                  | **Rejected**: contradicts CLAUDE.md §10 and `ci.yml:9-11`, needs an account-wide Pages token, and `main` is a month stale.          |
| GTM Custom HTML in the shared container              | 11 domains                  | **no**   | n/a                                | **Rejected** except as a last-resort emergency off-switch.                                                                          |
| Third-party review widget (Elfsight etc.)            | —                           | **no**   | n/a                                | **Rejected**: injects schema CI cannot see, sets marketing cookies, full DOM control under `'unsafe-inline'`.                       |

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

> **As built (2026-09-30):** green `#00702b`, 34 px, no ✕ yet, the evergreen line is
> WhatsApp-only and no line prints a number (the draft below shows the retired WhatsApp spelling
> `phone.mjs` forbids), open from 992 px always and below it only for a seasonal/safety line,
> with a scroll-away on phones. The wireframe and bullets below are the plan as approved; the
> Phase 1 block in §5 records what shipped and why it differs.

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
  - `quiet` days show `evergreen` only (as built: memorial days and fasts; on Shabbat and chag the
    safety line stays on — row 11).
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
the image pipeline). _As built: it fetches through the overlay's `verifiedThrough` plus one year,
emits Shabbat/chag as candle-lighting − 60 min → havdalah + 30 min from Hebcal (not the padded
fixed window in step 3), emits no `labelDate`, refuses to write a calendar that fails its own
content assertions, and `--check` exits 1 on drift — see the Phase 1 block in §5 and
`/israeli-calendar`._ The steps as planned:

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
  > hard quiet day                                ← memorial, fast, election/Rabin: evergreen only
    > safety window (summer hot-car line)         ← non-commercial; stays on through Shabbat + chag (decision 11)
      > Shabbat + chag                            ← evergreen — no seasonal line
        > seasonal advice window (highest priority number wins on overlap; check-campaigns forbids ties)
          > evergreen                             ← also the JS-off state and the fallback for any error
```

- Evaluated in `Asia/Jerusalem` from windows that already carry offsets — never the visitor's
  local date, never `new Date('YYYY-MM-DD')` (parsed as UTC midnight = 03:00 in Israel).
- Re-evaluated on `pageshow`, on `visibilitychange` and by a timer armed for the next boundary,
  so a tab left open across a sundown flips — a visible desktop tab included (as built; the
  first version had no timer and only flipped once the tab was hidden and shown again).
- A **time-travel preview**: `?at=2026-12-04T18:30+02:00` is honoured client-only (never linked,
  so never indexed) for review; the schedule simulator (§4.3) is the automated version.
- Page scoping — **shipped in Phase 1 as "calm pages".** `live-surfaces.mjs` puts
  `data-live-calm` on `.template-header` of the emergency cluster (ids 9301–9399; no manifest kind
  is called `emergency` — they are `kind: "service"`) and of the calculator steps (`/step/*`). A
  calm page carries only the evergreen line and the safety lines, so a seasonal tip can never
  show there, and on a phone its bar opens only for a safety line. The Phase 2 dialog must treat
  `data-live-calm` as "never open here". _As built (Phase 2):_ the second lock is not a `pages`
  field (check-campaigns rejects one) but `lib/live/pages.mjs` `allowsDialog` — calm pages, legal
  pages and any page whose own text tells the reader to call 100/101 never carry a card — checked
  again by check-live-regions.

### 4.3 Build gates — run on every human deploy, not only in CI

`deploy-site.ps1` runs only `npm run build`; CI has not run since 2026-08-30. So the gates that must
protect production go into an npm **`prebuild`** script (npm runs it before `build` automatically):

| Gate                                         | Fails when                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check-freshness` (exists)                   | `content/site.json` is older than its sources                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `check-claims` (**extended**)                | ⛔ patterns in `site.json` **or** in `_campaigns.mjs`/`_updates.mjs` string values **or** in `out/**/index.html`; new BLOCKING rules: arrival time `תוך \d+ דקות`, `טכנאים זמינים`, `נותרו`, `רק היום`, `\d+% הנחה`, `במקום \d+ ₪`, countdowns, ★ + number                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `check-typography` (**extended**)            | ASCII quotes in `_campaigns.mjs`, `_updates.mjs`, `_calendar.json` labels (add holiday tokens: `ל״ג`, `חוה״מ`, `ט״ו`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `check-campaigns` (**new**)                  | a window lacks an offset or names an impossible instant (30 February, hour 24 — V8 would roll them over silently); the **compiled** schedule shows any line inside a memorial day, fast or civic day, or a seasonal line inside a Shabbat or chag (a safety line may show there — decision 11) (Phase 1 replaced the authoring rule "a seasonal window overlaps a hard-quiet window": the compiler now subtracts them, so the output is what is tested); two windows tie on priority; a window never shows; a line is longer than one row (46 characters, evergreen 70), types a phone number or uses an unknown `{token}`; a safety variant lacks the `safety-` prefix; runway < 30 days of compiled schedule; the calendar ends < 60 days out (a warning from 12 months); an entry cites no business-facts row; a link is not a live route; a `data-cta` lacks the `-call`/`-whatsapp` suffix; an update's date is in the future (Israel date, not UTC); ⛔ copy patterns and ASCII quotes in any register string |
| schedule simulator (**new**, `node:test`)    | the resolver, the compiled schedule and the **shipped inline script (run in a VM)** disagree at any hour of the next 400 days or on either side of any boundary; a quiet-day promo; a wrong-side DST result on 2026-10-25/2027-03-26; an Adar mis-match in 5787; `site.json` carries a stale script                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `check-live-regions` (**new**)               | a `data-lm-ignore` region appears inside `<main>`, lacks `data-nosnippet`, contains a `<script>`, lacks a visible evergreen item or has it anywhere but last, or a calm page carries a seasonal line                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| rendered-DOM rating scan (**new**, Phase 4c) | any `Review`/`AggregateRating` JSON-LD or third-party review host after JS runs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

`.prettierignore` gains `content/enriched/_calendar.json` and `public/assets/live-schedule.json`,
or the Stop hook's Prettier pass creates a format → enrich loop.

**The escape hatch.** Two of these rules fail by the passage of time alone (runway, calendar
horizon), and `prebuild` gates every `npm run build` — including the one inside
`ops/deploy-site.ps1`. They must never block an unrelated hotfix. `LIVE_GATES=lapsed-ok` in the
environment downgrades **only** those two to warnings (`$env:LIVE_GATES='lapsed-ok'` before
`deploy-site.ps1 -Confirm`); every correctness rule still blocks. The nuclear option,
`npm_config_ignore_scripts=true`, skips the whole prebuild chain — use it only when the gate
itself is broken, and say so in the deploy log. Both are documented in `/deploy-3locksmiths`.
Shipped 2026-09-30 (Phase 0.5), reviewed adversarially the same day.

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

| #   | Task                                                                                                                                                                                                                                                                                                                                                                                                                                        | Who                     | Done when                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------- |
| 0.1 | Have the 12 reviews deleted by their posters; replace the two AI-generated profile photos with real key/lock photos; stop any review collection that is not the §4.6 ask-flow                                                                                                                                                                                                                                                               | owner                   | ledger reads 0 genuine-baseline; photos real                    |
| 0.2 | ✅ 2026-09-30 — `main` fast-forwarded to `d8e0b50` (CI green, first run since 30/08); secret scanning, push protection and Dependabot security updates enabled (verified via the repo API). Branch protection still open                                                                                                                                                                                                                    | owner / operator        | `git rev-list --count origin/main..HEAD` = 0                    |
| 0.3 | Freeze the September baseline (§4.7)                                                                                                                                                                                                                                                                                                                                                                                                        | operator                | a dated snapshot in `docs/reporting/`                           |
| 0.4 | Record the place ID and the Google-issued review/write-review URLs in the roster (`schema.*` or a new `googleProfile` block — fleet schema change) and sync down                                                                                                                                                                                                                                                                            | operator                | `site.config.json` carries them                                 |
| 0.5 | ✅ 2026-09-30 — `prebuild` chains check-freshness → check-claims → check-typography → `check-campaigns` → `check-live-regions` → `check-schedule` (all real validators, not stubs; they pass on the empty register). `lib/live/resolve.mjs` is the pure precedence resolver the simulator tests (9 tests, incl. DST nights and Adar I/II) and Phase 1 will inline into `<head>`                                                             | `rtl-frontend-engineer` | `npm run build` runs the gates                                  |
| 0.6 | ✅ 2026-09-30 — reserve 84 px (< 1200) / 126 px (≥ 1200) / 146 px (≥ 1441), from nav.js's own inline value measured at 22 widths; reduced-motion block. Verified on the built page: pre-JS vs post-JS screenshots **byte-identical** at 360/768/1366/1920 and identical header band at 992 and on a service page + the guides hub (≤ 262 px of anti-aliasing jitter vs 18,201 px of shift before). Live CLS reading still owed after deploy | `rtl-frontend-engineer` | no pre-JS hero overlap; CLS unchanged or better on the live URL |
| 0.7 | Fix stale doctrine that would misjudge this plan: `conversion-optimizer` (24/7 is ✅), `aeo-geo-strategist` + `/aeo-answer-content` + backlog §6.1 (the live robots.txt allows every AI bot), `local-presence-strategist` (posts live 6 months; Q&A discontinued 2025-11-03; the two payload shapes), `web-security-headers` (`_headers` exists), CLAUDE.md §1 (no contact popup) and §4 (`html-react-parser` is not a dependency)          | operator                | agents cite `business-facts` rows instead of restating facts    |
| 0.8 | Enable Cloudflare Page Shield (free) so the report-only CSP finally reports                                                                                                                                                                                                                                                                                                                                                                 | owner (zone toggle)     | violations visible in the dashboard                             |

> **Live result of 0.6 — deployed 2026-09-30, `584cb3da`.** Under throttled mobile emulation on
> the live deployments the old build rendered the hero under the header and jumped it 84 px when
> `nav.js` ran (~6.7 s — a 0.102 layout shift); the new build renders it in place from first paint
> and nothing moves. Chrome had excluded that jump from the CLS score, so the scored number only
> moves 0.056 → 0.048; the remainder is the Rubik font swap. A side effect worth knowing: LCP is
> now attributed to the hero background image (~3.1 s) instead of the `<h1>` (~2.3 s) — the same
> pixels at the same moments, a different element counted. Both are logged as backlog §10.7–10.8.
> The background-image preload is the next perf task, and Phase 1 must re-run this same probe
> when the topbar grows the reserve.

### Phase 1 — Calendar, topbar, gates (weeks 1–2)

> **Built 2026-09-30, reviewed adversarially the same day (five lenses, 59 findings, 58 acted
> on or recorded below); committed `c546009`/`813bb93`, deployed 2026-10-01 as `08f204f8`.** What shipped,
> against the steps as planned:

1. ✅ `scripts/calendar-sync.mjs` + `_calendar.overlay.json` → `content/enriched/_calendar.json`
   (§4.1): 153 windows, 01/09/2026 → 31/12/2027 — 63 Shabbat, 9 chag, 12 quiet days, 69
   `pre-shabbat`. Shabbat and chag run from candle-lighting − 60 min to havdalah + 30 min (Tel
   Aviv, from Hebcal), not the fixed Fri 15:00 → Sat 21:00 the plan sketched: the real times were
   one request away and a fixed window is wrong by up to two hours in June. The generator fetches
   one year past the overlay's `verifiedThrough` so the last Shabbat closes, and **refuses to
   write** a calendar in which a Friday night is not quiet, a named day of any year is missing,
   a diaspora-only day appears (proof `i=on` was honoured), a span is implausibly long, or any
   kind has fewer windows than the committed file. Every date was re-verified against Hebcal's
   own endpoints, the IANA tz database and the Ministry of Education's pages by the review.
   Minor fasts are **not** quiet (owner decision 9 named Yom Kippur and Tisha B'Av). CC BY
   credit inside and in the served schedule; in `.prettierignore`.
2. ✅ `content/enriched/_campaigns.mjs` — copy drafted by `hebrew-copywriter`, each line checked
   against the page it links to and by a typography pass, then revised on review:

   | Line (variant)   | Shows                                                              | Reads                                            | Links to                       |
   | ---------------- | ------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------ |
   | `evergreen`      | from 992 px, whenever nothing else is; JS off                      | מעדיפים לכתוב ולא להתקשר? שלחו לנו הודעת וואטסאפ | WhatsApp                       |
   | `before-shabbat` | every Thu 17:00 → Fri 14:00, from 08/10/2026                       | שני מפתחות הרכב בצרור אחד? זה לא גיבוי           | guide 9202 (only car key)      |
   | `winter-remote`  | 15/11/2026 → 01/03/2027                                            | השלט מגיב לאט בקור? סימן לסוללה חלשה             | guide 9210 (smart-key battery) |
   | `hanukkah`       | Thu 03/12 → Fri 11/12/2026 afternoon                               | נוסעים בחנוכה? השאירו מפתח אצל אדם אמין          | guide 9205 (locked out)        |
   | `pesach`         | 04/04 → 21/04/2027 12:00                                           | ניקיון לפסח? לצילינדר גרפיט, לא שמן מזון         | lander 78 (מנעולן לבית)        |
   | `safety-summer`  | 01/05 → 15/09/2027 — beats every seasonal line, on through Shabbat | ילד או בעל חיים ברכב נעול? חייגו 100/101         | emergency 9301 (locked car)    |

   Deviations from the plan, each deliberate: **the evergreen line is WhatsApp-only** — the
   header row directly under the bar already prints "24/7" and the phone number, so the planned
   line repeated both; **winter** is 15/11 → 01/03 rather than 01/11 → 31/03 (a line that opens
   "slow in the cold?" on a 28 °C day reads as automation); **Pesach** runs the three cleaning
   weeks _before_ the seder, and links to the home lander where the maintenance list is visible
   (the same advice sits in a collapsed FAQ on the lock-replacement page); **Hanukkah** links to
   9205, not 9211 — the spare-key advice is there, not in the burglary guide — and ends inside
   the last Shabbat so it never shows after the holiday; **back-to-school** was dropped — the
   summer safety line outranks it for its whole life, and `check-campaigns` now rejects a window
   that never shows; **no `reduced` line** is rendered until the `status.json` switch that
   reveals it exists (Phase 2) — text-only crawlers ignore `hidden`, and "reduced availability
   right now" on 109 pages is a sentence we do not want quoted. The plan's evergreen draft also
   printed the WhatsApp number in its retired spelling; no line prints a number now — `{phone}`
   and `{whatsapp:<label>}` are the only ways to reach one.

3. ✅ `scripts/live-surfaces.mjs` in the enrich and snapshot chains after `footer.mjs`. It fills
   `.nav-main__top-bar` on 109/109 pages with every line as a `<p data-campaign hidden>` inside a
   `data-lm-ignore data-nosnippet` container, the evergreen line last, and marks the slot
   `nav-main__top-bar--live` (the CSS keys on the marker, so an unfilled slot can never show the
   scraped speed claim); marks the 8 **calm pages** (emergency 93xx, `/step/*` — `lib/live/pages.mjs`)
   with `data-live-calm` and gives them only the evergreen and safety lines; drops a line's link
   on the page it points at; compiles the schedule (`lib/live/compile.mjs` — windows minus quiet
   days, precedence applied → 79 intervals) into the inline head script (`site.assets.liveHead`,
   ~1.7 KB) and into the readable `public/assets/live-schedule.json`. It **fails** rather than
   skips a page it cannot fill, fails when the register vanishes while the bar is already in
   `site.json` (the off switch is `windows: []`), and fails when timed windows exist without a
   calendar.
4. ✅ `scripts/lastmod.mjs` cuts `[data-lm-ignore]` elements out of the raw body by source offset
   (`lib/live/regions.mjs`, nested regions cut once) before hashing; `check-orphans` ignores the
   same regions, so a hidden bar link never keeps a route off the orphan list. Proved on the real
   site and pinned as a test: rewording a line moves **0 of 109** hashes; an edit outside the
   region still moves one. (Introducing the bar moved all 109 once — the old slot text had been
   inside the fingerprint.) CI's byte-for-byte check now covers `content/lastmod.json` and
   `public/assets/live-schedule.json`, and fails on an untracked file under `content/`, `lib/`,
   `scripts/` or `public/assets/` — a register that was never committed would otherwise
   "reproduce" in CI and be impossible to regenerate anywhere else.
5. ✅ `app/layout.tsx` prints the script (`<html suppressHydrationWarning>`); `app/enrich.css`
   holds the look and the rules for when the bar is open. **Green `#00702b`, white text (6.26:1),
   34 px.** Open from 992 px always (the sticky call/WhatsApp bar's cut-off — the review found
   that 992–1199 px, iPad landscape and zoomed laptops, had no WhatsApp link at all); below
   992 px only for a seasonal or safety line. Where the browser supports scroll-driven animation
   the phone header slides up by the bar's height in the first 68 px of scroll, so a tip does not
   follow the reader down the page for three winter months — and slides back while keyboard
   focus is inside the bar; without support, or with reduced-motion, it simply stays. One row
   normally (the 46-character cap, 12 px from 340 px down), but a text-spacing or zoom override
   wraps to a second row instead of truncating (WCAG 1.4.12). The header reserve from Phase 0.6
   grew with it: 84 px (+34 when the bar is open), 118 px from 992, 160 px, 180 px.
   The script is stored in `site.json` rather than assembled in `layout.tsx` from `_campaigns.mjs`
   as planned, so the schedule that ships is the one the simulator tested and CI's byte-for-byte
   check covers — and the app imports no pipeline module. It re-runs on `pageshow`,
   `visibilitychange` **and at the next boundary** (one timer), so a visible desktop tab flips
   at sundown too, and fires `resize` when the line changes so `nav.js` re-measures the header.
   **No ✕ yet.** Dismissal needs `localStorage` handling that belongs with `live.js` (Phase 2);
   the scroll-away is what makes a bar without one tolerable on a phone. Owner: look at the
   winter line on a real phone (`/?at=2027-01-12T10:00:00%2B02:00`) before agreeing to a
   3.5-month window.
6. ✅ Gates, all in `prebuild`: `check-campaigns` (offsets of the right season; tokens; no typed
   phone number anywhere a visitor reads, including labels; one-row length; the `safety-`
   prefix; ties; windows that never show; **no compiled interval inside a hard quiet day, no
   seasonal one inside a Shabbat or chag, and none past the calendar's last quiet window**; timed windows without a calendar; the
   calendar's kinds, its overlay days and every Saturday noon inside it; the `source` quote
   present in the module of the page the line links to; ⛔ claims from `lib/live/claims.mjs`,
   widened after mutation testing — bare מבצע, any price spelling, any arrival time, warranty —
   and pinned as a test; expired windows warned; runway measured on fixed-date windows only,
   with the next authored line printed on every build), `check-live-regions` (attribute-based;
   the calm pages exactly as `lib/live/pages.mjs` names them; one region per slot; **every
   item's text and link equal the register** — `site.json` being newer than the register proves
   nothing), and the simulator — 19 tests, in which the resolver, the compiled schedule and the
   **actual inline script executed in a VM** must agree on every hour of the next 400 days and
   both sides of every boundary; plus the timer, the region cutter and the claim fixtures.
   `check-freshness` treats `lib/live/*.mjs` and all of `lib/enrich/` as sources and names the
   calendar sync when the overlay is the newer file. `check-css-cascade` no longer mistakes a
   keyframe step for a selector. `check-claims` and `check-typography` were **not** extended to
   read the registers as planned: `check-campaigns` applies both rule sets to the registers, and
   `check-claims` sees every line again once it is rendered into `site.json`. Topbar `data-cta`
   values are in the tracking skill. `pages` and `dialog` on a window are rejected until Phase 2
   implements them.
7. ✅ **Deployed 2026-10-01 (`08f204f8`) and verified on the live URL:** the homepage is
   byte-identical to the build; the schedule asset is served (79 intervals, Hebcal credit); with
   `?at=` at 360 and 1366 px on the homepage and the locked-car page — today, Hanukkah, a
   Hanukkah Shabbat, the DST night 26/03/2027, a summer Shabbat and Tisha B'Av — every line,
   the calm-page rule and the reserve (= nav.js's value) came out as designed; the phone
   scroll-away translates −34 px. A throttled-mobile LCP comparison on 2026-10-01 was too noisy to
   read (1.7–7.1 s on one unchanged build — the machine was loaded); the LCP element is still the
   hero band and median CLS is unchanged (0.0004). Still owed: a quiet-machine LCP re-run and
   GTM Preview for `topbar-whatsapp`. As planned:
   Gate, deploy, **verify on the live URL** with `?at=` for Hanukkah
   (`/?at=2026-12-06T10:00:00%2B02:00`), a quiet day (`…12-05T10:00…`) and the DST night; GTM
   Preview for `topbar-whatsapp` → `contact_click`. Lighthouse on the live URL, 3 runs (the local
   harness under-reads by ~1.8 s — memory `match-production-compression`). Local evidence so
   far: a headless-Chrome probe over 180 cases (320, 360, 991, 992, 1024, 1199, 1200, 1366 and
   1920 px; the homepage and an emergency page; five instants; with and without the theme
   scripts) — the pre-JS padding equalled what `nav.js` later measured in every case, exactly
   one line showed, none was clipped, and the WhatsApp link was present at every width; plus
   keyboard focus, hover, forced-colours, text-spacing and 320 px probes. The LCP element is
   unchanged by the taller header (the review checked 27 cases against the previous export).
   A pre-existing 20 px horizontal overflow in the pre-JS state at exactly 1441–1479 px
   (`.col-right__bot`, present in the previous export too) was noted, not fixed.

**Decided 2026-10-01 (decision 11):** the safety line stays on through Shabbat and chag
(`resolve.mjs` and `compile.mjs` now know two grades of quiet: a memorial day or fast silences
everything, Shabbat/chag silence the seasonal lines only; no card opens on Shabbat even for a
safety line); it runs from 01/05/2027; the desktop WhatsApp line on the emergency pages stays.
Compiled: 79 intervals; the safety line is on every summer Saturday and Shavuot, off on Yom
HaShoah, Yom HaZikaron and Tisha B'Av.

**Still open (not blockers):** the site's own pages disagree on lock lubrication —
`/מנעולן-לבית/` allows "שמן מנעולים ייעודי", four others say graphite/dry only — the locksmiths
should settle it once and the modules follow. Phase 0.3 (the September baseline in
`docs/reporting/`) is still not done.

### Phase 2 — Updates strip, seasonal card, visual tokens (weeks 2–4)

> **Built 2026-10-01; committed `dfc2332`, deployed 2026-10-01 as `87535dbf` and verified on the live
> URL** — homepage byte-identical to the build and 501 KB (was 885 KB); the closed card hidden at
> 390 and 1366 px; the card opening on a 2nd page view with focus on its title; no card from a real
> HTTPS Google referrer, on /מנעולן-רכב/ or on the statement; Hebrew labels and logo alts; the
> contact-band button green. Status per step — the plan as written
> follows the block.
>
> - **4 ✅ The seasonal card.** `public/assets/live.js` (ES5, no copy — the gate fails on a Hebrew
>   letter or any fetch/innerHTML in it; versioned `?v=<hash>` because `_headers` sets no caching)
>   opens a closed `<dialog class="live-dialog">` that `live-surfaces.mjs` renders in a second
>   `data-lm-ignore` region at the end of the body. One card in 2026: **Hanukkah** (03/12–11/12),
>   copy by `hebrew-copywriter`, reviewed for claims and Hebrew. Rules as approved: never the first
>   page from a search engine; 2nd page → after 4 s; a first page from elsewhere → 20 s **and** a
>   quarter-page scroll; once per 14 days; never with a form field focused; no storage → no card.
>   Never rendered on the 8 calm pages, on the 6 other pages whose text tells the reader to call
>   100/101 (`lib/live/pages.mjs` detects it from the text), or on the card's own guide → 95
>   pages — 92 after the review widened the 100/101 detection to "ל-100 או ל-101" and added the
>   two legal pages. A card may sit only on a fixed-date **seasonal** window — never a safety window (it can
>   be live on Shabbat) or the weekly slot. Phone: a bottom sheet 16 px above the sticky bar;
>   desktop: centred, 360 px. Keyboard verified: focus starts on the call button, Tab stays
>   inside, Esc closes; `surface_view` / `surface_dismiss {method}` reach `dataLayer`.
>   **Still owed:** the GTM trigger + tag for those two events (an operator task in the container,
>   hostname-scoped), and the live-URL check after deploy.
> - **3 ✅ Dated guides.** `פורסם: dd/mm/yyyy` (and `· עודכן` only when it differs) under each
>   guide's `<h1>`, from the same module fields as the Article JSON-LD. `scripts/check-dates.mjs`
>   (prebuild) fingerprints each guide's advice — every string except the dates, the link lists
>   and phone numbers — against `content/guide-dates.json`: content changed but the date did
>   not, or the date moved but the content did not, fails. Baseline checked against git: since
>   25–26/08 the guides changed only by the 02/09 number swap, re-pointed links and one word
>   (פריסה ארצית → רחבה), so no guide shows "עודכן".
> - **5 ◐ Visual polish.** Done: the six homepage drawings (195,833 B, sent twice per load) are
>   now inline Font Awesome outlines read from the vendored SVG font (`scripts/advantage-icons.mjs`)
>   — about 4 KB together, and no font download (a first version used the icon font, which
>   would have made the homepage fetch its 123 KB for six glyphs). Homepage body 394 KB → 204 KB.
>   The footer copyright is year-free, built from the roster brand name; it re-dated every sitemap
>   URL once (accepted — a visible change on every page). **Waiting on the
>   owner:** the palette (`brand.*` is null in the roster; the AA accent override #00802f
>   already ships).
> - **6 ✅ Accessibility statement** rewritten (`scripts/pages.mjs`): researched against תקנות
>   35א/35ה/35ו, it now lists only what is true, names each limitation with an alternative (mobile
>   menu, logo alt text, form labels, unchecked motion), drops the unsupported SMS / full-keyboard /
>   labelled-form claims, adds WhatsApp as a link, the card and reduced-motion, and carries its
>   own dd/mm/yyyy "updated" and "last checked (internal)" dates. No coordinator is named — owner
>   questions in docs/business-facts.md §C.6. The contact page's WhatsApp link, which was
>   labelled with the CALL number, now says ״וואטסאפ״.
> - **1 ◐ Updates strip — built, empty.** `live-surfaces.mjs` renders `.live-updates` after
>   `.section-advantages` from `_updates.mjs` (`{ heading, items }`, newest 3, dd/mm/yyyy, own
>   classes — the theme's `.posts-list` would become a carousel); `live.js` hides it at 45 days.
>   Not seeded: the sourced corpus is two items dated 02/09 (one cannot print its number) and
>   would hide itself by 17/10. **Waits for the owner's first sentence.**
> - **2 ◐ `announcement-editor`** updated for both registers; live once the owner sends an item.
> - **7 ⏳** Gate green locally; commit and deploy on the owner's word.
>
> **Reviewed adversarially 2026-10-01** (four lenses, 43 findings, each reproduced by a second
> agent). Fixed before shipping: the **closed card was visible under the footer of every page**
> (the vendored bootstrap-grid sets `dialog { display: block }`; now `.live-dialog:not([open])`
> hides it and check-live-regions fails if that rule goes); a search referrer now wins at every
> page view, the Google Android app counts as search; a tap on the card's own padding no longer
> dismisses it; it never opens over the open mobile menu, retries once a hidden tab returns,
> closes itself when the line changes under it, gets focus on its title (not the call link), a
> scroll lock, a phone max-height and forced-colours edges; the scroll rule is "a quarter of
> the page or 600 px, whichever comes first". The statement's contrast, image, motion and
> label sentences were corrected — the logo strip now has Hebrew brand alts, the menu and call
> buttons Hebrew accessible names, and the homepage contact band's blue call button (3.49:1)
> the AA green. Gates widened: a card's source quote is checked against the card's own link,
> the strip's heading and labels against the claim rules, price words without ₪, real update
> dates, exact tel/wa.me hrefs, a card on its own target, `check-dates --accept` refusing a
> date-only move (`--minor <id>` records an insignificant edit).
> **Known and accepted:** the sticky call bar is inert while the card is open (a tap there
> closes the card, which has its own call and WhatsApp buttons); **no kill switch before
> Phase 3** — the fallback is to delete the Hanukkah window's `dialog`, run enrich and redeploy.

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

> **Status 2026-10-04 — built, reviewed, gated; production steps wait for the owner.**
>
> - **1 ✅ built.** `public/assets/live.js` reads `https://imgquarry.com/status/fleet.json` after
>   first paint (1.5 s, `credentials: omit`, `cache: no-cache` so a flip reaches the next page
>   view even after a hand upload); `parseStatus` lets through exactly normal / quiet / reduced /
>   off — anything else, and any network failure, is "fail". The mode goes to
>   `html[data-live-mode]`; the head script re-picks: off → no bar (and its 34 px given back),
>   reduced → the pre-written wartime line (`_campaigns.mjs` top-level `reduced`, on every page,
>   the emergency ones included), quiet → evergreen, fail → evergreen unless a safety line is live.
>   The card opens only after the switch said `normal` on that page view. A non-normal mode is
>   cached ("<mode>,<expires>", 30 min or the switch's own `until`) and applied before first paint
>   on the next page — and on a page restored from the back/forward cache; a failed read keeps a
>   still-valid cached mode instead of throwing it away. `?mode=…` previews. CSP connect-src
>   gains imgquarry.com. Write path: `../Sys Admin/scripts/fleet/status-switch.mjs`
>   (show / set / cors, -DryRun → -Confirm, the Sys Admin guard hook demands `# APPROVED:`) and
>   `../Sys Admin/runbooks/fleet-status-switch.md`. **Not yet done:** the bucket CORS rule, the
>   file itself, the deploy and the drill — in that order (owner approval).
> - **2 ✅ built.** `scripts/check-reminders.mjs` + `.github/workflows/remind.yml` (Sunday 08:00):
>   reads production — the switch, deploy drift (live.js, schedule, head script, strip), the
>   strip's age (21 days), the runway (30 days / a line ending in 14 with nothing after), quiet
>   days and chag in the next 7 days, the calendar horizon (90 days) — and pushes one ntfy
>   message. GitHub Actions instead of `/schedule`: it needs no session and no machine left on.
>   **Not yet done:** the `NTFY_TOPIC` repository secret (owner approval).
> - **3, 4 —** not started (optional).
>
> **Reviewed adversarially 2026-10-04** (four lenses, 17 findings, 14 reproduced by a second
> agent, all fixed): a slow or failed read threw away a still-valid cached off/reduced (the
> wartime line would vanish on slow phones); a late answer was discarded; a bfcache-restored page
> kept its old mode; the fail-closed wiring and the off/reduced CSS had no gate (now 4 live.js
> wiring tests, a card-lock test, a bfcache test and check-live-regions rule 13, each
> mutation-checked); `set` did not verify CORS per origin; the guard hook let `set -Confirm`
> through without approval; the runbook never created the file or said it must precede the
> deploy; the reminder named quiet days by their eve and printed the calendar end a day late.

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

**From Phase 3 (2026-10-04):** approve the three switch steps (bucket CORS for the three
3locksmiths origins, the file at `normal`, then the deploy and the drill); add the `NTFY_TOPIC`
secret to the GitHub repository (or approve the operator copying it from Sys Admin); confirm the
wartime wording `פועלים בכפוף להנחיות פיקוד העורף`.

**From Phase 2 (2026-10-01):** look at the Hanukkah card on a real phone
(`/?at=2026-12-06T10:00:00%2B02:00`, on a second page view); answer the accessibility questions in
docs/business-facts.md §C.6 (head count, legal entity and turnover, SMS on the 076 line, who answers
accessibility requests) and have the statement read by whoever signs for the business; add the
GTM trigger + tag for `surface_view` / `surface_dismiss`; send the first weekly update sentence;
brand colours or the AA-safe defaults (item 5).

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
// content/enriched/_campaigns.mjs  (authored; read by scripts/live-surfaces.mjs — as shipped in Phase 1)
export default {
  evergreen: {
    topbar: { text: "… {whatsapp:וואטסאפ}" }, // {phone} and {whatsapp:<label>} are the only tokens
    source: "docs/business-facts.md §C.5",
  },
  windows: [
    {
      id: "hanukkah-2026",
      variant: "hanukkah", // the line's id on the page; defaults to id; safety lines start "safety-"
      kind: "seasonal", // seasonal | safety | reduced
      from: "2026-12-03T06:00:00+02:00", // explicit offset, [from, until)
      until: "2026-12-13T00:00:00+02:00",
      priority: 30, // higher wins among seasonal; ties fail check-campaigns
      topbar: { text: "…", link: { label: "למדריך", href: "/מדריכים/…/" } }, // ≤ 46 chars as read
      source: "content/enriched/9205.mjs — the quoted sentence · business-facts §D.10",
    },
    {
      id: "before-shabbat",
      kind: "seasonal",
      during: "pre-shabbat", // repeat in every calendar window of this kind; from/until only bound it
      from: "2026-10-08T00:00:00+03:00",
      priority: 20,
      topbar: { text: "…", link: { label: "למדריך", href: "/מדריכים/…/" } },
      source: "…",
    },
    // Phase 2 (as built): a fixed-date seasonal window may add
    //   dialog: { title, body, call: "חייגו {phone}", whatsapp, link: { label, href }, capDays }
    // and the register gains ui: { close: "סגירה" }. No `pages` field — lib/live/pages.mjs decides.
    // content/enriched/_updates.mjs: export default { heading, items: [{ date, text, href, linkLabel, source }] }
  ],
};

// content/enriched/_calendar.json  (generated by scripts/calendar-sync.mjs; CC BY 4.0 Hebcal.com; do not hand-edit)
{ "credit": "…Hebcal.com (CC BY 4.0)…", "source": "…", "coversFrom": "2026-09-01", "coversThrough": "2027-12-31",
  "windows": [ { "id": "yom-kippur-5788", "kind": "quiet",  // quiet | shabbat | chag | pre-shabbat
                 "from": "2027-10-10T12:00:00+03:00", "until": "2027-10-11T…+03:00",
                 "label": "יום כיפור", "source": "hebcal" } ] }

// public/assets/live-schedule.json  (generated by live-surfaces.mjs; the compiled schedule, readable)
{ "about": "…", "variants": ["before-shabbat", "…", "evergreen"],
  "intervals": [ { "variant": "before-shabbat", "from": "2026-10-08T14:00:00.000Z", "until": "2026-10-09T11:00:00.000Z" } ] }

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
