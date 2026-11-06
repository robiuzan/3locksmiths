---
name: image-pipeline-3locksmiths
description: The mechanics of getting a generated image onto this site — the split between networked generation (Media Studio) and offline placement (the enrich chain), why CI forbids the two being joined, the deploy gate that blocks a published hero without a cdn-cgi URL, the scraped-HTML mutation idiom for the homepage, and the guard traps around naming, Prettier and alt text. Use when placing a catalog image, debugging one that will not appear, or adding a new image slot. Triggers "generate an image", "place a catalog image", "why is my image not showing", "image pipeline", "placeholder", "hero not updating".
---

# The image pipeline on this site

Two halves that must never be joined:

```
AUTHORING (networked, manual, guarded)     BUILD (offline, deterministic, runs in CI)
──────────────────────────────────────     ────────────────────────────────────────
Media Studio: prompt + refs -> image       site.config.json  images{}
  -> /api/upload -> R2 + D1                  -> lib/enrich/catalog-image.mjs
  -> /api/publish (human gate)                -> render.mjs / hero-gallery.mjs
  -> ops/sync-media.ps1 ────────────────────>  -> content/site.json -> out/
```

## Why they can never be joined

`.github/workflows/ci.yml` runs `npm run enrich` and then asserts byte-determinism:

```yaml
git diff --quiet -- content/site.json content/enriched/_manifest.json
```

with the invariant stated at line 56: _"the pipeline is byte-deterministic … and `enrich` never
touches the network."_ CI defines **no `env:` block and references no secrets**, and `.env.local`
is gitignored so it does not exist on the runner.

So: **never put an API call in the enrich chain.** Generation happens on a workstation and its
_committed output_ — a catalog entry synced into `site.config.json` — is deterministic input.

## The fallback is load-bearing

`catalogImg()` returns `null` when nothing is published, and every caller falls back to the legacy
`/wp-content/uploads/` constant. That is not defensiveness — it is what lets the whole pipeline
keep building byte-identically before a single image exists, which is exactly what CI checks.

**Never make a catalog image mandatory.** A missing image must degrade, not fail.

## The deploy gate that will bite you

`ops/deploy-site.ps1` `Test-OutDir` (lines 133-143):

```powershell
if ($manifest.images -and $manifest.images.mediaHost) {
  if ($manifest.images.hero -and $homeHtml -notmatch 'cdn-cgi/image/') { $bad += '...' }
  if ($homeHtml -notmatch ('rel="preconnect"[^>]*' + $mh))            { $bad += '...' }
}
```

`mediaHost` **is** set, so this is armed. It checks **`index.html`** — and the homepage does not use
`renderHero`. So publishing a `hero` slot while the homepage tiles are still stock **blocks the
deploy**.

Ship `hero-gallery.mjs`'s tiles in the same change as the hero slot, and keep images at
`published=0` in Media Studio until their placement is ready.

## The homepage is not an authored page

`content/enriched/7.mjs` does not exist, and `scripts/enrich.mjs:258-278` rebuilds `<main>` only for
pages that have a module. The homepage body is scraped WordPress markup.

So homepage changes are **pipeline passes**, in the `claims.mjs` / `footer.mjs` / `form.mjs` family.
`scripts/hero-gallery.mjs` follows the `footer.mjs` idiom:

```js
const root = parse(page.bodyHtml, { blockTextElements: { script: true, style: true, ... } });
const grid = root.querySelector(".home-hero-right-galley");
grid.setAttribute("data-hero-rebuilt", "1");   // sentinel
grid.set_content(html);                         // full replace -> converges on re-run
page.bodyHtml = root.toString();
```

**Page 7's HTML is stateful.** Nothing regenerates it, so each run mutates the previous run's
output. A string rewrite's `from` must match **what the pipeline last wrote**, not the WordPress
original (`claims.mjs:66-69` documents living with this).

## Naming and guard traps

