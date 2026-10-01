---
name: qa-build-gate
description: The release gate before any deploy — the content-freshness check that stops a silent stale-build deploy, clean build, lint, typecheck and format:check, route and sitemap parity, JSON-LD parseability, title/canonical/H1 assertions, the dead tel:[phone] and personal-email checks, the decode-aware orphan check, output weight, and the auditor sweep. Use before every deploy or when asked whether the site is ready to ship. Triggers "run the build gate", "is this ready to ship", "pre-deploy check", "QA the site", "verify the build".
---

# Build gate

Everything here runs against `out/` — the artifact that actually ships. A passing `npm run build` is
the start of this gate, not the end of it.

## 0. Rebuild content first if you touched it

```bash
npm run enrich          # pages → build-manifest → enrich → footer → live-surfaces → … → fix-links → lastmod   (no network)
```

**Required** if you edited `content/enriched/`, `lib/enrich/render.mjs` or `scripts/`. Skipping it
means the build ships the old content **with no error anywhere** — the single easiest way to "fix"
something and deploy the unfixed version.

**Never run `npm run snapshot` as part of a release.** It re-scrapes the live WordPress origin and
rewrites `content/site.json` from whatever that server returns today.

`scripts/enrich.mjs` is itself a gate: it asserts one `<h1>` per enriched page and that every block it
generates parses, exiting non-zero otherwise. Read its output — it prints `ENRICH PROBLEMS` before
failing.

## 0.5 Freshness — the silent one

```bash
node scripts/check-freshness.mjs
```

Asserts `content/site.json` is newer than every authored module, pipeline script and
`render.mjs`. **`npm run build` does not regenerate it**, so an edit made after the last
`npm run enrich` builds and ships the _previous_ copy with no error anywhere. That happened on
2026-08-25 and reached production. This check is also a blocking CI step.

## 0.6 Claims — read the rendered page, never the module

```bash
node scripts/check-claims.mjs
```

Fails on any claim the site's own data refutes: a years-in-business number against
`foundedYear: null`, `24/7` against the `openingHoursSpecification` 08:00–18:00 that every page
publishes, an averaged response time, a customer count, an `aggregateRating`.

**Why this is a separate gate and not a copy review.** On 2026-08-25 `lib/enrich/render.mjs`
shipped a `DEFAULT_STATS` strip asserting `25+ שנות ניסיון`, `30–60 ד׳ זמן מענה ממוצע` and
`אלפי לקוחות מרוצים` on ~60 pages. **Every authored module was clean.** The claims lived in a
renderer default and in scraped homepage HTML — both invisible to any review that reads
`content/enriched/`. Auditing the modules will not find this class of defect. Only reading
`content/site.json`, which is what reaches the browser, will.

It reports 🔶 unconfirmed claims (warranty, coverage, prices) as counts without failing — those
are the owner's to confirm, they number in the hundreds, and failing on them would make the gate
permanently red and therefore ignored. See `docs/business-facts.md` §D.4.

## 1. Clean build

```bash
rm -rf .next out
npm run lint && npm run typecheck && npm run format:check && npm run build
```

All four must pass. `rm -rf .next` matters: a polluted `.next` can carry stale compiled modules into
the export, producing a **successful build of the wrong code** with no error. `format:check` is
included because a Stop hook formats changed files — an unformatted file means something bypassed it.

## 2. Route and sitemap parity

```bash
find out -name index.html | wc -l          # 112 as of 2026-09-02 (was 119 — 7 cities withdrawn)
grep -c '<url>' out/sitemap.xml            # 105 — routes minus /step/ x4, /thank-you/ and the 404s
test -f out/robots.txt && echo ok
```

The gap is the `/step/` calculator pages plus `/thank-you/` and the 404s, excluded deliberately.
Any other gap means a page was added or dropped — reconcile before shipping. Unlike most sites in this
fleet there is **no hand-maintained URL array**, so a mismatch is a real signal.

## 3. JSON-LD must parse — the check that matters most here

