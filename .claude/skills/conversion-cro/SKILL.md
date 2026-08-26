---
name: conversion-cro
description: Lead conversion on 3locksmiths — the dead tel:[phone] links live on the homepage, the near-total absence of WhatsApp, the Web3Forms form that validates nothing and has no thank-you URL, single-valued data-cta tracking that skips the homepage entirely, and the honest-trust-signal gate. Use when conversions are weak, a page is missing its CTAs, or the form needs work. Triggers "improve conversions", "CRO pass", "form validation", "thank you page", "add click-to-call", "why aren't leads tracked".
---

# Conversion

Three actions, in priority order: **phone call → WhatsApp → lead form.** On a locksmith site the call
_is_ the conversion — which makes the current state unusually bad.

## The headline: the phone links are partly broken

Verified across all 64 pages in `content/site.json`, and live on the homepage:

| `tel:` href         | Count | Verdict                                             |
| ------------------- | ----- | --------------------------------------------------- |
| `tel:0556601006`    | 385   | works, not E.164                                    |
| `tel:055-6601006`   | 114   | works, not E.164                                    |
| `tel:+972556601006` | 4     | correct                                             |
| `tel:%5Bphone%5D`   | 3     | **dead — unresolved WordPress `[phone]` shortcode** |

**Three dead `<a href="tel:%5Bphone%5D">` anchors are live on the homepage** (confirmed via `curl`).
A raw `grep -c 'tel:%5Bphone%5D'` returns **6** — the static export embeds a second copy of the markup
in its payload, so count `href="tel:` to get the real number.
Tapping them does nothing. This is the most expensive defect on the site (backlog §8.1).

Fix in the pipeline — `scripts/transform.mjs` / `scripts/fix-links.mjs` — so it cannot come back, and
normalise every form to `manifest.contact.phoneE164`. **Never patch the built HTML.**

```bash
# the check that must return nothing
grep -rho 'tel:%5Bphone%5D\|tel:\[phone\]' out --include=index.html
```

## Gap 1 — WhatsApp is effectively absent

**Exactly 1 of 64 pages carries a WhatsApp link**, despite `contact.whatsappE164` being set in the
manifest and WhatsApp being the fleet's second conversion channel. There is no floating WhatsApp
button and no sticky mobile CTA bar (backlog §8.2).

For a trade where the customer is often standing next to a locked car, a one-tap WhatsApp path is not
a nice-to-have. Add it in `lib/enrich/render.mjs` (authored blocks) and `scripts/transform.mjs`
(scraped chrome), reading the number from the manifest.

## Gap 2 — CTA tracking exists, but every click reports the same thing

The fleet's GTM click triggers bind to `data-cta="{location}-{action}"`. This site **does** emit them
— **114 links across 58 of 66 pages — but every single one is `data-cta="content-call"`** (backlog
§13.3).

So GTM cannot tell a hero click from a pricing click from an in-copy click. And the eight pages with
none at all include **the homepage**, the highest-traffic page on the site, because the attributes
come only from the authored content blocks (`lib/enrich/render.mjs:139`, `:236`;
`scripts/pages.mjs:116`, `:151`, `:267`) and never from the scraped chrome.

**Extend, don't replace.** `content-call` is already live in the shared container, so keep it and add
per-surface values:

```
header-call · hero-call · hero-whatsapp · sticky-call · sticky-whatsapp
footer-call · footer-whatsapp · form-submit · pricing-call
```

```bash
# which surfaces are still untracked
grep -rn 'tel:\|wa\.me\|api\.whatsapp' lib/enrich/render.mjs scripts/transform.mjs | grep -v 'data-cta'
# the distribution that should stop being single-valued
grep -rho 'data-cta="[^"]*"' out --include=index.html | sort | uniq -c
# pages with no tracked CTA at all — the homepage must leave this list
grep -rL 'data-cta=' out --include=index.html
```

See `/tracking-analytics`.

## Gap 3 — the form validates nothing

