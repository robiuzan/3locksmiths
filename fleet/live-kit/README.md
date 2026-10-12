# Fleet live-kit

The dynamic-presence system of the 3locksmiths pilot (`docs/dynamic-presence-plan.md`), packaged
for the other Israeli fleet sites, which are ordinary Next.js component sites (no scrape/enrich
pipeline). Owner decision 2026-10-11: every fleet site gets everything — the announcement bar
with the Israeli calendar and quiet days, the fleet status switch, the homepage updates strip,
the seasonal card (popup, overriding the sites' written no-popup rules) and the weekly phone
reminder — each with **its own wording**, drafted from that site's own pages and approved by the
owner per site. The card follows the pilot's rules on every site.

## Why it lives here and is copied, not packaged

- The pure logic already lives — and is mutation-tested — in this repo: `lib/live/*.mjs`
  (including the claim rules), `public/assets/live.js`, the calendar in
  `content/enriched/_calendar.json`.
- `Israeli services sites/packages/site-kit` is not under git, two different kit tarballs are in
  use across the fleet, one site installs from the hub path and thermoleak does not use the kit at
  all. Re-vendoring an unversioned kit into ten repos would ship unrelated kit changes too.
- So `sync.mjs` copies the exact bytes into each site and writes `live-kit.lock.json`; every
  site's `prebuild` runs `scripts/live/check-live-copy.mjs`, which fails on any local edit (and
  says so when only line endings changed). One tested source, byte-identical copies, git history
  on both sides. `check-fleet.mjs` lists the sites that are behind or edited.

## What a site gets

