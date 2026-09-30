# Growth roadmap

The sequenced plan for SEO, AEO/GEO, E-E-A-T, content, structure, engagement, conversion, navigation,
performance and security.

`docs/optimization-backlog.md` is the **register of what is broken**. This file is **the order to fix
it in, and what to build next**. Backlog sections are cited as §n throughout.

---

## 0. Where the site actually stands

Be precise about this, because it changes what the work should be.

**Strong already — protect it:**

- Content depth is genuinely good: median ~1,500 unique words per page, and the 25 location pages
  **pass the doorway test** with named neighbourhoods and real local reasoning (§3).
- Technical SEO foundations are sound: canonicals on every page, sitemap derived from data with no
  hand-maintained array, exactly one `<h1>` on all 66 pages (build-enforced), zero duplicate titles or
  descriptions (§1, §2.4, §2.5).
- The `specsTable` blocks are a real competitive asset — the exact shape an answer engine prefers to
  quote, and most locksmith competitors publish nothing like it (§6.7).
- Pricing is internally consistent sitewide. No contradictions. Rare, and worth not breaking.

**The actual problems are not content volume. They are:**

| Gap              | State                                                                            |
| ---------------- | -------------------------------------------------------------------------------- |
| **Proof**        | zero reviews, zero ratings, no named human, no credentials; GBP live 2026-09-05  |
| **Reachability** | every major AI crawler blocked at the Cloudflare edge (§6.1)                     |
| **Measurement**  | ✅ fixed 2026-08-24 — 13 per-surface `data-cta`, `/thank-you/` conversion        |
| **Live defects** | ✅ all cleared 2026-08-24 and guarded by blocking CI checks                      |
| **Coverage**     | emergency/lockout intent — the highest-intent locksmith queries — barely covered |

A locksmith site ranks on **local trust signals** far more than on word count. The content work is
mostly done; the trust, measurement and reachability work has barely started.

---

## 1. The critical path — owner-blocked, start today

These gate the highest-value work and **only the owner can unblock them**. Everything else can proceed
in parallel, but these determine the ceiling. Chase them first and chase them hard.

| #   | Decision needed                                                                            | Unblocks                                                                          |
| --- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 1   | ✅ ~~Business Profile~~ — claimed, verified, areas corrected 2026-09-05                    | map pack, reviews, `sameAs`, entity identity                                      |
| 2   | **A review-collection process**                                                            | §7.2, `Review` schema, conversion rate                                            |
| 3   | Founding year — or approval to drop "25+ שנים"                                             | §7.1, `foundingDate`, every trust card                                            |
| 4   | Real opening hours — is it 24/7 or 08:00–18:00?                                            | §4.4, emergency positioning, schema                                               |
| 5   | Address: real premises, or service-area business?                                          | §5.1, `LocalBusiness` completeness, GBP type                                      |
| 6   | Licence / insurance / ח.פ. — any verifiable credential                                     | §7.4, the whole authority dimension                                               |
| 7   | A named human + photo (owner or lead technician)                                           | §7.3, article authorship, AEO                                                     |
| 8   | Sign-off on the price ranges already published                                             | §7.6, `Offer` schema, pricing page                                                |
| 9   | Cloudflare AI-crawler policy decision                                                      | **the entire AEO/GEO dimension** (§6.1)                                           |
| 10  | ~~Correct business email~~ ✅ confirmed 2026-08-24                                         | §4.2 — done, see business-facts §C.3                                              |
| 11  | **Remove the 12 non-genuine reviews** (business-facts §B.5) and start the genuine ask-flow | every reviews state in `docs/dynamic-presence-plan.md` §3.4; the profile's safety |
| 12  | Push `main` (29 commits behind production) and enable secret scanning                      | any scheduled routine, any CI gate that guards a deploy                           |

Record every answer in `docs/business-facts.md`. **Nothing here gets invented in the meantime.**

> **2026-09-29 — the dynamic-presence plan.** Topbar, seasonal card, updates strip, reviews states
> and the automation that keeps them fresh without a deploy are planned, decided and phased in
> [docs/dynamic-presence-plan.md](dynamic-presence-plan.md). It sits _after_ Phase 2's trust work in
> priority: its reviews track is gated on row 11, and it deliberately ships no offer, no live stat
> and no recent-activity feed.

---

## Phase 0 — Stop the bleeding — ✅ DEPLOYED 2026-08-24

