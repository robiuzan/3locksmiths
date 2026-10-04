---
name: deploy-3locksmiths
description: Ship 3locksmiths to production — the conflicting deploy records and how to settle them, ops/deploy-site.ps1 dry-run then -Confirm (wrangler direct upload to the Cloudflare Pages project), why pushing to main publishes a stale second origin instead of deploying, the npm file: tarball and .next cache traps, the out.prev rollback, and post-deploy verification. Use when publishing. Triggers "deploy", "ship it", "publish the site", "go live", "roll back", "why isn't my change live".
---

# Deploy

## The one thing to know

**Production is Cloudflare Pages (project `3locksmiths`) via wrangler direct upload. Pushing to `main`
does not deploy it — and it _does_ publish a stale second origin.**

## The records conflict — settle it before you ship

This site has contradictory deploy documentation, so **verify rather than assume**:

| Source                                            | Says                                                |
| ------------------------------------------------- | --------------------------------------------------- |
| `roster/roster.json` → `hosting.target`           | `cloudflare-pages`, `pagesProject: "3locksmiths"`   |
| `roster/roster.json` → `notes` (dated 2026-07-13) | deploy by pushing to `robiuzan/robiuzan.github.io`  |
| `logs/deploys.csv`                                | **no row for this domain**                          |
| `.github/workflows/deploy.yml`                    | _deleted 2026-08-26_ — used to publish to GH Pages  |
| local `git remote origin`                         | `robiuzan/3locksmiths` — **public**, Pages disabled |

**Live evidence favours Cloudflare Pages.** Verified 2026-08-16 against `https://3locksmiths.co.il/`:

```
Server: cloudflare · cf-cache-status: DYNAMIC · Access-Control-Allow-Origin: *
x-content-type-options: nosniff · referrer-policy: strict-origin-when-cross-origin
```

— the Cloudflare Pages default header set, **with no `Last-Modified`, no `ETag` and no
`x-github-request-id`**, all of which GitHub Pages always sends and Cloudflare passes through. Plus a
Cloudflare-managed `robots.txt`, which is a proxy-only feature.

> ✅ **Settled 2026-08-24.** The dry run's drift check returned OK: the Cloudflare Pages project
> `3locksmiths` serves `3locksmiths.pages.dev`, `3locksmiths.co.il` **and** `www.3locksmiths.co.il`.
> Production is Cloudflare Pages; the roster's free-text GitHub Pages note was stale and has been
> corrected. Re-run the dry run anyway before each deploy — it is cheap and it is the guard.

**The arbiter is the dry run.** `ops/deploy-site.ps1` asks the Cloudflare API whether project
`3locksmiths` actually serves this domain, and refuses if it doesn't. Run it and read the drift-check
output before believing anything above.

## ✅ The stale second origin — retired

`https://robiuzan.github.io/` used to return **200** with `Server: GitHub.com`, serving an older
build of this site alongside production: two live origins for one site, a duplicate-content and
brand risk (backlog §12.1).

It was retired operationally on **2026-08-25** (the user-site repo cannot have Pages disabled, so it
now serves a redirect to production, and the repo is archived). The two files that kept it alive here
— `.github/workflows/deploy.yml` and `public/CNAME` — were **deleted from this repo on 2026-08-26**
in `ebb913e`, which is why the table above no longer lists the workflow as a live claim.

Nothing in this repo now publishes to GitHub Pages. `.github/workflows/ci.yml` is **build-only** and
deliberately does not deploy. If a second origin ever reappears, treat it as a regression.

## The command

Deploying is a **production mutation**. It runs dry first, and it always asks.

```powershell
# preview - safe, changes nothing
powershell -File "c:/Users/robiu/antigravity/Projects/Israeli services sites/ops/deploy-site.ps1" -Domain 3locksmiths.co.il -DryRun

# execute - only after the user asks
powershell -File "c:/Users/robiu/antigravity/Projects/Israeli services sites/ops/deploy-site.ps1" -Domain 3locksmiths.co.il -Confirm
```

Other flags: `-BuildOnly` (build + output gate, no upload), `-DeployOnly` (ship the existing `out/`
as-is), `-SkipDriftCheck` (**only** when the roster is knowingly ahead of DNS).

**Since 2026-09-30 `npm run build` runs a `prebuild` gate first** — check-freshness, check-claims,
check-typography, check-campaigns, check-live-regions, the schedule simulator and (since
2026-10-01) check-dates
(`docs/dynamic-presence-plan.md` §4.3) — so the script's build step now fails on a stale
`content/site.json` or a ⛔ claim instead of shipping it. Two rules in `check-campaigns` fail by
the passage of time alone (campaign runway, calendar horizon). If one of them is red while you are
shipping an unrelated hotfix, set `$env:LIVE_GATES = 'lapsed-ok'` in the same PowerShell session
before `-Confirm`: only those two become warnings, everything else still blocks. The nuclear
bypass `$env:npm_config_ignore_scripts = 'true'` skips the whole chain — only when the gate
itself is broken, and note it in `logs/deploys.csv`. Note that the script rotates `out/` into
`out.prev/` **before** building, so a prebuild failure leaves no `out/` — fix the gate (or use
the override) and run again; `-DeployOnly` cannot rescue it.

## What the script does, and why each step exists

1. Resolves the Pages project name from the roster (`3locksmiths`).
2. **Drift check** — asks the Cloudflare API whether that Pages project actually serves this domain.
   This is the guard against wrangler-pushing into a project nothing resolves to, which reports
   success while changing nothing the public can see. **On this site it is also the answer to the
   records conflict above.**
