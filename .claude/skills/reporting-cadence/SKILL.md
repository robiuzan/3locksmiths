---
name: reporting-cadence
description: The measurement rhythm for 3locksmiths — what to check weekly, monthly and quarterly, which numbers can be read honestly today versus which need a baseline that does not exist yet, the auditor sweep, and how to tell a real ranking movement from normal SERP noise. Use when asked how the site is performing or what to check. Triggers "how is the site doing", "reporting", "monthly check", "did it work", "track progress", "KPIs".
---

# Reporting cadence

## Read this before quoting any number

Conversion tracking was only wired on **2026-08-24**. Before that the site had one `data-cta` value,
an untracked homepage, and **no conversion event at all**.

That means: **there is no historical baseline.** Any before/after comparison spanning that date is
comparing "not measured" to "measured", not "worse" to "better". Say so rather than implying a lift.

**The baseline starts from the first full month after 2026-08-24.**

## What is measurable today

| Signal                             | Source             | Status                               |
| ---------------------------------- | ------------------ | ------------------------------------ |
| Call clicks by surface             | GTM → GA4          | ✅ 13 `data-cta` values live         |
| WhatsApp clicks                    | GTM → GA4          | ✅ sticky bar on every route         |
| Form submissions                   | `/thank-you/` view | ✅ URL conversion                    |
| Impressions, clicks, CTR, position | Search Console     | ✅ once verified + sitemap submitted |
| Indexed page count                 | Search Console     | ✅                                   |
| Core Web Vitals (field)            | Search Console     | 🟡 needs traffic volume              |
| Map pack performance               | Business Profile   | 🟢 profile live, claimed and correct |
| Reviews                            | Business Profile   | 🔴 **0** (owner, 2026-09-05)         |
| AI citations                       | manual             | 🔴 all crawlers blocked (§6.1)       |

Two of the most important rows are red for the same reason: the owner-blocked critical path in
`docs/growth-roadmap.md` §1.

## Weekly — 5 minutes

```bash
curl -o /dev/null -s -w '%{http_code}\n' "https://www.googletagmanager.com/gtm.js?id=GTM-KWGGH438"
curl -sS https://3locksmiths.co.il/ | grep -c 'tel:%5Bphone%5D'      # must be 0
curl -o /dev/null -s -w '%{http_code}\n' https://3locksmiths.co.il/thank-you/
```

- GA4 realtime: are call and WhatsApp events arriving with the right hostname?
- Any Search Console coverage errors?

**A GTM snippet in the HTML proves nothing** — the 200 check is the check.

## Monthly — the real review

1. **Leads by surface.** Which `data-cta` values fire most? `hero-call` vs `sticky-call` vs
   `footer-call` tells you which placement earns calls — the whole reason per-surface tracking exists.
2. **Search Console:** impressions, clicks, CTR, average position. Query-level movement on the
   watchlist in `docs/competitors.md` §5.
3. **New/lost pages** in the index.
4. **Auditor sweep** — run against a **fresh** `out/`:

   | Changed                     | Run                         |
   | --------------------------- | --------------------------- |
   | metadata, routes, sitemap   | `seo-auditor`               |
   | JSON-LD                     | `schema-auditor`            |
   | copy, claims, pricing       | `eeat-trust-auditor`        |
   | components, images, CSS     | `perf-a11y-auditor`         |
   | headers, form, deps         | `security-auditor`          |
   | locations, NAP, coverage    | `local-seo-strategist`      |
   | links, footer, nav          | `ia-navigation-architect`   |
   | keywords, coverage          | `keyword-strategist`        |
   | reviews, profile, citations | `local-presence-strategist` |

5. **Business Profile** (live since 2026-09-05): views, calls, direction requests, new reviews.
   Owned by `local-presence-strategist`, which reads the count rather than estimating it and appends
   it to `docs/local-presence.md`. **Direction requests will read ~0** for a hidden-address
   service-area business — that is correct, not a failure.
6. **Update the docs.** `docs/content-calendar.md` status keys, `docs/competitors.md` observations.

## Quarterly

- Full keyword gap re-run (`keyword-strategist`) → update `docs/keyword-universe.md`.
- Refresh guides; update `dateModified` (only when genuinely revised — never touch dates to fake
  freshness).
- Re-check the **live** `robots.txt` AI-crawler stance; it is a zone setting that can change without
  a deploy.
- Re-verify every 🔶 in `docs/business-facts.md` — some may now be answerable.
- Re-run the full `/qa-build-gate`.

## Reading movement honestly

- **SERP positions vary by location, device and day.** One observation is not a trend. Two data
  points are not a trend either.
- **Seasonality is real** in this trade — lockouts spike in weather extremes and holidays.
- **Attribute before celebrating.** If rankings moved the week you shipped, check whether anything
  else changed: a Google update, a competitor, or normal variance.
- **Correlation across a single month on a small site is usually noise.** Say "consistent with" not
  "caused by" unless the mechanism is clear.
- **Never report a metric you did not read.** No estimated traffic, no invented conversion rates.

## When something drops

1. Is it us? Check the deploy log (`logs/deploys.csv`) and recent commits.
2. Is it technical? Run `/qa-build-gate` — canonical, schema, sitemap, one H1.
3. Is it them? A competitor change or a Google update.
4. Is it noise? Most single-week movement on a 64-page site is.

**Do not "fix" a drop before establishing which of the four it is.** Changing pages in response to
noise makes the next signal harder to read.

## What good looks like, in order

1. **Leads attributable to a page and a surface** — now possible for the first time.
2. Business Profile live (2026-09-05) with a growing review count — the reviews half is still open.
3. Emergency and guide clusters ranking (`docs/content-calendar.md` Batches 1–2).
4. AI assistants citing the site — blocked until the crawler policy changes.
