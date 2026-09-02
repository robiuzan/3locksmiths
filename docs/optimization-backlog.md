# Optimization backlog

The ranked, sectioned register of open work. **Every agent in `.claude/agents/` cites a section number
from this file**, so the numbering is a contract — add subsections, don't renumber.

**Measured against** the `out/` export built 2026-08-02 at commit `0b3c2a2`, and against the live site
verified 2026-08-16. Where a finding says "live", it was confirmed with `curl` against
`https://3locksmiths.co.il`, not inferred from the repo.

> **2026-08-25 (2) — EMERGENCY CLUSTER DEPLOYED.** Three pages live at ~2,500 rendered words each:
> `/services/פתיחת-רכב-נעול/`, `/services/פתיחת-דלת-נעולה/`, `/services/מפתח-נשבר-במנעול/` —
> Tier E in `docs/keyword-universe.md`, previously **zero coverage** and the highest-intent demand
> in the trade. 74 routes, 67 sitemap URLs. Each carries `Service` + `HowTo` + `FAQPage` +
> `BreadcrumbList` and **zero availability claims** — hours are still 🔶, so the copy describes the
> work and never promises a wait. The car page leads with "call 100/101" for a child or animal
> locked in, explicitly telling the reader NOT to wait for a locksmith.
>
> New guard `scripts/check-freshness.mjs` **blocked a deploy during this batch** (Prettier had
> rewritten modules after `npm run enrich`). Correct order is **format → enrich → build → deploy**.
>
> **2026-08-25 — DEPLOYED.** Footer rebuild, guides hub + 3 guides, form normalization,
> `public/_headers`, contrast fix and hub schema are all **live and verified** (71 routes,
> 64 sitemap URLs, 47 footer links, headers confirmed via curl).
>
> ⚠️ **Process note:** the first deploy attempt that day shipped a **stale build** — a background
> content workflow edited authored modules after `npm run enrich` had run, so `content/site.json`
> did not contain the latest copy. Caught in post-deploy verification, rebuilt, redeployed.
> **Never deploy while anything is still writing to `content/enriched/`.**

> **2026-08-17 — Phase 0 + Phase 1 of `docs/growth-roadmap.md` shipped (local, not yet deployed):**
> §2.1, §4.1, §4.2, §4.3, §8.1, §8.2, §8.6, §11.7, §13.1, §13.3 and §13.5 are **fixed in the
> working tree** and asserted as blocking checks in `.github/workflows/ci.yml`. §7.1 is fixed in
> every authored surface; after page 95 was authored (2026-08-24) the claim survives **only** in
> the homepage's original scraped WordPress body (id 7). §12.1 is
> **done** (2026-08-23): local publisher and `public/CNAME` removed, and `robiuzan.github.io` now
> serves a redirect to production (user-site repos cannot have Pages disabled); repo re-archived. **DEPLOYED to production 2026-08-24** and verified live: 0 dead
> tel links, 0 personal-email occurrences, 3/3 homepage JSON-LD blocks parse, GTM in `<head>`,
> sticky CTA bar on every route, `/thank-you/` returning 200. Per-item notes below are kept as written for history; trust
> this note and the CI checks for current state.

## Verdict at a glance

| §   | Area            | State | Headline                                                         |
| --- | --------------- | ----- | ---------------------------------------------------------------- |
| 1   | Technical SEO   | 🟢    | canonicals, sitemap parity and route generation are all sound    |
| 2   | On-page SEO     | 🟢    | fixed 2026-08-17/24; only 4 over-length titles remain (§2.2)     |
| 3   | Content depth   | 🟢    | 57 authored; guides hub + 3 guides shipped 2026-08-25            |
| 4   | Structured data | 🟢    | all real pages carry schema 2026-08-25; §4.5 area type open      |
| 5   | Local SEO       | 🔴    | no Business Profile, sameAs empty; address exists but Latin-only |
| 6   | AEO / GEO       | 🔴    | crawlers blocked at edge; guides now exist to be cited when open |
| 7   | E-E-A-T & trust | 🔴    | zero social proof; 25-years claim removed from authored copy     |
| 8   | Conversion      | 🟢    | form fixed 2026-08-25: validation, phone field, consent, RTL     |
| 9   | Navigation      | 🟢    | footer rebuilt 2026-08-25 (6→44 links); zero orphans, CI-gated   |
| 10  | Performance     | 🟡    | 57.9 MB export, ~8 MB of unused icon-font SVGs                   |
| 11  | Accessibility   | 🟡    | contrast + form RTL fixed 2026-08-25; mobile menu a11y open      |
| 12  | Security        | 🟢    | origin retired; _headers shipped 2026-08-25 (CSP report-only)    |
| 13  | Analytics       | 🟢    | fixed 2026-08-17: GTM in `<head>`, 13 per-surface `data-cta`     |

---

## §1 Technical SEO — 🟢

The migration got this right. Protect it.

**1.1 Route generation — sound.** `app/[...slug]/page.tsx` derives every route from
`getContentPages()` with `dynamicParams = false`, so the emitted route set cannot drift from
`content/site.json`. 108 pages + `/404` + `/_not-found` + `/thank-you` = 111 `index.html` files.