3. Installs dependencies, busting two caches (below).
4. `npm run build`.
5. **Output gate** on `out/` — refuses to ship a broken or stale export.
6. Preserves the previous `out/` as `out.prev/` so a rollback is one command.
7. `npx wrangler pages deploy .\out --project-name 3locksmiths --branch main`.
8. Appends the result to `logs/deploys.csv`.

## The two staleness traps

Both produce a **successful build of the wrong code**, with no error anywhere:

- **npm caches `file:` tarball dependencies.** `@ishub/site-kit` is vendored as
  `vendor/ishub-site-kit-0.0.0.tgz`. A fresh tarball on disk plus a plain `npm install` will happily
  keep serving the **old** kit from cache.
- **Next caches compiled modules under `.next/`.** Even with correct `node_modules`, a rebuild can
  emit the previous kit's output.

If you build manually before deploying, `rm -rf .next out` first.

## The third staleness trap — specific to this site

**`content/site.json` is a build artifact, and `npm run build` does not regenerate it.**

If you edited `content/enriched/`, `lib/enrich/render.mjs` or `scripts/`, you must run:

```bash
npm run enrich
```

before building, or the deploy ships the **previous** content with no error and no warning. This is
the most likely way to "fix" something on this site and deploy the unfixed version.

> ✅ **This is now checkable:** `node scripts/check-freshness.mjs` fails if `content/site.json`
> is older than any module or script that feeds it. It runs in CI and is step 0.5 of
> `/qa-build-gate`. **It exists because this trap reached production on 2026-08-25** — a
> background process edited authored modules after `npm run enrich`, and the deploy shipped the
> previous copy silently. Never deploy while anything is still writing to `content/enriched/`.

**Never run `npm run snapshot` as part of a deploy.** It re-scrapes the live WordPress origin and
rewrites everything from whatever that server returns today — turning a content fix into an
unreviewed full-site change.

## Before you deploy

**Since Phase 3 (2026-10-04) every page reads the status switch** — check it answers before you
ship: `node scripts/fleet/status-switch.mjs show` from `../Sys Admin` must print HTTP 200 and an
`access-control-allow-origin`. A missing file or CORS rule does not break the build; it silently
turns every seasonal line and the card off on the live site (`../Sys Admin/runbooks/fleet-status-switch.md`).

Run `/qa-build-gate` end to end. Its stop-ship list applies — in particular do not ship an
unparseable JSON-LD block, a `tel:[phone]` placeholder, a personal email in the business node, or any
`Review`/`AggregateRating` without a source.

> All four former stop-ship items (backlog §4.1, §4.2, §8.1, §2.1) were fixed 2026-08-17 and are
> now blocking CI checks. A failure here is a regression, not the known state.

## After you deploy

```bash
curl -sSI https://3locksmiths.co.il/ | head -20
curl -sS https://3locksmiths.co.il/ | grep -o '<title>[^<]*</title>'
curl -sS "https://3locksmiths.co.il/%d7%9e%d7%97%d7%99%d7%a8%d7%95%d7%9f/" | grep -o '<title>[^<]*</title>'
curl -sS https://3locksmiths.co.il/sitemap.xml | grep -c '<loc>'          # expect 104
curl -sS https://3locksmiths.co.il/robots.txt | head -40
curl -o /dev/null -s -w '%{http_code}\n' "https://www.googletagmanager.com/gtm.js?id=GTM-KWGGH438"
curl -sS https://3locksmiths.co.il/ | grep -c 'tel:%5Bphone%5D'           # target 0
curl -sS https://3locksmiths.co.il/ | grep -c 'href="#"'                  # target 0 — see below
```

Check: the page is the new build; titles carry the brand exactly once; the sitemap lists **104**
URLs; `robots.txt` matches the intended AI-crawler stance (**Cloudflare prepends a managed block** —
see `/aeo-answer-content`); GTM returns 200; and any new `public/_headers` entries actually appear in
the response (`/web-security-headers`).

> The `href="#"` check is there because of a 2026-08-26 finding: the homepage brand grid shipped all
> 17 of its cards pointing at `#`, dead, while the brand pages they should have reached existed the
> whole time. Neither guard caught it — `fix-links.mjs` treats `#` as a deliberate non-route, and the
> orphan check passed because the footer already reached those pages. `fix-links.mjs` now resolves
> the grid from the build manifest, so this line is a regression check, not a routine step.

## Rollback

`out.prev/` holds the previous export. Restore it over `out/`, then deploy with `-DeployOnly`.
Cloudflare Pages also keeps prior deployments in its dashboard and can roll back there, which is often
faster — offer both and let the user choose.

## Rules

- **Never deploy without being asked.** Not as the last step of a task, not "while I'm here".
- **Never skip `npm run enrich`** after a content change. It is the difference between shipping the
  fix and shipping nothing.
- **Never run `npm run snapshot`** as part of a deploy.
- Never use `-SkipDriftCheck` to make a failing deploy pass. A drift failure means the deploy would
  have gone somewhere nobody can see — and on this site it is also your evidence about which origin is
  real.
- Never edit `site.config.json` as part of a deploy — it syncs from the roster.
- Never deploy with `/qa-build-gate` stop-ship items outstanding without saying so explicitly.
- Zone settings (AI crawler policy, cache rules, Scrape Shield) are the owner's to change; a deploy
  does not touch them.
