---
name: web-security-headers
description: Security posture for a snapshot-ported static export on Cloudflare Pages — public/_headers for HSTS, X-Frame-Options and Permissions-Policy, why a CSP here is harder than on any sibling site (three separate inline-script paths), public/_redirects, the stale second origin still live on GitHub Pages, PII and consent on the Web3Forms form, and secret hygiene. Use when adding headers, planning a CSP, or auditing security. Triggers "security headers", "CSP", "HSTS", "_headers", "is the form safe", "clickjacking".
---

# Security headers & posture

`output: "export"` means Next's `headers()` is unavailable. **Cloudflare Pages reads
`public/_headers`**, so headers are one file.

## What the live site already returns

Verified 2026-08-16 against `https://3locksmiths.co.il/`:

| Header                                             | Status                              |
| -------------------------------------------------- | ----------------------------------- |
| `x-content-type-options: nosniff`                  | ✅ Cloudflare Pages default         |
| `referrer-policy: strict-origin-when-cross-origin` | ✅ Pages default                    |
| `strict-transport-security`                        | ❌ absent                           |
| `x-frame-options` / `frame-ancestors`              | ❌ absent — the site is framable    |
| `permissions-policy`                               | ❌ absent                           |
| `content-security-policy`                          | ❌ absent                           |
| `access-control-allow-origin`                      | ⚠️ `*` on HTML — looser than needed |

**Always verify against the live response, never against the repo's intent:**

```bash
curl -sSI https://3locksmiths.co.il/ | grep -iE 'strict-transport|content-security|x-frame|permissions|access-control|server'
```

Those exact defaults — plus **no `Last-Modified`, `ETag` or `x-github-request-id`** — are also the
evidence that the origin is Cloudflare Pages rather than GitHub Pages. See `/deploy-3locksmiths`.

## 🔴 The second origin — fix this first

`https://robiuzan.github.io/` returns **200** with `Server: GitHub.com` and serves an **older build**
of this site: its homepage `<title>` is the pre-fix bare `שלושה מנעולנים`, while production serves the
enriched title.

Two live origins for one site is a duplicate-content and brand risk, and the stale one drifts further
with every deploy. Root cause: `.github/workflows/deploy.yml` publishes `out/` to GitHub Pages, and
`public/CNAME` + `out/CNAME` carry the apex (backlog §12.1).

Options, in order of preference:

1. Remove the publish/deploy jobs from `deploy.yml`, keeping the build as CI (that is what
   `.github/workflows/ci.yml` already does), and disable Pages on the repo.
2. Point the Pages origin at a redirect.
3. At minimum, delete `public/CNAME` so the stale origin stops claiming the apex.

**This is a deploy-behaviour change — confirm before doing it.**

## `public/_headers` — the baseline

This file does not exist yet. A safe starting point:

```
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```

Notes before shipping it:

- **HSTS `preload` is close to irreversible.** The token is deliberately omitted above. Only add it if
  the owner accepts that the domain and every subdomain must stay HTTPS indefinitely.
- `SAMEORIGIN` over `DENY` leaves room for a Business Profile or map embed of the site itself (a profile has existed since 2026-09-05).
- Cloudflare Pages **merges** `_headers` with its defaults; it does not replace them.
- Verify with `curl -sSI` after deploy. A header that isn't in the live response didn't ship.

## CSP — harder here than on any sibling site

There are **three separate inline-script paths**, and a static export cannot generate a per-request
nonce:

1. **The GTM snippet** — injected via `dangerouslySetInnerHTML` in `app/layout.tsx`.
2. **`components/ThemeScripts.tsx`** — creates `<script>` elements **at runtime** and appends them to
   the body, replaying the theme's libraries in document order.
3. **The scraped WordPress HTML itself** — `page.bodyHtml` contains the source site's own inline
   scripts, injected as opaque markup.

Hashing is impractical across (3) because the inline blocks vary per page. So any workable CSP needs
`'unsafe-inline'` in `script-src`, which removes most of the XSS benefit — **be honest about that
rather than shipping a CSP that looks strong and isn't.**

Report-only first, always:

```
/*
  Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://cdnjs.cloudflare.com https://ajax.googleapis.com; connect-src 'self' https://api.web3forms.com https://www.google-analytics.com https://*.googletagmanager.com; img-src 'self' data: https://www.googletagmanager.com https://www.google-analytics.com https://imgquarry.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; frame-src https://www.googletagmanager.com; base-uri 'self'; form-action 'self' https://api.web3forms.com
```