```bash
node -e '
const fs=require("fs"),path=require("path");const f=[];
(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
e.isDirectory()?w(p):e.name==="index.html"&&f.push(p);}})("out");
let bad=0,ok=0;
for(const x of f){const h=fs.readFileSync(x,"utf8");
for(const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
try{JSON.parse(m[1]);ok++;}catch(e){bad++;console.log("UNPARSEABLE:",x,"-",e.message);}}}
console.log("ok:",ok," unparseable:",bad);'
```

**Must return 0.** It returned 2 until 2026-08-25 (the homepage's scraped `FAQPage` and one on
`/services/שכפול-מפתח-לרכב/`); `scripts/enrich.mjs` now repairs or drops unparseable scraped blocks,
and this is a blocking CI check. **A block that does not parse is a stop-ship.**

## 4. Titles, descriptions, canonicals, H1

```bash
# duplicates (expect only the two 404 variants)
grep -rho '<title>[^<]*</title>' out --include=index.html | sort | uniq -c | sort -rn | head

# the brand must appear exactly once per title — must return nothing
grep -rho '<title>[^<]*</title>' out --include=index.html | grep 'שלושה מנעולנים.*שלושה מנעולנים'

# canonicals (expect only /404/, /_not-found/ and /thank-you/)
grep -rL 'rel="canonical"' out --include=index.html

# descriptions (expect the four /step/ routes, /thank-you/ and the 404s)
grep -rL '<meta name="description"' out --include=index.html

# exactly one H1 everywhere (expect no output)
for f in $(find out -name index.html -not -path 'out/404/*' -not -path 'out/_not-found/*'); do
  n=$(grep -o '<h1' "$f" | wc -l); [ "$n" -ne 1 ] && echo "$f: $n";
done
```

## 5. The conversion checks

```bash
# dead click-to-call — MUST be empty (was 3 anchors on the homepage until 2026-08-25)
grep -rho 'tel:%5Bphone%5D\|tel:\[phone\]' out --include=index.html | wc -l

# the business node must not publish a personal address. Must show the manifest email.
grep -o '"email":"[^"]*"' out/index.html

# GTM click tracking. Expect MANY distinct values (17 as of 2026-09-30: topbar-whatsapp and
# topbar-link joined the 15 of 2026-09-01) and the homepage
# must carry at least one — it had a single sitewide value until then. See backlog §13.3.
grep -rho 'data-cta="[^"]*"' out --include=index.html | sort | uniq -c
grep -rL 'data-cta=' out --include=index.html      # must not list out/index.html
```

## 6. Structured data coverage

```bash
grep -rL 'application/ld+json' out --include=index.html      # only 404s, /thank-you/, 4x /step/
grep -rl 'BreadcrumbList' out --include=index.html | wc -l   # 111 — every authored + generated page
grep -rl 'aggregateRating\|"@type": *"Review"' out --include=index.html   # MUST be empty
```

Any `Review` or `AggregateRating` without a verifiable public source is a **stop-ship**, not a warning
(`docs/schema-graph.md` §4.4).

## 7. Orphans

```bash
find out -name index.html | sed 's|^out||; s|index.html$||' | sort > /tmp/emitted.txt
grep -rho 'href="/[^"]*"' out --include=index.html | sed 's|href="||; s|"$||' | sort -u > /tmp/linked.txt
comm -23 /tmp/emitted.txt /tmp/linked.txt
```

⚠️ **Use `node scripts/check-orphans.mjs` instead.** The shell version above compares DECODED
filesystem paths against PERCENT-ENCODED hrefs and is meaningless on this site — it reported a false
orphan on 2026-08-25 for a page that was linked from all 64 footers. The script decodes both sides and
is a blocking CI step.

## 8. Output weight

```bash
find out -type f -size +500k -exec ls -lh {} \; | sort -k5 -h -r | head -15
find out -name '*.js' -size +1M -exec ls -lh {} \;    # expect nothing
du -sh out                                             # ~127 MB (123 MB apparent) as of 2026-09-01

# where the weight actually is — run this before blaming any one asset
node -e '
const fs=require("fs"),path=require("path");const by={};
(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
if(e.isDirectory())w(p);else{const m=e.name.match(/\.[^.]+$/);const k=m?m[0]:"(none)";
(by[k]=by[k]||{n:0,b:0}).n++;by[k].b+=fs.statSync(p).size;}}})("out");
Object.entries(by).sort((a,b)=>b[1].b-a[1].b).slice(0,8)
.forEach(([k,v])=>console.log((v.b/1048576).toFixed(1).padStart(8)+" MB "+String(v.n).padStart(6)+" files  "+k));'
```

