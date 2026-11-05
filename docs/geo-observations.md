# GEO and search observations — dated, measured only

What search engines and answer engines actually do with this site, recorded with the date and the
tool that produced each number. Same rule as `docs/competitors.md`: **an observation without a date
and a source is not evidence.** Never record an estimated traffic, ranking or citation figure as fact.

Owned by the `aeo-geo-strategist` and `reporting-cadence` flows. The plan this measures is the
2026-11-04 GEO plan (homepage pivot, family link hub, answer-first content).

---

## 1. Baseline — 2026-11-03 / 2026-11-04 (before any change from the 2026-11-04 plan)

### 1.1 Reachability

| Check                                                                 | Result                                                                                                                                                                                                                | How                                                     |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Live `robots.txt`                                                     | `User-Agent: *` `Allow: /`, plus an explicit allow group for OAI-SearchBot, ChatGPT-User, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User, GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot | `curl https://3locksmiths.co.il/robots.txt`, 2026-11-03 |
| Cloudflare managed AI block (`Content-Signal`, `Disallow: /` per bot) | **gone** — it was live on 2026-08-16                                                                                                                                                                                  | same fetch                                              |
| `/llms.txt`                                                           | 404                                                                                                                                                                                                                   | WebFetch, 2026-11-03                                    |
| JSON-LD                                                               | every block on `/`, 95, 124 and 154 parses                                                                                                                                                                            | `out/` export, 2026-11-03                               |

### 1.2 Search Console — 90 days, 2026-08-04 → 2026-11-01

Source: `Israeli services sites/ops/gsc/gsc-report.mjs`, service account with `siteFullUser` on
`https://3locksmiths.co.il/`, pulled 2026-11-03.

| Measure          | Value                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| Page-level total | **31 clicks, 483 impressions**                                             |
| Clicks by page   | all 31 on `/` (305 impressions, average position 35.3)                     |
| Query-level rows | 116 rows, 260 impressions, 0 clicks (the clicks sit on anonymised queries) |

Monthly impressions (date dimension, same property):

| Month                | Clicks | Impressions |
| -------------------- | ------ | ----------- |
| 2026-06 (from 06-10) | 0      | 40          |
| 2026-07              | 1      | 39          |
| 2026-08              | 8      | 57          |
| 2026-09              | 9      | 167         |
| 2026-10              | 14     | 241         |

Head and target queries, and the URL Google served for each:

| Query              | URL served                   | Impressions | Avg. position |
| ------------------ | ---------------------------- | ----------- | ------------- |
| שכפול מפתח לרכב    | `/`                          | 3           | 18.7          |
| שכפול מפתחות לרכב  | `/`                          | 2           | 16            |
| שכפול מפתחות       | `/`                          | 11          | 2.9           |
| שחזור מפתח לרכב    | `/`                          | 1           | 7             |
| מנעולן רכב         | `/`                          | 7           | 104.3         |
| מנעולן לרכב        | `/`                          | 3           | 98            |
| מנעולן בזכרון יעקב | `/`                          | 16          | 3.6           |
| שכפול מפתח פיג'ו   | `/services/שכפול-מפתח-פיגו/` | 14          | 89.1          |

Only one query was served by more than one URL: `שכפול מפתחות בחולון` (151 at position 54.8,
147 at 50).

**What this says about the plan:** Google serves the homepage, not page 95, for the Tier-1 term,
because page 95 has never been crawled (§1.3). The pivot keeps 95 as the target (owner decision
2026-11-04) and links it from the homepage body; whether Google switches URLs is the first thing to
re-measure.

### 1.3 Index coverage — URL Inspection API, 2026-11-03

Inspected with UPPERCASE `%D7` encoding (lowercase returns "unknown" for indexed pages — memory
`gsc-uppercase-percent-encoding`). "URL is unknown to Google" here means "no crawl record
retrievable"; for this site it has always coincided with "Discovered – currently not indexed" or
never seen.

| Group                                  | Indexed                                                       | Not indexed                                                             |
| -------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Brand pages (32)                       | **2** — 121 פיג׳ו (crawled 2026-10-21), 127 אופל (2026-09-25) | **30 never crawled**                                                    |
| City pages (25)                        | **23**                                                        | 140 נתניה: never crawled · 154 גבעתיים: crawled 2026-09-22, not indexed |
| Parent 95 `/services/שכפול-מפתח-לרכב/` | —                                                             | never crawled                                                           |
| 96 שחזור, 115 שכפול שלט                | —                                                             | never crawled                                                           |
| `/services/` hub                       | —                                                             | Discovered, not indexed                                                 |
| `/אזורי-שירות/`, guides 9201 and 9204  | all 3                                                         | —                                                                       |

