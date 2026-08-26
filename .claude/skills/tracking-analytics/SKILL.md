---
name: tracking-analytics
description: GTM, GA4 and conversion events for 3locksmiths on the shared Israeli fleet container GTM-KWGGH438 — the mandatory gtm.js 200-check, moving the snippet from <body> to <head>, single-valued data-cta tracking that collapses every surface into one bucket and skips the homepage, why there is no lead_submit event, the hardcoded Search Console token, and hostname-scoped container edits. Use when turning on analytics or when conversions are not being recorded. Triggers "set up GTM", "GA4", "track calls", "conversion tracking not firing", "Search Console", "container id".
---

# Tracking & analytics

## The container is shared — this changes everything

`GTM-KWGGH438` is **one container for all ~10 Israeli fleet domains**, with GA4 resolved _inside_ the
container by a RegEx table on `{{Page Hostname}}`. Consequences:

- Changing container config affects **every fleet site**, not just this one. Never edit a shared
  trigger or variable to fix one site — **add a hostname condition**.
- This site's GA4 property is resolved in the container, not in this repo. No local
  `ga4MeasurementId` is expected.
- The container id lives in the **roster manifest**, not `site.config.json` directly.

## The 200-check — non-negotiable

**A GTM snippet in the HTML proves nothing.** A wrong id renders identical markup and silently
collects nothing.

```bash
curl -o /dev/null -w '%{http_code}\n' "https://www.googletagmanager.com/gtm.js?id=GTM-KWGGH438"
```

**200 or the id is wrong.** Currently returns 200 (verified 2026-08-16). Two fabricated container ids
in a row previously cost the Israeli fleet **18 days of zero analytics across every site**, with the
snippet sitting in the HTML looking correct the whole time. Run this any time an id changes, and again
after deploy.

## Head placement (backlog §13.1)

`app/layout.tsx:53` renders the GTM script as a **child of `<body>`**:

```tsx
<body className="rtl wp-theme-gogo">
  {gtmNoScript && <noscript>…</noscript>}
  {gtmHead && <script id="gtm-init" dangerouslySetInnerHTML={{ __html: gtmHead }} />}
```

Google's own install requires `<head>`. Body placement delays container load and can miss early
events — and on this site the body is also where the whole ported page and the script replay live, so
the container competes with jQuery for parse time.

Move the `gtm-init` script into `<head>`; keep the `<noscript>` iframe in `<body>`, which is where it
belongs.

Note this inline script is one of the three inline-script paths a future CSP must accommodate — see
`/web-security-headers`.

## The `data-cta` inventory — present, but single-valued

The fleet's GTM click triggers read `data-cta`, and no JS ships for call tracking, which is exactly
why the attribute is load-bearing.

Measured on the export: **114 tracked links across 58 of 66 pages — every one of them
`data-cta="content-call"`** (backlog §13.3). So the container _is_ receiving call clicks, but:

1. **One value means GTM cannot tell the surfaces apart.** Hero, pricing, in-copy and footer clicks
   all arrive as `content-call`, so there is no way to learn which placement converts.
2. **Eight pages emit none at all — including the homepage.** The attributes come only from the
   authored content blocks (`lib/enrich/render.mjs:139`, `:236`; `scripts/pages.mjs:116`, `:151`,
   `:267`); the scraped chrome (header, footer, floating buttons) has none. On the highest-traffic
   page on the site, every call click is invisible.
3. **No WhatsApp CTA exists at all**, tracked or otherwise.

**Extend, don't replace.** `content-call` is already live in the shared container — renaming it breaks
existing history for a trigger other fleet sites may share. Keep it and add per-surface values.

Convention: `{location}-{action}`.