**The old "~58 MB" figure in this file was written at 64 routes and is gone; there are 112 now.**
Measured 2026-09-01, the breakdown is not what the prose used to claim:

| Bytes   | Files | Type    | What it is                                                       |
| ------- | ----- | ------- | ---------------------------------------------------------------- |
| 59.8 MB | 826   | `.txt`  | **Next RSC payloads — bigger than the HTML itself.** Unexamined. |
| 43.0 MB | 113   | `.html` | 112 routes, ~370 KB mean (the homepage is ~780 KB)               |
| 8.5 MB  | 15    | `.svg`  | the known legacy Font Awesome fonts (backlog §10.2)              |

So the bulk is **not** vendored theme assets any more — it is RSC payloads and inlined page HTML.
1,126 files total, well inside Cloudflare Pages' 20,000-file cap. Do not delete from `out/` — it is
regenerated. See `/performance-web-vitals`.

## 9. Content floors

Spot-check that nothing regressed below `docs/content-standards.md` §1. Strip tags **and**
`<script>`/`<style>` before counting — the ported pages carry large inline blocks that wreck a naive
count. The median is **~3,000 words** as of 2026-09-01 (112 content pages, range 613–4,396) — the
site roughly doubled its depth after the guides and brand-key build-out, so the old "~1,500" figure
no longer describes it. Investigate anything under 900 that is not a `/step/` fragment, a legal page
or a hub.

Expected to sit under the floor today, all legitimately: `/contact/`, `/privacy-policy/`,
`/services/` and `/מדריכים/` (both hub indexes) and `/sitemap/`.

## 10. Auditor sweep

For a substantive change, run the relevant agents against the **fresh** `out/`:

| Changed                         | Run                       |
| ------------------------------- | ------------------------- |
| metadata, routes, sitemap       | `seo-auditor`             |
| JSON-LD, `scripts/enrich.mjs`   | `schema-auditor`          |
| copy, claims, pricing           | `eeat-trust-auditor`      |
| `render.mjs`, images, CSS       | `perf-a11y-auditor`       |
| headers, the form, deps, deploy | `security-auditor`        |
| any TS/React or pipeline script | `ts-react-reviewer`       |
| locations, NAP, coverage        | `local-seo-strategist`    |
| footer, nav, orphans            | `ia-navigation-architect` |
| keywords, coverage gaps         | `keyword-strategist`      |
| CTAs, the form, conversions     | `conversion-optimizer`    |

## Stop-ship list

- Any `application/ld+json` block that does not parse.
- A `tel:[phone]` placeholder anywhere in the export.
- A personal email address in the `LocalBusiness` node.
- `Review` / `AggregateRating` without a verifiable source.
- Zero or multiple `<h1>` on any page.
- A missing or non-self-referencing canonical on a real page.
- A route in `out/` missing from `sitemap.xml` (other than `/step/` and the 404s).
- `lint`, `typecheck`, `format:check` or `build` failing — or `npm run enrich` printing
  `ENRICH PROBLEMS`.
- A live claim that `docs/business-facts.md` marks 🔶 or ⛔.

> All stop-ship items pass as of **2026-09-01**, re-verified on the merged tree carrying the homepage
> CTA photographs and the פורד key grid: 533 JSON-LD blocks parse and 0 fail, 0 `tel:[phone]`
> placeholders, the manifest email, no `Review`/`aggregateRating`, exactly one `<h1>` everywhere, and
> 112 − 105 = 7 route/sitemap gap. The §4.1/§4.2/§8.1/§2.1 defects were fixed on 2026-08-25 and their
> checks promoted to blocking in `.github/workflows/ci.yml`. If one fails now, it is a regression.

## Then

`/deploy-3locksmiths` — dry run first. **Pushing to `main` does not deploy production**, and it
_does_ publish a stale second origin.