**1.2 Canonicals — sound.** Present on all 64 real pages, self-referencing, trailing slash,
percent-escaped. Sourced from the scraped `seo.canonical`, so they are byte-identical to the
WordPress originals. Only `/404/` and `/_not-found/` lack one, which is correct.

**1.3 Sitemap parity — sound.** `app/sitemap.ts` derives from `getSite().pages`, filters on
`seo.canonical`, and excludes `/step/`. 104 `<url>` entries against 108 pages = exactly the four
calculator fragments excluded. **No hand-maintained array anywhere** — better than most of the fleet.

**1.4 `lastModified` — absent.** The sitemap emits `changeFrequency` and `priority` but no
`lastModified`. Priority is derived (`1` front, `0.8` services/locations, `0.6` other), which is
reasonable. Adding a real per-page date would need a provenance source the snapshot doesn't carry —
**do not stamp build time**; a date that changes every deploy is worth less than no date.

**1.5 The `/step/` routes are indexable.** They are excluded from the sitemap but nothing stops a
crawler reaching them, and they are 173–182 words. Decide deliberately: either `noindex` them via
their `seo.robots`, or accept them as thin funnel pages. Do not pad them.

**1.6 `robots.txt` is not what serves.** `app/robots.ts` emits a blanket allow plus the sitemap.
Cloudflare prepends a managed block at the edge that no repo change overrides. See §6.1.

**1.7 The export is stale relative to `HEAD`.** `out/` was built 2026-08-02; `site.config.json` has
uncommitted changes. Always `rm -rf .next out && npm run build` before auditing — see `/qa-build-gate`.

---

## §2 On-page SEO — 🟡

**2.1 One doubled brand title.** `/אודותינו/`:

```
אודותינו – שלושה מנעולנים, מעל 25 שנות ניסיון | שלושה מנעולנים
```

The brand appears twice **and** the ⛔ 25-years claim appears in the title. Note this is _not_ the
layout-template bug that affects sibling fleet sites — `buildMetadata` sets
`title: { absolute: … }` and `app/layout.tsx` defines no `template`, so titles are whatever the
authored module says. Fix in the module's `seo.title`.

**2.2 Five titles over 60 characters** (62–69): `/`, `/services/החלפת-מנעולים/`,
`/services/תיקון-דלתות/`, `/אודותינו/`, `/מנעולן-לבית/`. They will truncate in SERPs.

**2.3 Five real pages have no meta description.** `/services/שכפול-מפתח-לרכב/` (a Tier-1 term — see
§3.2) and the four `/step/` routes. The `/step/` pages may legitimately stay bare.

**2.4 Uniqueness — sound.** Zero duplicate titles and zero duplicate descriptions across all 64
pages. Hold this line.

**2.5 One `<h1>` per page — sound, and enforced.** All 66 emitted pages carry exactly one.
`scripts/enrich.mjs` asserts `h1count === 1` per enriched page and **fails the build** otherwise. That
guard only covers the 53 enriched pages; the other 11 are correct today but unguarded.

**2.6 Heading order.** `lib/enrich/render.mjs` owns the `<h2>`/`<h3>` structure for enriched content.
Spot-check any new block type for a skipped level.

---

## §3 Content depth — 🟢

**This is the site's strongest area.** Median ~1,500 unique words; the deepest location pages reach
~1,600. The 25 location pages **pass the doorway test** — `content/enriched/137.mjs` (תל אביב) names
דיזנגוף, רוטשילד, פלורנטין, נווה צדק, רמת אביב and שכונת התקווה and reasons about the city's parking
and building stock. Substituting another city would make the page wrong, not merely generic.

**3.1 The gap is the 11 un-enriched pages**, not the 53 authored ones:

| Page                         | Words   | Missing                                                      |
| ---------------------------- | ------- | ------------------------------------------------------------ |
| `/services/שכפול-מפתח-לרכב/` | 763     | description, `BreadcrumbList`, `Service`, `HowTo`, `FAQPage` |
| `/services/` (hub)           | 371     | all schema; prose intro                                      |
| `/contact/`                  | 411     | all schema                                                   |
| `/sitemap/`                  | 358     | all schema                                                   |
| `/accessibility-statement/`  | 484     | `BreadcrumbList`                                             |
| `/privacy-policy/`           | 595     | `BreadcrumbList`                                             |
| `/step/…` ×4                 | 173–182 | correctly bare — funnel fragments                            |
| `/` (homepage)               | 974     | valid `FAQPage` (its scraped one is broken — §4.1)           |

> ✅ **DONE 2026-08-24** — `content/enriched/95.mjs` authored. The page went 763 → **1,702**
> rendered words and now emits `BreadcrumbList` + `Service` + `HowTo` + `FAQPage`, with a meta
> description and a 45-word answer block. Closed §2.3 (its missing description) and §4.8 (its
> missing schema) at the same time. Historical text below.

**3.2 `/services/שכפול-מפתח-לרכב/` is the highest-value single task on the site.** It is page id
**95**, recorded in `content/enriched/_manifest.json` as the `referenceId` — the structural reference
the other 53 modules were written against — so it deliberately has no `95.mjs`. The consequence is
that a **Tier-1 head term** sits on the thinnest, least-marked-up service page, and it ships one of
the two malformed JSON-LD blocks. Author `content/enriched/95.mjs`. See `/new-service`.

