# Business facts — the confirmation register

Every claim this site makes must trace to a row here, to `site.config.json`, or to the roster manifest
at `Israeli services sites/roster/sites/3locksmiths.json`. A claim that traces to nothing is **🔶
unconfirmed** and may not be stated as fact.

**The rule:** if it is not confirmed, write around it. Do not soften an invented number — omit it.
Absent is always better than fabricated. A fabricated review, rating or certification is a Google
policy violation and a consumer-protection exposure, not a content gap.

Status key: ✅ confirmed · 🔶 unconfirmed, do not state · ⛔ contradicted by our own data

---

## A. Identity & people

| Fact              | Value                             | Status | Source                      |
| ----------------- | --------------------------------- | ------ | --------------------------- |
| Brand name (he)   | שלושה מנעולנים                    | ✅     | manifest `brandName`        |
| Brand name (en)   | 3 Locksmiths                      | ✅     | manifest `brandNameEn`      |
| Legal name / ח.פ. | —                                 | 🔶     | manifest `legalName: null`  |
| Owner / founder   | —                                 | 🔶     | named nowhere in the repo   |
| Named technician  | —                                 | 🔶     | no person named on any page |
| Years in business | "מעל 25 שנות ניסיון"              | ⛔     | see §A.1                    |
| Team size         | "שלושה" implied by the brand name | 🔶     | never stated as a fact      |

### A.1 The 25-years claim — the flagship trust defect

> ⚠️ **The 2026-08-17 entry here was wrong, and stayed wrong for eight days.** It read "removed
> from every authored surface". It was not. `DEFAULT_FEATURES` had been fixed; **`DEFAULT_STATS`,
> twelve lines below it in the same file, had not** — and it rendered `25+ שנות ניסיון במנעולנות`
> on **61 pages** the whole time, alongside `30–60 ד׳ זמן מענה ממוצע` and `אלפי לקוחות מרוצים`.
> The claim was also live in the homepage `<title>` (`HOME_SEO`), in `129.mjs`'s explicit `stats`,
> and in scraped homepage body copy.
>
> The check that produced the false all-clear read the authored modules. The claims were in a
> renderer default and in scraped HTML — neither of which a module scan can see. **That is the
> lesson: verify the rendered page, not the source.** See §D.4.
>
> **2026-08-25 — actually removed, and verified live.** Fixed in `DEFAULT_STATS`,
> `DEFAULT_FEATURES`, the advantages intro (`lib/enrich/render.mjs`), `HOME_SEO`
> (`scripts/enrich.mjs`), `129.mjs`, and the scraped homepage copy via `scripts/claims.mjs`.
> `scripts/check-claims.mjs` now fails the build on any recurrence. Verified: 0 occurrences across
> all 74 built pages and 33 live URLs spot-checked, including all 17 location pages.
>
> The options below remain the path to _restoring_ an experience claim.

`scripts/enrich.mjs` writes `מעל 25 שנות ניסיון` into the homepage meta description, and the
`/אודותינו/` title carries it too. The manifest has **`foundedYear: null`**, so the `LocalBusiness`
JSON-LD emits no `foundingDate`. The marketing copy and the structured data disagree.

Resolve one of three ways — do not leave it as is:

1. Owner confirms the founding year → set `foundedYear` in the **roster manifest**, sync, and let
   `foundingDate` be emitted. The copy then has a source.
2. Owner confirms a range but not a year → soften the copy to what is true and drop the number.
3. Owner cannot substantiate it → remove the claim from every page.

Until then: **no new page may repeat the 25-years claim.**

---

## B. Reputation & social proof

| Fact                    | Value                           | Status | Source                  |
| ----------------------- | ------------------------------- | ------ | ----------------------- |
| Google Business Profile | —                               | 🔶     | `schema.sameAs` is `[]` |
| Review count / rating   | "Google rating 5.0 ★★★★★"       | ⛔     | see §B.1                |
| Testimonials            | 3 named reviews on the homepage | ⛔     | see §B.2                |
| Social profiles         | —                               | 🔶     | `sameAs: []`            |
| Case studies            | —                               | 🔶     | none                    |