The pages every footer links (the 25 cities, 108 inbound links each) are the ones Google indexed.
The brand pages had 7–10 inbound links each on 2026-11-03 and were never crawled. The Phase 2b
family hub raises that to about 60; the owner's manual Request Indexing is the lever that has
worked here before (12 of 21 requested URLs indexed within 5 days in Sep–Oct 2026, 0 of 55
unrequested).

### 1.4 Analytics routing

- The shared container `GTM-KWGGH438` maps the hostname rule `(^|\.)3locksmiths\.co\.il$` to GA4
  property **`G-8GFFY333F7`** in a lookup table, and has triggers on `data-cta` values ending in
  `-call` / `-whatsapp` and on `thankyou`. Read from `https://www.googletagmanager.com/gtm.js?id=GTM-KWGGH438`
  (HTTP 200), 2026-11-04.
- The roster still says `ga4MeasurementId: null`; that field is stale, not the routing.
- **Not yet verified:** that the GA4 property actually receives hits from this hostname. Until
  someone with GA4 access confirms it, no referral-based KPI is reported.

### 1.5 AI answer probe — run by the owner, received 2026-11-05

**Run 1 — the baseline.** Ten queries on Google (AI Overview), ChatGPT, Perplexity and Gemini,
captured by the owner after the two deploys of 2026-11-04 and received on 2026-11-05. The engines'
copies of our pages predate those deploys (Perplexity quotes the old page 96 prices), so this is
the before-state. Conditions: Israel, Sharon area — Google, ChatGPT and Gemini localized their
local answers there; Google, ChatGPT and Gemini logged out; Perplexity logged out for query 1 and signed in on a free plan from query 3 on.
The 52 screenshots are kept locally in `docs/evidence/ai-probe-2026-11-05/` (git-ignored: they
show an account and a location, and this repository is public). Read twice — once in session and
once by four independent readers. **3locksmiths** in bold; "local" = businesses listed from Maps.