**3.3 Duplicate-intent pages.** `/מנעולן-רכב/` and `/services/מנעולן-רכב/` both exist and are both
authored, as are the `מנעולן-לבית` and `קודן-לרכב` pairs, plus `שכפול-מפתח-בנתניה` /
`שכפול-מפתחות-בנתניה` and the same pair for חולון. Both of each pair are live WordPress URLs. They
are not currently cannibalising badly (titles and descriptions differ), but they should be
differentiated deliberately — or consolidated **with a `_redirects` 301**, never without.

**3.4 The shared "why choose us" block.** `DEFAULT_FEATURES` in `lib/enrich/render.mjs:42` ships the
same three cards on every page that doesn't override them, and the first one is
`"ניסיון של 25 שנים"` — the ⛔ claim, propagated sitewide from a single constant. Fixing it there
fixes it everywhere.

**3.5 Location page depth — passing.** All 17 clear the 900-word floor (1,282–1,598). No action
beyond keeping new additions to the same bar (`/new-city`).

> ✅ **FIXED 2026-08-25.** `/מדריכים/` hub + 3 guides shipped (1,919 / 2,276 / 2,213 rendered
> words), each emitting `Article` + `BreadcrumbList` + `HowTo` + `FAQPage`. Built via
> `scripts/pages.mjs` shells + authored modules — **the route mechanism existed all along**; an
> earlier note in these docs wrongly called it blocked. New `kind: "guide"` in the EnrichedPage
> contract drives the breadcrumb trail and Article schema. `author` is deliberately OMITTED —
> nobody is named on this site (§A) and a fabricated byline is worse than none.

**3.6 No editorial surface.** Zero guides, zero articles, no `/מדריכים/` route. This is the whole
Tier-4 / topical-authority gap (`docs/keyword-map.md` §2). See `/new-article`.

---

## §4 Structured data — 🔴

Full target graph: `docs/schema-graph.md`.

**4.1 Two unparseable JSON-LD blocks ship.** `out/index.html` and
`out/services/שכפול-מפתח-לרכב/index.html` each carry a block that fails `JSON.parse` with _"Bad
control character in string literal"_ — a raw newline inside a JSON string. Both are inherited
verbatim from the WordPress scrape. **The homepage's is its `FAQPage`, so the homepage FAQ rich result
is dead.**

Root cause: `scripts/enrich.mjs` **replaces** `page.jsonLd` wholesale for the 53 enriched pages and
validates every block it generates — but scraped blocks on un-enriched pages pass through unvalidated,
and the homepage keeps its scraped blocks alongside the generated `LocalBusiness`. Fix by validating
all of `page.jsonLd` at the end of `enrich.mjs`, and by authoring `95.mjs` (§3.2). **A block that does
not parse is a stop-ship.**

**4.2 🔴 The business node publishes a personal Gmail.** `localBusinessSchema()` in
`scripts/enrich.mjs:105` hardcodes `email: "robiuzan@gmail.com"` — the developer's personal address —
while the manifest carries `info@3locksmiths.co.il`. **Live on the homepage, verified 2026-08-16.**
Ship the fix ahead of anything cosmetic.

**4.3 The business node is hardcoded, not manifest-driven.** `name`, `telephone`, `email`,
`priceRange`, `areaServed` and `openingHoursSpecification` are all string literals in `enrich.mjs`.
`telephone` is `+972-55-6601006` against the manifest's `+972556601006` — two NAP spellings. Read
them from `site.config.json` instead; change values in the roster.

**4.4 Opening hours contradict the homepage title.** The schema says Sun–Fri 08:00–18:00, Sat
08:00–17:00. The homepage title claims `מנעולן 24/7`. One of them is wrong, and both are 🔶
(`docs/business-facts.md` §D.3).

**4.5 `קריות` is typed as a `City`.** It is a region and must be `AdministrativeArea`. Add an explicit
`kind` field rather than special-casing the string. `docs/schema-graph.md` §5.

**4.6 ~~The business node's `areaServed` is a hardcoded 15-city array~~ — FIXED.** It is now derived
from `content/enriched/_manifest.json` (`scripts/enrich.mjs` `CITIES`) and emits 23 unique `City`
nodes, so it tracks the routes and cannot drift. Note the consequence: the schema DOES publish a
coverage claim on ~100 pages even though the manifest carries `areaServed: null`.

**4.7 `{ "@type": "Country", name: "IL" }`** puts an ISO code in a `name` field. Use `"Israel"`.

> ✅ **FIXED 2026-08-25.** `makePage()` now accepts `jsonLd`, and the generated hubs/utility
> pages emit `BreadcrumbList` + a page type: `/services/` and `/sitemap/` → `CollectionPage`,
> `/contact/` → `ContactPage`, the two legal pages → `WebPage`, `/מדריכים/` → `CollectionPage`.
> Only 7 pages now lack schema and all are correct: `/404`, `/_not-found`, `/thank-you/`
> (noindex) and the four `/step/` funnel fragments.

**4.8 Nine real pages emit no schema at all** (§3.1). At minimum they want `BreadcrumbList`.

