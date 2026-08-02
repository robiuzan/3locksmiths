// Snapshot the live WordPress site + vendor its assets for a faithful 1:1 static port.
//
// Why this exists: the source ("gogo" custom theme) renders pages from server-side
// post-meta that the REST API does NOT expose (content.rendered is empty). So the page
// bodies are captured from the live rendered HTML, and every same-origin asset
// (CSS / JS / fonts / images, including CSS url() deps) is mirrored into public/ at its
// ORIGINAL path so the same absolute URLs resolve locally.
//
// Output: content/site.json  (consumed by lib/content.ts at build time)
//
// Run: node scripts/scrape.mjs

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");
const CONTENT = join(ROOT, "content");

// ---- read NEXT_PUBLIC_WP_URL from .env.local ------------------------------
function readEnv() {
  const env = readFileSync(join(ROOT, ".env.local"), "utf8");
  const m = env.match(/^NEXT_PUBLIC_WP_URL\s*=\s*(.+)\s*$/m);
  if (!m) throw new Error("NEXT_PUBLIC_WP_URL not found in .env.local");
  return m[1].trim().replace(/\/+$/, "");
}
const WP = readEnv();
const WP_HOST = new URL(WP).host;
console.log("WP source:", WP, "(host:", WP_HOST + ")");

const UA = { "User-Agent": "Mozilla/5.0 (migration-snapshot)" };
async function fetchText(url, tries = 3) {
  let last;
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.text();
    } catch (e) {
      last = e;
      if (i < tries) await new Promise((res) => setTimeout(res, 1500 * i));
    }
  }
  throw last;
}
async function fetchBuf(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

function sameOrigin(u) {
  try { return new URL(u).host === WP_HOST; } catch { return false; }
}
// Normalize an asset URL: drop query/hash, trim stray %20/spaces left by the theme.
function cleanAsset(absUrl) {
  const u = new URL(absUrl);
  u.search = ""; u.hash = "";
  u.pathname = u.pathname.replace(/(?:%20|\s)+$/gi, "");
  return u;
}
function localRef(u) { return decodeURIComponent(u.pathname); } // leading-slash path

// ---- asset vendoring ------------------------------------------------------
const vendored = new Map();   // cleaned href -> local ref
const inFlight = new Map();
let bytes = 0, files = 0;

async function vendor(absUrl, depth = 0) {
  if (!sameOrigin(absUrl)) return null;        // keep cross-origin (Google/cdnjs) external
  const u = cleanAsset(absUrl);
  const key = u.href;
  if (vendored.has(key)) return vendored.get(key);
  if (inFlight.has(key)) return inFlight.get(key);

  const p = (async () => {
    const ref = localRef(u);
    const fsPath = join(PUBLIC, ref);
    const isCss = ref.toLowerCase().endsWith(".css");
    try {
      if (!isCss && existsSync(fsPath)) { vendored.set(key, ref); return ref; } // idempotent
      let buf = await fetchBuf(u.href);
      if (isCss && depth < 4) {
        // rewrite absolute same-origin url()/@import to local; recurse to fetch deps
        let css = buf.toString("utf8");
        const urls = new Set();
        const re = /url\(\s*['"]?([^'")]+)['"]?\s*\)|@import\s+['"]([^'"]+)['"]/gi;
        let m;
        while ((m = re.exec(css))) { const v = (m[1] || m[2] || "").trim(); if (v) urls.add(v); }
        for (const raw of urls) {
          if (/^data:/i.test(raw)) continue;
          let abs; try { abs = new URL(raw, u.href).href; } catch { continue; }
          if (!sameOrigin(abs)) continue;
          const childRef = await vendor(abs, depth + 1);
          if (childRef) {
            // rewrite ONLY absolute same-origin refs; relative ones already resolve (tree mirrored)
            if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) {
              css = css.split(raw).join(childRef);
            }
          }
        }
        buf = Buffer.from(css, "utf8");
      }
      mkdirSync(dirname(fsPath), { recursive: true });
      writeFileSync(fsPath, buf);
      bytes += buf.length; files++;
      vendored.set(key, ref);
      return ref;
    } catch (e) {
      console.warn("  ! asset failed:", u.href, "-", e.message);
      vendored.set(key, null);
      return null;
    }
  })();
  inFlight.set(key, p);
  const r = await p;
  inFlight.delete(key);
  vendored.set(key, r);
  return r;
}