**Nothing on this site is corroborated from outside it.** For a single-trade local business the
Business Profile is the highest-leverage missing asset — it drives the map pack, it is where reviews
live, and it is the entity anchor that makes `sameAs` meaningful. This is an owner action, not a code
task.

**`Review` and `AggregateRating` must never ship without a verifiable public source URL.** Not as
sample data, not "to test the markup". The export emits zero of both in _schema_ — which is why both
defects below went unnoticed for so long. Neither was in the structured data.

### B.1 The fabricated Google rating badge — REMOVED 2026-08-26

The vendored gogo theme ships `assets/img/GoogleRating.png`: an image reading **"Google rating 5.0"**
beside five filled stars. The scraped header placed it on **all 71 pages**. We hold zero reviews and
have no Business Profile, so the badge asserted a rating that does not exist.

**Why every previous audit missed it.** Every rating guard we had — `scripts/check-claims.mjs`, the
schema auditor, the QA gate's "no `aggregateRating`" assertion — looks for `aggregateRating` or
`reviewCount` in **markup**. This claim was baked into a **PNG**. No schema validator and no text
scan could see it, and all of them reported clean while it was live.

Removed via an enumerated rewrite in `scripts/claims.mjs`, and `check-claims.mjs` now has a
`BLOCKING_RAW` rule tested against raw HTML rather than visible text, so it fails the build if the
badge returns.

### B.2 Three fabricated testimonials on the homepage — REMOVED 2026-08-26

The homepage carried a `.s-feedback` review carousel containing the gogo demo's own testimonials,
machine-translated into Hebrew, live in production:

- attributed to three invented customers — "חנה מלמד", "ג׳ורג׳יה אקרס", "ליליאנה פונס"
- with star-rating markup (`saswp-r2-strs`) for each
- and the text was not about locksmithing at all: translated from a US garage-**gate** company's
  sample content, so the page praised a gate opener and a technician named "אנדרו", and one line
  rendered as a mistranslation about costumes and Jesus

Invented reviews attributed to invented people are a Google policy violation and an Israeli
consumer-protection exposure, so the whole band was pruned (`PRUNE_SELECTORS` in
`scripts/pages.mjs`) rather than emptied. It carried no links and no CTA, so nothing was lost. The
19 KB schema-plugin stylesheet that existed only to style it is now dropped by `scripts/assets.mjs`.

**The lesson, again, is §D.4's:** both defects were in _rendered output_ that no module and no
schema check covers. B.1 was an image; B.2 was scraped markup. Read the page, not the source.

**Restoring a reviews section** requires real, attributable reviews with a public source URL.
Until then the site has no social proof — which the 2026-08-26 competitor teardown identifies as
the single largest gap against the category leader, and the one that cannot be closed with code.

---

## C. Contact & NAP

| Fact               | Value                                                      | Status | Source                                                      |
| ------------------ | ---------------------------------------------------------- | ------ | ----------------------------------------------------------- |
| Phone (display)    | 055-6601006                                                | ✅     | manifest `contact.phoneDisplay`                             |
| Phone (E.164)      | +972556601006                                              | ✅     | manifest `contact.phoneE164`                                |
| WhatsApp           | +972556601006                                              | ✅     | manifest `contact.whatsappE164`                             |
| Email              | info@3locksmiths.co.il                                     | ✅     | **verified 2026-08-24** — live routing rule, see §C.3       |
| **Street address** | —                                                          | 🔶     | **the manifest has no address field at all**                |
| Opening hours      | 2 `OpeningHoursSpecification` nodes in the scraped JSON-LD | 🔶     | scraped from WordPress, never verified against the business |

### C.1 The address — CORRECTED 2026-08-25

