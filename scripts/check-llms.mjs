/**
 * Checks the exported /llms.txt (app/llms.txt/route.ts) — run AFTER `npm run build`.
 *
 * WHY — llms.txt is written straight to out/ by Next. It never passes through content/site.json,
 * so check-claims.mjs, check-typography.mjs and fix-links.mjs never see it. A wrong URL or an
 * unsourced claim here would be read by exactly the engines it is meant to inform.
 *
 * Fails when:
 *   · out/llms.txt is missing or empty;
 *   · a URL in it is not a <loc> in out/sitemap.xml (a dead or non-canonical link);
 *   · it states a gated claim (the patterns scripts/check-claims.mjs blocks), any ₪ price, or a
 *     coverage phrase (docs/business-facts.md §D.1, §E.2);
 *   · a Hebrew word carries an ASCII apostrophe or quote instead of ׳ / ״ (CLAUDE.md §8).
 *
 * Non-mutating and offline.   node scripts/check-llms.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "out");
const fail = [];

const llmsPath = join(OUT, "llms.txt");
const sitemapPath = join(OUT, "sitemap.xml");
if (!existsSync(llmsPath) || !existsSync(sitemapPath)) {
  console.error(
    "llms: out/llms.txt or out/sitemap.xml is missing — run `npm run build` first.",
  );
  process.exit(1);
}
const text = readFileSync(llmsPath, "utf8");
if (text.trim().length < 200) fail.push("out/llms.txt is (nearly) empty");

const locs = new Set(
  [...readFileSync(sitemapPath, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => m[1],
  ),
);
const urls = [...text.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);
for (const u of urls)
  if (!locs.has(u)) fail.push(`URL not in sitemap.xml: ${decodeURIComponent(u)}`);
if (urls.length < 50)
  fail.push(`only ${urls.length} links — expected every service, brand, city and guide`);

const RULES = [
  [
    "years-in-business",
    /\d{1,2}\s*\+?\s*שנות ניסיון|ניסיון של\s*\d{1,2}\s*שנ|מעל\s*\d{1,2}\s*שנות|שנים של ניסיון|ניסיון מוכח/,
  ],
  ["warranty", /אחריות/],
  ["customer-count", /(?:עשרות|מאות|אלפי)\s+(?:לקוחות|מוסכים|עסקים|סוכנויות|ציי רכב)/],
  ["response-time", /זמן מענה ממוצע|זמן הגעה ממוצע|תוך\s*\d+\s*דקות/],
  ["rating", /★|דירוג|ביקורות/],
  ["price", /\d\s*₪|₪\s*\d|\$\s?\d/],
  ["coverage", /פריסה ארצית|פריסה רחבה|בכל הארץ/],
  ["ascii-apostrophe", /[א-ת]['"’]/],
];
for (const [id, re] of RULES) {
  const m = text.match(re);
  if (m) fail.push(`[${id}] "${m[0]}"`);
}

if (fail.length) {
  console.error(`\nllms: ${fail.length} problem(s) in out/llms.txt:`);
  for (const f of fail) console.error("  ! " + f);
  process.exit(1);
}
console.log(
  `llms: ${urls.length} links, all in sitemap.xml; no gated claim, price or coverage phrase ✅`,
);