All five fixes are **live in production** and asserted as blocking CI checks. The remote
`robiuzan.github.io` origin was retired 2026-08-23 — it now redirects to production (GitHub does
not allow disabling Pages on a user-site repo), and the repo is re-archived. All of it is **live and verified** as of 2026-08-24. The separate **Pages custom-domain claim** on the source repo outlived this by a month and was released 2026-09-05 — see §12.1 in `docs/optimization-backlog.md`.

| Fix                                                          | Why it's first                                     | §    |
| ------------------------------------------------------------ | -------------------------------------------------- | ---- |
| 3 dead `tel:%5Bphone%5D` anchors on the homepage             | on a locksmith site the call **is** the conversion | 8.1  |
| `robiuzan@gmail.com` published in `LocalBusiness` schema     | wrong business identity + personal data exposure   | 4.2  |
| 2 unparseable JSON-LD blocks                                 | the homepage FAQ rich result is dead               | 4.1  |
| Stale second origin live at `robiuzan.github.io`             | duplicate content, drifting further every deploy   | 12.1 |
| `/אודותינו/` title: doubled brand + unverified 25-year claim | one edit fixes an SEO and a trust defect together  | 2.1  |

Ship these as one small, reviewable batch. Run `/qa-build-gate` before and after.

---

## Phase 1 — Make it measurable — ✅ DEPLOYED 2026-08-24

Items 1–4 and 6 are **live in production**: GTM in `<head>`, 13 per-surface `data-cta` values
(sticky bar on all 67 routes), WhatsApp as a channel, `/thank-you/` (English path — a Hebrew route
directory breaks the Next 16 exporter) with every form redirecting to it, and the verification
token in the roster. Still open: item 5 (GA4 key events — owner/dashboard) and item 7 (call
tracking — owner decision).