| #   | Query                         | Google AIO cites                                                                                                         | ChatGPT cites                    | Perplexity cites                                                                                                                                                                                                                                                                                         | Gemini cites                                                             |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | שכפול מפתח לרכב               | midrag.co.il, car-keys.co.il, מנעולן פיקס, vs-key.co.il (מפתח בקליק), גבי מנעולים                                        | no site — 3 local businesses     | midrag.co.il, suncar.co.il, keyforme.co.il, b144.co.il, d.co.il, emess.co.il                                                                                                                                                                                                                             | no sources shown                                                         |
| 2   | כמה עולה שכפול מפתח לרכב      | keyforme.co.il, midrag.co.il, yarincarservice.co.il, carkey4u.com — answered with restoration prices                     | one price site ("כמה עולה")      | lock4you.co.il, midrag.co.il, locksmith1.co.il, carkeynow.co.il, vs-key.co.il, keyforme.co.il, d.co.il                                                                                                                                                                                                   | no sources shown                                                         |
| 3   | שחזור מפתח פיג'ו              | yarincarservice.co.il, keyforme.co.il, מנעולן פיקס, midrag.co.il, carkeynow.co.il                                        | no site — 3 local businesses     | carkeynow.co.il (×4 in its table), **3locksmiths ×3** (two old page-96 price rows, the "delete old keys" note); links: carkeynow ×3, **3locksmiths ×2** (96, /קודן-לרכב/), eladkeys.com, yarincarservice.co.il, carkey4u.com, publiclocks.com, key-man.co.il                                             | no sources shown                                                         |
| 4   | שכפול מפתח טויוטה מחיר        | מנעולן פיקס, vs-key.co.il, car-keys.co.il, חנות מנעולים, midrag.co.il, keyforme.co.il, shop-locks.co.il, carkeynow.co.il | midrag.co.il                     | midrag.co.il, carkeynow.co.il, vs-key.co.il, shop-locks.co.il, telavivlocksmith.link, carkey4u.com                                                                                                                                                                                                       | מנעולן פיקס, car-keys.co.il, carkeynow.co.il, midrag.co.il, חנות מנעולים |
| 5   | אבד המפתח היחיד לרכב מה עושים | חנות מנעולים, carkeynow.co.il, keyforme.co.il (×4), ויטלי המנעולן, midrag.co.il, מנעולן פיקס, shop-locks.co.il           | no sources shown                 | publiclocks.com, keyreplacement.co.il, yarincarservice.co.il, **3locksmiths ×1** (stolen key: delete the old keys); links: **3locksmiths ×2** (/אודותינו/, 96), hapoelta.org.il, academics.co.il                                                                                                         | no sources shown                                                         |
| 6   | מנעולן רכב 24/7               | מנעולן פיקס, סרילאן מנעולים, carkeynow.co.il, eyalock.co.il                                                              | no site — 4 local businesses     | b144.co.il, pro.co.il, gkeys.co.il, locksmith-chadik.co.il, eyalock.co.il, midrag.co.il, silverlock.co.il, moked24h, vs-key.co.il, d.co.il                                                                                                                                                               | no site — 3 local businesses (Maps)                                      |
| 7   | שכפול מפתח (לרכב) גבעתיים     | no screenshot (no AI Overview captured)                                                                                  | no site — 3 local businesses     | carkey4u.com, carkeynow.co.il (×5), vs-key.co.il, key4u.co.il, keyforme.co.il, easy.co.il, dlocks.co.il, b144.co.il                                                                                                                                                                                      | no site — 3 local businesses (Maps)                                      |
| 8   | שכפול מפתח חכם מחיר           | midrag.co.il (×4), car-keys.co.il, גבי מנעולים, peerlocks.com                                                            | midrag.co.il; 3 local businesses | midrag.co.il (most chips), eladkeys.com, b144.co.il, d.co.il                                                                                                                                                                                                                                             | no sources shown                                                         |
| 9   | מפתח עם שבב או מפתח חכם       | ס.אבי מנעולים, carkey4u.com, midrag.co.il                                                                                | no sources shown                 | **3locksmiths — the only source of the answer** (4+ chips, incl. its time-and-price table, from guide 9203); links: **3locksmiths #1** (9203) and #3 (/services/מנעולן-רכב/), silverlocksmith.co.il, locksmith1.co.il, keyreplacement.co.il, yarincarservice.co.il, carkey4u.com, locksmith-chadik.co.il | no sources shown                                                         |
| 10  | איך לבחור מנעולן אמין         | מנעולן 10, reeflocks.co.il (ריף מנעולים), מנעולן פיקס, keyforme.co.il                                                    | no sources shown                 | jonnylocksmith.co.il (most chips), emess.co.il, silverlock.co.il, vaad.org.il, jerusalem.mynet.co.il, pro.co.il, reeflocks.co.il, mako.co.il                                                                                                                                                             | no sources shown                                                         |

**What run 1 says**

- **3locksmiths is cited by Perplexity only, in 3 of 10 answers** (queries 3, 5 and 9), and is
  the main source for query 9: Perplexity rebuilt its whole answer, comparison table included,
  from guide 9203 and listed it first. Google AI Overviews 0 of 9, ChatGPT 0 of 10, Gemini 0 of 10.
- **What it quoted was stale.** The chip-key price in 9203 (200 – 350 ₪, against the owner's
  350 – 550 ₪ row — corrected 2026-11-05) and the old restoration rows of page 96
  (300 – 600 / 450 – 900 ₪, "לפי דגם" since the 2026-11-04 deploy).
- **The competitors this plan benchmarks are everywhere we are not.** midrag.co.il is the most-cited source overall (Google 7 of 9, Perplexity 5, ChatGPT 2, Gemini 1). keyforme.co.il: Google 5 (queries 2–5, 10), Perplexity 3 (1, 2, 7). carkeynow.co.il: Google 4 (3–6), Perplexity 4 (2–4, 7), Gemini 1 (4). Neither appears in ChatGPT.
- **ChatGPT and Gemini answer local questions from Google Maps.** For queries 1, 3, 6, 7 and 8
  they listed nearby businesses with their review counts (85 to 644 reviews) and cited no
  website. That channel runs through the Business Profile and its reviews, not through the site.
- **Gemini, logged out, shows no sources** on 8 of 10 answers, so it cannot be scored on citations.

Repeat in about 4 weeks (early December 2026), with the same 10 queries, engines and conditions,
and add a "Run 2" table below this one.

---

## 2. Instruments — what can be measured honestly