| Add                               | Where                                    |
| --------------------------------- | ---------------------------------------- |
| `header-call`                     | scraped chrome → `scripts/transform.mjs` |
| `hero-call` / `hero-whatsapp`     | `lib/enrich/render.mjs`                  |
| `sticky-call` / `sticky-whatsapp` | a new mobile CTA bar                     |
| `footer-call` / `footer-whatsapp` | scraped chrome                           |
| `pricing-call`                    | `lib/enrich/render.mjs` pricing block    |
| `form-submit`                     | the Web3Forms form                       |

```bash
# the distribution — should stop being a single value
grep -rho 'data-cta="[^"]*"' out --include=index.html | sort | uniq -c
# pages with no tracked CTA at all — the homepage must leave this list
grep -rL 'data-cta=' out --include=index.html
# every phone/WhatsApp link in source that still lacks the attribute
grep -rn 'tel:\|wa\.me\|api\.whatsapp' lib/enrich/render.mjs scripts/transform.mjs | grep -v 'data-cta'
```

Add them in the **pipeline**, then `npm run enrich`. Never patch the built HTML.

## Events

- **There is no `lead_submit` event.** The form is a native HTML POST with no JS handler, so nothing
  fires on success — and success happens **off-domain** on Web3Forms' generic page (backlog §13.4).
- The clean fix is `/תודה/` plus the form's `redirect` field (`/conversion-cro` gap 4). A URL-based
  conversion is the best signal available for a no-JS form, and it works without adding a client
  bundle to a site that currently ships exactly one client component.
- If a JS handler is ever added, fire `trackEvent("lead_submit", { form: "lead" })` **only on
  confirmed success**, never on submit — firing on submit inflates conversions with failures.
- **Never put PII in `dataLayer`** — no name, phone, email or message text.

## GA4 and Search Console

- **GA4 property** for 3locksmiths.co.il: resolved inside the shared container by hostname. Confirm it
  exists and is receiving data before declaring tracking working
  (`docs/business-facts.md` §F).
- Mark call clicks, WhatsApp clicks and the thank-you page view as **Key events** in GA4, or they
  won't appear as conversions.
- **Search Console verification is hardcoded** at `app/layout.tsx:33` as a string literal, while the
  manifest carries `analytics.googleSiteVerification: null`. The token works, but the manifest is no
  longer the source of truth. Move it to the **roster manifest** and read it from
  `manifest.analytics.googleSiteVerification` (backlog §13.5). Never edit `site.config.json` directly.
- Submit `https://3locksmiths.co.il/sitemap.xml` (60 URLs).

## Verifying a deploy

1. Live page source contains `googletagmanager.com/gtm.js?id=` **inside `<head>`**.
2. `curl` the `gtm.js` URL → 200.
3. GTM Preview mode on the live domain: fire a call click, a WhatsApp click and a form submit; confirm
   each trigger fires **once**.
4. GA4 Realtime shows the events with hostname `3locksmiths.co.il`.
5. Confirm no PII appears in any `dataLayer` push.

## Checklist

- [ ] `gtm.js?id=…` returns 200.
- [ ] GTM script is in `<head>`; `<noscript>` iframe in `<body>`.
- [ ] Every call and WhatsApp link carries a `data-cta` following `{location}-{action}`.
- [ ] More than one `data-cta` value exists, and the homepage emits at least one.
- [ ] No `tel:[phone]` placeholder survives — an untracked click is bad, a dead one is worse.
- [ ] A conversion signal exists on success (`/תודה/` page view at minimum).
- [ ] No PII in `dataLayer`.
- [ ] Container edits are hostname-scoped so other fleet sites are unaffected.
- [ ] GA4 key events marked; Search Console verified and sitemap submitted.

## Gotchas

- Editing `site.config.json` directly is wrong — the id syncs from the roster.
- A shared container means a broken trigger is a **fleet-wide** outage. Test in Preview first.
- Client-side route changes don't apply here (static export, full page loads), so a History Change
  trigger is not needed and will not fire.
- `components/ThemeScripts.tsx` appends scripts at runtime. If a GTM custom template is ever added,
  make sure it does not race the replay — the replay guards itself with a `window` flag and runs once.