**4.9 No `Offer` on `/מחירון/` — correct for now.** Gated on owner-sourced prices,
`docs/schema-graph.md` §4.3.

**4.10 No `Review` / `AggregateRating` anywhere — correct.** Verified zero across all 66 pages. Either
shipping unsourced is a **stop-ship**.

---

## §5 Local SEO — 🔴

**5.1 🔴 There is no address.** Not in the roster manifest (`schema` has `type`, `priceRange`,
`areaServed`, `sameAs` — no `address` field), not in the JSON-LD, not on any page, not in the footer.
For a `Locksmith` node this is the largest structural local-SEO gap.

It may be legitimate — a mobile-only locksmith may have no public premises, in which case the right
answer is a service-area business on the Google side, not an invented address. **Never invent one.**
Resolve in `docs/business-facts.md` §C.1 first.

**5.2 🔴 No Google Business Profile link.** `schema.sameAs` is `[]`. For a single-trade local business
the Business Profile outranks almost everything else on-page: it drives the map pack, it is where
reviews live, and it is the entity anchor that makes `sameAs` meaningful. Owner action, not a code
task.

**5.3 NAP is internally inconsistent.** Three phone spellings in `tel:` hrefs (§8.1) plus a fourth in
the schema (`+972-55-6601006`). One number, four strings.

**5.4 Coverage is unreconciled.** `schema.areaServed: null` in the manifest; "פריסה ארצית" in the
homepage title (it is NOT — see business-facts §E); 23 derived cities in the schema; 25 location
pages. The schema and the routes now agree; the manifest and the copy still do not.

**5.5 No geo signals.** No `GeoCoordinates`, no `hasMap`, no map embed on `/contact/`.

**5.6 The location pages themselves are strong** (§3.5) — named neighbourhoods, real local reasoning.
This is the asset the rest of §5 fails to capitalise on.

---

## §6 AEO / GEO — 🔴

**6.1 🔴 Every major AI crawler is blocked at the edge — this gates everything else in §6.**
Verified live 2026-08-16, `https://3locksmiths.co.il/robots.txt`:

```
User-agent: *
Content-Signal: search=yes, ai-train=no, use=reference
Allow: /

Disallow: /   for  Amazonbot · Applebot-Extended · Bytespider · CCBot · ClaudeBot ·
                   CloudflareBrowserRenderingCrawler · Google-Extended · GPTBot · meta-externalagent
```

This is Cloudflare's managed block, injected at the edge. **`app/robots.ts` cannot override it.** The
site cannot be cited by ChatGPT, Claude, Perplexity or AI Overviews while it stands.

Changing it is a **Cloudflare zone setting** (AI Crawl Control / managed robots.txt) and is the
owner's call and the owner's action. Document the exact toggle; never assume it was flipped; always
re-verify against the live file. Note the three permissions are distinct: `ai-train` (may the content
train a model), retrieval bots (may an assistant fetch the page to answer a live question — **this is
the one that produces citations**), and `use=reference` (may it be cited with attribution).

**6.2 No answer blocks.** No service, location or top-level page opens with a 40–60 word
self-contained answer under a question-form heading. The first `intro` paragraph is usually close but
scene-sets before answering. Tightening it across the 53 modules is cheap and high-yield.
`docs/content-standards.md` §5.

**6.3 Extractability is good.** The FAQ answers ship in the DOM (the gogo theme's accordion hides with
CSS, not conditional rendering), and the `specsTable` blocks are real `<table>` markup at first paint.
Preserve both properties.

**6.4 Entity corroboration is zero.** `sameAs: []` — nothing off-site resolves this business. An
assistant has no second source to confirm the entity against. Same blocker as §5.2.

**6.5 No freshness or authorship signals.** No `datePublished`, no `dateModified`, no author on any
page.

**6.6 No `llms.txt`.** Worth adding once §6.1 opens — a short factual pointer file, not a second
website.

**6.7 Citable substance — genuinely strong here.** The `specsTable` blocks (key type × system ×
complexity × duration × price band) are exactly the shape an assistant prefers to quote, and most
competitors don't publish one. What's still missing: a real cost breakdown by scenario, a
"מפתח עם שבב מול מפתח חכם" comparison, what to do when the only key is lost, and realistic timing.
Those are the Tier-4 targets in `docs/keyword-map.md` §2.

---

## §7 E-E-A-T & trust — 🔴

**7.1 ⛔ "מעל 25 שנות ניסיון" is contradicted by the site's own data.** `foundedYear` is `null`, so
the `LocalBusiness` node emits no `foundingDate`. The claim appears in the homepage meta description
(`scripts/enrich.mjs:HOME_SEO`), in the `/אודותינו/` title, and — via `DEFAULT_FEATURES` in
`lib/enrich/render.mjs:42` — as a trust card on **every page that doesn't override it**. One constant,
sitewide reach. `docs/business-facts.md` §A.1.

**7.2 🔴 Zero social proof.** No reviews, no ratings, no testimonials, no case studies, no component
and no data for any of them. `sameAs: []`. Nothing on this site is corroborated from outside it.

**7.3 No named human.** No owner, founder or technician is named anywhere. Nobody is accountable on
the page.

**7.4 No credentials.** רישיון, תעודה, מוסמך, ביטוח and ח.פ. appear nowhere in the repo.