1. **Move GTM to `<head>`** (§13.1).
2. **Per-surface `data-cta`.** All 114 tracked links say `content-call`; the homepage has none. Keep
   `content-call` (it's live in the shared container) and add `header-call`, `hero-call`,
   `footer-call`, `sticky-call`, `sticky-whatsapp`, `pricing-call`, `form-submit` (§13.3).
3. **Add WhatsApp as a real channel.** Currently on 1 of 66 pages. For a trade where the customer is
   standing next to a locked car, add a sticky mobile CTA bar with call + WhatsApp (§8.2).
4. **Create `/thank-you/`** and point the form's `redirect` at it → the first URL-based conversion
   the site has ever had. `noindex` it (§8.6).
5. **GA4 key events** for call, WhatsApp, thank-you view.
6. **Search Console**: move the hardcoded token to the roster manifest, submit the sitemap (§13.5).
7. Consider **call tracking** (a forwarding number) if the owner wants call quality/volume attribution
   beyond click counts.

**Outcome:** by end of week 2 you can attribute every lead to a page and a surface. Everything after
this becomes measurable.

---

## Phase 2 — Trust & authority / E-E-A-T (weeks 2–6)

This is the highest-leverage dimension for this site, and most of it is owner-blocked (§1 above).

1. ✅ **Google Business Profile — done 2026-09-05.** Live, claimed, ownership-verified, service areas
   corrected, and its name, phone, website, category and hours all verified against ours
   (`docs/business-facts.md` §B.4). Nothing about the profile itself is outstanding. **It holds 0
   reviews**, which is now the single highest-value gap on this site and the subject of §2 below.
2. **Review generation as a process, not a request.** A short SMS/WhatsApp with a direct review link,
   sent same-day after every completed job. Target the first 20 reviews, then keep the cadence.
   **Never** publish a `Review` or `AggregateRating` without a verifiable public source (§4.10).
3. **Put a human on the site.** Named owner or lead technician, real photo, a sentence of genuine
   experience. Nobody is currently accountable on any page (§7.3).
4. **Credentials page**: licence, insurance, ח.פ., association membership — whatever is real (§7.4).
5. **Resolve the address question** and render NAP from the manifest everywhere, footer included
   (§5.1, §5.3).
6. **State the warranty precisely** — duration, scope, exclusions (§7.5).
7. **Fix the 25-years claim at `DEFAULT_FEATURES`** in `lib/enrich/render.mjs:42` — one constant that
   reaches every page (§7.1).
8. ✅ **`sameAs` populated** 2026-09-05 with the Business Profile. Add social profiles as they exist.
9. Rebuild `/אודותינו/` around real substance rather than the unverified claim.

---

## Phase 3 — AEO / GEO (weeks 2–8)

Three gates, strictly in order. Work on gate 3 is wasted while gate 1 is shut.

**Gate 1 — reachability.** Cloudflare's managed `robots.txt` currently sends `Disallow: /` to
ClaudeBot, GPTBot, Google-Extended, CCBot, Bytespider, Amazonbot, Applebot-Extended and
meta-externalagent. **No repo change overrides this.** The owner decides in the Cloudflare dashboard.
Distinguish the three permissions when presenting the choice: training (`ai-train`), retrieval (**this
is what produces citations**), and attribution (`use=reference`). Blocking training while allowing
retrieval is a coherent, common position (§6.1).

**Gate 2 — parseability.** The two broken JSON-LD blocks (Phase 0). An assistant that can't parse the
FAQ block loses the cleanest machine-readable answer set on the site.

**Gate 3 — citability.**

1. **Answer blocks.** Open every service, location and guide page with a 40–60 word self-contained
   answer, complete in its first sentence. None of the 53 modules does this today; the first paragraph
   scene-sets before answering. Cheapest high-yield content pass available (§6.2).
2. **Comparison tables** — the citable asset. Expand `specsTable` coverage and add genuinely new ones:
   chip key vs smart key, cost by scenario, what needs the vehicle present.
3. **`public/llms.txt`** once gate 1 opens.
4. **Freshness and authorship** — `datePublished` / `dateModified` / a real author on guides (§6.5).

---

## Phase 4 — Content & keyword expansion (weeks 3–16)

The "rank for more keywords" work. **Order matters** — fix the hole before adding surface area.

### 4a. Fill the Tier-1 hole first — ✅ DONE 2026-08-24 (deployed)

### 4d. Guides hub — ✅ SHIPPED 2026-08-25 (deployed)

`/מדריכים/` + 3 guides live: כמה עולה שכפול מפתח לרכב · אבד המפתח היחיד לרכב · מפתח עם שבב או
מפתח חכם. 1,900–2,300 rendered words each, `Article` + `BreadcrumbList` + `HowTo` + `FAQPage`,
author deliberately omitted (§A). Guides 4–6 remain queued in `docs/content-calendar.md`.

### 4c. Emergency cluster — 🔨 IN PROGRESS 2026-08-25

Three routes created (`/services/פתיחת-רכב-נעול/`, `/services/פתיחת-דלת-נעולה/`,
`/services/מפתח-נשבר-במנעול/`). Deliberately three, not six: "נעלתי מפתחות ברכב" is the same
intent as "פתיחת רכב נעול" and would be a doorway page. `מנעולן חירום` is **not** built — it is a
pure availability claim and hours are 🔶 unconfirmed.

`content/enriched/95.mjs` authored: 763 → 1,702 words, full schema set, description added.

`content/enriched/95.mjs` does not exist, which leaves **`שכפול מפתח לרכב` — a head term — on the
site's weakest page**: 763 words, no description, no schema, and one of the two broken JSON-LD blocks.
Authoring it closes §2.3, §3.2, §4.1 and §4.8 at once. See `/new-service`.

### 4b. Deepen the 24 brand-key pages — where the long tail actually lives

The brand-key silo (מאזדה, טויוטה, יונדאי, קיה, פורד, סקודה, שברולט, סוזוקי, רנו, סיטרואן, פיגו,
מיצובישי, סובארו, מרצדס, הונדה, אופל, במוו, פולקסווגן …) is the site's genuine moat: high intent, low
competition, and highly answerable. Deepen each with **model-and-year-level specificity**:

- Which generations use which transponder / immobiliser system.
- Whether a key can be cut and coded without the original.
- Whether the vehicle must be present.
- Typical duration and price band per key type for that make.
- What goes wrong with that make specifically.

This is what captures `שכפול מפתח מאזדה 3`, `מפתח חכם יונדאי טוסון`, and hundreds of similar queries
without creating a single thin page.

### 4c. New service clusters — the biggest coverage gap

**Emergency and lockout intent is the highest-intent segment in this trade and is barely covered.**
Each of these deserves a real page:

| Cluster        | Pages to build                                                                    |
| -------------- | --------------------------------------------------------------------------------- |
| **Emergency**  | פתיחת רכב נעול · נעלתי מפתחות ברכב · פתיחת דלת דירה נעולה · מנעולן חירום 24/7     |
| **Loss**       | אבד המפתח היחיד לרכב · שחזור מפתח ללא מקור · מפתח נשבר במנעול · מפתח נשבר בסוויץ׳ |
| **Remotes**    | תיקון שלט רכב · החלפת סוללה למפתח · שלט אבד · קידוד אימובילייזר                   |
| **Home locks** | החלפת צילינדר · מנעול רב-בריח · שדרוג מנעול לדלת · מנעול נתקע                     |
| **Smart**      | מנעולים חכמים · מנעול קוד לדלת · אינטרקום ומנעול חשמלי                            |
| **Safes**      | פתיחת כספת · החלפת קוד לכספת                                                      |
| **Other**      | מפתח לאופנוע · מפתחות לרכב מסחרי                                                  |

Build these against `docs/content-standards.md` §3, not as thin keyword pages.

### 4d. Editorial hub — `/מדריכים/` (the topical-authority gap)

The site has **no editorial surface at all**. These are the Tier-4 questions with real volume:

- כמה עולה שכפול מפתח לרכב? (a real breakdown, not a range restatement)
- אבד לי המפתח היחיד לרכב — מה עושים? _(highest-intent question in the trade)_
- מה ההבדל בין מפתח עם שבב למפתח חכם?
- כמה זמן לוקח לשכפל מפתח רכב?
- אפשר לשכפל מפתח רכב בלי המקור?
- מתי מספיק להחליף צילינדר ומתי צריך מנעול חדש?
- מה עושים כשמפתח נשבר בתוך המנעול?

Each must answer better than the service page, then link to it for the action. See `/new-article` —
note this is a **routing change**, not just another module.

### 4e. Location expansion — disciplined

**Not before 4a.** Then, in order:

1. Fix `קריות` typed as `City` → `AdministrativeArea` (§4.5).
2. Differentiate the duplicate-city pairs (נתניה ×2, חולון ×2) rather than leaving near-twins.
3. **Emergency × city** for the top 5 cities only — `פתיחת רכב נעול בתל אביב` has real, urgent volume.
4. Sub-city neighbourhood pages for Tel Aviv / Jerusalem / Haifa **only** where three or more genuinely
   local facts exist.

**Do not build the 30 × 17 = 510 matrix.** Scaling a template multiplies risk, not reach.

### 4f. Segment / B2B pages

Untouched revenue with almost no competition:

ועדי בתים · חברות ניהול נכסים · צי רכב ולוגיסטיקה · מוסכים · חברות ליסינג · סוכנויות רכב · נדל״ן ומשרדי תיווך

---

## Phase 5 — Structure, navigation & engagement — 🔨 PARTLY SHIPPED 2026-08-25

Done and deployed: the **footer rebuild** (6 → 47 links, both silos reachable, zero orphans, now a
blocking CI check) and **hub/utility schema** (only the 404s, `/thank-you/` and the `/step/`
fragments lack JSON-LD now, all correctly). Still open: header one-hop reach, contextual in-copy
links (blocked on a renderer change — `docs/information-architecture.md` §4), and the price
calculator decision.

1. **Service ↔ location cross-links** — the largest missing edge in the graph. The 24 brand-key pages
   don't reach the 25 location pages at all (§9.3).
2. **Contextual in-copy anchors** with descriptive Hebrew text. Nearly every internal link today is a
   nav label or card title, so the site emits almost no anchor-text diversity (§9.4).
3. **Relevance-based `related`**, not array order — otherwise the flagship pages hoard internal equity
   (`/internal-linking` §2).
4. **Give the hubs prose.** `/services/` is a bare grid at 371 words; `/אזורי-שירות/` likewise.
5. **Link the duplicate-intent pairs** rather than merging them (a merge needs a `_redirects` 301).
6. **Breadcrumbs everywhere**, with `BreadcrumbList` on the 11 pages that emit none (§4.8).
7. **Revive the price calculator.** The four `/step/` pages are a genuine interactive conversion asset
   sitting at 173–182 words, excluded from the sitemap, and completely untracked. Either invest in it —
   make it prominent, instrument it, capture the lead at the end — or retire it. Leaving a calculator
   half-built is the worst of both.
8. Consider an **emergency-first mobile layout**: for this trade, the fastest path from landing to
   dialling is the whole UX.

---

## Phase 6 — Performance & accessibility (weeks 6–12)

1. **~8 MB of legacy Font Awesome SVG fonts** ship every deploy. **Root-cause before deleting** — if
   `@font-face` lists `.woff2` first, real browsers never fetch them, making this a deploy-hygiene win
   rather than an LCP win. Say which it is (§10.2).
2. **The 780 KB homepage.** Measure the inline `<script>`/`<style>` share before acting (§10.3).
3. **Images**: add `loading="lazy"` + `decoding="async"` in the pipeline (cheap, safe), then decide
   between Cloudflare `/cdn-cgi/image` transforms or pre-generated width variants (§10.4).
4. **Font preconnect/preload** (§10.6).
5. **Contrast**: the theme accent `#009f3c` is ≈3.5:1 on white. Compute per surface and fix the ones
   carrying text (§11.1).
6. **The contact form**: `dir="rtl"` / `lang="he"`, real validation, `aria-invalid` + `aria-describedby`
   (§8.4, §11.4).
7. **Mobile menu** keyboard support via an enhancement layer — never by editing vendored theme JS
   (§11.3).
8. Keep `/accessibility-statement/` **true** in both directions.

---

## Phase 7 — Security — ✅ MOSTLY SHIPPED 2026-08-25

Done: second origin retired (redirects), `public/_headers` live with HSTS / X-Frame-Options /
Permissions-Policy / report-only CSP, form consent line linking the privacy policy. Open: deciding
whether the CSP can ever go enforcing (three inline-script paths make it doubtful), and `npm audit`
triage.

1. **Retire the stale second origin** (Phase 0, §12.1).
2. **Ship `public/_headers`**: HSTS (without `preload` unless the owner accepts it), `X-Frame-Options`,
   `Permissions-Policy` (§12.3).
3. **CSP report-only.** Harder here than on any sibling site — three separate inline-script paths
   (injected GTM, the runtime script replay, and the scraped HTML's own inline scripts) and no
   per-request nonce under static export. Be honest that enforcing may need `'unsafe-inline'` (§12.5).
4. **Form consent line** linking `/privacy-policy/` (§8.5).
5. `npm audit --omit=dev` triage.

---

## The compounding loop (ongoing)

- **Every deploy:** `/qa-build-gate`, then `/deploy-3locksmiths` dry-run first.
- **Monthly:** run the auditor sweep — `seo-auditor`, `schema-auditor`, `eeat-trust-auditor`,
  `perf-a11y-auditor`, `security-auditor`, `local-seo-strategist`, `local-presence-strategist`.
- **Monthly:** review new review volume and GBP insights — `local-presence-strategist`, which reads
  the count rather than estimating it, and logs it in `docs/local-presence.md`.
- **Quarterly:** refresh the guides, update `dateModified`, re-check the AI-crawler stance against the
  live `robots.txt`.
- **Continuously:** every new claim gets a `docs/business-facts.md` row before it ships.

---

## What NOT to do

| Anti-pattern                                         | Why                                              |
| ---------------------------------------------------- | ------------------------------------------------ |
| Build the 510 service × city matrix                  | doorway cluster; the penalty lands on the domain |
| Fabricate reviews, ratings, credentials or an author | Google policy violation; also just a lie         |
| Rename or merge a live slug without a 301            | discards every ranking signal that URL holds     |
| Pad the `/step/` pages to hit a word count           | they are funnel fragments, not landing pages     |
| Ship `Offer` schema on unsourced prices              | publishes unconfirmed commitments                |
| Add an 18th location before `95.mjs` exists          | widening a gap instead of closing one            |
| Edit `public/wp-content/` or `content/site.json`     | vendored / generated; changes get overwritten    |
| Chase word count on pages already at ~1,500 words    | depth is not this site's problem                 |

---

## KPIs

| Dimension   | Metric                                                             | Today               |
| ----------- | ------------------------------------------------------------------ | ------------------- |
| Conversion  | calls, WhatsApp, form leads — by page and surface                  | partly unmeasured   |
| Local       | GBP views, calls, direction requests, review count and rating      | GBP live, 0 reviews |
| Rankings    | head terms, brand-key cluster, emergency cluster, location cluster | untracked           |
| Indexation  | indexed pages, impressions, CTR (Search Console)                   | 104 URLs submitted  |
| AEO         | citations in AI answers; crawler reachability                      | blocked at edge     |
| Performance | LCP / CLS / INP field data, mobile                                 | unmeasured          |
| Trust       | reviews published, credentials shown, claims sourced               | zero                |

Set the baseline **after Phase 1** — before then, most of these cannot be read honestly.