> ⚠️ **My earlier claim "no address anywhere" was wrong.** The scraped footer renders
> **`derech sara 25/2`** — a Latin transliteration of דרך שרה 25/2 — as plain text on every page,
> with **no city**, no link, and no schema markup. So an address does exist in the copy; what is
> missing is a _confirmed, structured, Hebrew_ one.
>
> Open questions for the owner: is this the real business address? Which city? Should it be public
> at all (a mobile-only locksmith may prefer a service-area listing)? Until answered, do not promote
> it into the `LocalBusiness` schema — a wrong or partial address is worse than none.
>
> The manifest still has **no `address` field**, so adding one is a roster-schema change. Original
> analysis below.

### C.1b The manifest has no address field

`roster/sites/3locksmiths.json` `schema` carries `type`, `priceRange`, `areaServed` and `sameAs` —
**no `address`**. No page renders one. For a `Locksmith` node this is the largest local-SEO gap after
the missing Business Profile, and it is blocked on the owner: a mobile-only locksmith may legitimately
have no public premises, in which case the correct answer is a service-area business on the Business
Profile side, not an invented address.

**Never invent an address to fill the schema.** Record the answer here first.

### C.2 The phone is correct but the links are not — FIXED 2026-08-17

> `scripts/fix-links.mjs` now normalizes every spelling of the business number — including the
> dead `tel:[phone]` shortcode — to the manifest's E.164 form (`tel:+972556601006`, 574 links in
> the export), and replaces the legacy personal `robiuzan@gmail.com` (which the scraped chrome
> displayed as visible text and `mailto:` on every page) with `contact.email`. Both are blocking
> CI checks. The `info@` address was **confirmed live** on 2026-08-24 — see §C.3.
> The historical record below is kept as written.

Verified against `content/site.json` across all 108 pages:

| `tel:` href         | Count | Verdict                                             |
| ------------------- | ----- | --------------------------------------------------- |
| `tel:0556601006`    | 385   | works; not E.164                                    |
| `tel:055-6601006`   | 114   | works; not E.164                                    |
| `tel:+972556601006` | 4     | correct form                                        |
| `tel:%5Bphone%5D`   | 3     | **dead — unresolved WordPress `[phone]` shortcode** |

The `tel:[phone]` placeholder is live on the homepage — **3 rendered `<a href="tel:%5Bphone%5D">`
anchors** (a raw grep returns 6, because the static export embeds a second copy of the markup in its
payload; count `href="tel:` to get the real number). Confirmed
2026-08-16 via `curl`). Those are dead click-to-call links on the highest-traffic page. See
`docs/optimization-backlog.md` §8.1 — this is a confirmed defect, not a 🔶.

---

### C.3 The business email is live — CONFIRMED 2026-08-24

> Queried the Cloudflare Email Routing rules for the zone: **`info@3locksmiths.co.il` is an enabled
> routing rule forwarding to `robiuzan@gmail.com`.** So the address genuinely receives mail, and it
> reaches the same inbox the site was previously exposing publicly.
>
> This resolves the last risk on the §4.2 fix: replacing the personal Gmail with `info@` sitewide
> changes **who the public sees**, not **who gets the mail**. No deliverability regression. The owner
> had already configured the routing — the website simply never used it.
>
> Note the destination is still a personal Gmail. That is fine for delivery, but if the business ever
> wants mail to survive a change of hands, the routing destination is the thing to revisit — not the
> address on the site.

## D. Services & pricing

| Fact                | Value                                            | Status                      |
| ------------------- | ------------------------------------------------ | --------------------------- |
| Service list        | 30 service pages + 17 location pages             | ✅ (in `content/site.json`) |
| Price ranges        | per-page `pricing[]` in `content/enriched/*.mjs` | 🔶                          |
| `priceRange`        | `₪₪`                                             | ✅ manifest                 |
| Warranty ("אחריות") | claimed widely, no term stated                   | 🔶                          |
| Response time       | "כ-20–40 דקות" and similar, per city             | 🔶                          |
| 24/7 availability   | **confirmed by the owner 2026-08-30** — see D.3  | ✅ owner instruction        |

### D.1 Prices are authored, not sourced