**7.5 The warranty has no term.** "אחריות" / "אחריות מלאה" is claimed throughout with no duration,
scope or exclusions.

**7.6 Prices are authored, not sourced.** Every `pricing[]` row was written during enrichment. They
are internally consistent — which is genuinely better than the fleet norm — but consistency is not
sourcing. Gate any `Offer` markup on owner sign-off (§4.9).

**7.7 Imagery provenance unknown.** The `public/wp-content/uploads/` images came from the WordPress
source. Nobody has confirmed any of them shows this business's own work. Do not caption one as a real
job.

**7.8 Transparency surface.** No address (§5.1), no hours beyond a footer string, no map, no
complaints or cancellation path.

---

## §8 Conversion — 🔴

**8.1 🔴 Dead click-to-call links on the homepage.** Three `<a href="tel:%5Bphone%5D">` anchors — an
unresolved WordPress `[phone]` shortcode — are **live on the homepage**, verified 2026-08-16. Tapping
them does nothing. On a locksmith site where the phone call _is_ the conversion, this is the single
most expensive defect on the list.

> Counting note: a raw `grep -c 'tel:%5Bphone%5D' out/index.html` returns **6**, because the static
> export embeds a second copy of the markup in its payload. Count `href="tel:` for rendered anchors.
> The same doubling affects any raw attribute grep over `out/` — see §13.3.

Full `tel:` inventory across all 108 pages in `content/site.json`:

| href                | Count | Verdict          |
| ------------------- | ----- | ---------------- |
| `tel:0556601006`    | 385   | works, not E.164 |
| `tel:055-6601006`   | 114   | works, not E.164 |
| `tel:+972556601006` | 4     | correct          |
| `tel:%5Bphone%5D`   | 3     | **dead**         |

Fix the placeholder in the scrape/transform pipeline so it cannot come back, and normalise all four
forms to the manifest's `contact.phoneE164`.

**8.2 🔴 WhatsApp is effectively absent.** Exactly **1 of 108 pages** carries a WhatsApp link, despite
`contact.whatsappE164` being set and WhatsApp being the fleet's second conversion channel. There is no
floating WhatsApp button and no sticky mobile CTA bar.

**8.3 🟡 CTA tracking is single-valued and skips the homepage.** All 114 tracked links carry the same
`data-cta="content-call"`, and the homepage carries none at all. See §13.3.

> ✅ **FIXED 2026-08-25** via `scripts/form.mjs` (new, in the enrich chain). Five defects, one
> pass, and **zero JavaScript** — native constraint validation only, because a lead form that
> depends on JS is one that can fail silently:
>
> 1. **Validation turned on.** `novalidate` removed. The only prior "required" markers were CF7
>    _class names_ (`wpcf7-validates-as-required`) plus `aria-required="true"` — so the form
>    **announced required fields to screen-reader users while accepting an empty submit**.
> 2. **A phone field was added.** The form collected name, email and message and **no phone
>    number** — on a locksmith site, where the callback is the service, that is barely a lead.
>    It is now required, `type="tel"`, with a permissive Israeli pattern (a false rejection on a
>    lockout call costs more than a malformed number) and Hebrew `title` guidance.
> 3. **Email made optional** — phone is what matters, and every extra required field costs
>    completions. Web3Forms still uses it as reply-to when present.
> 4. **`lang="he"` / `dir="rtl"`** on the form and its CF7 wrapper, plus a Hebrew `aria-label`
>    (was `lang="en-US"`, `dir="ltr"`, `aria-label="Contact form"`) — §8.8 / §11.4.
> 5. **Consent line** added above the submit, linking `/privacy-policy/` — §8.5.

**8.4 The lead form has no validation.** The Web3Forms form (injected by `lib/enrich/render.mjs`, and
`scripts/transform.mjs` for the scraped instances) carries `novalidate="novalidate"` and **no JS
handler**, so nothing is validated at all — browser validation is disabled and nothing replaces it.
No per-field errors, no `aria-invalid`, no `aria-describedby`, no phone-format check.

**8.5 No consent affordance.** The form collects name, phone and a free-text message.
`/privacy-policy/` exists and the form never references it.

**8.6 No thank-you URL.** The form has no `redirect` hidden field, so a successful submit lands on
Web3Forms' own generic off-domain page. There is **no URL-based conversion to count**, no clean Google
Ads conversion target, and no next step offered. Add `/תודה/` as a real route, `noindex`, with a
WhatsApp second touch, and point `redirect` at it.

**8.7 The honeypot is present.** `<input type="checkbox" name="botcheck">` positioned off-screen —
correct, keep it.

**8.8 Form markup is still Contact Form 7 debris.** The wrapper carries `wpcf7` classes,
`id="wpcf7-f13-o1"`, `lang="en-US"` and `dir="ltr"` on a Hebrew RTL site, plus an English
`aria-label="Contact form"`. See §11.4.

---

## §9 Navigation & internal linking — 🟡

**9.1 Orphans — now checked properly, and clean.** This section previously asserted "no orphans"
**without the check ever having been run**. When it finally was (2026-08-25),
`/שכפול-שלט-לרכב-2/` turned out to have zero inbound links sitewide.

Two lessons worth keeping:

- The naive shell orphan check compares **decoded** filesystem paths against **percent-encoded**
  hrefs and is therefore meaningless on this site — it reported a false orphan even after the
  page was linked from all 64 footers. Use `node scripts/check-orphans.mjs`, which decodes both
  sides, and which now runs as a **blocking CI step**.
- The page was orphaned because it is a duplicate-intent twin whose label matched a services
  column entry. See §9.7.

> ✅ **FIXED 2026-08-25.** `scripts/footer.mjs` (new, in the enrich chain) rebuilds the footer
> on all 108 pages: a **שירותים** column (13 links incl. the Tier-1 page), an **אזורי שירות**
> column (all 17 — no truncation), the original contact column preserved, and a bottom-bar strip
> carrying every top-level lander. **6 links → 40.** The empty `sidebar-1` column is gone.
> Orphans are now a blocking CI check (`scripts/check-orphans.mjs`). Original finding below.

**9.2 🔴 The footer is near-empty — the single biggest wasted internal-linking surface.**
Measured on the export 2026-08-25:

| Footer fact                    | Value                                                          |
| ------------------------------ | -------------------------------------------------------------- |
| Columns                        | 2 — and `footer-col sidebar-1` is **completely blank**         |
| Total links                    | **6** (phone, email, contact CTA, privacy, a11y, sitemap)      |
| Links to the 30 service pages  | **0**                                                          |
| Links to the 25 location pages | **0**                                                          |
| Unique words                   | 31                                                             |
| Address                        | `derech sara 25/2` — Latin transliteration, no city, no markup |

Every page on the site carries this footer, so it is 67 opportunities to link into the silos, and it
links into neither. An empty column also renders as a visible blank gap. Rebuilding it is the highest
ratio of ranking-and-UX gain to effort available: see `/site-navigation`.

**9.2b The mesh is inherited, not designed.** It came from the WordPress theme wholesale. The
`related.services[]` / `related.locations[]` arrays in each authored module are the one place link
equity is deliberately shaped — verify they are chosen by relevance rather than by array order.

**9.3 No service ↔ location cross-links beyond `related`.** No service page links into the city set
contextually; no location page links to an adjacent city.

**9.4 Anchor-text diversity is limited — and the renderer currently makes it impossible.**
Most internal links are nav items and card titles. **Root cause found 2026-08-24:**
`lib/enrich/render.mjs:97` defines `paras = (arr) => arr.map(t => `<p>${esc(t)}</p>`)`, so any
`<a href>` written into an authored paragraph is HTML-escaped and renders as **visible literal
markup**. Contextual in-copy linking therefore needs a renderer change first — e.g. a typed
`links: [{text, href}]` field per paragraph, or an explicit opt-in `html: true` — not just
copywriting. Until then, in-copy references must name the target page in prose and rely on the
`related` carousel for the actual link.

**9.5 Breadcrumbs are marked up but not rendered everywhere.** 53 pages emit `BreadcrumbList`; the
visible trail comes from the gogo theme and does not appear on all of them. Markup and UI should
agree.

**9.6 `/sitemap/` is a real page** (358 words) distinct from `/sitemap.xml`. Keep them straight.

