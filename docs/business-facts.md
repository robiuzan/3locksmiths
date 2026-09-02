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

| Fact              | Value                | Status | Source                      |
| ----------------- | -------------------- | ------ | --------------------------- |
| Brand name (he)   | שלושה מנעולנים       | ✅     | manifest `brandName`        |
| Brand name (en)   | 3 Locksmiths         | ✅     | manifest `brandNameEn`      |
| Legal name / ח.פ. | —                    | 🔶     | manifest `legalName: null`  |
| Owner / founder   | —                    | 🔶     | named nowhere in the repo   |
| Named technician  | —                    | 🔶     | no person named on any page |
| Years in business | "מעל 25 שנות ניסיון" | ⛔     | see §A.1                    |
| Team size         | **three locksmiths** | ✅     | owner, 2026-08-30 — §A.2    |

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

### A.2 Team size — ✅ CONFIRMED 2026-08-30

**"שלושה מנעולנים" is literal: three people do the work.** Confirmed by the owner on 2026-08-30.

⚠️ **This is a fact about the business, not about the imagery.** The people pictured on the site are
AI-generated brand characters, not photographs of the three real locksmiths — see §G.1. An earlier
version of this row also recorded "all three technicians consented to AI images of themselves"; that
was wrong and has been removed. No real person's likeness appears in any site image, so there is no
consent to record.

This matters beyond the brand name. It is the fact that makes depicting a _team_ honest, and it sets
the ceiling: imagery and copy must never imply more than three people. It does **not** substantiate
§A.1 — years in business is still unsourced, and the two are unrelated.

Still open: no individual is **named** anywhere on the site, so `authorName` stays absent on all 12
guides (`scripts/enrich.mjs:132-137`). A fabricated byline is worse than an absent one.

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

### B.3 Two more fabricated Google 5.0 badges — REMOVED 2026-08-30

§B.1 removed the theme's `GoogleRating.png` and added a guard for the token `GoogleRating`. **Two
more copies of the same fabricated rating were live the whole time**, and neither could ever have
matched that guard:

| File             | Where                                                                                | Why nothing caught it                  |
| ---------------- | ------------------------------------------------------------------------------------ | -------------------------------------- |
| `logo-11.png`    | 5th `.gallery-item` in the **homepage hero**, absolutely centred over the photo grid | the filename says "logo", not "rating" |
| `admin-ajax-2-1` | a 4-photo collage with the badge **composited into the raster**                      | no text-level guard can read pixels    |

Both removed in `scripts/claims.mjs` (`fabricated-google-rating-badge-hero`, `…-collage`).
`scripts/check-claims.mjs` now also pins them by filename (`fabricated-rating-image-by-filename`).

**A rating badge is identified by what it depicts, not by what it is called.** A new badge image
would still need a human to notice it — which is what §G exists for.

⚠️ Removing the hero badge required a CSS override in `app/enrich.css`: the theme styles
`.home-hero-right-galley .gallery-item:last-child` as an absolutely-centred overlay
(`main.css:1788`), so dropping the 5th tile would otherwise make the 4th photo jump into the middle
of the grid.

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

### C.4 A US phone number was printed on the homepage — FIXED 2026-08-30

The homepage CTA button displayed **`(281) 843-8447`** — a Houston, Texas number inherited from the
gogo theme's US origin. It was live and visible.

It survived every check because **the `href` was correct**: `fix-links.mjs` had already normalised
it to `tel:+972556601006`, so the button dialled Israel while the text a human reads said Texas.
Link tests passed; the page still lied. Desktop visitors, who read a number rather than tap it, got
a US one.

Fixed by `scripts/claims.mjs` (`us-phone-number-in-cta`), substituting
`manifest.contact.phoneDisplay`. `scripts/check-claims.mjs` now blocks any US-format
`(NNN) NNN-NNNN` string sitewide (`foreign-phone-number`).

**NAP integrity has to be checked on what is displayed, not only on what is linked.**

## D. Services & pricing

| Fact                | Value                                            | Status                      |
| ------------------- | ------------------------------------------------ | --------------------------- |
| Service list        | 30 service pages + 25 location pages             | ✅ (in `content/site.json`) |
| Price ranges        | per-page `pricing[]` in `content/enriched/*.mjs` | 🔶                          |
| `priceRange`        | `₪₪`                                             | ✅ manifest                 |
| Warranty ("אחריות") | claimed widely, no term stated                   | 🔶                          |
| Response time       | "כ-20–40 דקות" and similar, per city             | 🔶                          |
| 24/7 availability   | **confirmed by the owner 2026-08-30** — see D.3  | ✅ owner instruction        |
| Key-type per model  | `keyModels[]` on brand pages — see D.5           | 🔶                          |

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