Every `pricing[]` row in `content/enriched/<id>.mjs` (e.g. `"שכפול מפתח רכב סטנדרטי" → "200 – 350 ₪"`)
was authored during the enrichment pass. **None is traced to an owner-supplied price list.** They are
internally consistent, which is better than galbath's contradiction, but consistency is not
sourcing.

Before any pricing page is promoted or any `Offer` schema is emitted, the ranges need owner sign-off.
An `Offer` carrying an unconfirmed price is worse than no `Offer`.

### D.2 The warranty has no term

"אחריות" / "אחריות מלאה" appears throughout the authored copy with **no duration, scope or
exclusions**. Do not state a term. Do not let "אחריות מלאה" be read as a period.

### D.3 "24/7" — ⛔ removed 2026-08-25, ✅ CONFIRMED AND RESTORED 2026-08-30

> ✅ **The owner confirmed 24/7 availability on 2026-08-30**, in response to this register's own
> question. That is the source; there is nothing further to verify.
>
> The published hours are now `openingHoursSpecification` **00:00–23:59, all seven days**
> (`scripts/enrich.mjs`), the chrome prints `24/7` (`lib/enrich/render.mjs`, `scripts/pages.mjs`),
> and the `always-open` blocking rules were removed from `scripts/claims.mjs` and
> `scripts/check-claims.mjs` — a guard that forbids a now-sourced claim is a guard that will be
> ignored. The rewrites that stripped 24/7 from the scraped homepage copy were deleted with them.
>
> **If the business ever stops answering overnight, this must be reversed in all five places.**
> The claim is only as good as the confirmation behind it, and it now appears in the schema, which
> is what Google reads.

**The history is worth keeping**, because the defect was not "an unconfirmed claim" — it was a
self-contradiction. Until 2026-08-25 every page published `openingHoursSpecification` 08:00–18:00
(Sat 08:00–17:00) while the copy claimed 24/7, in the same HTML document, on the highest-value
pages on the site. Whichever half was true, the page was provably lying about the other.

That is the general rule this section exists to record: **a claim that contradicts our own
structured data is worse than an unsourced one**, because the contradiction is machine-detectable.
The fix was never "pick the friendlier wording" — it was to find out which half was true. Now that
the owner has, both halves say the same thing.

Previously removed from, and now restored across: the homepage `<title>` (`scripts/enrich.mjs`
`HOME_SEO`), the homepage feature card and FAQ accordion including its `FAQPage` JSON-LD mirror
(`scripts/claims.mjs`), the `/contact/` title (`scripts/pages.mjs`), and the authored modules
`77.mjs`, `93.mjs`, `94.mjs`.

The per-city response windows ("ברוב המקרים … תוך כ-30 עד 45 דקות") were authored, not measured.
They are hedged and remain 🔶 — but see D.4 for the version that was not hedged.

### D.4 The renderer defaults — a sitewide fabrication that shipped

**Incident, 2026-08-25.** `lib/enrich/render.mjs` had a `DEFAULT_STATS` array that renders on
every page which does not author its own `stats`. It asserted, as a four-item metrics strip
captioned "למה אנחנו **במספרים**":

| Rendered claim                 | Pages | Status                                             |
| ------------------------------ | ----- | -------------------------------------------------- |
| `25+ שנות ניסיון במנעולנות`    | 61    | ⛔ manifest `foundedYear` is `null`                |
| `30–60 ד׳ זמן מענה ממוצע`      | 60    | ⛔ an unhedged averaged response-time promise      |
| `100% אחריות מלאה על כל עבודה` | 62    | 🔶 no term, no scope                               |
| `אלפי לקוחות מרוצים`           | 59    | ⛔ zero reviews, `sameAs: []` — no possible source |

`DEFAULT_FEATURES` added `7 ימים בשבוע` and a second warranty assertion on the same pages.

**Why it survived review:** every audit pass read the authored **modules** and checked them
against this file. None read the **rendered output**. A default in the renderer is invisible to
module-level review by construction — the modules were clean, and the pages were not.