| Instrument                        | What it shows                                                                                                                                                 | Cadence                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Search Console (`gsc-report.mjs`) | index state of the 64 family URLs; query × page for the 10 probe queries and the head terms (מנעולן, מנעולן רכב, מנעולן לבית, פתיחת רכב); the `/` vs 95 split | weekly for 8 weeks after each deploy |
| Cloudflare AI Crawl Control       | hits by AI crawler — reach, not citations                                                                                                                     | weekly                               |
| Bing Webmaster Tools              | Bing index state and its AI-performance report, once the site is verified                                                                                     | monthly                              |
| GA4 `G-8GFFY333F7`                | referral segment for chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com, claude.ai — only after §1.4 is verified                            | monthly                              |
| Manual probe (§1.5)               | who is cited, for us and both competitors                                                                                                                     | monthly                              |

Mechanism notes, so reports do not repeat old mistakes:

- Google AI Overviews draw on Google's ordinary index. `Google-Extended` does not gate them, and an
  unindexed page cannot be cited. Indexing is the first gate for "שחזור מפתח פיג'ו".
- `data-nosnippet` is what keeps text out of snippets and AI Overviews, and Google honours it only on
  `span`, `div` and `section`. The topbar and the reviews line use it on purpose; answer blocks,
  price tables and the family hub must never sit inside one.
- ChatGPT search surfaces sites through `OAI-SearchBot`, which the live `robots.txt` allows.
- FAQ rich results are no longer shown for most sites, and HowTo rich results ended in 2023.
  `FAQPage` and `HowTo` markup stay as understanding signals, not as a SERP feature to chase.
- No major engine has confirmed it reads `llms.txt`. It is cheap hygiene, not a lever.

---

## 3. Log (append below, newest last)

| Date       | What changed or was observed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Source                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 2026-11-03 | Baseline in §1 recorded before the homepage pivot and the family hub                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | this file                       |
| 2026-11-04 | AI-crawler tripwire green: 9 bots allowed in robots.txt, 200 to each user agent                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `scripts/check-ai-crawlers.mjs` |
| 2026-11-04 | COMMITTED, NOT DEPLOYED — homepage pivot and four claims removed (`60203f1`); lastmod keyed on `<main>` (`d0cef3b`); family hub on 58 pages (`5099788`); sitewide schema, question headings, `/llms.txt` (`0d99118`); GEO gates and Batch 0 — 95, 96, 9201, 9202, 9204 (`af8c18f`)                                                                                                                                                                                                                                                                                                                                           | git                             |
| 2026-11-04 | DEPLOYED — everything committed above plus B1 brand pages 121, 118, 122, 98, 119, 100, 109, 117 (owner confirmed the claims sheet), Next 16.4.5, LocalBusiness logo + description, privacy notice, reviews line 15 / 04/11/2026 (`0e13243`, branch `geo/p3-release`). Pages deployment `d7f9847b` (https://d7f9847b.3locksmiths.pages.dev). Homepage tiles 1 and 4 NOT in this deploy (old images still live). The §1 baseline is the before-state; attribute any movement to this date.                                                                                                                                     | `ops/deploy-site.ps1`           |
| 2026-11-04 | DEPLOYED — fixes from the post-deploy audit (`b6e247e`): WhatsApp no longer steered to the 076 line (/מחירון/ FAQ, 121, 96, 194, /contact/ description) with a block-level guard; key-deletion claim on 95/9201/9202 aligned with the owner-confirmed rows; 9202 restoration priced לפי דגם; Service areaServed = the served places, not Country IL; privacy notice wording; Bat Yam and Netanya headings; guide breadcrumbs; phone-field pattern; menu item to 9401; footer and breadcrumb on phones. Pages deployment `7ca6e9f5` (https://7ca6e9f5.3locksmiths.pages.dev). All 110 live files byte-identical to the build. | `ops/deploy-site.ps1`           |
| 2026-11-05 | AI answer probe, run 1 (baseline): 3locksmiths cited by Perplexity in 3 of 10 answers (main source for "מפתח עם שבב או מפתח חכם"), by Google AI Overviews, ChatGPT and Gemini in none. midrag.co.il, keyforme.co.il and carkeynow.co.il cited widely. Details in §1.5                                                                                                                                                                                                                                                                                                                                                        | owner screenshots               |
| 2026-11-05 | DEPLOYED — owner job times sitewide (mechanical 10–20, chip and flip 30–45, smart 45–60, no key 60–90 min) and guide 9203 prices to the four rows (`428bd9e`). Pages deployment `59f3cdcf`. All 110 live files byte-identical to the build.                                                                                                                                                                                                                                                                                                                                                                                  | `ops/deploy-site.ps1`           |
| —          | Add one row per DEPLOY with its date and Pages deployment id: the deploy date, not the commit date, is the attribution point for any movement in §1's numbers                                                                                                                                                                                                                                                                                                                                                                                                                                                                | —                               |