### D.5 Per-model key types on the brand pages — 🔶 open

`content/enriched/99.mjs` (פורד) now renders a `keyModels[]` grid: eight Ford models, each with
the key type we say is fitted to it, a button count, a model-year span and a price range.

**The prices are safe.** Every range restates a number already published in that page's
`pricing` and `specsTable`; the grid introduces none of its own.

**The key types are not sourced.** The model → key-type mapping (blade-with-chip on Fiesta,
flip-with-remote on Focus/Transit/EcoSport, smart key on Puma and late Kuga) is general Ford
market knowledge, and trims vary _within_ a generation — a Kuga ST-Line and a base Kuga of the
same year do not carry the same key. The copy hedges accordingly ("בגימורים גבוהים", "בדור
החדש"), but a hedge is not a source.

**What would confirm it:** the owner cuts these keys and is the only person who can sign the
mapping off. One pass down the eight cards, correcting the key type and the year span, closes
this. Until then the grid is accurate-as-hedged, not verified.

**Before this pattern is copied to the other 31 brand pages**, get that pass — otherwise one
unverified mapping becomes thirty-two.

**Update 2026-08-31 — the grid now shows three key TYPES, not eight models.** The copy declares
only three types across the eight cards (פוקוס, טרנזיט and אקוספורט all declare the identical
`מפתח מתקפל עם שלט`; קוגה, ריינג׳ר, מונדאו and פומה all declare flip-or-smart). Eight distinct
photographs could therefore only be made distinct by inventing differences no card claims — a
half-open blade, a twin pair, a split ring, staged wear. Cards that declare the same key now share
one image, and `intro` discloses it. Nothing on the page asserts a mapping as fact.

**The four questions that would buy a fourth picture — owner only:**

| Question                                                                                       | What it unblocks                                                                                            |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| For each of the eight models: one key type, or genuinely two? If two, from which year or trim? | The whole mapping; every hedge on the page                                                                  |
| Are the eight year spans right?                                                                | The `years` line on each card                                                                               |
| פומה — smart-key only in Israel, or does a trim ship a flip key?                               | "smart only" drops `או מתקפל`, moves it to a fourth plate, and yields the most distinctive frame in the set |
| פיאסטה — is the separate remote the common Israeli case, or the bare key?                      | Whether Plate A should show one object or two                                                               |

Until these come back the page stays hedged, which is the truth. The plates are named for the key
type and are brand-agnostic, so the answers change which plate a card points at — never invalidate
a generated image.

### D.6 The buttonless-key rows were wrong on every page that named a current model — CORRECTED 2026-09-01

**Found by the owner**, who looked at the key grid on the קיה page and said the picture was not his
customers' key. It was not an imagery defect. The grid is generated from each page's own
`specsTable`, and that row said the Picanto takes a plain chip key with no buttons. It does not.

Fifteen rows across the brand pages made that claim. Every one that named a car still on the road
was checked against retailer listings and OEM part numbers. **All seven were wrong.**

| Page     | Claimed                     | Actually                                                                                         | Evidence                                         |
| -------- | --------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| קיה      | `Picanto, Rio` chip key     | Picanto is a flip remote — 2-btn `95430-1Y600`, 3-btn `95430-G6600`, plus a smart key. Rio 3-btn | keyshop-online, car-keys.co.il, shop-locks.co.il |
| יונדאי   | `i10 / i20` chip key        | 3-btn flip, every generation — `95430-B9500`, `95430-K7000`, `95430-1JAB1`, `95430-Q0000`        | advanced-keys, keyshop-online                    |
| יונדאי   | `אקסנט / i25` chip key      | 3-btn flip `95430-J0700`, blade `81996-H5000`                                                    | key4, mk3                                        |
| סוזוקי   | `Jimny, Ignis` chip key     | Jimny 2018+ is a 2-btn remote flip, transponder on the board                                     | reidsremotes                                     |
| שברולט   | `Spark, Aveo` chip key      | Spark 3-btn remote head `A2GM3AFUS03`; Aveo 2-btn remote                                         | transponderisland, car-keys-online               |
| סובארו   | `אימפרזה / XV` chip key     | 3–4 btn flip `CWTWB1U811`; XV also 3-btn smart                                                   | car-keys-online, remkeys                         |
| מיצובישי | `ספייס סטאר / ASX` chip key | ASX 2-btn flip on `MIT11`; Space Star 2-btn remote head                                          | autokeystore, keyshop-online                     |

**The fix**, applied to all seven: the buttonless row keeps its description but stops naming a
modern car, and the model moves onto the flip row. Eight further rows make the same claim but hedge
it — "ישנות", "ותיקים", or commercial vans — and were left alone as defensible.

**The standard these corrections meet.** They are sourced to retailer listings and OEM part
numbers, **not to the owner**. That is a real improvement on what was published — which was sourced
to nothing — but it is not his word, and he has not personally confirmed a single row. Approved by
him on 2026-09-01 as good enough to publish on that basis.

**What this says about §D.5.** That entry warned the model-to-key-type mapping was unsourced and
should not be copied to 31 more pages unverified. A 7-of-7 error rate on the first rows actually
checked is the strongest possible confirmation. **The remaining rows — flip, smart, remote and card
— have NOT been audited.** Assume they carry a similar error rate until they have been.

### D.7 The 32-brand key-spec audit — 198 rows checked, 2026-09-01

Every row in every brand page's `specsTable` was checked against parts catalogues and OEM part
numbers, and each suspected error was then argued against by an independent reviewer before it was
accepted.

|                                                |                     |
| ---------------------------------------------- | ------------------- |
| Rows audited                                   | 198 across 32 pages |
| Flagged on first pass                          | 103                 |
| **Refuted** — the "fix" was worse than the row | **79**              |
| **Confirmed wrong or materially imprecise**    | **24 (12%)**        |

**The 12% corrects §D.6's warning.** That entry said to assume the 7-of-7 rate held site-wide. It
does not. The buttonless slice was pre-filtered to the worst possible shape — a row naming a
current high-volume car and claiming a no-button chip blade — and every row of that shape was
wrong. Swept across everything, including hedged rows about twenty-year-old cars, the rate is 12%.

**⛔ RULE FOR ANY FUTURE PASS: a North American part number is inadmissible evidence for button
count on this site.** It was the single most common cause of the 79 refutations. US keys are 315 MHz
and carry a panic button; the same car sold here is 433 MHz without one. Sourcing a US part yields
a count one too high, and would have introduced fresh errors across Toyota, Honda, Infiniti, Subaru
and Mitsubishi.

**The site's signature error is not the chip blade — it is "מתקפל".** Eleven of the 24 call a key
folding when it does not fold: Suzuki (whole brand), Isuzu, Dacia ×3, Nissan Micra, Subaru, Buick
Enclave, Ford Fiesta, plus Jeep and Mercedes in mirror image. **One of those eleven was mine** — I
"corrected" Suzuki on 2026-09-01 by moving the Jimny onto a folding row. Suzuki's factory key is a
one-piece remote head; the flip is an aftermarket conversion.

**Applied 2026-09-01:** the nine rows that cause a wrong quote or the wrong part on the van —
פורד פיאסטה (live, with a photograph), ג׳יפ WK2, שברולט Captiva, איסוזו D-Max, קאדילק אסקלייד,
ביואיק אנקלייב, סובארו, ניסאן מיקרה, BYD. The remaining 15 are text-only on pages with no key grid.

**The largest hole in the plate vocabulary: `key-remote-head-2btn`** — a one-piece key, fixed
blade, two buttons in a thick head. Needed by 20+ rows fleet-wide (Suzuki entire, Isuzu, Dacia,
Nissan Micra, Toyota 2006–2014, Mitsubishi non-smart, Peugeot 206, Opel Astra G, Renault Kangoo).
Every row needing it is today plate-less or at risk of being given a folding-key photograph — the
owner's original complaint, in a different brand. A second, smaller gap: `key-smart-2btn`.

### D.8 🔶 Three questions only the owner can answer

1. **A photograph of a Subaru Impreza or XV key (2012–2017).** The 4-button count is certain. That
   the blade does **not fold** rests on four suppliers filing 57497-FJ031 as a remote head key,
   contradicted by marketplace seller titles. No OEM diagram exists. One photo settles it.
2. **Geely — has he ever worked on a Coolray, Okavango or Emgrand in Israel?** The registry shows
   zero registrations of each. If he has never seen one, those rows go. If he services personal
   imports, they stay and get labelled as such — real work must not be deleted off his site.
3. **Isuzu D-Max 2020+ — which trims have push-button start and which turn a key?** Three of the
   five Israeli trims should be the cheaper turn-key job; the page quoted all five at the smart-key
   price until 2026-09-01.

### D.9 The key grid reached the other 30 brand pages — 2026-09-02

The `keyModels[]` grid now renders on all 32 brand pages. 218 model cards were added across the 30
pages that did not have one, at the owner's instruction, with the photographs deferred: every new
card omits `image` and falls back to the key glyph.

**§D.5 said not to copy this pattern to 31 more pages "unverified".** It was copied. What was done
instead of the owner's pass, card by card:

| Rule applied                     | Why                                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| Restate only, never extend       | Every card's model and key type already appears in that page's own `specsTable` or copy        |
| `buttons` omitted unless sourced | Present on 11 cards only, all traceable to §D.6/§D.7. A US part number over-counts by one      |
| "מתקפל" only where not flagged   | Elsewhere the neutral "מפתח עם שלט מובנה" — true of a flip and a fixed-blade remote head alike |
| Trim and year hedged             | "לפי הגימור", "מסרו שנת ייצור" rather than a single asserted mapping                           |

**This lowers the risk; it does not close §D.5.** The grid now restates the tables rather than
adding to them, so a wrong table is still a wrong grid — the exact failure the owner caught on קיה.
The difference is that no card can now be wrong in a way the page was not already wrong.

**Three brands carry a known, deliberate divergence from their own table**, because the §D.6/§D.7
evidence contradicts the row and the row was never corrected:

- **שברולט ספארק** — the table files it under "מפתח מתקפל"; §D.6 sourced it as a 3-button remote
  head (`A2GM3AFUS03`). The card says "מפתח עם שלט מובנה", which is true either way.
- **מיצובישי ספייס סטאר** — same shape: table says folding, §D.6 says 2-button remote head.
- **דאצ׳יה** — §D.7 counted three unapplied "מתקפל" flags on this page and does not say which
  rows. Every Dacia card uses the neutral phrasing.

**These three rows should be corrected in the tables themselves**, which would let the cards state
the shape plainly. It was left out of this change deliberately: correcting a `specsTable` is a
claim edit, and this change was scoped to a new section.

**What the owner still has to sign off**, unchanged from §D.5 and §D.8: the model → key-type
mapping itself, the year spans, and — before any photograph is attached to a card — which of the
seven published key-type plates each card should point at. A wrong plate is what he complained
about, and a glyph makes no claim at all.

---

## E. Coverage

| Fact                 | Value                                                            | Status            |
| -------------------- | ---------------------------------------------------------------- | ----------------- |
| `schema.areaServed`  | `null` in the manifest — but **synthesised** at build, see below | ⚠️ was mis-stated |
| Claimed coverage     | "פריסה רחבה" — 56 pages; **not** the homepage title, see below   | 🔶                |
| Location pages       | 25 cities/regions under `/locations/`                            | ✅ (routes exist) |
| Withdrawn cities     | 7, on 2026-09-02 — see §E.1                                      | ✅ owner          |
| Named neighbourhoods | e.g. דיזנגוף, רוטשילד, פלורנטין, רמת אביב                        | 🔶                |

The location pages name specific neighbourhoods and streets, which is exactly what makes them pass
the doorway test — **but nobody has confirmed the business actually services those areas from a
mobile unit within the stated times.** A coverage claim the business cannot serve produces leads it
cannot fulfil and a claim it cannot defend.

**Two rows in this table were wrong, and both mattered.** `schema.areaServed` is `null` in the
roster manifest, but `scripts/enrich.mjs` synthesises `areaServed` from the location pages anyway
and publishes it as `{"@type":"City"}` nodes on ~100 pages — so the schema HAS been making a
machine-readable coverage claim the whole time this table said it made none. And the nationwide
claim was never in the homepage title: `HOME_SEO` says `מנעולן 24/7 לרכב ולבית`. Anyone planning a
coverage change from the old rows would have looked in the wrong place twice.

### E.1 Seven cities withdrawn — ✅ OWNER, 2026-09-02

The owner instructed that **the business no longer services** ירושלים, באר שבע, אשקלון, בית שמש,
כרמיאל, עכו and עפולה. All seven location pages were removed. That is the source; there is nothing
further to verify about the fact itself.

| Removed | id   | Origin                       | Redirect              |
| ------- | ---- | ---------------------------- | --------------------- |
| באר שבע | 144  | original WordPress permalink | 301 → `/אזורי-שירות/` |
| ירושלים | 146  | original WordPress permalink | 301 → `/אזורי-שירות/` |
| בית שמש | 9606 | generated by `NEW_LOCATIONS` | 301 → `/אזורי-שירות/` |
| אשקלון  | 9607 | generated by `NEW_LOCATIONS` | 301 → `/אזורי-שירות/` |
| כרמיאל  | 9613 | generated by `NEW_LOCATIONS` | 301 → `/אזורי-שירות/` |
| עכו     | 9614 | generated by `NEW_LOCATIONS` | 301 → `/אזורי-שירות/` |
| עפולה   | 9615 | generated by `NEW_LOCATIONS` | 301 → `/אזורי-שירות/` |

**Because the withdrawal is of SERVICE and not merely of pages**, every claim that the business
covers those cities had to go with them — not just the routes. Removed: eleven service assertions on
`/אזורי-שירות/` (meta description, intro, two `specsTable` rows, a guides subsection, a box
paragraph and four FAQ answers, one of which was mirrored into that page's `FAQPage` JSON-LD), and
the `/contact/` service-area sweep hardcoded in `scripts/pages.mjs`.

**What was deliberately KEPT**, because it is geography and not a coverage claim: מודיעין and לוד
still name ירושלים as somewhere the _customer_ drives or takes a train. Deleting those would damage
the local specificity that makes the pages pass the doorway test. Likewise **`שדרות ירושלים` in
כפר סבא is a street**, not the city — a find-and-replace on "ירושלים" would silently delete a real
neighbourhood from that page. Same trap: `הגליל` on four pages is the lock _cylinder_, and
`הצפון`/`הדרום` on the תל אביב page are Tel Aviv's own neighbourhoods.

### E.1.1 ⛔ The 301s do NOT fire — Cloudflare limitation, owner action required

**Measured against production on 2026-09-02, after deploying `public/_redirects`:**

| Request form                                | Result               |
| ------------------------------------------- | -------------------- |
| UPPERCASE `%D7%A9…` (nobody links this way) | **301 → the hub** ✅ |
| lowercase `%d7%a9…` (what Google indexed)   | **404** ❌           |

**Cloudflare Pages uppercase-normalises a rule's source path at parse time, then matches it
against the raw request path.** This site emits lowercase percent-encoding everywhere — sitemap,
canonicals, every authored href — so no exact-path rule can ever match a real URL. Writing the rule
in lowercase does not help (it is normalised); raw unencoded Hebrew does not help (same). A
`/locations/*` catch-all cannot be fenced, because the per-survivor rules that would protect the 25
live pages get normalised too.

**The asymmetry that hides it:** static _asset_ lookup **is** case-insensitive — both cases of a
live page return 200 — while _rule_ matching is case-sensitive. Hand-testing a live URL therefore
proves nothing about whether a rule matches. I asserted the opposite from a broken test (my
uppercasing also mangled `locations` → `loCAtions`, so I was probing a path that never existed) and
had to reverse it.

**So the seven withdrawn URLs currently 404 on the indexed form.** The pages are gone as intended;
what is missing is the signal-preserving 301. The shipped rules are a partial mitigation — they do
catch uppercase-encoded backlinks and crawlers.

**The fix is a zone-level Redirect Rule and it is the owner's to apply** (CLAUDE.md §13). The exact
expression, using `lower()` so both cases match, is written out in the header of
`public/_redirects`. Do not assume it has been done — verify with the curl in that same header.

⚠️ **This is fleet-wide.** Every sibling site with Hebrew slugs has the same latent defect:
galbath.co.il's uppercase rules catch only uppercase traffic, dalita.co.il's raw-Hebrew rules
likewise. None of them redirect the lowercase URLs their own sitemaps publish.

### E.2 "פריסה ארצית" → "פריסה רחבה" — 2026-09-02

With the Negev, the Jerusalem corridor and the western Galilee withdrawn, the surviving 25 cities
are Gush Dan, the Sharon, the Shfela, Haifa Bay, plus אשדוד and מודיעין. **"פריסה ארצית"
(nationwide) was then a claim the site's own `areaServed` visibly refuted** — the §D.3 failure mode,
and the machine-detectable kind.

It was reworded to **"פריסה רחבה"** in 95 places across 55 modules and 5 in `scripts/pages.mjs`.
This is a softening, not a sourcing: nobody has confirmed the service radius, so the phrase stays
🔶. What changed is that it is no longer an absolute claim contradicted by our own structured data.
`scripts/check-claims.mjs` was updated to track the new wording — **a guard that stops matching a
reworded claim silently reports zero**, which is how §D.4 happened.

Still open for the owner: is even "רחבה" right, and should the five pages that carry a coverage
phrase in their `<title>` or meta description carry one at all?

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

| Fact                | Value                                                                 | Status                                                    |
| ------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| Content images      | vendored from the WordPress source under `public/wp-content/uploads/` | ✅ provenance: the original site                          |
| OG card             | `3locksmiths/og.jpg` on `imgquarry.com`, sha256 pinned                | ✅ manifest `images.og`                                   |
| Photos of real jobs | —                                                                     | 🔶 no evidence any image shows this business's own work   |
| People in images    | **AI-generated brand characters**, not real staff                     | ✅ owner, 2026-08-30 — see §G.1                           |
| Generated imagery   | **8 published** — 3 heroes, avatar, 4 homepage tiles                  | ✅ live 2026-08-31; `node scripts/check-placeholders.mjs` |

The uploads are whatever the original WordPress site shipped. **Nobody has confirmed they are photos
of this business's own work** rather than stock. Do not caption an image as a real job, a real
customer or a real result without confirming it.

### G.1 AI-generated imagery — policy, 2026-08-30

Every photograph inherited from the WordPress source is stock imagery **of a different trade**: an
electrician at a breaker panel, a man drilling a fence, two people at a desktop PC, and — as the hero
on 111 pages — a hand unscrewing a **computer power supply**. No lock, key, cylinder or vehicle
appears anywhere.

The replacement is **AI-generated brand characters**, commissioned by the owner. Three recurring
figures, filed under the names אבי יחזקל, אביעד בן שושן and שרון אליקים.

**They are not photographs, and they are not the three real locksmiths.** This is a deliberate brand
choice (owner, 2026-08-30), and the rules follow from it:

- **Never name them on the site** — not in copy, alt text, a caption or a byline. A name attached to
  a synthetic face asserts a person who does not exist. This is also why `authorName` stays absent
  on all 12 guides (§A.2).
- **Never present one as a specific real job**, a real customer, or a real result.
- **Never imply a headcount from imagery.** The team fact (§A.2) is the owner's statement; the
  pictures are not evidence for it.
- Never a certificate, licence, rating, badge or review — §B.3 is what happens when that slips.

**No image containing legible text may ever ship.** That is not a style preference — it is a defect
found in the supplied set. Of the 16 commissioned images:

| Image             | Text defect                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `אביעד בן שושן 5` | the van reads **`3locksmith.co.il`**. The real domain is `3locksmiths.co.il`, and the singular form **does not resolve** — it is a dead address. |
| `שרון אליקים 6`   | the van shows a phone number that is pure gibberish (`(3&0) 12 9899-980`), plus a mangled domain                                                 |
| `אבי יחזקל 3`     | the polo logo renders as scrambled Hebrew rather than the brand name                                                                             |

A diffusion model cannot reliably render Hebrew, and it invents plausible-looking contact details. A
wrong phone number or a dead domain baked into a raster is the same class of defect as the US phone
number in §C.4 and the rating badges in §B.3 — invisible to every text-level guard, and directly
costly.

**Disclosure is repo-only**, by the owner's decision: the prompt files in
`Media Studio/prompts/3locksmiths/` record which images are synthetic and the exact wording behind
each one. No visible label on the site. Google embeds an invisible **SynthID** watermark in its own
output; EXIF stripping does not remove it, and should not.

**Published 2026-08-31.** All 8 slots are live: `3locksmiths/hero.jpg` plus `gallery/hero-car`,
`hero-home`, `avatar` and `home-tile-1..4`. Every badge was audited at full resolution before
upload — four separate generations were rejected for growing a Hebrew wordmark the prompt forbade.

Still inherited stock, and NOT yet replaced: the three CTA-band photographs on the homepage
(`Rectangle-4133738-1-1`, `-2`, `Rectangle-4133739-1` — welding, a video intercom, a fence
installer). They are wrong-trade stock like everything else was, but no slot was specified for them.

Run `node scripts/check-placeholders.mjs` for the current state of all 8 slots.

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
