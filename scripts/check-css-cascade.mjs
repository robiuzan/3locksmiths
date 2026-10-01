/**
 * Catches overrides in app/enrich.css that silently lose to the vendored theme.
 *
 *   node scripts/check-css-cascade.mjs
 *
 * WHY THIS EXISTS
 *
 *   app/enrich.css is emitted in the Next CSS chunk, which is the FIRST stylesheet in <head>.
 *   The vendored gogo main.css loads NINTH. So on a specificity tie the theme wins — an override
 *   written with the theme's own selector does nothing at all, silently, with no build error and
 *   nothing visibly wrong in the markup.
 *
 *   That shipped to production once: the homepage hero's 4th tile was supposed to sit in the
 *   bottom-left of the grid, and instead stayed absolutely centred in the middle, because the
 *   override used `.home-hero-right-galley .gallery-item:last-child` — byte-identical to the
 *   theme's selector. Reviewing the CSS could not catch it; only looking at the page could.
 *
 * WHAT IT CHECKS
 *
 *   A selector appearing in BOTH files is only a problem when the two rules set the SAME property.
 *   A shared selector setting different properties is fine, so those are not reported.
 *
 * Non-mutating, so `check-` is the correct prefix.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** selector -> Set(property) */
function rules(css) {
  const map = new Map();
  for (const m of strip(css).matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    const props = new Set(
      m[2]
        .split(";")
        .map((d) => d.split(":")[0]?.trim().toLowerCase())
        .filter(Boolean),
    );
    for (const sel of m[1].split(",")) {
      const s = sel.trim().replace(/\s+/g, " ");
      if (!s || s.startsWith("@") || s.startsWith("%")) continue;
      // `from` / `to` / `40%` inside @keyframes are steps, not selectors: the theme's own
      // keyframes would otherwise "tie" with ours on `transform`.
      if (/^(?:from|to|\d+(?:\.\d+)?%)$/.test(s)) continue;
      if (!map.has(s)) map.set(s, new Set());
      for (const p of props) map.get(s).add(p);
    }
  }
  return map;
}

const ours = rules(readFileSync(join(ROOT, "app/enrich.css"), "utf8"));
const theme = new Map();
for (const f of ["main.css", "rtl.css"]) {
  for (const [sel, props] of rules(
    readFileSync(join(ROOT, "public/wp-content/themes/gogo/assets/css", f), "utf8"),
  )) {
    if (!theme.has(sel)) theme.set(sel, new Set());
    for (const p of props) theme.get(sel).add(p);
  }
}

const losing = [];
for (const [sel, props] of ours) {
  const t = theme.get(sel);
  if (!t) continue;
  const shared = [...props].filter((p) => t.has(p));
  if (shared.length) losing.push({ sel, shared });
}

if (losing.length) {
  console.error(
    `\ncss-cascade: ${losing.length} override(s) tie with the vendored theme and LOSE:\n`,
  );
  for (const { sel, shared } of losing) {
    console.error(`  ${sel}`);
    console.error(`    also set by the theme: ${shared.join(", ")}`);
  }
  console.error(
    `\n  Both sheets use the same selector, so specificity ties and the LATER sheet wins —\n` +
      `  and the theme loads after app/enrich.css. Add an ancestor (e.g. \`body \` or a section\n` +
      `  class) so the override wins on specificity instead of on order.\n`,
  );
  process.exit(1);
}
console.log(
  `css-cascade: no override ties with the vendored theme (${ours.size} selectors checked) ✅`,
);