// rewrite an element attribute that holds a same-origin asset URL -> local ref
async function rewriteAsset(el, attr) {
  const v = el.getAttribute(attr);
  if (!v) return;
  let abs; try { abs = new URL(v, WP + "/").href; } catch { return; }
  if (!sameOrigin(abs)) return;
  const ref = await vendor(abs);
  if (ref) el.setAttribute(attr, ref);
}
async function rewriteSrcset(el) {
  const v = el.getAttribute("srcset");
  if (!v) return;
  const parts = await Promise.all(v.split(",").map(async (cand) => {
    const s = cand.trim(); if (!s) return null;
    const [url, ...desc] = s.split(/\s+/);
    let abs; try { abs = new URL(url, WP + "/").href; } catch { return s; }
    if (!sameOrigin(abs)) return s;
    const ref = await vendor(abs);
    return [(ref || url), ...desc].join(" ");
  }));
  el.setAttribute("srcset", parts.filter(Boolean).join(", "));
}
// vendor + rewrite every same-origin url()/@import inside a CSS string (style attr / <style> / head style)
const STRIP_Q = /^(?:&quot;|&#34;|&#039;|&apos;|["'\s])+|(?:&quot;|&#34;|&#039;|&apos;|["'\s])+$/g;
async function localizeCss(css) {
  if (!css) return css;
  const found = [];
  let m;
  const reUrl = /url\(\s*([^)]+?)\s*\)/gi;
  while ((m = reUrl.exec(css))) found.push({ full: m[0], raw: m[1], imp: false });
  const reImp = /@import\s+(['"])([^'"]+)\1/gi;
  while ((m = reImp.exec(css))) found.push({ full: m[0], raw: m[2], imp: true });
  for (const f of found) {
    const raw = f.raw.replace(STRIP_Q, "");
    if (!raw || /^data:/i.test(raw)) continue;
    let abs; try { abs = new URL(raw, WP + "/").href; } catch { continue; }
    if (!sameOrigin(abs)) continue;
    const ref = await vendor(abs);
    if (ref) css = css.split(f.full).join(f.imp ? `@import "${ref}"` : `url('${ref}')`);
  }
  return css;
}

// ---- SEO + head capture ---------------------------------------------------
function attrsOf(el) {
  const o = {}; for (const [k, v] of Object.entries(el.attributes)) o[k] = v; return o;
}
function extractSeo(head) {
  const get = (sel, attr = "content") => { const e = head.querySelector(sel); return e ? e.getAttribute(attr) : undefined; };
  const titleEl = head.querySelector("title");
  return {
    title: titleEl ? titleEl.text.trim() : undefined,
    description: get('meta[name="description"]'),
    canonical: get('link[rel="canonical"]', "href"),
    robots: get('meta[name="robots"]'),
    ogTitle: get('meta[property="og:title"]'),
    ogDescription: get('meta[property="og:description"]'),
    ogType: get('meta[property="og:type"]'),
    ogUrl: get('meta[property="og:url"]', "content"),
    ogImage: get('meta[property="og:image"]'),
    ogSiteName: get('meta[property="og:site_name"]'),
    ogLocale: get('meta[property="og:locale"]'),
    twitterCard: get('meta[name="twitter:card"]'),
    twitterTitle: get('meta[name="twitter:title"]'),
    twitterImage: get('meta[name="twitter:image"]'),
  };
}

// ---- per-page processing --------------------------------------------------
function routeFromLink(link) {
  const path = new URL(link).pathname;            // e.g. /%d7%9e.../ or /
  const segs = path.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
  return { path: path, segments: segs, isFront: segs.length === 0 };
}

async function processPage(meta, captureAssets) {
  const html = await fetchText(meta.link);
  const root = parse(html, { blockTextElements: { script: true, style: true, noscript: true, pre: true } });
  const head = root.querySelector("head");
  const body = root.querySelector("body");
  const seo = extractSeo(head);
  const bodyClass = body.getAttribute("class") || "";

  // -- ordered scripts (head + body, document order) + json-ld --
  const scripts = [];
  const jsonLd = [];
  for (const s of root.querySelectorAll("script")) {
    const type = (s.getAttribute("type") || "").toLowerCase();
    if (type.includes("ld+json")) { const t = s.text.trim(); if (t) jsonLd.push(t); s.remove(); continue; }
    let src = s.getAttribute("src") || s.getAttribute("data-rocket-src");
    if (src) {
      let abs; try { abs = new URL(src, WP + "/").href; } catch { abs = null; }
      let ref = src;
      if (abs && sameOrigin(abs)) { ref = (await vendor(abs)) || abs; }
      else if (abs) ref = abs;
      scripts.push({ kind: "src", url: ref, type: type || undefined });
    } else {
      const code = s.text;
      if (code && code.trim()) scripts.push({ kind: "inline", code, type: type || undefined });
    }
    s.remove();
  }

  // -- rewrite asset URLs inside the body (img/source/style/a) --
  for (const img of body.querySelectorAll("img")) { await rewriteAsset(img, "src"); await rewriteSrcset(img); await rewriteAsset(img, "data-src"); }
  for (const so of body.querySelectorAll("source")) { await rewriteSrcset(so); await rewriteAsset(so, "src"); }
  for (const el of body.querySelectorAll("[style]")) el.setAttribute("style", await localizeCss(el.getAttribute("style")));
  for (const st of body.querySelectorAll("style")) st.set_content(await localizeCss(st.text));
  // internal links -> relative (so they hit Next routes); leave tel:/mailto:/external/anchors
  for (const a of body.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    if (sameOrigin(href)) a.setAttribute("href", new URL(href).pathname + new URL(href).search + new URL(href).hash);
  }

  const route = routeFromLink(meta.link);
  const page = {
    id: meta.id,
    title: meta.title,
    slug: decodeURIComponent(meta.slug),
    path: route.path,
    segments: route.segments,
    isFront: route.isFront,
    bodyClass,
    seo,
    jsonLd,
    scripts,
    bodyHtml: body.innerHTML,
  };

  // -- capture shared chrome assets (CSS links + head inline styles) once --
  let assets = null;
  if (captureAssets) {
    const headLinks = [];
    for (const ln of head.querySelectorAll("link")) {
      const rel = (ln.getAttribute("rel") || "").toLowerCase();
      if (!/stylesheet|preload|icon|apple-touch-icon|mask-icon/.test(rel)) continue;
      const a = attrsOf(ln);
      if (a.href) { const ref = await vendor(new URL(a.href, WP + "/").href); if (ref) a.href = ref; }
      headLinks.push(a);
    }
    const headStyles = [];
    for (const st of head.querySelectorAll("style")) headStyles.push(await localizeCss(st.text));
    assets = { headLinks, headStyles };
  }
  return { page, assets };
}

// ---- main -----------------------------------------------------------------
// Every PUBLIC content type with frontend permalinks. The site is a custom "gogo"
// theme: besides core `pages`/`posts`, it registers `services` (/services/<slug>/),
// `locations` (/locations/<slug>/) and `step` (/step/<slug>/ — price-calculator steps).
// All render real themed pages on the live site, so all must be captured for 1:1.
const CONTENT_TYPES = ["pages", "posts", "services", "locations", "step"];

// WordPress ships these two demo posts with every install and they were never removed from the
// source. They carry no business content, are not linked from anywhere on the site, and were
// indexable dead weight — so they are not captured at all. (scripts/pages.mjs prunes them from
// an older snapshot too, in case site.json predates this.)
const SKIP_SLUGS = new Set(["hello-world", "sample-page"]);

async function getAllContent() {
  const out = [];
  let dropped = 0;
  for (const base of CONTENT_TYPES) {
    let p = 1, totalPages = 1, count = 0;
    do {
      const url = `${WP}/wp-json/wp/v2/${base}?per_page=100&page=${p}&status=publish&_fields=id,slug,link,title,status`;
      const r = await fetch(url, { headers: UA });
      if (!r.ok) { console.warn(`  ! ${base} page ${p} -> ${r.status} (skipping)`); break; }
      totalPages = parseInt(r.headers.get("x-wp-totalpages") || "1", 10);
      const batch = await r.json();
      for (const pg of batch) {
        if (SKIP_SLUGS.has(pg.slug)) { dropped++; continue; }
        out.push({ id: pg.id, slug: pg.slug, link: pg.link, title: pg.title.rendered, postType: base });
      }
      count += batch.length;
      p++;
    } while (p <= totalPages);
    console.log(`  ${base}: ${count}`);
  }
  if (dropped) console.log(`  (skipped ${dropped} WordPress demo post(s): ${[...SKIP_SLUGS].join(", ")})`);
  return out;
}

async function main() {
  mkdirSync(CONTENT, { recursive: true });
  console.log("Discovering content types:");
  const metas = await getAllContent();
  console.log(`\nFound ${metas.length} items. Snapshotting + vendoring assets...\n`);

  // process the front page first so we capture the shared CSS/JS chrome from it
  metas.sort((a, b) => (new URL(a.link).pathname === "/" ? -1 : 1));

  const pages = [];
  const skipped = [];
  let sharedAssets = null;
  for (const meta of metas) {
    process.stdout.write(`  [${meta.id}] ${meta.title}  ${meta.link}\n`);
    try {
      const { page, assets } = await processPage(meta, !sharedAssets);
      if (assets && !sharedAssets) sharedAssets = assets;
      pages.push(page);
    } catch (e) {
      console.warn(`      ! SKIPPED [${meta.id}] ${meta.link} -> ${e.message}`);
      skipped.push({ id: meta.id, link: meta.link, error: String(e.message) });
    }
  }
  pages.sort((a, b) => a.id - b.id);
  if (skipped.length) {
    console.log(`\n${skipped.length} page(s) skipped (broken on the source site):`);
    for (const s of skipped) console.log(`   [${s.id}] ${s.link} (${s.error})`);
  }

  const site = { wpUrl: WP, assets: sharedAssets, pages };
  writeFileSync(join(CONTENT, "site.json"), JSON.stringify(site, null, 2), "utf8");
  console.log(`\nDone. ${pages.length} pages, ${files} assets vendored (${(bytes / 1048576).toFixed(1)} MB).`);
  console.log(`Wrote content/site.json`);
}
main().catch((e) => { console.error(e); process.exit(1); });