**9.7 🔶 Four duplicate-intent twin pairs — an owner decision.**
`/מנעולן-רכב/` ↔ `/services/מנעולן-רכב/`, and the same for `מנעולן-לבית`, `קודן-לרכב` and
`שכפול-שלט-לרכב` (whose top-level half carries WordPress's `-2` duplicate-slug suffix). Both
halves of each pair are live permalinks holding ranking signal, so **neither is merged away**
without a `public/_redirects` 301 (`docs/keyword-map.md` §8).

They are now all linked from the footer bottom bar, which fixes the orphan but means four labels
appear twice in the chrome. The real question — consolidate with 301s, or differentiate the two
halves deliberately — is a content decision for the owner, not something to resolve silently.

---

## §10 Performance — 🟡

**10.1 The export is 57.9 MB.** Dominated by vendored theme assets, not by application code.

**10.2 ~8 MB of Font Awesome SVG font files** ship on every deploy:

| File                 | Size    |
| -------------------- | ------- |
| `fa-duotone-900.svg` | 2.17 MB |
| `fa-light-300.svg`   | 1.98 MB |
| `fa-regular-400.svg` | 1.78 MB |
| `fa-solid-900.svg`   | 1.45 MB |
| `fa-brands-400.svg`  | 0.66 MB |

The `.svg` variants are the legacy fallback format for very old browsers; the `.woff2` files are what
modern browsers load. **Root-cause before deleting** — confirm nothing in the vendored CSS references
them at a URL a real browser would take. Deleting a referenced font breaks every icon on the site.

**10.3 `out/index.html` is 780 KB.** The homepage is one enormous scraped HTML document. That is
inherent to the snapshot approach, but it is the LCP-blocking payload on a phone.

**10.4 One 0.96 MB JPEG ships** (`uploads/2025/04/157336036_m.jpg`) and it is the `image` in the
`LocalBusiness` node and the hero. `images.unoptimized: true` is set (correct for a static export),
so nothing generates a `srcset` — a 360px phone downloads the full file. `@ishub/site-kit` ships
`SiteImage`, `mediaUrl`, `srcsetFor` and `preloadPropsFor` backed by Cloudflare `/cdn-cgi/image`
transforms, and the zone is proxied — but the content is injected as raw HTML, so adopting them means
rewriting `<img>` tags in the pipeline, not swapping a React component.

**10.5 jQuery and the full theme JS run on every page.** `components/ThemeScripts.tsx` replays the
original script sequence in document order — jQuery, owl.carousel, magnific-popup, calculator.js,
quiz.js, marquee, fancybox. That is **deliberate and load-bearing**: it is what makes the port
faithful. Do not "optimise" it away. The available win is deferring libraries a given page doesn't
use, which requires knowing per-page which are needed.

**10.6 No font preload.** Google Fonts (Alexandria, Rubik, Poppins) load via the original `<link>`
to Google's CDN, matching the source.

**10.7 CLS.** The theme CSS reserves most boxes. Verify any new enriched block reserves its own.

---

## §11 Accessibility — 🟡

Target: WCAG 2.1 AA and Israeli standard IS 5568. The site **publishes an accessibility statement** at
`/accessibility-statement/`, which raises the stakes — a failure here makes a published statement
false.

> ✅ **FIXED 2026-08-25.** `--acsent-color` overridden to **#00802f** in `app/enrich.css`
> (`html:root`, which outranks the theme's inline `:root`). White-on-accent goes 3.49:1 → **5.09:1**,
> and the button's hover state (accent text on white) with it. #00802f is the _lightest_ shade that
> clears 4.5:1, so this is the smallest change that works. **Brand-visible**: every green darkens
> slightly. Revert by deleting that one block.

**11.1 Accent contrast.** The theme accent is `--acsent-color: #009f3c` (note the source's
misspelling; 103 references across `main.css` and `rtl.css`). White text on it computes to
**≈3.5:1** — below the 4.5:1 AA floor for normal text. **Compute the real ratio from the CSS for each
place it actually ships** before ranking it; the accent is used for borders and icon fills as well as
for text, and a 3:1 boundary is fine.

**11.2 Focus visibility.** Inherited from the gogo theme and not audited. Check every interactive
element has a visible focus indicator.

**11.3 The mobile menu** is the theme's jQuery `nav.js`. No focus trap, no Escape handler, no
`aria-expanded` wiring. Fixing it means editing vendored theme JS — which the project rules forbid —
so the fix is a scoped enhancement layer, not an edit to `public/wp-content/`.

> ✅ Fixed 2026-08-25 — see §8.4.

**11.4 The contact form is marked `dir="ltr"` and `lang="en-US"`** on a Hebrew RTL site, with an
English `aria-label="Contact form"`. Leftover Contact Form 7 markup (§8.8). Screen readers will
announce the form in the wrong language.

**11.5 Form errors are not announced** (§8.4) — there is no error state at all.

**11.6 Image `alt` text is inherited from WordPress** and unaudited. Any image the enrichment pipeline
adds needs a meaningful Hebrew `alt`; decorative gets `alt=""`.

**11.7 Hebrew punctuation.** `lib/enrich/render.mjs:29` writes hours as `א’-ו’` using the right single
quotation mark (U+2019) instead of גרש `׳` (U+05F3). Cosmetic but wrong, and it is in a shared
constant.

**11.8 Verify the statement stays true.** Any a11y change that makes `/accessibility-statement/`
inaccurate — in either direction — must be flagged.

---

## §12 Security — 🔴

**12.1 🔴 A stale second origin is live.** `https://robiuzan.github.io/` returns **200** with
`Server: GitHub.com` and serves this site's content from an older build — its homepage `<title>` is
the pre-fix bare `שלושה מנעולנים`, while production serves the enriched title. Two live origins
serving the same site is a duplicate-content and brand risk.

Root: `.github/workflows/deploy.yml` publishes `out/` to GitHub Pages, and `public/CNAME` +
`out/CNAME` carry `3locksmiths.co.il`. Production, meanwhile, is Cloudflare Pages (§12.2). Retire the
GitHub Pages publish step, or make it redirect.

**12.2 Production is Cloudflare Pages, and the roster's notes disagree with the roster's fields.**
`roster/roster.json` sets `hosting.target: cloudflare-pages`, `pagesProject: "3locksmiths"`, while its
free-text `notes` (dated 2026-07-13) describe deploying by pushing to the
`robiuzan/robiuzan.github.io` Pages repo. `logs/deploys.csv` has **no 3locksmiths row**.

Live evidence settles it: the apex returns `Server: cloudflare`, `cf-cache-status: DYNAMIC`,
`Access-Control-Allow-Origin: *`, `x-content-type-options: nosniff` and
`referrer-policy: strict-origin-when-cross-origin` — the Cloudflare Pages default header set — and
**no `Last-Modified`, no `ETag`, no `x-github-request-id`**, all of which GitHub Pages always sends and
Cloudflare passes through. The origin is Cloudflare Pages.

**Do not act on that conclusion blind.** `ops/deploy-site.ps1` performs a drift check against the
Cloudflare API that is the actual arbiter — run the dry run first. See `/deploy-3locksmiths`.

> ✅ **FIXED 2026-08-25.** `public/_headers` shipped: HSTS (1 year, **no `preload`** — that is the
> owner's call), `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy`, and a **report-only** CSP
> whose host list was enumerated from the actual export (cdnjs, googletagmanager, fonts.googleapis,
> fonts.gstatic, imgquarry, api.web3forms). Verify with `curl -sSI` after deploy — an unverified
> header is not a shipped header.

**12.3 Missing response headers.** The live response carries no `Strict-Transport-Security`, no
`X-Frame-Options` / `frame-ancestors` (the site is framable), no `Permissions-Policy` and no CSP.
`output: "export"` makes Next's `headers()` unavailable, but **Cloudflare Pages reads
`public/_headers`** — so all of it is one file. See `/web-security-headers`.

**12.4 `Access-Control-Allow-Origin: *` on HTML** — a Cloudflare Pages default, looser than needed.

**12.5 CSP is hard here and must be report-only first.** The GTM snippet is injected via
`dangerouslySetInnerHTML`, **and** `components/ThemeScripts.tsx` creates `<script>` elements at runtime
and appends them to the body, **and** the scraped HTML contains inline scripts. A static export cannot
generate a per-request nonce. Any CSP will need `'unsafe-inline'` for scripts to keep the port
working. Ship report-only, observe for a week, then decide whether enforcing is achievable at all.

**12.6 The Web3Forms access key is public by design.** `cea18712-…` is not a leaked secret — do not
report it as one.

**12.7 No PII in `dataLayer`** — nothing currently pushes any. Keep it that way.

**12.8 `dangerouslySetInnerHTML` is used deliberately** in `SiteFrame` for the ported body and the
JSON-LD. The content is build-time snapshot data, not user input, so it is not an XSS vector — but it
means **anything that lands in `content/site.json` ships as live HTML**. Treat the scrape pipeline as
a trust boundary.

---

## §13 Analytics — 🟡

**13.1 GTM is in `<body>`, not `<head>`.** `app/layout.tsx:53` renders the container script as a child
of `<body>`. Google's install requires `<head>`; body placement delays container load and can miss
early events. The `<noscript>` iframe correctly stays in `<body>`.

**13.2 The container is correct and live.** `GTM-KWGGH438` returns **200** (verified 2026-08-16) and
appears in the served HTML. It is a **shared container across ~10 Israeli fleet domains**, with GA4
resolved inside it by a hostname table — so any container edit affects every fleet site. Never edit a
shared trigger to fix one site; add a hostname condition.

**13.3 🟡 `data-cta` exists but collapses into a single bucket, and misses the homepage.** Measured on
the export: **114 tracked links across 58 of 66 pages — every one of them
`data-cta="content-call"`.** They are emitted only from the authored content blocks
(`lib/enrich/render.mjs:139` and `:236`, `scripts/pages.mjs:116`, `:151`, `:267`).

Three consequences:

1. **One value means GTM cannot tell the surfaces apart.** Header, hero, pricing, footer and in-copy
   clicks all report as `content-call`, so there is no way to learn which placement converts.
2. **The eight pages with no `data-cta` include the homepage** — the highest-traffic page on the site
   — plus `/services/שכפול-מפתח-לרכב/` and the four `/step/` routes. The scraped chrome (header,
   footer, floating buttons) carries none, so those clicks are genuinely invisible everywhere.
3. **No WhatsApp CTA exists at all**, tracked or otherwise (§8.2).

Extend the convention rather than replacing it — `content-call` is already live in the container, so
keep it and add: `header-call`, `hero-call`, `footer-call`, `sticky-call`, `sticky-whatsapp`,
`pricing-call`, `form-submit`. Authored blocks change in `lib/enrich/render.mjs`; the scraped chrome
changes in `scripts/transform.mjs`.

**13.4 No `lead_submit` event.** The form is a native HTML POST with no JS handler, so nothing fires
on success — and success happens off-domain (§8.6). Fixing §8.6 with a `/תודה/` redirect gives a
URL-based conversion, which is the cleanest signal available for a no-JS form.

**13.5 Search Console verification is hardcoded.** `app/layout.tsx:33` carries the token as a string
literal while the manifest has `googleSiteVerification: null`. Move it to the roster manifest.
`docs/business-facts.md` §F.1.

**13.6 GA4 property existence unverified** for this domain inside the shared container.

---

## Working order

Done 2026-08-17 (in the working tree; deploy to make live): ~~§4.2~~ · ~~§8.1~~ · ~~§4.1~~ ·
~~§13.3 + §8.2 + §8.6~~ · ~~§2.1~~ · ~~§13.1~~ · ~~§13.5~~ · §7.1 (authored surfaces) ·
§12.1 (local half).

1. **Deploy** the 2026-08-17 batch — nothing above is live until it ships. `/deploy-3locksmiths`.
2. ~~**§12.1**~~ done 2026-08-23 — `robiuzan.github.io` redirects to production.
3. **§3.2** author `content/enriched/95.mjs` — also removes the last scraped-body 25-years claim
   on that page.
4. **§2.2/§2.3** remaining title lengths and the missing description on page 95.
5. **§12.3** ship `public/_headers`.
6. **§8.4** form validation (per-field, Hebrew, announced).
7. **§5.1/§5.2** address and Business Profile — owner-blocked, escalate early so they run in
   parallel with everything above.