| Locked (copied, never edited in the site)                                         | The site's own adapter                                         |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `lib/live/{resolve,compile,head-script,topbar,israel-time,claims}.mjs` (pilot's)  | `live.config.mjs` — calm / no-card paths, claims, pageOfSource |
| `lib/live/render.mjs`, `lib/live/live-core.css` (kit)                             | `content/live/_campaigns.mjs`, `_updates.mjs` (+ `approved`)   |
| `public/assets/live.js` (pilot's)                                                 | `components/live/Live.tsx` (from `templates/`)                 |
| `content/live/_calendar.json` + overlay (pilot's)                                 | layout + homepage wiring, `--live-*` colours, breakpoint fix   |
| `scripts/live/check-live-{copy,register,schedule,out}.mjs`, `check-reminders.mjs` | `package.json` hooks, CSP, `remind.yml`, link-check stripping  |

## Install / update a site

```bash
# from this repo, after committing the kit (the lock records the commit)
node fleet/live-kit/sync.mjs ../<site> --dry-run
node fleet/live-kit/sync.mjs ../<site>
node fleet/live-kit/check-fleet.mjs
```

Sync also adds the locked paths to the site's `.prettierignore` and `.gitattributes` (`text
eol=lf`). Then, in the site (gagoline.co.il is the reference adapter — copy its shape):

1. `live.config.mjs`: `site`, `url`, `calm` (thank-you, legal, noindex pages; emergency pages; any
   page telling the reader to call 100/101/102), `noDialog` (the lead-form page), the homepage
   container classes, the site's own ⛔ `claims` (every 🔶 item in its business facts, as
   STEMS, not exact phrases), `pageOfSource` (file → the page it renders).
   - **Mutation-test the stems** before handing back: feed near-miss rewordings of every 🔶 row
     (number words, synonyms, the row reworded) through `findClaim` with the site's rules — and
     the site's OWN claim-free advice sentences, which must NOT hit (on gagoline a `זמינים` stem
     fired on every `לפני שמזמינים …`). The 2026-10-12 reviews found phrase-list stems letting
     69 of 81, 76 of 158 and 83 of 90 rewordings through; mind Hebrew word edges
     (`(?<![א-ת])`) and final letters (ם/מ, ן/נ, ץ/צ, ף/פ, ך/כ). Site stems apply to visible
     copy only; the calendar's labels answer to the fleet rules alone, so a bare `שבת` or
     `מלחמה` stem is safe.
   - The fleet rules over-match a few innocent words on purpose (they fail safe): `עלות` inside
     תעלות / מעלות / בעלות, `מבצע` in מבצעים (we carry out), `אחריות` in באחריות המזמין,
     `הנחה` as an assumption, `הכי טוב` as timing advice, `תוך N יום` as a legal deadline. Reword
     such a tip; never add an `allowClaims` entry for it.
   - `forbiddenSources`: files the site renders but cannot vouch for (invented testimonials, AI
     gallery captions) — exact paths, or folders ending in `/`. A line may never cite them; an
     UNLINKED line (evergreen, reduced) has no other guard.
   - `pageOfSource(file, source)` is called **once per quote**, with `source` =
     `` `<file> — ״<that one quote>״` ``, and every page it names must be the line's link target.
     `check-live-out` then proves it on the BUILT page: every quoted piece of a linked line must
     be visible on its link target (scripts and the live regions removed) — that also catches a
     quote from a shared module, for which `pageOfSource` answers null. An adapter that reads
     files resolves them as `join(/* turbopackIgnore: true */ process.cwd(), file)` on a
     Turbopack (Next 16) site — `live.config.mjs` is bundled into the build through `Live.tsx`,
     and a dynamic path makes Turbopack trace the whole project; on a webpack (Next 14) site
     resolve from the config file's own folder with `dirname(fileURLToPath(import.meta.url))` —
     NOT `new URL(".", import.meta.url)`, which webpack bundles as an asset import and fails the
     build ("Can't resolve '.'", dangates 2026-10-12). A quote from a collapsed accordion (a
     closed FAQ answer) counts as on the page: it is in the HTML and one tap away.
2. `content/live/_campaigns.mjs` + `_updates.mjs`: drafted ONLY from sentences the site already
   shows; every line's `source` quotes its file. No hours, emergency, speed, warranty, price,
   coverage, credentials, counts or reviews. Never copy another site's wording.
3. `components/live/Live.tsx` from `templates/`. `<LiveHead/>` FIRST in `<head>`;
   `<LiveTopBar/>` directly before the header (not sticky); `<LiveDialogs/>` last in `<body>`;
   `<LiveUpdates/>` on the homepage; `suppressHydrationWarning` on `<html>`;
   `import "@/lib/live/live-core.css"` in the root layout.
4. `--live-*` colours in the site's globals (AA contrast; a light CTA colour needs
   `--live-call-ink` / `--live-wa-ink` dark). `--live-sticky-offset` = the sticky call bar's
   height INCLUDING its border, + 16px. The kit's phone rules run to 991.98px; where the site's
   own mobile layout (its sticky call bar) ends elsewhere, add an UNLAYERED override (the `html`
   prefix beats live-core.css, which loads after globals) for the band between the two:
   - **mobile ends ABOVE 992px** (Tailwind `lg` = 1024px; gagoline, betonplus, skyshade): band
     992px…(edge−0.02px) gets the PHONE rules — the bar closed on evergreen days and on calm
     pages, the path-marked ones (`html[data-live-calm]…`) AND the 404
     (`html:has([data-live-calm-page])…`) — and the card's phone placement: `html .live-dialog {
margin: auto auto calc(var(--live-sticky-offset) + env(safe-area-inset-bottom)); max-height:
calc(100% - var(--live-sticky-offset) - env(safe-area-inset-bottom) - 16px) }` (both, or a tall
     card runs under the sticky bar). See gagoline's globals.css. On these sites the evergreen
     line shows from 1024px, not 992px.
   - **mobile ends BELOW 992px** (Tailwind `md` = 768px; myhomeplumber, thermoleak): band
     edge…991.98px gets the DESKTOP rules — the bar open with at least the evergreen line unless
     `off` (needs `!important`: the phone calm rules out-specify a plain selector) and the card
     centred (`margin: auto`, `max-height` reset). See thermoleak's globals.css. On these sites
     the evergreen line shows from 768px.
5. Anything that can sit over the page — a mobile menu panel, a consent banner — carries
   `data-live-block` while it is open: the card never opens over it. A consent banner needs it
   from the FIRST PAINT until answered, and a static export cannot know on the server whether
   this visitor already answered — so do what hambabait does: an inline `<head>` script after
   `<LiveHead/>` sets `data-live-block` on `<html>` when the consent key is missing from
   localStorage, and the banner removes it when answered (hambabait `app/layout.tsx`,
   `components/layout/ConsentBanner.tsx`).
   5a. The 404 page renders `<div data-live-calm-page hidden />`: no path can name it in advance,
   and this marks it calm (no seasonal line, no card) from its own content. `check-live-out`
   fails without it (it matches the element in `out/404.html`, `out/404/index.html` and
   `out/_not-found/index.html` — the bare attribute name is in every page's RSC payload).
6. `package.json`: `prebuild` = `check-live-copy && check-live-register && check-live-schedule`;
   `postbuild` += `check-live-out`. Linter ignores for `lib/live/**`, `scripts/live/**`,
   `public/assets/live.js`.
7. CSP: `https://imgquarry.com` in `connect-src`.
8. The site's own link / orphan checker: strip `<div class="live-topbar"…</div></div>` and
   `<div class="live-dialogs"…</dialog></div>` as chrome (they are on every page).
9. `.github/workflows/remind.yml` → `node scripts/live/check-reminders.mjs`. It pushes only when
   THIS site needs something (switch unreadable from its origin, deploy drift, the strip's age,
   the runway); the switch's mode, quiet days and the calendar's end are pushed once for the
   fleet by the 3locksmiths reminder. It fails red on GitHub when `NTFY_TOPIC` is missing.
10. Update the site's own docs: record the owner's override of any no-popup rule, dated.
11. Last: `node fleet/live-kit/check-fleet.mjs` from this repo — the kit may have moved while you
    worked (it did on 2026-10-12); re-sync if the site is `behind`.

**Weight.** Every line and both inline scripts are printed twice — in the HTML and, JSON-escaped,
in the RSC payload: about +16 KB raw / +4–7 KB gzip per page in the HTML. A Next 16 site also
writes separate RSC `.txt` files per route (+7–9 KB gzip each, fetched only on a client-side
navigation). thermoleak: +913 KB on a 6.0 MB export. Check the site's own size budgets before it
ships, and put a breach to the owner (2026-10-12: thermoleak's cap raised to 7.5 MB, skyshade's
home-JS budget to 130 KB).

**Events.** `live.js` pushes `surface_view` / `surface_dismiss` with `surface`, `variant` and
`method` only — no `site` parameter: the one shared GTM trigger and the `GA4 Measurement ID`
lookup route every event by hostname. A site whose event taxonomy requires `site` on every event
records this as a fleet exception (dangates did, 2026-10-12).

**Local preview builds of an unapproved draft: `LIVE_DRAFT=1 npm run build`.** Without the
owner's `approved: "YYYY-MM-DD — who, how"` in both registers the build FAILS — so a draft can
never reach production by any path, including skyshade's push-to-deploy. `check-live-out` writes
`out/.live-draft` while either register lacks the stamp (or under `LIVE_DRAFT=1`) and removes it
only once both carry one, so a standalone re-run cannot clear it. `ops/deploy-site.ps1` refuses
any `out/` that carries it — also under `-DeployOnly` (fixed 2026-10-12; it used to skip the
check there) — and discards a draft `out/` instead of rotating it into `out.prev/`, the rollback
copy.

**After `node scripts/calendar-sync.mjs` here, re-sync every site** — the calendar is fleet data.

## React sites navigate without loading a page — what the kit does about it

`next/link` swaps the page in place: the root layout persists, `<html>` keeps its attributes and
the inline scripts never run again. Found by the 2026-10-11 review; handled by:

- the head script appends its OWN `<style>` (never a React-owned one — React empties it on the
  first click; check-live-out fails if `id="live-reveal"` reappears);
- the calm script wraps `history.pushState` / `replaceState` and listens to `popstate`: it
  re-marks calm / no-card pages on every move and fires `live-nav` when the path changed;
- `live.js` counts `live-nav` as a page view (never a search landing), re-decides the card, and
  looks the card up at the moment it opens (React may have replaced the node);
- the stale updates strip is hidden from `html[data-live-stale]` (set by the calm script), which
  survives a re-render.

Verify every site with real link clicks, not only page loads (the browser checks used for
gagoline: hard loads in every mode at phone and desktop width, then soft navigation through a
no-card, an ordinary and a calm page, and the wartime line across clicks).

## Before a site's first deploy — in this order, each on the owner's approval

1. The owner approves that site's wording → add `approved` to both registers.
2. Commit the kit here and re-sync the site (its lock must name a commit, not `+dirty`).
3. In the SAME approved step: add the site's three origins (apex, www, `.pages.dev`) to `ORIGINS`
   in `../Sys Admin/scripts/fleet/status-switch.mjs`, then `cors -DryRun` → `cors -Confirm`.
   **Without it the site reads the switch as unreadable and every seasonal line and the card stay
   off — silently.** Verify with `show`.
4. Count the card in GTM (container GTM-KWGGH438). Owner decision 2026-10-12: ONE shared trigger
   for the whole fleet — widen `CE - popup events (3locksmiths)` so its hostname condition
   matches every fleet site (myhomeplumber's `docs/gtm-container-spec.md` records the exception to
   its per-site rule). The site's GA4 property needs the custom dimensions `surface`, `variant`,
   `method` and `cta_id`.
5. `gh secret set NTFY_TOPIC -R robiuzan/<site repo>` (the same topic as 3locksmiths).
6. Deploy: `ops/deploy-site.ps1 -Domain <site> -DryRun`, then `-Confirm` — **skyshade deploys
   by GitHub Actions on every push to main, so for skyshade merging to main IS the deploy** —
   and its deploy.yml also rebuilds and deploys main on the 1st of every month.
7. Verify on the live URL: the switch read (200), the line, a soft navigation, the card on a 2nd
   page, DebugView for `surface_view`.

## Differences from the pilot

- A Next root layout does not know its page, so every page carries every line and the card;
  `calmScript()` marks the page from its own path before first paint and after every
  client-side navigation (`html[data-live-calm]`, `[data-live-nodialog]`, `[data-live-stale]`).
- The bar lines carry no `hidden` attribute (Tailwind v4 preflight's `[hidden]{display:none
!important}` lives in a cascade layer and would beat the head script's reveal); live-core.css
  hides them instead.
- `check-live-out.mjs` demands the rendered markup verbatim on every Next-rendered page.
- A `source` cites any repo file except the registers, the settings, `docs/` and root `*.md`:
  `lib/service-depth.ts — ״the sentence״`; each `<file> — ״…״` pair is checked against its file.