The Web3Forms form (injected by `lib/enrich/render.mjs`, and `scripts/transform.mjs` for scraped
instances) is a **native HTML POST with no JS handler**, and it carries `novalidate="novalidate"`. So
browser validation is disabled and nothing replaces it: an empty or malformed submit goes through.

There are no per-field errors, no `aria-invalid`, no `aria-describedby`, no focus management, and no
phone-format check (backlog §8.4, §11.5).

Two viable directions — pick deliberately:

1. **Drop `novalidate`** and use native constraint validation (`required`, `type="tel"`,
   `pattern`, `title`). Zero JS, works immediately, but the messages are browser-default and in the
   browser's language.
2. **Add a small progressive-enhancement script** with Hebrew per-field messages, `aria-invalid` +
   `aria-describedby`, and focus to the first invalid field — keeping the form functional without JS.

Israeli phone validation must accept `05X-XXXXXXX`, `05XXXXXXXX` and `+9725XXXXXXXX`. **Reject nothing
a real customer would type.**

## Gap 4 — no thank-you URL

The form has **no `redirect` hidden field**, so a successful submit lands on Web3Forms' own generic
off-domain page. Consequences: no URL-based conversion to count, no clean Google Ads conversion
target, no next step offered, and the visitor leaves the brand (backlog §8.6).

Add `/תודה/` as a real page and point the form at it:

```html
<input type="hidden" name="redirect" value="https://3locksmiths.co.il/תודה/" />
```

The page should state what happens next and when, offer WhatsApp as an immediate second touch, and be
`noindex` (thin, and a stray SERP entry inflates conversion counts). Note the current metadata mapper
forces `index: true` on every page (`lib/content.ts:99`) — so `noindex` needs a change there too.

## Gap 5 — form markup is Contact Form 7 debris

The wrapper still carries `wpcf7` classes, `id="wpcf7-f13-o1"`, `lang="en-US"`, **`dir="ltr"`** and an
English `aria-label="Contact form"` on a Hebrew RTL site (backlog §8.8, §11.4). Clean it in the
pipeline.

## What already works — don't regress it

- The `botcheck` honeypot is present and correctly positioned off-screen.
- The form POSTs over HTTPS to Web3Forms with a **public-by-design** access key read from
  `site.config.json` — not a leaked secret.
- Click-to-call appears above the fold on every page (the ones that work).
- Pricing is **internally consistent** across every page — no contradictions anywhere. That is a real
  asset most sites in this fleet don't have. Don't introduce the first one.

## The trust gate

Conversion work that adds pressure without adding proof makes the page worse. Before adding urgency
copy, badges or counters, check `docs/business-facts.md`:

- **No invented testimonials, ratings, "X לקוחות החודש", or countdown timers.** A fabricated trust
  signal is a policy violation and a lie to the customer.
- The site has **zero** social proof (backlog §7.2). The highest-value CRO change here is not a button
  colour — it is real reviews. Escalate rather than substituting fake urgency.
- The `#009f3c` accent is ≈3.5:1 against white (backlog §11.1). A CTA a person can't read is a
  conversion bug as much as an accessibility one.
- "מעל 25 שנות ניסיון" and "24/7" are both gated claims already shipping. Don't add a fourth.

## Checklist

- [ ] Zero `tel:[phone]` placeholders survive; every `tel:` is the manifest E.164 value.
- [ ] Call and WhatsApp reachable without scrolling on every page, mobile and desktop.
- [ ] Every CTA carries a `data-cta` following `{location}-{action}`, and more than one value exists.
- [ ] The homepage carries at least one tracked CTA.
- [ ] The form validates name and an Israeli phone format, with announced errors.
- [ ] Consent line present and linked to `/privacy-policy/`.
- [ ] `/תודה/` exists, is `noindex`, and offers a next step; the form redirects to it.
- [ ] Form markup is `dir="rtl"` / `lang="he"` with a Hebrew accessible name.
- [ ] No trust signal on the page that `docs/business-facts.md` doesn't confirm.
- [ ] `npm run enrich` re-run and the change verified in `out/`.
