/**
 * Hebrew punctuation guard for the authored modules (CLAUDE.md §8).
 *
 * Hebrew abbreviations and transliterated foreign sounds take גרש U+05F3 (׳) and גרשיים
 * U+05F4 (״) — never the ASCII apostrophe `'`, the ASCII quote `"`, or the typographic `’`.
 * The distinction is not cosmetic: `פיג'ו` and `פיג׳ו` are different strings, so a page written
 * with the ASCII form does not match a query typed with the correct one, and screen readers
 * announce the two differently.
 *
 * WHY A SCRIPT — a 2026-08-26 sweep found six modules carrying the wrong character in ~67
 * places: `פיג'ו` throughout the Peugeot page, `ג'אז` on Honda, `ג'סי כהן` and `רח'` on Holon,
 * the Beer Sheva letter-neighbourhoods `ד'` / `ו'` / `י"א`, and `וכו'` on two brand pages. Every
 * one had been read past by review after review, because a lone apostrophe is invisible in
 * prose. A machine notices it every time.
 *
 * SCOPE — deliberately narrow. It inspects only the STRING VALUES of each module's default
 * export, never the file source, so JavaScript's own quote characters are out of reach. It
 * reports the offending Hebrew token with context so a fix is a one-line edit.
 *
 *   node scripts/check-typography.mjs            report only (exit 1 if anything is wrong)
 *   node scripts/check-typography.mjs --fix      rewrite the known-safe cases in place
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENRICHED = join(ROOT, "content", "enriched");
const FIX = process.argv.includes("--fix");

const GERESH = "׳"; // ׳
const GERSHAYIM = "״"; // ״

/**
 * Exact, enumerated replacements. No blanket regex: a broad "apostrophe after a Hebrew letter"
 * substitution would also rewrite quoted English inside Hebrew copy, and a possessive in a
 * Latin model name. Each entry is a token we have actually seen and verified.
 */
const TOKENS = [
  // transliterated foreign sounds — the ג׳ / ז׳ / צ׳ family
  ["פיג'ו", `פיג${GERESH}ו`],
  ["ג'אז", `ג${GERESH}אז`],
  ["ג'יפ", `ג${GERESH}יפ`],
  ["ג'ילי", `ג${GERESH}ילי`],
  ["ג'סי", `ג${GERESH}סי`],
  ["דאצ'יה", `דאצ${GERESH}יה`],
  ["סוויץ'", `סוויץ${GERESH}`],
  ["ז'בוטינסקי", `ז${GERESH}בוטינסקי`],
  ["ויז'ניץ", `ויז${GERESH}ניץ`],
  // Hebrew abbreviations
  ["וכו'", `וכו${GERESH}`],
  ["רח'", `רח${GERESH}`],
  ['ד"ר', `ד${GERSHAYIM}ר`],
  ['ממ"ד', `ממ${GERSHAYIM}ד`],
  // Beer Sheva / Ashdod letter-quarters: a lone Hebrew letter used as an ordinal
  ["שכונה א'", `שכונה א${GERESH}`],
  ["שכונה ב'", `שכונה ב${GERESH}`],
  ["שכונה ג'", `שכונה ג${GERESH}`],
  ["שכונה ד'", `שכונה ד${GERESH}`],
  ["שכונה ו'", `שכונה ו${GERESH}`],
  ["ד', ", `ד${GERESH}, `],
  ["ו', ", `ו${GERESH}, `],
  ["ה', ", `ה${GERESH}, `],
  ['י"א', `י${GERSHAYIM}א`],
  ['י"ב', `י${GERSHAYIM}ב`],
];

/** Anything still matching these after the token pass is reported for a human to look at. */
const RESIDUAL = [
  ["ascii-apostrophe", /[֐-׿]'/],
  ["ascii-gershayim", /[֐-׿]"[֐-׿]/],
  ["typographic-apostrophe", /[֐-׿]’/],
];

const files = readdirSync(ENRICHED).filter((f) => /^\d+\.mjs$/.test(f));
let fixedFiles = 0;
let fixedCount = 0;
const residuals = [];

for (const f of files) {
  const path = join(ENRICHED, f);
  const mod = await import(pathToFileURL(path).href);
  const data = mod.default;
  if (!data) continue;

  // Walk the string values only, so JS quote characters in the source are never touched.
  const strings = [];
  const walk = (v) => {
    if (typeof v === "string") strings.push(v);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(data);

  let src = readFileSync(path, "utf8");
  let n = 0;
  for (const [from, to] of TOKENS) {
    // only rewrite tokens that genuinely occur in a rendered string, not anywhere in the file
    if (!strings.some((s) => s.includes(from))) continue;
    const hits = src.split(from).length - 1;
    if (!hits) continue;
    n += hits;
    if (FIX) src = src.split(from).join(to);
  }
  if (n) {
    fixedCount += n;
    fixedFiles++;
    if (FIX) writeFileSync(path, src, "utf8");
    console.log(`  ${FIX ? "fixed" : "would fix"} ${f.padEnd(10)} ${n} occurrence(s)`);
  }

  for (const s of strings) {
    for (const [id, re] of RESIDUAL) {
      const m = s.match(re);
      if (!m) continue;
      // Skip the tokens we already handle — after --fix they are gone anyway.
      if (TOKENS.some(([from]) => s.includes(from))) continue;
      const i = s.indexOf(m[0]);
      residuals.push(`${id} :: ${f} :: …${s.slice(Math.max(0, i - 30), i + 30)}…`);
    }
  }
}

console.log(
  `typography: ${FIX ? "fixed" : "found"} ${fixedCount} occurrence(s) across ${fixedFiles} module(s).`,
);

const unique = [...new Set(residuals)];
if (unique.length) {
  console.error(`\ntypography: ${unique.length} unrecognised case(s) — review by hand:`);
  for (const r of unique.slice(0, 25)) console.error("  ! " + r);
  console.error(
    `\nAdd the token to TOKENS in scripts/check-typography.mjs, or correct the module.\n`,
  );
  process.exit(1);
}
if (!FIX && fixedCount) {
  console.error(`\nRun \`node scripts/check-typography.mjs --fix\` to correct these.\n`);
  process.exit(1);
}
console.log("typography: Hebrew punctuation clean ✅");
