/**
 * Orphan check: every emitted route must have at least one inbound internal link.
 *
 * Why this is a script and not a shell one-liner: the naive pipeline
 *   find out -name index.html | sed ... > routes.txt
 *   grep -rho 'href="/[^"]*"' out ... > linked.txt
 *   comm -23 routes.txt linked.txt
 * compares **decoded** filesystem paths against **percent-encoded** hrefs, so every Hebrew
 * route looks orphaned or not depending on which form happens to appear. It produced a false
 * "orphan" for /שכפול-שלט-לרכב-2/ on 2026-08-25 when the page was in fact linked from the
 * footer of all 64 pages. Decode both sides, then compare.
 *
 * Run: node scripts/check-orphans.mjs        (exits 1 if a real orphan exists)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { withoutLiveRegions } from "../lib/live/regions.mjs";

const OUT = "out";

// Routes that are legitimately unlinked.
const ALLOWED = new Set([
  "/404/",
  "/_not-found/",
  "/thank-you/", // noindex form-success target, reached by redirect
]);
// Calculator funnel fragments: excluded from the sitemap by design (backlog §1.5).
const ALLOWED_PREFIX = ["/step/"];

const decode = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};
const norm = (p) => {
  const d = decode(p).split("?")[0].split("#")[0];
  return d.endsWith("/") ? d : d + "/";
};

// --- every emitted route -----------------------------------------------------------------
const routes = new Set();
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === "index.html") {
      const rel = relative(OUT, p).split(sep).slice(0, -1).join("/");
      routes.add(norm("/" + rel));
    }
  }
})(OUT);

// --- every internally linked href --------------------------------------------------------
const linked = new Set();
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === "index.html") {
      // The announcement bar's links sit on every page, inside `hidden` items in a
      // data-lm-ignore region; they must not be what keeps a route out of this list.
      const html = withoutLiveRegions(readFileSync(p, "utf8"));
      for (const m of html.matchAll(/href="(\/[^"]*)"/g)) linked.add(norm(m[1]));
    }
  }
})(OUT);

const orphans = [...routes]
  .filter((r) => !linked.has(r))
  .filter((r) => !ALLOWED.has(r) && !ALLOWED_PREFIX.some((p) => r.startsWith(p)))
  .sort();

console.log(`routes: ${routes.size} · distinct internal link targets: ${linked.size}`);
if (orphans.length === 0) {
  console.log("orphans: none ✅");
} else {
  console.error(`\nORPHANED ROUTES (${orphans.length}) — no inbound internal link:`);
  for (const o of orphans) console.error("  ! " + o);
  process.exit(1);
}