Hosts that must be present or something breaks:

- `googletagmanager.com` — the container, plus `frame-src` for the `<noscript>` iframe.
- `api.web3forms.com` — the lead form POST, in `connect-src` **and** `form-action`.
- `fonts.googleapis.com` / `fonts.gstatic.com` — the original Google Fonts links, matching the source.
- **Any CDN the scraped HTML loads.** Enumerate them before drafting — do not trust the list above:

```bash
grep -rho 'https://[a-z0-9.-]*\.[a-z]\{2,\}' out/index.html | sort -u | head -40
node -e 'const s=require("./content/site.json");
const h=new Set();for(const p of s.pages)for(const x of p.scripts||[])
if(x.kind==="src"&&/^https?:/.test(x.url))h.add(new URL(x.url).host);
console.log([...h].join("\n"));'
```

**Process:** ship report-only → collect reports for at least a week of real traffic, including a real
form submission and a call click → only then decide whether enforcing is achievable at all. Shipping
an enforcing CSP untested breaks the jQuery replay, the analytics, or the form silently — and on a
lead-gen site that is a revenue bug.

## `public/_redirects`

Also available on Cloudflare Pages, and this repo has no redirects file yet. It is the **prerequisite
for any slug change** — the duplicate-city pairs, the cross-silo duplicates, `/שכפול-שלט-לרכב-2/`.
Renaming or merging without a 301 discards the ranking signal that URL holds. Not a cleanup task; a
deliberate project with a redirect map (`docs/keyword-map.md` §8).

## The lead form

- POSTs to `https://api.web3forms.com/submit` over HTTPS with a **public-by-design** access key read
  from `site.config.json`. **It is not a leaked secret; don't report it as one.**
- Honeypot field `botcheck` present and correctly off-screen. No client-side rate limiting —
  acceptable for the volume, and Web3Forms applies its own.
- **`novalidate` with no JS handler means nothing is validated** — a spam or malformed submit is
  accepted. See `/conversion-cro`.
- **Consent:** the form collects name, phone and free text while `/privacy-policy/` exists and is
  never referenced from it. Add the link.
- **No PII in `dataLayer`** — nothing currently pushes any. Keep it that way.

## The scrape is the trust boundary

`components/SiteFrame.tsx` injects `page.bodyHtml` and every `page.jsonLd` entry with
`dangerouslySetInnerHTML`. The content is **build-time snapshot data, not user input**, so this is not
an XSS vector in the usual sense — say so plainly rather than flagging it.

But it does mean **anything that lands in `content/site.json` ships as live executable HTML**. The
boundary worth auditing is `scripts/scrape.mjs` and `scripts/transform.mjs`, and the rule worth
holding is: `npm run snapshot` re-scrapes a live third-party origin, so **never run it in CI** and
never run it unprompted.

## Secret hygiene

The only key in the repo is the public Web3Forms access key. The Search Console token hardcoded at
`app/layout.tsx:33` is not a secret but is config in the wrong place — it belongs in the roster
manifest (backlog §13.5). Check `.env.local` for anything that should not be committed (it is
gitignored via `.env*`).

```bash
npm audit --omit=dev    # runtime — matters
npm audit               # includes dev — usually informational for a static export
```

Report the two separately. A devDependency advisory does not ship to users here.

## Checklist

- [ ] The stale GitHub Pages origin is retired or redirected.
- [ ] `public/_headers` shipped; verified with `curl -sSI` against the live site after deploy.
- [ ] HSTS without `preload` unless the owner has explicitly accepted it.
- [ ] CSP is **report-only**, its host list enumerated from the actual export, and observed for a full
      week including a real form submit and a call click.
- [ ] Form links to `/privacy-policy/`.
- [ ] No PII in `dataLayer`.
- [ ] `npm audit --omit=dev` clean or triaged.
- [ ] No second live origin.

## Gotchas

- Never verify a header from the repo. Cloudflare adds, merges and sometimes overrides.
- A CSP that blocks `googletagmanager.com` silently kills every conversion signal — the pages still
  look fine.
- A CSP that blocks the theme's CDN-hosted jQuery kills the nav, the carousels and the calculator on
  every page.
- Zone-level settings (Scrape Shield, AI Crawl Control, cache rules) are the **owner's** to change.
  Document the toggle; never assume it was flipped.