| Trap                                                               | Rule                                                                                                                                                                                                                               |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check-freshness.mjs:43` skips `check-*` when listing sources      | A **mutating** script must never be named `check-…` or it drops out of the staleness check. `hero-gallery.mjs` is mutating; `check-placeholders.mjs` and `check-catalog-images.mjs` are not.                                       |
| `check-claims.mjs` tests **visible** copy, which strips `alt`      | Only the raw-HTML rules see an alt: `claims.mjs` FORBIDDEN (years of experience, warranty term, customer counts) and check-claims BLOCKING_RAW (rating badge, US phone, review widget). A response time or price in an alt passes. |
| `check-typography.mjs` walks every string in every authored module | Hebrew with an ASCII `'` fails. Prompts live in Media Studio, outside its reach — keep them there.                                                                                                                                 |
| `.prettierignore` does not list `public/assets/img/`               | It passes today only because Prettier has no `.webp` parser. A **JSON sidecar** there would be format-checked and create a regenerate loop.                                                                                        |
| `fix-links.mjs:36` excludes image extensions                       | A broken `<img src>` fails nothing. `check-catalog-images.mjs` covers the catalog side.                                                                                                                                            |
| `assets.mjs` rewrites every `<img>`                                | It adds `width`/`height`/`loading` only to `/wp-content/uploads/**`. Catalog images must carry their own.                                                                                                                          |

## Key-card images (per model)

The brand pages' key grids take one picture per card, made from the owner's own key photographs
(business-facts §D.15). They do not use a prompt file under `prompts/3locksmiths/` and they do not
use a slot: they ride the fleet page-images toolkit and arrive as ordinary gallery items.

```
Media Studio  page-images toolkit, site `threelocksmiths`   brief → digest → OWNER YES → generate/qa → board
        │     (prompts under prompts/threelocksmiths/ are the approval and disclosure record)
        ▼
sites/threelocksmiths/catalog-bridge.mjs   approved frames only → /api/upload + /api/publish
        ▼                                  (gallery item `key-<brand>-<model>`, altHe + English alt)
Israeli services sites/ops/sync-media.ps1 -Domain 3locksmiths.co.il   → site.config.json
        ▼
node scripts/attach-key-images.mjs --map <abs path to Media Studio/sites/threelocksmiths/cards.json> --dry-run
node scripts/attach-key-images.mjs --map <…>   → `image:` + Hebrew `alt:` on each confirmed card
        ▼
npx prettier --write <the files it names>  →  npm run enrich  →  the gate  →  deploy (owner's word)
```

- **The attach script decides which pages may take a picture**, not the map: the B1 pages are
  built in, any other page needs `--allow <id> --ref "§D.n"`, and קיה (98) is never touched.
  `--replace-plate 99` is the only way an existing `image` changes, and only from a type plate.
- **The card's alt is authored in the module**, so `check-typography` sees it; the catalog's
  `altHe` and English `alt` are never rendered on a card.
- **It refuses rather than guesses**: a stale map line, an ambiguous (model, years) pair, an
  uncommitted module, a plate or reserved name as the slug, an alt that is not Hebrew, misses the
  model, or carries a digit or an ASCII quote. Any refusal writes nothing.
- It is a **freshness source** (scripts/, not `check-*`): editing it means a no-op
  `npm run enrich` before `check-freshness` passes again.
- `node scripts/check-placeholders.mjs` counts a card as attached only when its image resolves,
  and reports attached cards whose alt is not Hebrew or repeats within a grid.

## Adding a new image slot

1. Add a row to `SLOTS` in `scripts/check-placeholders.mjs` — that is what makes it visible in the
   approval queue.
2. Add its `sizes` to `SIZES` in `lib/enrich/catalog-image.mjs`, derived from the CSS.
3. Call `catalogImg(imageRef("<name>"), …)` at the render site, **with a fallback**.
4. Have the art director write the prompt; the owner approves it; generate and publish.

## Verifying

```bash
node scripts/check-placeholders.mjs      # the approval queue: what is published, what is blocking
node scripts/check-catalog-images.mjs    # URL builder parity + hero bucket coverage
npm run enrich && node scripts/check-freshness.mjs && node scripts/check-claims.mjs
npm run build
grep -o 'cdn-cgi/image/[^"]*' out/index.html | head    # did the transform URLs actually render
```

**Check the rendered output, not `content/site.json`.** A change can look applied in the artifact
and still not reach `out/`.
