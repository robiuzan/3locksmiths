/**
 * The answer block: the question heading and the first paragraph under it — the span an answer
 * engine or a featured snippet lifts whole (docs/content-standards.md §5, /aeo-answer-content).
 *
 * THE RULE, per authored page of kind service, brand-key, location or guide:
 *   - `intro.heading` is a question (ends with "?");
 *   - `intro.paragraphs[0]` is 40–60 words — shorter reads thin, longer stops being liftable;
 *   - it carries the concrete answer: a ₪ price on service and brand pages, a ₪ price or a
 *     duration (minutes to years — a smart-key battery lasts "שנה עד שלוש") on city pages and
 *     guides.
 * Words are whitespace tokens holding a letter or a digit, so "200 – 350 ₪" counts as two.
 *
 * Checked on the MODULES, not the rendered page: the answer block is authored data with a fixed
 * place in the contract (lib/enrich/types.ts), and a module-level check names the field to fix.
 * Ported from visionsecurity.co.il/scripts/answer-block-check.mjs, which reads its export instead.
 *
 * RATCHETED (scripts/check-ratchet.mjs): full rule on pages marked done in
 * content/geo-ratchet.json; elsewhere the number of failing pages may only fall.
 *
 *   node scripts/check-answer-block.mjs [--verbose] [--ratchet] [--init]
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { judge } from "./check-ratchet.mjs";

export const MIN_WORDS = 40;
export const MAX_WORDS = 60;
const REQUIRED = new Set(["service", "brand-key", "location", "guide"]);
const PRICE_REQUIRED = new Set(["service", "brand-key"]);

export const words = (s) =>
  String(s ?? "")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** Every reason this module's answer block fails; [] when it passes or is not required. */
export function answerBlockProblems(mod) {
  if (!REQUIRED.has(mod.kind)) return [];
  const problems = [];
  const heading = String(mod.intro?.heading ?? "").trim();
  const first = String(mod.intro?.paragraphs?.[0] ?? "");
  if (!heading.endsWith("?"))
    problems.push(`heading is not a question ("${heading.slice(0, 50)}")`);
  const n = words(first);
  if (n < MIN_WORDS) problems.push(`first paragraph ${n} words, under ${MIN_WORDS}`);
  if (n > MAX_WORDS) problems.push(`first paragraph ${n} words, over ${MAX_WORDS}`);
  // "לפי דגם" is the price answer for the no-key case (שחזור): the owner chose not to publish a
  // range for it (docs/business-facts.md §D.1), and saying so plainly IS the concrete answer.
  const hasPrice = /₪|לפי דגם/.test(first);
  const hasTime = /דקות|דקה|שעה|שעות|יום|ימים|שבוע|חודש|שנה|שנים/.test(first);
  if (PRICE_REQUIRED.has(mod.kind) ? !hasPrice : !hasPrice && !hasTime) {
    problems.push(
      PRICE_REQUIRED.has(mod.kind)
        ? "no ₪ price in the first paragraph"
        : "no price or duration in the first paragraph",
    );
  }
  return problems;
}

/**
 * The rest of the Phase 3 "done" definition that a script can see — checked ONLY on pages marked
 * done, so it never blocks a page that has not been through its batch yet:
 *   - service, brand and city pages carry a checklist of at least 4 items and 4–6 timed steps;
 *   - brand pages name the no-key case (שחזור) in the answer block, in a FAQ question, in a price
 *     or specs row and in the description, and keep page 96 in `related` when they author it.
 */
const RESTORE = /שחזור|%d7%a9%d7%97%d7%96%d7%95%d7%a8/i;
export function patternProblems(mod) {
  const problems = [];
  if (["service", "brand-key", "location"].includes(mod.kind)) {
    const items = mod.checklist?.items?.length ?? 0;
    if (items < 4) problems.push(`checklist has ${items} item(s), needs at least 4`);
    const steps = mod.process?.length ?? 0;
    if (steps < 4 || steps > 6) problems.push(`process has ${steps} step(s), needs 4–6`);
    if ((mod.process ?? []).some((s) => !s.time))
      problems.push("a process step has no time");
  }
  if (mod.kind === "brand-key") {
    if (!/שחזור/.test(mod.intro?.paragraphs?.[0] ?? ""))
      problems.push("answer block never says שחזור");
    if (!(mod.faq?.items ?? []).some((it) => /שחזור/.test(it.q)))
      problems.push("no FAQ question about שחזור");
    const rows = [
      ...(mod.pricing ?? []).map((r) => r.service),
      ...(mod.specsTable?.rows ?? []).flat(),
    ];
    if (!rows.some((r) => /שחזור|ללא מקור/.test(r)))
      problems.push("no price or specs row for the no-key case");
    if (!/שחזור/.test(mod.seo?.description ?? ""))
      problems.push("description never says שחזור");
    const rel = mod.related?.services;
    if (rel && !rel.some((l) => RESTORE.test(`${l.label} ${l.href}`))) {
      problems.push("related.services is authored and omits 96 (שחזור מפתח לרכב)");
    }
  }
  return problems;
}

export async function loadModules(dir = join(process.cwd(), "content", "enriched")) {
  const mods = [];
  for (const f of readdirSync(dir).filter((x) => /^\d+\.mjs$/.test(x))) {
    const m = (await import(pathToFileURL(join(dir, f)).href)).default;
    if (m && typeof m.id === "number") mods.push(m);
  }
  return mods.sort((a, b) => a.id - b.id);
}

if (process.argv[1] && process.argv[1].endsWith("check-answer-block.mjs")) {
  const mods = await loadModules();
  const violations = [];
  for (const m of mods) {
    const problems = answerBlockProblems(m);
    if (problems.length) violations.push({ id: m.id, keyword: m.keyword, problems });
  }
  const required = mods.filter((m) => REQUIRED.has(m.kind)).length;
  const verdict = judge("answer-block", violations, {
    verbose: process.argv.includes("--verbose"),
    describe: (v) => `id ${v.id} ${v.keyword} — ${v.problems.join("; ")}`,
  });
  for (const l of verdict.lines) (verdict.failed ? console.error : console.log)(l);

  // The done-only pattern rule. Every violation is on a done page by construction, so its
  // baseline is 0 and stays 0: the ratchet's done-page half is the whole rule.
  const pattern = [];
  for (const m of mods.filter((x) => verdict.done.has(x.id))) {
    const problems = patternProblems(m);
    if (problems.length) pattern.push({ id: m.id, keyword: m.keyword, problems });
  }
  const pv = judge("geo-pattern", pattern, {
    describe: (v) => `id ${v.id} ${v.keyword} — ${v.problems.join("; ")}`,
  });
  for (const l of pv.lines) (pv.failed ? console.error : console.log)(l);

  const failed = verdict.failed || pv.failed;
  console.log(
    `answer-block: ${required - violations.length}/${required} required pages pass; ` +
      `${verdict.done.size} page(s) done` +
      (failed ? " — FAILED" : " ✅"),
  );
  process.exit(failed ? 1 : 0);
}
