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

| Source                                            | Says                                                    |
| ------------------------------------------------- | ------------------------------------------------------- |
| `roster/roster.json` → `hosting.target`           | `cloudflare-pages`, `pagesProject: "3locksmiths"`       |
| `roster/roster.json` → `notes` (dated 2026-07-13) | deploy by pushing to `robiuzan/robiuzan.github.io`      |
| `logs/deploys.csv`                                | **no row for this domain**                              |
| `.github/workflows/deploy.yml`                    | publishes `out/` to GitHub Pages                        |
| local `git remote origin`                         | `robiuzan/3locksmiths` (private mirror, Pages disabled) |

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

## ⚠️ The stale second origin

`https://robiuzan.github.io/` returns **200** with `Server: GitHub.com` and serves an **older build**
of this site — its homepage `<title>` is the pre-fix bare `שלושה מנעולנים` while production serves the
enriched title. `.github/workflows/deploy.yml` keeps it alive, and `public/CNAME` claims the apex for
it (backlog §12.1).

Two live origins for one site is a duplicate-content and brand risk. **Retiring it is a deploy-
behaviour change — confirm with the user before doing it.** See `/web-security-headers`.

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
curl -sS https://3locksmiths.co.il/sitemap.xml | grep -c '<url>'          # expect 60
curl -sS https://3locksmiths.co.il/robots.txt | head -40
curl -o /dev/null -s -w '%{http_code}\n' "https://www.googletagmanager.com/gtm.js?id=GTM-KWGGH438"
curl -sS https://3locksmiths.co.il/ | grep -c 'tel:%5Bphone%5D'           # target 0
```

Check: the page is the new build; titles carry the brand exactly once; the sitemap lists 60 URLs;
`robots.txt` matches the intended AI-crawler stance (**Cloudflare prepends a managed block** — see
`/aeo-answer-content`); GTM returns 200; and any new `public/_headers` entries actually appear in the
response (`/web-security-headers`).

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
