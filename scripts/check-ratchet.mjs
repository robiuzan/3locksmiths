/**
 * The GEO content ratchet — shared by scripts/check-prices.mjs, check-answer-block.mjs,
 * check-boilerplate.mjs and the arrival rule in check-claims.mjs.
 *
 * WHY A RATCHET — the GEO pattern (docs/content-standards.md §5, the Phase 3 plan) is rolled out
 * in batches of about eight pages, each shipped only after a partner locksmith signs its claims
 * sheet. A gate that demanded the whole pattern on all 98 authored pages would be red for months
 * and therefore ignored. A gate that demanded nothing would let the next edit add a contradiction.
 * So every rule has two halves:
 *
 *   - pages listed in `done` must pass the rule in full — one violation fails the build;
 *   - on every other page the violation count may only fall: above `baseline[rule]` fails, below
 *     it prints the command that lowers the baseline.
 *
 * The file lives at content/geo-ratchet.json, OUTSIDE content/enriched/: scripts/check-freshness.mjs
 * treats every file in that folder as a source of content/site.json, and lowering a baseline must
 * not force a rebuild of the site.
 *
 * Never raise a baseline by hand. If a rule's count went up, a change introduced a violation —
 * fix the change. `--ratchet` only ever lowers a number; `--init` only fills a rule that has none.
 *
 * Not a page script and not mutating unless one of those two flags is passed, so it is named
 * check-… on purpose: check-freshness skips check-* files when it lists the sources of site.json.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const FILE = join(process.cwd(), "content", "geo-ratchet.json");

export function loadRatchet() {
  if (!existsSync(FILE)) throw new Error("content/geo-ratchet.json is missing");
  const r = JSON.parse(readFileSync(FILE, "utf8"));
  if (!Array.isArray(r.done) || typeof r.baseline !== "object") {
    throw new Error(
      "content/geo-ratchet.json needs `done` (array) and `baseline` (object)",
    );
  }
  return r;
}

/**
 * Judge one rule. `violations` is every violation sitewide, each with a numeric `id`.
 * Returns { failed, lines } — the caller prints the lines and sets the exit code.
 */
export function judge(rule, violations, { describe, verbose = false } = {}) {
  const ratchet = loadRatchet();
  const done = new Set(ratchet.done);
  const onDone = violations.filter((v) => done.has(v.id));
  const rest = violations.filter((v) => !done.has(v.id));
  const base = ratchet.baseline[rule];
  const lines = [];
  let failed = false;

  if (onDone.length) {
    failed = true;
    lines.push(`✗ ${rule}: ${onDone.length} violation(s) on pages marked done:`);
    for (const v of onDone) lines.push(`    ${describe(v)}`);
  }

  const flags = process.argv.slice(2);
  if (base === undefined) {
    if (flags.includes("--init")) {
      ratchet.baseline[rule] = rest.length;
      writeFileSync(FILE, JSON.stringify(ratchet, null, 2) + "\n");
      lines.push(`• ${rule}: baseline initialised at ${rest.length}`);
    } else {
      failed = true;
      lines.push(
        `✗ ${rule}: no baseline in content/geo-ratchet.json — run with --init once`,
      );
    }
  } else if (rest.length > base) {
    failed = true;
    lines.push(
      `✗ ${rule}: ${rest.length} violation(s) on pages not yet done, above the baseline of ${base}.` +
        ` A change added ${rest.length - base}. Fix it; never raise the baseline.`,
    );
    for (const v of rest.slice(0, 12)) lines.push(`    ${describe(v)}`);
  } else if (rest.length < base) {
    if (flags.includes("--ratchet")) {
      ratchet.baseline[rule] = rest.length;
      writeFileSync(FILE, JSON.stringify(ratchet, null, 2) + "\n");
      lines.push(`• ${rule}: baseline lowered ${base} → ${rest.length}`);
    } else {
      lines.push(
        `• ${rule}: ${rest.length} on pages not yet done, below the baseline of ${base} —` +
          ` lower it with: node ${process.argv[1].split(/[\\/]/).slice(-2).join("/")} --ratchet`,
      );
    }
  } else {
    lines.push(
      `• ${rule}: ${rest.length} on pages not yet done (baseline ${base}), ${onDone.length} on done pages`,
    );
  }

  if (verbose && rest.length) {
    lines.push(`  not-yet-done violations (${rest.length}):`);
    for (const v of rest) lines.push(`    ${describe(v)}`);
  }
  return { failed, lines, done };
}

// Run directly: print the ratchet file in a readable form.
if (process.argv[1] && process.argv[1].endsWith("check-ratchet.mjs")) {
  const r = loadRatchet();
  console.log(
    `GEO ratchet — ${r.done.length} page(s) done: ${r.done.join(", ") || "none"}`,
  );
  for (const [rule, n] of Object.entries(r.baseline))
    console.log(`  ${rule.padEnd(22)} baseline ${n}`);
}