**The guard:** `scripts/check-claims.mjs` reads `content/site.json` (what actually reaches the
browser) and fails the build on any ⛔ claim. It is part of the gate in CLAUDE.md §11. It found
four more instances within a minute of being written, all in scraped homepage HTML that no module
scan could ever have reached.

**Rule going forward:** anything added to `DEFAULT_STATS`, `DEFAULT_FEATURES` or any renderer
default is asserted on ~55 pages at once. It must be a description of what the business does, or a
✅ row in this file. Never a number, a duration, a guarantee or a count.

---

## E. Coverage

| Fact                 | Value                                     | Status            |
| -------------------- | ----------------------------------------- | ----------------- |
| `schema.areaServed`  | `null`                                    | 🔶                |
| Claimed coverage     | "פריסה ארצית" (homepage title)            | 🔶                |
| Location pages       | 17 cities/regions under `/locations/`     | ✅ (routes exist) |
| Named neighbourhoods | e.g. דיזנגוף, רוטשילד, פלורנטין, רמת אביב | 🔶                |

The 17 location pages name specific neighbourhoods and streets, which is exactly what makes them pass
the doorway test — **but nobody has confirmed the business actually services those areas from a
mobile unit within the stated times.** A coverage claim the business cannot serve produces leads it
cannot fulfil and a claim it cannot defend.

`areaServed` is `null` in the manifest while the copy claims national coverage. Reconcile before
emitting `areaServed` in schema.

---

## F. Analytics & verification

| Fact                        | Value                                         | Status                                    |
| --------------------------- | --------------------------------------------- | ----------------------------------------- |
| GTM container               | `GTM-KWGGH438` (shared, ~10 fleet domains)    | ✅ verified 200 on 2026-08-16             |
| GA4 property                | resolved inside the container by hostname     | 🔶 existence not verified for this domain |
| Search Console verification | `ifGKeC-eWQKeDqM1qDUOgGmDODCTE1vSalAmg7bGmEI` | ⛔ see §F.1                               |
| Web3Forms access key        | `cea18712-6fba-46ca-abb1-2f140806a35a`        | ✅ public by design                       |

### F.1 The verification token is hardcoded and drifts from the manifest — FIXED 2026-08-17

> The token now lives in the roster (`analytics.googleSiteVerification`), synced into
> `site.config.json`, and `app/layout.tsx` reads it from the manifest. Historical record below.

`app/layout.tsx:33` hardcodes `verification.google` as a string literal, while the roster manifest and
`site.config.json` both carry `analytics.googleSiteVerification: null`. The token works, but the
manifest is no longer the source of truth for it.

Fix direction: put the real token in the **roster manifest**, sync, and read it from
`manifest.analytics.googleSiteVerification`. Do not edit `site.config.json` directly.

---

## G. Imagery

| Fact                | Value                                                                 | Status                                                  |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| Content images      | vendored from the WordPress source under `public/wp-content/uploads/` | ✅ provenance: the original site                        |
| OG card             | `3locksmiths/og.jpg` on `imgquarry.com`, sha256 pinned                | ✅ manifest `images.og`                                 |
| Photos of real jobs | —                                                                     | 🔶 no evidence any image shows this business's own work |

The uploads are whatever the original WordPress site shipped. **Nobody has confirmed they are photos
of this business's own work** rather than stock. Do not caption an image as a real job, a real
customer or a real result without confirming it.

---

## How to add a row

When you hit an unknown:

1. Do not state it. Write around it, or use a phrasing that is true without the unknown.
2. Add `// 🔶 confirm` beside the line in `content/enriched/<id>.mjs`.
3. Add or update the row in the right section above, with what you would need to confirm it.
4. Say so in your handoff so the owner sees the open question.

Facts that graduate to ✅ move up the chain: identity, NAP, schema and analytics belong in
**`Israeli services sites/roster/sites/3locksmiths.json`**, then sync down. Never edit
`site.config.json` directly.
